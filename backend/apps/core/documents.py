"""Server-side A4 PDF generation for commercial documents (proposals, invoices).

Uses ReportLab only (pure Python) so it deploys without native dependencies.
"""

from datetime import date
from decimal import Decimal
from io import BytesIO

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

BRAND = colors.HexColor("#063F2B")
BRAND_LIGHT = colors.HexColor("#EAF3EE")
GREY_TEXT = colors.HexColor("#5B6B62")
GREY_LINE = colors.HexColor("#D9E2DC")

PAGE_MARGIN_X = 16 * mm
PAGE_MARGIN_TOP = 16 * mm
PAGE_MARGIN_BOTTOM = 20 * mm

DEFAULT_QUOTE_TERMS = (
    "Esta proposta está sujeita à confirmação de disponibilidade, "
    "especificações finais e aprovação do cliente. Valores em Meticais (MZN), "
    "com IVA incluído à taxa legal em vigor, quando aplicável."
)

DEFAULT_INVOICE_TERMS = (
    "Pagamento por transferência bancária, M-Pesa ou E-Mola. "
    "Este documento não substitui a fatura certificada nos termos legais."
)


def _money(value) -> str:
    if value is None:
        return "—"
    amount = Decimal(str(value)).quantize(Decimal("0.01"))
    integer, _, cents = f"{amount:.2f}".partition(".")
    grouped = f"{int(integer):,}".replace(",", " ")
    return f"{grouped},{cents} MZN"


def _date(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        value = date.fromisoformat(value[:10])
    return value.strftime("%d/%m/%Y")


def _styles():
    return {
        "doc_type": ParagraphStyle(
            "doc_type", fontName="Helvetica-Bold", fontSize=16, textColor=BRAND,
            alignment=TA_RIGHT, spaceAfter=2,
        ),
        "doc_ref": ParagraphStyle(
            "doc_ref", fontName="Helvetica-Bold", fontSize=11,
            textColor=colors.HexColor("#1A2B23"), alignment=TA_RIGHT,
        ),
        "meta": ParagraphStyle(
            "meta", fontName="Helvetica", fontSize=9, textColor=GREY_TEXT,
            alignment=TA_RIGHT, leading=13,
        ),
        "label": ParagraphStyle(
            "label", fontName="Helvetica-Bold", fontSize=8, textColor=GREY_TEXT,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=9.5, leading=13.5,
            textColor=colors.HexColor("#1A2B23"),
        ),
        "small": ParagraphStyle(
            "small", fontName="Helvetica", fontSize=8.5, leading=12,
            textColor=GREY_TEXT,
        ),
        "section": ParagraphStyle(
            "section", fontName="Helvetica-Bold", fontSize=9, textColor=BRAND,
            spaceBefore=6, spaceAfter=3,
        ),
    }


def _footer(canvas, doc, company):
    canvas.saveState()
    width, _ = A4
    y = 14 * mm
    canvas.setStrokeColor(GREY_LINE)
    canvas.setLineWidth(0.5)
    canvas.line(PAGE_MARGIN_X, y + 5 * mm, width - PAGE_MARGIN_X, y + 5 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GREY_TEXT)
    contact = " · ".join(
        part
        for part in [company["legal_name"], company["address"], company["email"], company["phone"]]
        if part
    )
    canvas.drawString(PAGE_MARGIN_X, y, contact)
    canvas.drawRightString(
        width - PAGE_MARGIN_X, y, f"Página {canvas.getPageNumber()}"
    )
    canvas.restoreState()


def _header_block(styles, doc_title, reference, meta_rows, company):
    left = []
    logo_path = company.get("logo_path")
    try:
        if logo_path:
            left.append(Image(str(logo_path), width=42 * mm, height=15 * mm, kind="proportional"))
    except Exception:
        pass
    left.append(Spacer(1, 3 * mm))
    left.append(Paragraph(company["legal_name"], styles["body"]))
    if company.get("nuit"):
        left.append(Paragraph(f"NUIT: {company['nuit']}", styles["small"]))
    left.append(Paragraph(company["address"], styles["small"]))

    right = [Paragraph(doc_title, styles["doc_type"]), Paragraph(reference, styles["doc_ref"]), Spacer(1, 2 * mm)]
    right.append(Paragraph("<br/>".join(meta_rows), styles["meta"]))

    table = Table([[left, right]], colWidths=[100 * mm, 78 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("LINEBELOW", (0, 0), (-1, -1), 1.2, BRAND),
            ]
        )
    )
    return table


def _client_block(styles, title, lines):
    content = [Paragraph(title.upper(), styles["label"])]
    content += [Paragraph(line, styles["body"]) for line in lines if line]
    return content


def _items_table(styles, rows):
    data = [["Descrição", "Qtd.", "Preço unit.", "Total"]]
    for row in rows:
        data.append(row)
    table = Table(
        data,
        colWidths=[92 * mm, 18 * mm, 34 * mm, 34 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 1), (-1, -2), 0.4, GREY_LINE),
                ("LINEBELOW", (0, -1), (-1, -1), 0.8, BRAND),
            ]
        )
    )
    return table


def _totals_table(rows, emphasize=-1):
    table = Table(rows, colWidths=[40 * mm, 40 * mm], hAlign="RIGHT")
    style = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (0, -1), GREY_TEXT),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    # Emphasise the grand total row.
    style += [
        ("FONTNAME", (0, emphasize), (-1, emphasize), "Helvetica-Bold"),
        ("FONTSIZE", (0, emphasize), (-1, emphasize), 11.5),
        ("TEXTCOLOR", (0, emphasize), (-1, emphasize), BRAND),
        ("BACKGROUND", (0, emphasize), (-1, emphasize), BRAND_LIGHT),
        ("LINEABOVE", (0, emphasize), (-1, emphasize), 0.8, BRAND),
    ]
    table.setStyle(TableStyle(style))
    return table


