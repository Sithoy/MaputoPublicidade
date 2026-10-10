"""Generate local design samples only: no database connections or production writes."""
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
import fitz
from apps.core.documents import build_invoice_pdf, build_quote_pdf
from apps.core.pricing import document_totals


class Items(list):
    def all(self):
        return self


def main():
    root = Path(__file__).resolve().parents[2]
    final = root / 'output/pdf'
    temporary = root / 'tmp/pdfs/commercial-review'
    final.mkdir(parents=True, exist_ok=True)
    temporary.mkdir(parents=True, exist_ok=True)
    items = Items([SimpleNamespace(description=description, quantity=quantity, unit_price=Decimal(price), size=size, material=material, colors='Full color', notes=notes, line_total=quantity * Decimal(price)) for description, quantity, price, size, material, notes in [
        ('Produção de roll-ups institucionais', 2, '3500', '85 x 200 cm', 'Lona', 'Impressão e estrutura incluídas.'),
        ('Polos personalizados para equipa', 30, '850', 'S a XXL', 'Algodão', 'Bordado do logótipo no peito.'),
        ('Aplicação de vinil na recepção', 1, '6500', '300 x 120 cm', 'Vinil mate', 'Preparação da superfície incluída.'),
    ]])
    totals = document_totals(sum(item.line_total for item in items), 'percentage', discount_percentage=10, tax_rate=16)
    common = dict(client_name='Empresa Horizonte', client_company='', client_nuit='400123456', client_email='compras@example.com', client_phone='+258 84 123 4567', billing_address='Av. Eduardo Mondlane, Maputo', items=items, discount_type='percentage', discount_percentage=Decimal('10'), tax_rate=Decimal('16'), discount_amount=totals['discount_amount'], tax_amount=totals['tax_amount'], notes='Arte final sujeita à aprovação do cliente antes da produção.')
    quote = SimpleNamespace(**common, reference='MP-0001-2026', created_at=datetime(2026, 10, 10), valid_until=date(2026, 10, 25), estimated_delivery_days=10, payment_option='deposit_50', get_payment_option_display=lambda: '50% adiantado + 50% na entrega', terms='Entrega em Maputo incluída. Alterações após aprovação serão orçamentadas separadamente.', commercial_pricing=True, final_price=totals['total'], estimated_price=totals['total'])
    invoice = SimpleNamespace(**common, reference='FT-2026-0001', issue_date=date(2026, 10, 10), due_date=date(2026, 10, 25), currency='MZN', order=SimpleNamespace(reference='ORD-2026-0001'), subtotal=totals['subtotal'], total=totals['total'], amount_paid=totals['total'] / 2, terms='50% adiantado + 50% na entrega. Conforme proposta MP-0001-2026.')
    for kind, data in [('proposal', build_quote_pdf(quote)), ('invoice', build_invoice_pdf(invoice))]:
        path = final / f'maputo-publicidade-commercial-{kind}-preview.pdf'
        path.write_bytes(data)
        with fitz.open(stream=data, filetype='pdf') as pdf:
            for index, page in enumerate(pdf):
                page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(temporary / f'{kind}-{index + 1}.png')
            print(f'{path}: {len(pdf)} page(s)')

    # Multipage layout stress test stays in the temporary QA directory.
    extended_items = Items(items * 8)
    quote.items = extended_items
    invoice.items = extended_items
    extended_totals = document_totals(sum(item.line_total for item in extended_items), 'percentage', discount_percentage=10, tax_rate=16)
    for document in (quote, invoice):
        document.discount_amount = extended_totals['discount_amount']
        document.tax_amount = extended_totals['tax_amount']
    quote.final_price = quote.estimated_price = extended_totals['total']
    invoice.subtotal = extended_totals['subtotal']
    invoice.total = extended_totals['total']
    invoice.amount_paid = extended_totals['total'] / 2
    for kind, data in [('proposal', build_quote_pdf(quote)), ('invoice', build_invoice_pdf(invoice))]:
        with fitz.open(stream=data, filetype='pdf') as pdf:
            for index, page in enumerate(pdf):
                page.get_pixmap(matrix=fitz.Matrix(1, 1)).save(temporary / f'long-{kind}-{index + 1}.png')
            print(f'Multipage QA {kind}: {len(pdf)} page(s)')


if __name__ == '__main__':
    main()
