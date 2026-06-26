from django.db import models
from django.utils.text import slugify


class ServiceCategory(models.Model):
    name = models.CharField("nome", max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    icon_name = models.CharField(
        "nome do ícone",
        max_length=100,
        blank=True,
        help_text="Identificador do ícone usado no frontend (ex: Printer, Shirt, Car).",
    )
    short_description = models.CharField("descrição curta", max_length=255, blank=True)
    description = models.TextField("descrição", blank=True)
    image = models.ImageField("imagem", upload_to="categories/", blank=True, null=True)
    image_data_url = models.TextField("imagem embutida", blank=True)
    display_order = models.PositiveSmallIntegerField("ordem", default=0)
    is_active = models.BooleanField("ativo", default=True)

    class Meta:
        verbose_name = "categoria de serviço"
        verbose_name_plural = "categorias de serviços"
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    PRICING_SIMPLE = "simple"
    PRICING_COMPLEX = "complex"
    PRICING_CHOICES = [
        (PRICING_SIMPLE, "Simples (preço base por unidade)"),
        (PRICING_COMPLEX, "Complexo (requer orçamento manual)"),
    ]

    name = models.CharField("nome", max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
        verbose_name="categoria",
    )
    description = models.TextField("descrição", blank=True)
    image = models.ImageField("imagem", upload_to="products/", blank=True, null=True)
    image_data_url = models.TextField("imagem embutida", blank=True)
    materials = models.JSONField(
        "materiais",
        default=list,
        blank=True,
        help_text='Lista de materiais disponíveis (ex: ["Algodão", "Poliéster"]).',
    )
    sizes = models.JSONField(
        "tamanhos",
        default=list,
        blank=True,
        help_text='Lista de tamanhos disponíveis (ex: ["A4", "A3", "M"]).',
    )
    min_quantity = models.PositiveIntegerField("quantidade mínima", default=1)
    lead_time = models.CharField("prazo estimado", max_length=100, blank=True)
    base_price = models.DecimalField(
        "preço base", max_digits=12, decimal_places=2, null=True, blank=True
    )
    pricing_complexity = models.CharField(
        "tipo de precificação",
        max_length=20,
        choices=PRICING_CHOICES,
        default=PRICING_SIMPLE,
    )
    is_featured = models.BooleanField("em destaque", default=False)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "produto"
        verbose_name_plural = "produtos"
        ordering = ["-is_featured", "name"]

    def __str__(self):
        return self.name

    @property
    def starting_price(self):
        active_variants = self.variants.filter(is_active=True)
        if active_variants.exists():
            return min(v.price for v in active_variants)
        return self.base_price

    @property
    def has_variants(self):
        return self.variants.filter(is_active=True).exists()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name="produto",
    )
    name = models.CharField("nome da variante", max_length=255)
    sku = models.CharField("SKU", max_length=100, blank=True)
    price = models.DecimalField("preço", max_digits=12, decimal_places=2)
    image = models.ImageField("imagem", upload_to="variants/", blank=True, null=True)
    image_data_url = models.TextField("imagem embutida", blank=True)
    position = models.PositiveIntegerField("ordem", default=0)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "variante de produto"
        verbose_name_plural = "variantes de produtos"
        ordering = ["position", "name"]

    def __str__(self):
        return f"{self.product.name} — {self.name}"


class Package(models.Model):
    name = models.CharField("nome", max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField("descrição", blank=True)
    price = models.DecimalField("preço", max_digits=12, decimal_places=2)
    items = models.JSONField(
        "itens incluídos",
        default=list,
        blank=True,
        help_text="Lista de itens incluídos no pacote.",
    )
    image = models.ImageField("imagem", upload_to="packages/", blank=True, null=True)
    image_data_url = models.TextField("imagem embutida", blank=True)
    target_audience = models.CharField(
        "público-alvo", max_length=255, blank=True
    )
    is_recurring = models.BooleanField("recorrente", default=False)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pacote"
        verbose_name_plural = "pacotes"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
