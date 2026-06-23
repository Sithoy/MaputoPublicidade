from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.payments.models import Payment
from apps.payments.providers import get_provider


class MockProviderTests(TestCase):
    def test_initiate_completes_payment(self):
        provider = get_provider()
        user = User.objects.create_user("client", "client@test.com", "pass")
        order = Order.objects.create(user=user, final_price=1000)
        payment = Payment.objects.create(
            order=order,
            amount=order.amount_due,
            method=Payment.METHOD_MPESA,
            phone_number="258840000000",
            status=Payment.STATUS_PENDING,
        )
        result = provider.initiate(payment)
        payment.save()

        self.assertEqual(payment.provider, "mock")
        self.assertEqual(payment.status, Payment.STATUS_COMPLETED)
        self.assertEqual(result["output_ResponseCode"], "INS-0")
        self.assertTrue(payment.provider_transaction_id.startswith("MOCK-"))


class PaymentApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("client2", "client2@test.com", "pass")
        self.order = Order.objects.create(user=self.user, final_price=500)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_initiate_endpoint_with_mock_provider(self):
        response = self.client.post(
            reverse("payment-initiate"),
            {
                "order_reference": self.order.reference,
                "method": "mpesa",
                "phone_number": "258841234567",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["payment"]["status"], "completed")
        self.assertEqual(data["payment"]["provider"], "mock")

    @override_settings(PAYMENT_PROVIDER="mpesa")
    def test_mpesa_webhook_updates_payment(self):
        payment = Payment.objects.create(
            order=self.order,
            amount=500,
            method=Payment.METHOD_MPESA,
            phone_number="258841234567",
            status=Payment.STATUS_PENDING,
            provider="mpesa",
            provider_transaction_id="TX123",
        )
        response = self.client.post(
            reverse("mpesa-webhook"),
            {
                "output_TransactionID": "TX123",
                "output_ResponseCode": "INS-0",
                "output_ResponseDesc": "Approved",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.STATUS_COMPLETED)
