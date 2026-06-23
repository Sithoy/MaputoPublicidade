import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product, ProductVariant, ServiceCategory
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.quotes.models import ArtworkApproval, QuoteItem, QuoteRequest


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        username="client",
        email="client@example.com",
        password="testpass123",
        first_name="Cliente",
        last_name="Teste",
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staff",
        email="staff@example.com",
        password="testpass123",
        is_staff=True,
    )


@pytest.fixture
def authenticated_client(client_user):
    client = APIClient()
    client.force_authenticate(user=client_user)
    return client


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def category(db):
    return ServiceCategory.objects.create(name="Impressão Digital", slug="impressao-digital")


@pytest.fixture
def product(db, category):
    return Product.objects.create(
        name="Cartão de Visita",
        slug="cartao-de-visita",
        category=category,
        base_price="500.00",
        pricing_complexity=Product.PRICING_SIMPLE,
        is_active=True,
    )


@pytest.fixture
def product_variant(db, product):
    return ProductVariant.objects.create(
        product=product,
        name="Pack 100",
        price="4500.00",
        is_active=True,
    )


@pytest.fixture
def quote(db, client_user, product):
    quote = QuoteRequest.objects.create(
        user=client_user,
        client_name="Cliente Teste",
        client_email="client@example.com",
        client_phone="258841234567",
        urgency=QuoteRequest.URGENCY_NORMAL,
    )
    QuoteItem.objects.create(
        quote=quote,
        product=product,
        description="Cartão de Visita",
        quantity=2,
    )
    return quote


@pytest.fixture
def quoted_quote(db, quote):
    quote.final_price = "1000.00"
    quote.status = QuoteRequest.STATUS_QUOTED
    quote.save(update_fields=["final_price", "status"])
    return quote


@pytest.fixture
def order(db, client_user, quote):
    order = Order.objects.create(
        user=client_user,
        quote=quote,
        final_price="1000.00",
        status=Order.STATUS_APPROVED,
        delivery_method=Order.DELIVERY_PICKUP,
    )
    quote.status = QuoteRequest.STATUS_APPROVED
    quote.save(update_fields=["status"])
    return order


@pytest.fixture
def cart(db, client_user):
    return Cart.objects.get_or_create(user=client_user)[0]


@pytest.fixture
def cart_item(db, cart, product):
    return CartItem.objects.create(
        cart=cart,
        product=product,
        description="Cartão de Visita",
        quantity=1,
    )


@pytest.fixture
def payment(db, order):
    return Payment.objects.create(
        order=order,
        amount="500.00",
        method=Payment.METHOD_MPESA,
        phone_number="258841234567",
        status=Payment.STATUS_COMPLETED,
    )


@pytest.fixture
def artwork(db, quote):
    return ArtworkApproval.objects.create(quote=quote)


@pytest.fixture
def product_data():
    return {
        "client_name": "Novo Cliente",
        "client_email": "novo@example.com",
        "client_phone": "258849999999",
        "items": [
            {
                "product_slug": "cartao-de-visita",
                "description": "Cartão de Visita",
                "quantity": 1,
            }
        ],
    }
