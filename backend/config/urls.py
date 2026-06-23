"""URL configuration for Maputo Publicidade."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.core.views import AdminStatsView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("admin/", admin.site.urls),
    path("_allauth/", include("allauth.headless.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.portfolio.urls")),
    path("api/", include("apps.quotes.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.cart.urls")),
    path("api/", include("apps.payments.urls")),
]

if settings.DEBUG or settings.SERVE_MEDIA:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
