"""Shared commercial calculations. Discount precedes configured tax; never infer a tax rate."""

from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def document_totals(
    subtotal, discount_type="fixed", discount_amount=0, discount_percentage=0, tax_rate=0
):
    subtotal = Decimal(str(subtotal)).quantize(CENT, rounding=ROUND_HALF_UP)
    percentage = Decimal(str(discount_percentage))
    rate = Decimal(str(tax_rate))
    discount = Decimal(str(discount_amount))
    if (
        discount_type not in {"fixed", "percentage"}
        or not (0 <= percentage <= 100)
        or not (0 <= rate <= 100)
    ):
        raise ValueError("Indique percentagens entre 0 e 100 e um tipo de desconto válido.")
    if discount_type == "percentage":
        discount = (subtotal * percentage / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    if subtotal < 0 or discount < 0 or discount > subtotal:
        raise ValueError("O desconto não pode exceder o subtotal nem ser negativo.")
    taxable = subtotal - discount
    tax = (taxable * rate / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    if taxable + tax > Decimal("9999999999.99"):
        raise ValueError("O valor do documento excede o limite permitido.")
    return {
        "subtotal": subtotal,
        "discount_amount": discount,
        "tax_amount": tax,
        "total": taxable + tax,
    }
