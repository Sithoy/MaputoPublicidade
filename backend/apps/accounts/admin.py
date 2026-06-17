from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import ClientProfile


class ClientProfileInline(admin.StackedInline):
    model = ClientProfile
    can_delete = False
    verbose_name_plural = "perfil"


class UserAdmin(BaseUserAdmin):
    inlines = [ClientProfileInline]
    list_display = ["username", "email", "first_name", "last_name", "is_staff", "date_joined"]
    list_filter = ["is_staff", "is_superuser", "is_active", "date_joined"]
    search_fields = ["username", "email", "first_name", "last_name"]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "company", "phone", "nuit", "created_at"]
    search_fields = ["user__username", "user__email", "company", "phone", "nuit"]
    list_filter = ["created_at"]
