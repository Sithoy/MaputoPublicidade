from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.catalog.models import Product, ProductVariant


class Cart(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="cart",
        verbose_name="utilizador",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "carrinho"
        verbose_name_plural = "carrinhos"

    def __str__(self):
        return f"Carrinho de {self.user.email}"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="carrinho",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="produto",
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.SET_NULL,
        related_name="cart_items",
        null=True,
        blank=True,
        verbose_name="variante",
    )
    description = models.CharField("descrição", max_length=255, blank=True)
    quantity = models.PositiveIntegerField("quantidade", default=1)
    size = models.CharField("tamanho", max_length=100, blank=True)
    material = models.CharField("material", max_length=100, blank=True)
    colors = models.CharField("cores", max_length=100, blank=True)
    needs_design = models.BooleanField("necessita de design", default=False)
    artwork_file = models.FileField(
        "ficheiro de arte", upload_to="cart/item_files/", blank=True, null=True
    )
    notes = models.TextField("observações", blank=True)
    position = models.PositiveSmallIntegerField("ordem", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "item do carrinho"
        verbose_name_plural = "itens do carrinho"
        ordering = ["position", "id"]

    def __str__(self):
        return f"{self.description or 'Item'} × {self.quantity}"


@receiver(post_save, sender=User)
def create_user_cart(sender, instance, created, **kwargs):
    if created:
        Cart.objects.get_or_create(user=instance)
