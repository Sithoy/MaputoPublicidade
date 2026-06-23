import re
from abc import ABC, abstractmethod


class PaymentProvider(ABC):
    """Base interface for mobile-money payment providers."""

    MOCK = "mock"
    MPESA = "mpesa"
    EMOLA = "emola"

    @abstractmethod
    def initiate(self, payment) -> dict:
        """Send a payment request to the provider and return a normalized dict."""

    @abstractmethod
    def handle_webhook(self, payload: dict) -> dict | None:
        """Process an asynchronous provider callback and return update data or None."""

    def normalize_phone(self, phone: str, country_prefix: str = "258") -> str:
        digits = re.sub(r"\D", "", phone or "")
        if digits.startswith(country_prefix) and len(digits) == 12:
            return digits
        if digits.startswith("8") and len(digits) == 9:
            return f"{country_prefix}{digits}"
        if digits.startswith("+"):
            return digits[1:]
        if len(digits) == 9 and digits.startswith("7"):
            return f"{country_prefix}{digits}"
        return digits
