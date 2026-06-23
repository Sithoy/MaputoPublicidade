import os

from rest_framework import serializers, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.quotes.models import QuoteItem, QuoteRequest
from apps.quotes.serializers import QuoteRequestDetailSerializer

from .models import Cart, CartItem
from .serializers import (
    CartItemCreateUpdateSerializer,
    CartItemSerializer,
    CartSerializer,
)


class CartToQuoteSerializer(serializers.Serializer):
    client_name = serializers.CharField(required=True)
    client_email = serializers.EmailField(required=True)
    client_phone = serializers.CharField(required=False, allow_blank=True, default="")
    client_company = serializers.CharField(required=False, allow_blank=True, default="")
    urgency = serializers.ChoiceField(
        choices=QuoteRequest.URGENCY_CHOICES, required=False, default=QuoteRequest.URGENCY_NORMAL
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class CartDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CartConvertToQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartToQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart, _ = Cart.objects.get_or_create(user=request.user)
        if not cart.items.exists():
            return Response(
                {"detail": "O carrinho está vazio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quote = QuoteRequest.objects.create(
            user=request.user,
            status=QuoteRequest.STATUS_RECEIVED,
            **serializer.validated_data,
        )

        for cart_item in cart.items.all().order_by("position", "id"):
            quote_item = QuoteItem.objects.create(
                quote=quote,
                product=cart_item.product,
                product_variant=cart_item.product_variant,
                description=cart_item.description,
                quantity=cart_item.quantity,
                size=cart_item.size,
                material=cart_item.material,
                colors=cart_item.colors,
                needs_design=cart_item.needs_design,
                notes=cart_item.notes,
                position=cart_item.position,
            )
            if cart_item.artwork_file:
                quote_item.artwork_file.save(
                    os.path.basename(cart_item.artwork_file.name),
                    cart_item.artwork_file,
                    save=True,
                )

        cart.items.all().delete()
        output = QuoteRequestDetailSerializer(quote)
        return Response(output.data, status=status.HTTP_201_CREATED)


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def get_serializer_class(self):
        if self.action in ["retrieve", "list"]:
            return CartItemSerializer
        return CartItemCreateUpdateSerializer

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        position = cart.items.count()
        serializer.save(cart=cart, position=position)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        output = CartItemSerializer(serializer.instance)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        output = CartItemSerializer(instance)
        return Response(output.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
