import base64
import logging
import textwrap

from django.conf import settings

from apps.payments.models import Payment

from .base import PaymentProvider

logger = logging.getLogger(__name__)


def _get_token(api_key: str, public_key: str) -> str:
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import padding
    except ImportError as exc:
        raise RuntimeError("cryptography is required for M-Pesa token generation") from exc

    pem = "-----BEGIN PUBLIC KEY-----\n"
    pem += textwrap.fill(public_key.strip(), width=60)
    pem += "\n-----END PUBLIC KEY-----"
    key = serialization.load_pem_public_key(pem.encode())
    encrypted = key.encrypt(api_key.encode(), padding.PKCS1v15())
    return base64.b64encode(encrypted).decode()


class MpesaProvider(PaymentProvider):
    """Vodacom M-Pesa Mozambique OpenAPI provider (C2B single stage)."""

    ENDPOINTS = {
        "c2b": "/ipg/v1x/c2bPayment/singleStage/",
        "query": "/ipg/v1x/queryTransactionStatus/",
        "reversal": "/ipg/v1x/reversal/",
        "b2c": "/ipg/v1x/b2cPayment/",
        "b2b": "/ipg/v1x/b2bPayment/",
        "customer_name": "/ipg/v1x/queryCustomerName/",
    }
    PORTS = {
        "c2b": 18352,
        "query": 18353,
        "reversal": 18354,
        "b2c": 18345,
        "b2b": 18349,
        "customer_name": 19323,
    }

    def __init__(self):
        self.api_key = getattr(settings, "MPESA_API_KEY", "")
        self.public_key = getattr(settings, "MPESA_PUBLIC_KEY", "")
        self.service_provider_code = getattr(
            settings, "MPESA_SERVICE_PROVIDER_CODE", ""
        )
        self.environment = getattr(settings, "MPESA_ENVIRONMENT", "sandbox").lower()
        self.origin = getattr(settings, "MPESA_ORIGIN", "developer.mpesa.vm.co.mz")
        self.callback_url = getattr(settings, "MPESA_CALLBACK_URL", "")
        self.base_url = (
            "https://api.sandbox.vm.co.mz"
            if self.environment != "production"
            else "https://api.vm.co.mz"
        )
        self.timeout = 45

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {_get_token(self.api_key, self.public_key)}",
            "origin": self.origin,
        }

    def _request(self, operation: str, method: str, payload: dict) -> dict:
        port = self.PORTS[operation]
        path = self.ENDPOINTS[operation]
        try:
            import requests  # noqa: I900
        except ImportError as exc:
            raise RuntimeError("requests is required for M-Pesa integration") from exc

        url = f"{self.base_url}:{port}{path}"
        verify = self.environment == "production"
        try:
            if method.upper() == "GET":
                response = requests.get(
                    url, headers=self._headers(), params=payload, timeout=self.timeout, verify=verify
                )
            else:
                response = requests.request(
                    method.upper(), url, headers=self._headers(), json=payload, timeout=self.timeout, verify=verify
                )
        except requests.RequestException as exc:
            logger.exception("M-Pesa request failed: %s", url)
            raise RuntimeError(f"Falha de comunicação com M-Pesa: {exc}") from exc

        try:
            data = response.json()
        except ValueError:
            data = {"raw": response.text}
        data["_http_status"] = response.status_code
        return data

    def initiate(self, payment: Payment) -> dict:
        if not all([self.api_key, self.public_key, self.service_provider_code]):
            raise RuntimeError("M-Pesa credentials are not configured")

        msisdn = self.normalize_phone(payment.phone_number)
        amount = f"{payment.amount:.2f}"
        reference = payment.order.reference or payment.correlation_id
        third_party_ref = payment.correlation_id

        payload = {
            "input_TransactionReference": reference,
            "input_CustomerMSISDN": msisdn,
            "input_Amount": amount,
            "input_ThirdPartyReference": third_party_ref,
            "input_ServiceProviderCode": self.service_provider_code,
        }
        if self.callback_url:
            payload["input_CallbackURL"] = self.callback_url

        payment.provider = self.MPESA
        result = self._request("c2b", "POST", payload)
        payment.provider_payload = result
        payment.provider_transaction_id = result.get(
            "output_TransactionID", result.get("output_ConversationID", "")
        )
        payment.reference_code = result.get("output_TransactionID", "")

        if result.get("output_ResponseCode") == "INS-0":
            payment.status = Payment.STATUS_COMPLETED
        else:
            payment.status = Payment.STATUS_PENDING
        return result

    def query_status(self, payment: Payment) -> dict:
        if not payment.provider_transaction_id:
            raise RuntimeError("No provider transaction ID to query")
        payload = {
            "input_ThirdPartyReference": payment.correlation_id,
            "input_QueryReference": payment.provider_transaction_id,
            "input_ServiceProviderCode": self.service_provider_code,
        }
        return self._request("query", "GET", payload)

    def handle_webhook(self, payload: dict) -> dict | None:
        tx_id = payload.get("output_TransactionID") or payload.get("transaction_id")
        correlation = payload.get("output_ThirdPartyReference")
        code = payload.get("output_ResponseCode") or payload.get("responseCode") or ""
        desc = payload.get("output_ResponseDesc") or payload.get("responseDesc") or ""

        status = Payment.STATUS_PENDING
        if code == "INS-0":
            status = Payment.STATUS_COMPLETED
        elif code and code != "INS-0":
            status = Payment.STATUS_FAILED

        return {
            "provider_transaction_id": tx_id,
            "correlation_id": correlation,
            "status": status,
            "provider_payload": payload,
            "reference_code": tx_id,
        }
