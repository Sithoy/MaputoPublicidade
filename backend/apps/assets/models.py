from django.contrib.auth.models import User
from django.db import models


class BrandAsset(models.Model):
    """A reusable brand file a client stores with MP — logos, approved
    artwork, templates, brand guides — so future jobs start faster."""

    KIND_LOGO = "logo"
    KIND_ARTWORK = "artwork"
    KIND_TEMPLATE = "template"
    KIND_GUIDE = "guide"
    KIND_DOCUMENT = "document"
    KIND_OTHER = "other"
    KIND_CHOICES = [
        (KIND_LOGO, "Logótipo"),
        (KIND_ARTWORK, "Arte aprovada"),
        (KIND_TEMPLATE, "Modelo reutilizável"),
        (KIND_GUIDE, "Guia de marca"),
        (KIND_DOCUMENT, "Documento"),
        (KIND_OTHER, "Outro"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="brand_assets",
        verbose_name="cliente",
    )
    name = models.CharField("nome", max_length=255)
    kind = models.CharField(
        "tipo", max_length=20, choices=KIND_CHOICES, default=KIND_OTHER
    )
    file = models.FileField("ficheiro", upload_to="uploads/brand_assets/")
    description = models.TextField("descrição", blank=True)
    brand_colors = models.CharField(
        "cores da marca",
        max_length=255,
        blank=True,
        help_text="Códigos hex separados por vírgula, ex.: #063F2B, #F4F0E8",
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="uploaded_brand_assets",
        null=True,
        blank=True,
        verbose_name="carregado por",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "material de marca"
        verbose_name_plural = "materiais de marca"
        ordering = ["kind", "name"]
        indexes = [models.Index(fields=["user", "kind"])]

    def __str__(self):
        return f"{self.name} ({self.get_kind_display()})"
