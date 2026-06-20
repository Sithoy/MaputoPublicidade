from django.db import models
from django.utils.text import slugify

from apps.catalog.models import ServiceCategory


class PortfolioItem(models.Model):
    title = models.CharField("título", max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        related_name="portfolio_items",
        null=True,
        blank=True,
        verbose_name="categoria",
    )
    image = models.ImageField("imagem", upload_to="portfolio/", blank=True, null=True)
    description = models.TextField("descrição", blank=True)
    client_name = models.CharField("cliente", max_length=255, blank=True)
    completion_date = models.DateField("data de conclusão", null=True, blank=True)
    is_featured = models.BooleanField("em destaque", default=False)
    is_active = models.BooleanField("ativo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "item de portfólio"
        verbose_name_plural = "itens de portfólio"
        ordering = ["-is_featured", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            slug = base
            counter = 1
            while PortfolioItem.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
