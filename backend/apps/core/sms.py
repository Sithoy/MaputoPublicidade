import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _provider():
    return getattr(settings, "SMS_BACKEND", "none").lower()


def _normalize_phone(phone: str):
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("258") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("8") and len(digits) == 9:
        return f"+258{digits}"
    if digits.startswith("+258"):
        return digits
    return f"+258{digits}"


def _send_console(phone, message):
    logger.info("[SMS to %s] %s", phone, message)


def send_sms(phone, message):
    if not phone or not message:
        return
    phone = _normalize_phone(phone)
    provider = _provider()
    if provider in ("none", "console"):
        _send_console(phone, message)
    elif provider == "africastalking":
        _send_africas_talking(phone, message)
    elif provider == "twilio":
        _send_twilio(phone, message)
    else:
        _send_console(phone, message)


def _send_africas_talking(phone, message):
    try:
        import africastalking  # noqa: I900
    except ImportError:
        logger.warning("africastalking not installed; falling back to console SMS")
        return _send_console(phone, message)

    username = getattr(settings, "AFRICASTALKING_USERNAME", "sandbox")
    api_key = getattr(settings, "AFRICASTALKING_API_KEY", "")
    sender = getattr(settings, "SMS_FROM", None)
    africastalking.initialize(username, api_key)
    sms = africastalking.SMS
    try:
        kwargs = {"message": message, "to_": [phone]}
        if sender:
            kwargs["from_"] = sender
        sms.send(**kwargs)
    except Exception:
        logger.exception("Africa's Talking SMS failed to %s", phone)


def _send_twilio(phone, message):
    try:
        from twilio.rest import Client  # noqa: I900
    except ImportError:
        logger.warning("twilio not installed; falling back to console SMS")
        return _send_console(phone, message)

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    sender = getattr(settings, "TWILIO_PHONE_NUMBER", "")
    if not all([account_sid, auth_token, sender]):
        logger.warning("Twilio credentials missing; falling back to console SMS")
        return _send_console(phone, message)
    client = Client(account_sid, auth_token)
    try:
        client.messages.create(body=message, from_=sender, to=phone)
    except Exception:
        logger.exception("Twilio SMS failed to %s", phone)
