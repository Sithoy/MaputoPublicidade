from django.contrib.auth.models import User
from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Package, Product, ServiceCategory
from apps.orders.models import Order
from apps.quotes.models import QuoteRequest

from .permissions import IsStaffUser


class HealthCheckView(APIView):
    """Lightweight health endpoint for deployment platforms."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        db_ok = True
        try:
            Order.objects.exists()
        except Exception:
            db_ok = False
        status_code = 200 if db_ok else 503
        return Response({"status": "ok" if db_ok else "error", "db": db_ok}, status=status_code)


class AdminStatsView(APIView):
    """Aggregated statistics for the admin dashboard."""

    permission_classes = [IsStaffUser]

    def get(self, request):
        now = timezone.now()
        last_30_days = now - timezone.timedelta(days=30)

        quotes = QuoteRequest.objects.all()
        orders = Order.objects.all()
        users = User.objects.all()
        products = Product.objects.all()

        quote_status_counts = dict(
            quotes.values("status").annotate(count=Count("id")).values_list("status", "count")
        )
        order_status_counts = dict(
            orders.values("status").annotate(count=Count("id")).values_list("status", "count")
        )
        payment_status_counts = dict(
            orders.values("payment_status")
            .annotate(count=Count("id"))
            .values_list("payment_status", "count")
        )

        quotes_total = quotes.count()
        orders_total = orders.count()
        non_cancelled_quotes = quotes.exclude(status=QuoteRequest.STATUS_CANCELLED).count()
        conversion_rate = 0
        if non_cancelled_quotes > 0:
            conversion_rate = round((orders_total / non_cancelled_quotes) * 100, 1)

        amount_due_sum = (
            orders.annotate(
                due=Coalesce("final_price", Value(0), output_field=DecimalField())
                - Coalesce("amount_paid", Value(0), output_field=DecimalField())
            )
            .aggregate(total=Sum("due"))["total"]
            or 0
        )

        data = {
            "quotes": {
                "total": quotes_total,
                "by_status": quote_status_counts,
                "new": quotes.filter(
                    status__in=[QuoteRequest.STATUS_RECEIVED, QuoteRequest.STATUS_REVIEWING]
                ).count(),
                "awaiting_approval": quotes.filter(status=QuoteRequest.STATUS_QUOTED).count(),
                "pending": quotes.exclude(
                    status__in=[QuoteRequest.STATUS_DELIVERED, QuoteRequest.STATUS_CANCELLED]
                ).count(),
                "last_30_days": quotes.filter(created_at__gte=last_30_days).count(),
            },
            "orders": {
                "total": orders_total,
                "by_status": order_status_counts,
                "by_payment_status": payment_status_counts,
                "pending": orders.exclude(
                    status__in=[Order.STATUS_DELIVERED, Order.STATUS_CANCELLED]
                ).count(),
                "last_30_days": orders.filter(created_at__gte=last_30_days).count(),
                "amount_paid_sum": orders.aggregate(Sum("amount_paid"))["amount_paid__sum"] or 0,
                "amount_due_sum": amount_due_sum,
            },
            "revenue": {
                "estimated_total": quotes.aggregate(Sum("estimated_price"))[
                    "estimated_price__sum"
                ]
                or 0,
                "final_total": quotes.aggregate(Sum("final_price"))["final_price__sum"] or 0,
                "estimated_last_30_days": quotes.filter(created_at__gte=last_30_days)
                .aggregate(Sum("estimated_price"))["estimated_price__sum"]
                or 0,
                "paid_total": orders.aggregate(Sum("amount_paid"))["amount_paid__sum"] or 0,
            },
            "conversion_rate": conversion_rate,
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
            "recent_activity": self._recent_activity(),
            "quotes_trend": self._daily_trend(quotes),
            "orders_trend": self._daily_trend(orders),
        }
        return Response(data)

    def _recent_activity(self):
        quotes = list(
            QuoteRequest.objects.order_by("-created_at").values(
                "reference", "status", "client_name", "created_at"
            )[:5]
        )
        orders = list(
            Order.objects.order_by("-created_at").values(
                "reference", "status", "user__email", "created_at"
            )[:5]
        )
        activity = []
        for q in quotes:
            activity.append(
                {
                    "type": "quote",
                    "reference": q["reference"],
                    "status": q["status"],
                    "client": q["client_name"],
                    "created_at": q["created_at"],
                }
            )
        for o in orders:
            activity.append(
                {
                    "type": "order",
                    "reference": o["reference"],
                    "status": o["status"],
                    "client": o["user__email"],
                    "created_at": o["created_at"],
                }
            )
        activity.sort(key=lambda x: x["created_at"], reverse=True)
        return activity[:10]

    def _daily_trend(self, queryset):
        now = timezone.now()
        start = now - timezone.timedelta(days=29)
        qs = (
            queryset.filter(created_at__gte=start)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        counts = {item["date"].strftime("%Y-%m-%d"): item["count"] for item in qs}
        data = []
        for i in range(30):
            day = (start + timezone.timedelta(days=i)).date()
            data.append({"date": day.strftime("%Y-%m-%d"), "count": counts.get(day.strftime("%Y-%m-%d"), 0)})
        return data
