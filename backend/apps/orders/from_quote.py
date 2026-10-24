"""Materialise the approved technical specification without changing payment state."""
import os

from .models import Order, OrderItem


def create_order_from_quote(
    quote,
    *,
    delivery_method=Order.DELIVERY_PICKUP,
    delivery_address="",
):
    order = Order.objects.create(
        user=quote.user,
        quote=quote,
        estimated_price=quote.estimated_price,
        final_price=quote.final_price,
        status=Order.STATUS_APPROVED,
        delivery_method=delivery_method,
        delivery_address=delivery_address,
    )

    for idx, quote_item in enumerate(quote.items.all()):
        order_item = OrderItem.objects.create(
            order=order,
            product=quote_item.product,
            product_variant=quote_item.product_variant,
            description=quote_item.description,
            quantity=quote_item.quantity,
            size=quote_item.size,
            material=quote_item.material,
            colors=quote_item.colors,
            needs_design=quote_item.needs_design,
            notes=quote_item.notes,
            material_briefing=quote_item.material_briefing,
            unit_price=quote_item.unit_price,
            position=idx,
        )
        if quote_item.artwork_file:
            filename = os.path.basename(quote_item.artwork_file.name)
            order_item.artwork_file.save(filename, quote_item.artwork_file, save=True)

    return order
