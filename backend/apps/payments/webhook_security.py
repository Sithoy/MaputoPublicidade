import hashlib
import hmac
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

SIGNATURE_HEADER = "X-Webhook-Signature"


def compute_webhook_signature(payload: bytes, secret: str) -> str:
    """Return HMAC-SHA256 hex signature for the given raw payload."""
    return hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()


def verify_webhook_signature(request) -> bool:
    """Verify the webhook signature header when a secret is configured.

    Returns ``True`` when:
    - no secret is configured (logs a warning and accepts the request), or
    - the provided ``X-Webhook-Signature`` header matches the computed HMAC.

    Returns ``False`` when a secret is configured but the signature is missing
    or invalid.
    """
    secret = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning(
            "PAYMENT_WEBHOOK_SECRET is not set; accepting webhook without signature verification. "
            "Configure a shared secret before enabling real payments."
        )
        return True

    provided = request.headers.get(SIGNATURE_HEADER)
    if not provided:
        logger.warning("Webhook rejected: missing %s header", SIGNATURE_HEADER)
        return False

    try:
        payload = request.body
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Webhook rejected: could not read request body: %s", exc)
        return False

    expected = compute_webhook_signature(payload, secret)
    if not hmac.compare_digest(expected, provided):
        logger.warning("Webhook rejected: invalid %s header", SIGNATURE_HEADER)
        return False

    return True
