import logging
import uuid

from apps.payments.models import Payment

from .base import PaymentProvider

logger = logging.getLogger(__name__)


class EmolaProvider(PaymentProvider):
    """E-Mola placeholder provider.

    Keeps the payment pending until a webhook callback updates it.
    When real E-Mola credentials are available this class can be swapped
    for a full HTTP implementation without touching the rest of the app.
    """

    def initiate(self, payment: Payment) -> dict:
        payment.provider = self.EMOLA
        payment.provider_transaction_id = f"EMOLA-{uuid.uuid4().hex[:12].upper()}"
        payment.status = Payment.STATUS_PENDING
        payment.reference_code = payment.provider_transaction_id
        payment.provider_payload = {
            "output_ResponseCode": "PENDING",
            "output_ResponseDesc": "E-Mola payment pending webhook confirmation",
            "output_TransactionID": payment.provider_transaction_id,
            "output_ThirdPartyReference": payment.correlation_id,
        }
        logger.info("E-Mola payment initiated: %s", payment.provider_transaction_id)
        return payment.provider_payload

    def handle_webhook(self, payload: dict) -> dict | None:
        tx_id = payload.get("transaction_id") or payload.get("output_TransactionID")
        correlation = payload.get("third_party_reference") or payload.get(
            "output_ThirdPartyReference"
        )
        status_code = payload.get("status") or payload.get("output_ResponseCode")

        status = Payment.STATUS_PENDING
        if status_code in ("SUCCESS", "INS-0", "completed", "success"):
            status = Payment.STATUS_COMPLETED
        elif status_code in ("FAILED", "INS-1", "failed"):
            status = Payment.STATUS_FAILED

        return {
            "provider_transaction_id": tx_id,
            "correlation_id": correlation,
            "status": status,
            "provider_payload": payload,
            "reference_code": tx_id,
        }
