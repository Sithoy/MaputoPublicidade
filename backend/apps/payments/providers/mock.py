import uuid

from apps.payments.models import Payment

from .base import PaymentProvider


class MockProvider(PaymentProvider):
    """Provider that always succeeds immediately — useful for local tests."""

    def initiate(self, payment: Payment) -> dict:
        payment.provider = self.MOCK
        payment.provider_transaction_id = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        payment.status = Payment.STATUS_COMPLETED
        payment.reference_code = payment.provider_transaction_id
        payment.provider_payload = {
            "output_ResponseCode": "INS-0",
            "output_ResponseDesc": "Mock request processed successfully",
            "output_TransactionID": payment.provider_transaction_id,
            "output_ConversationID": uuid.uuid4().hex,
            "output_ThirdPartyReference": payment.correlation_id,
        }
        return payment.provider_payload

    def handle_webhook(self, payload: dict) -> dict | None:
        return None
