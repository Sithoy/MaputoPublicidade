from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Package, Product, ServiceCategory
from apps.quotes.models import QuoteRequest

from .permissions import IsStaffUser


class HealthCheckView(APIView):
    """Lightweight health endpoint for deployment platforms."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class AdminStatsView(APIView):
    """Aggregated statistics for the admin dashboard."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        now = timezone.now()
        last_30_days = now - timezone.timedelta(days=30)

        quotes = QuoteRequest.objects.all()
        users = User.objects.all()
        products = Product.objects.all()

        status_counts = {
            status: quotes.filter(status=status).count()
            for status, _ in QuoteRequest.STATUS_CHOICES
        }

        data = {
            "quotes": {
                "total": quotes.count(),
                "by_status": status_counts,
                "pending": quotes.exclude(
                    status__in=[QuoteRequest.STATUS_DELIVERED]
                ).count(),
                "last_30_days": quotes.filter(created_at__gte=last_30_days).count(),
            },
            "revenue": {
                "estimated_total": quotes.aggregate(Sum("estimated_price"))[
                    "estimated_price__sum"
                ]
                or 0,
                "final_total": quotes.aggregate(Sum("final_price"))["final_price__sum"]
                or 0,
                "estimated_last_30_days": quotes.filter(created_at__gte=last_30_days)
                .aggregate(Sum("estimated_price"))["estimated_price__sum"]
                or 0,
            },
            "products": {
                "total": products.count(),
                "active": products.filter(is_active=True).count(),
                "inactive": products.filter(is_active=False).count(),
                "featured": products.filter(is_featured=True).count(),
            },
            "catalog": {
                "categories": ServiceCategory.objects.count(),
                "packages": Package.objects.count(),
            },
            "users": {
                "total": users.count(),
                "staff": users.filter(is_staff=True).count(),
                "active": users.filter(is_active=True).count(),
                "inactive": users.filter(is_active=False).count(),
            },
        }
        return Response(data)
