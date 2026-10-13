"""Editable correspondence starters; missing commercial facts are never invented."""
import hashlib
import json
import re

from django.conf import settings
from django.utils.html import escape

from apps.accounts.roles import StaffCapability, has_staff_capability

KEYS = ['received', 'details', 'proposal', 'artwork', 'production', 'ready', 'followup']
PLACEHOLDER = re.compile(r'⟦[^⟧]*⟧')


def signature():
    company = settings.COMPANY_PROFILE
    return {'name': company['legal_name'], 'email': 'atendimento@maputopublicidade.com',
            'phone': company['phone'], 'address': company['address']}


def models_for(conversation, user):
    quote = conversation.quote or (conversation.order.quote if conversation.order else None)
    if quote and not has_staff_capability(user, StaffCapability.VIEW_QUOTES):
        quote = None
    name = (quote.client_company or quote.client_name) if quote else conversation.contact_name or 'cliente'
    ref = quote.reference if quote else '⟦Referência do pedido⟧'
    validity = quote.valid_until.strftime('%d/%m/%Y') if quote and quote.valid_until else '⟦Validade da proposta⟧'
    days = f'{quote.estimated_delivery_days} dias úteis' if quote and quote.estimated_delivery_days else '⟦Prazo estimado⟧'
    payment = quote.get_payment_option_display() if quote else '⟦Condições de pagamento⟧'
    greeting = f'Olá, {name}.\n\n'
    entries = [
        ('received', 'Receção do pedido', f'Recebemos o seu pedido — {ref}', f'Obrigado pelo contacto. Recebemos o pedido {ref} e vamos analisar as suas necessidades.\n\nEntraremos em contacto para confirmar os próximos passos.'),
        ('details', 'Informação em falta', f'Informação para preparar o pedido — {ref}', f'Para prepararmos o pedido {ref}, precisamos de confirmar:\n\n⟦Indique apenas a informação em falta⟧\n\nPode responder diretamente a este email e incluir referências ou imagens.'),
        ('proposal', 'Envio de proposta', f'Proposta comercial — {ref}', f'Partilhamos a proposta para o pedido {ref}.\n\nProposta: ⟦Link da proposta ou documento disponibilizado⟧\nValidade: {validity}\nPrazo estimado: {days}, após confirmação das condições aplicáveis.\nPagamento: {payment}\n\nAgradecemos a revisão e confirmação. Não iniciamos o trabalho sem a aprovação necessária.'),
        ('artwork', 'Aprovação de arte', f'Arte para apreciação — {ref}', f'A arte do pedido {ref} está pronta para revisão.\n\nPré-visualização: ⟦Link da arte⟧\n\nConfirme se está aprovada ou indique as alterações pretendidas. A produção depende da sua aprovação.'),
        ('production', 'Confirmação de produção', f'Próximos passos da produção — {ref}', f'Confirmamos os próximos passos do pedido {ref}.\n\nEstado confirmado: ⟦Estado autorizado pela Produção⟧\nPrevisão acordada: ⟦Data ou prazo confirmado⟧\n\nInformaremos caso exista alguma alteração. Obrigado pela confiança.'),
        ('ready', 'Levantamento ou entrega', f'Levantamento ou entrega — {ref}', f'Gostaríamos de coordenar a conclusão do pedido {ref}.\n\nDisponibilidade confirmada: ⟦Data e horário⟧\nModalidade: ⟦Levantamento ou entrega⟧\nLocal: ⟦Local confirmado⟧\n\nConfirme a opção mais conveniente para si.'),
        ('followup', 'Seguimento de proposta', f'Podemos ajudar com a proposta? — {ref}', f'Voltamos ao contacto sobre o pedido {ref}.\n\nFicou alguma questão sobre a proposta ou pretende ajustar algum detalhe? Estamos disponíveis para ajudar.\n\nAguardamos o seu retorno.'),
    ]
    return [{'key': key, 'name': label, 'subject': subject, 'body': greeting + body,
             'missing': PLACEHOLDER.findall(subject + '\n' + body)} for key, label, subject, body in entries]


def preview(subject, body, staff_profile=None, attachments=None):
    profile = staff_profile or signature()
    def rich_text(text):
        parts = re.split(r'(https?://[^\s<>]+)', text)
        return ''.join(f'<a href="{escape(part)}" style="color:#174733;text-decoration:underline">{escape(part)}</a>' if part.startswith(('https://', 'http://')) else str(escape(part)) for part in parts).replace('\n', '<br>')
    paragraphs = ''.join(f'<p style="margin:0 0 16px;line-height:1.7">{rich_text(part)}</p>' for part in body.split('\n\n'))
    html = f'''<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://maputopublicidade.com;"></head><body style="margin:0;background:#f3f5ef;font-family:Arial,sans-serif;color:#243d32"><table role="presentation" style="width:100%;max-width:640px;margin:24px auto;background:white;border-collapse:collapse"><tr><td style="padding:24px 32px;border-top:4px solid #bc9c50;border-bottom:1px solid #e5e9df"><img src="https://maputopublicidade.com/logo-tight.png" width="150" alt="Maputo Publicidade"><p style="font-size:10px;letter-spacing:2px;color:#68816c">ATENDIMENTO · MAPUTO PUBLICIDADE</p></td></tr><tr><td style="padding:32px"><h1 style="font-size:22px;font-weight:600;margin:0 0 24px;color:#174733">{escape(subject)}</h1>{paragraphs}<div style="margin-top:28px;padding-top:20px;border-top:1px solid #ddcf9d;font-size:13px;line-height:1.8"><strong>Equipa de Atendimento</strong><br>{escape(profile['name'])}<br>{escape(profile['email'])}<br>{escape(profile['phone'])}<br>{escape(profile['address'])}</div></td></tr><tr><td style="padding:16px 32px;background:#174733;color:#eef3e8;font-size:11px">Pode responder diretamente a este email. Estamos disponíveis para ajudar.</td></tr></table></body></html>'''
    if staff_profile:
        html = html.replace('<strong>Equipa de Atendimento</strong>', f"<strong>{escape(profile['staff_name'])}</strong><br>{escape(profile['staff_title'])}")
    digest = hashlib.sha256(json.dumps({'subject': subject, 'body': body, 'signature': profile, 'attachments': attachments or []}, sort_keys=True).encode()).hexdigest()
    text = subject + '\n' + body
    missing = PLACEHOLDER.findall(text)
    if ('⟦' in text or '⟧' in text) and not missing:
        missing = ['Marcadores de informação por completar']
    return {'html': html, 'hash': digest, 'signature': profile, 'missing': missing, 'attachments': attachments or [], 'signature_approved': bool(staff_profile)}
