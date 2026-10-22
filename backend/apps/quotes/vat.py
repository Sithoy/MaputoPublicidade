"""Proposal tax policy, not a determination of legal eligibility for exemption."""

import json
from decimal import Decimal
from hashlib import sha256

from rest_framework.exceptions import ValidationError

STANDARD_VAT_RATE = Decimal("16")


def client_identity(quote):
    values = [(quote.client_company or quote.client_name).strip(), quote.client_nuit.strip()]
    return sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()


def current_evidence(quote):
    return quote.vat_evidence.defer("content").filter(client_identity=client_identity(quote)).order_by("-pk").first()


def proposal_tax_rate(instance, exempt, requested=None):
    expected = Decimal("0") if exempt else STANDARD_VAT_RATE
    # Historical tax treatments must survive ordinary editing, but cannot be copied to new quotes.
    historical = (
        instance is not None and instance.commercial_pricing and not instance.vat_exempt
        and not exempt and requested == instance.tax_rate
    )
    if requested is not None and requested != expected and not historical:
        raise ValidationError({"tax_rate": "IVA fixo de 16%. Para isenção, selecione a opção própria."})
    return requested if historical else expected


def require_vat_evidence(quote):
    if quote.vat_exempt and (
        not quote.vat_exemption_reason.strip() or current_evidence(quote) is None
    ):
        raise ValidationError("Anexe o comprovativo e indique a justificação da isenção de IVA antes de enviar.")