def _build(filename, company, story, footer_extra_note=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=PAGE_MARGIN_X,
        rightMargin=PAGE_MARGIN_X,
        topMargin=PAGE_MARGIN_TOP,
        bottomMargin=PAGE_MARGIN_BOTTOM,
        title=filename,
        author=company["legal_name"],
    )
    doc.build(story, onFirstPage=lambda c, d: _footer(c, d, company), onLaterPages=lambda c, d: _footer(c, d, company))
    return buffer.getvalue()


def build_quote_pdf(quote) -> bytes:
    company = settings.COMPANY_PROFILE
    styles = _styles()

    meta = [f"Data: {_date(quote.created_at)}"]
    if quote.valid_until:
        meta.append(f"Válida até: {_date(quote.valid_until)}")
    meta.append("Moeda: MZN")

    story = [
        _header_block(styles, "PROPOSTA COMERCIAL", quote.reference, meta, company),
        Spacer(1, 7 * mm),
    ]

    client_lines = [
        quote.client_company or quote.client_name,
        quote.client_name if quote.client_company else None,
        quote.client_email,
        quote.client_phone,
    ]
    story += _client_block(styles, "Preparado para", client_lines)
    story.append(Spacer(1, 6 * mm))

    rows = []
    items_subtotal = Decimal("0")
    has_unit_prices = True
    for item in quote.items.all():
        unit = item.unit_price
        if unit is None:
            has_unit_prices = False
        else:
            items_subtotal += Decimal(str(unit)) * item.quantity
        details = item.description or "Serviço"
        specs = " · ".join(p for p in [item.size, item.material, item.colors] if p)
        if specs:
            details = f"{details}<br/><font size='8' color='#5B6B62'>{specs}</font>"
        rows.append(
            [
                Paragraph(details, styles["body"]),
                str(item.quantity),
                _money(unit) if unit is not None else "A definir",
                _money(Decimal(str(unit)) * item.quantity) if unit is not None else "—",
            ]
        )
    story.append(_items_table(styles, rows))
    story.append(Spacer(1, 4 * mm))

    total = quote.final_price or quote.estimated_price or (items_subtotal if has_unit_prices else None)
    totals_rows = []
    if has_unit_prices and quote.final_price is not None and items_subtotal != quote.final_price:
        totals_rows.append(["Subtotal", _money(items_subtotal)])
    totals_rows.append(["Total da proposta", _money(total)])
    story.append(_totals_table(totals_rows))

    terms = quote.terms or DEFAULT_QUOTE_TERMS
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("CONDIÇÕES", styles["section"]))
    story.append(Paragraph(terms.replace("\n", "<br/>"), styles["small"]))

    if quote.notes:
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph("OBSERVAÇÕES", styles["section"]))
        story.append(Paragraph(quote.notes.replace("\n", "<br/>"), styles["small"]))

    return _build(f"Proposta-{quote.reference}", company, story)


def build_invoice_pdf(invoice) -> bytes:
    company = settings.COMPANY_PROFILE
    styles = _styles()

    meta = [
        f"Emissão: {_date(invoice.issue_date)}",
        f"Vencimento: {_date(invoice.due_date)}",
        f"Estado: {invoice.get_status_display()}",
    ]
    if invoice.order:
        meta.append(f"Encomenda: {invoice.order.reference}")

    story = [
        _header_block(styles, "FATURA PROFORMA", invoice.reference, meta, company),
        Spacer(1, 7 * mm),
    ]

    client_lines = [
        invoice.client_company or invoice.client_name,
        invoice.client_name if invoice.client_company else None,
        f"NUIT: {invoice.client_nuit}" if invoice.client_nuit else None,
        invoice.billing_address or None,
        invoice.client_email,
        invoice.client_phone,
    ]
    story += _client_block(styles, "Faturado a", client_lines)
    story.append(Spacer(1, 6 * mm))

    rows = []
    for item in invoice.items.all():
        rows.append(
            [
                Paragraph(item.description, styles["body"]),
                f"{item.quantity.normalize()}" if item.quantity == item.quantity.to_integral() else str(item.quantity),
                _money(item.unit_price),
                _money(item.line_total),
            ]
        )
    story.append(_items_table(styles, rows))
    story.append(Spacer(1, 4 * mm))

    totals_rows = [["Subtotal", _money(invoice.subtotal)]]
    if invoice.discount_amount:
        totals_rows.append(["Desconto", f"-{_money(invoice.discount_amount)}"])
    if invoice.tax_rate:
        totals_rows.append([f"IVA ({invoice.tax_rate.normalize()}%)", _money(invoice.tax_amount)])
    totals_rows.append(["Total", _money(invoice.total)])
    total_row_index = len(totals_rows) - 1
    if invoice.amount_paid:
        totals_rows.append(["Pago", _money(invoice.amount_paid)])
    if invoice.balance_due:
        totals_rows.append(["Em dívida", _money(invoice.balance_due)])
    story.append(_totals_table(totals_rows, emphasize=total_row_index))

    terms = invoice.terms or DEFAULT_INVOICE_TERMS
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("CONDIÇÕES DE PAGAMENTO", styles["section"]))
    story.append(Paragraph(terms.replace("\n", "<br/>"), styles["small"]))

    if invoice.notes:
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph("OBSERVAÇÕES", styles["section"]))
        story.append(Paragraph(invoice.notes.replace("\n", "<br/>"), styles["small"]))

    return _build(f"Fatura-{invoice.reference}", company, story)
