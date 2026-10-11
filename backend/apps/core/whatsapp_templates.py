"""Read approved WABA utility templates; never accept a client-built Meta payload."""

import hashlib
import json
import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .whatsapp import connection, graph, send_payload

VARIABLE = re.compile(r"\{\{([a-zA-Z_][a-zA-Z_0-9]*|[1-9][0-9]*)\}\}")


def describe(row):
    texts, variables = [], []
    reason = ""
    components = row.get("components", [])
    if not isinstance(components, list) or any(not isinstance(part, dict) for part in components):
        raise ValidationError("A Meta devolveu componentes de template inválidos.")
    if row.get("status") != "APPROVED" or row.get("category") != "UTILITY":
        reason = "Disponível apenas para templates de serviço (UTILITY) aprovados."
    for component in components:
        kind = component.get("type", "")
        if kind not in {"HEADER", "BODY", "FOOTER"} or (
            kind == "HEADER" and component.get("format") != "TEXT"
        ):
            reason = "Templates com media ou botões ainda não são suportados neste editor."
            continue
        text = component.get("text", "")
        if not isinstance(text, str):
            raise ValidationError("A Meta devolveu um template inválido.")
        names = list(dict.fromkeys(VARIABLE.findall(text)))
        positional = all(name.isdigit() for name in names)
        if (
            kind == "FOOTER"
            and names
            or "{{" in VARIABLE.sub("", text)
            or positional
            and sorted(map(int, names)) != list(range(1, len(names) + 1))
            or not positional
            and any(name.isdigit() for name in names)
        ):
            reason = "Formato de variáveis não suportado."
        if positional:
            names.sort(key=int)
        variables.extend(
            {
                "key": f"{kind.lower()}:{name}",
                "component": kind.lower(),
                "name": name,
                "named": not positional,
            }
            for name in names
        )
        texts.append({"type": kind.lower(), "text": text})
    if len(variables) > 40:
        reason = "Máximo de 40 variáveis suportadas."
    if not any(part["type"] == "body" for part in texts):
        reason = "Template sem corpo de texto."
    return {
        "revision": hashlib.sha256(json.dumps(components, sort_keys=True).encode()).hexdigest(),
        "id": str(row.get("id", "")),
        "name": row.get("name", ""),
        "language": row.get("language", ""),
        "category": row.get("category", ""),
        "texts": texts,
        "variables": variables,
        "supported": not reason,
        "reason": reason,
    }


def list_templates(config=None, after="", name=""):
    config = config or connection()
    if not config.enabled:
        raise ValidationError(
            "Ative a integração WhatsApp nas definições antes de consultar templates."
        )
    params = {"fields": "id,name,language,status,category,components", "limit": 100}
    if after:
        params["after"] = after
    if name:
        params["name"] = name
    data = graph(config, "GET", f"{config.details['waba_id']}/message_templates", params=params)
    rows = data.get("data", [])
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValidationError("A Meta não confirmou os templates.")
    paging = data.get("paging", {})
    if not isinstance(paging, dict) or not isinstance(paging.get("cursors", {}), dict):
        raise ValidationError("A Meta devolveu uma paginação inválida.")
    cursor = paging.get("cursors", {}).get("after", "") if paging.get("next") else ""
    return {
        "results": [describe(row) for row in rows if row.get("status") == "APPROVED"],
        "after": cursor,
    }


def send_template(conversation, sender, values):
    config = connection()
    rows = list_templates(config, name=values["name"])["results"]
    template = next(
        (
            row
            for row in rows
            if row["id"] == values["template_id"]
            and row["name"] == values["name"]
            and row["language"] == values["language"]
        ),
        None,
    )
    if not template or not template["supported"]:
        raise ValidationError(
            "Template indisponível, não aprovado ou não suportado. Atualize a lista."
        )
    if values["revision"] != template["revision"]:
        raise ValidationError(
            "O template foi alterado na Meta. Atualize a lista e reveja a mensagem antes de enviar."
        )
    parameters = values["parameters"]
    if set(parameters) != {variable["key"] for variable in template["variables"]}:
        raise ValidationError("Preencha todas as variáveis do template, sem campos adicionais.")
    components = []
    for kind in ("header", "body"):
        fields = [variable for variable in template["variables"] if variable["component"] == kind]
        if fields:
            components.append(
                {
                    "type": kind,
                    "parameters": [
                        {
                            "type": "text",
                            "text": parameters[field["key"]],
                            **({"parameter_name": field["name"]} if field["named"] else {}),
                        }
                        for field in fields
                    ],
                }
            )
    body = "\n\n".join(
        VARIABLE.sub(lambda match: parameters[f"{part['type']}:{match[1]}"], part["text"])
        for part in template["texts"]
    )
    if len(body) > 4000:
        raise ValidationError("O texto final ultrapassa 4000 caracteres.")
    audit = {
        "id": template["id"],
        "name": template["name"],
        "language": template["language"],
        "consent_note": values["consent_note"],
        "confirmed_at": timezone.now().isoformat(),
    }
    return send_payload(
        conversation,
        sender,
        body,
        {
            "type": "template",
            "template": {
                "name": template["name"],
                "language": {"code": template["language"]},
                "components": components,
            },
        },
        config,
        template=audit,
    )
