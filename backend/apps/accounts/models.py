from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class ClientProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )
    company = models.CharField("empresa", max_length=255, blank=True)
    phone = models.CharField("telefone", max_length=50, blank=True)
    nuit = models.CharField("NUIT", max_length=50, blank=True)
    address = models.TextField("endereço", blank=True)
    billing_address = models.TextField("morada de faturação", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil de cliente"
        verbose_name_plural = "perfis de clientes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} — {self.company or 'Particular'}"


@receiver(post_save, sender=User)
def create_client_profile(sender, instance, created, **kwargs):
    if created:
        ClientProfile.objects.get_or_create(user=instance)
