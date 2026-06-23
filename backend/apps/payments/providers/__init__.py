from django.conf import settings

from .base import PaymentProvider
from .emola import EmolaProvider
from .mock import MockProvider
from .mpesa import MpesaProvider

PROVIDER_MAP = {
    PaymentProvider.MOCK: MockProvider,
    PaymentProvider.MPESA: MpesaProvider,
    PaymentProvider.EMOLA: EmolaProvider,
}


def get_provider() -> PaymentProvider:
    name = getattr(settings, "PAYMENT_PROVIDER", "mock").lower()
    provider_class = PROVIDER_MAP.get(name, MockProvider)
    return provider_class()
