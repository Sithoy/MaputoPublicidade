"""Server-side A4 PDF generation for commercial documents (proposals, invoices).

Uses ReportLab only (pure Python) so it deploys without native dependencies.
"""

from datetime import date
from decimal import Decimal
from io import BytesIO

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
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
BRAND_DARK = colors.HexColor("#022D22")
BRAND_BRIGHT = colors.HexColor("#087B57")
BRAND_LIGHT = colors.HexColor("#EAF3EE")
PAPER_TINT = colors.HexColor("#F6F8F5")
INK = colors.HexColor("#17211D")
GREY_TEXT = colors.HexColor("#5B6B62")
GREY_LINE = colors.HexColor("#D9E2DC")
ACCENT = colors.HexColor("#D6A842")
GOLD_LIGHT = colors.HexColor("#FFF7E7")
GOLD_TEXT = colors.HexColor("#8A6828")

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


def _quantity(value) -> str:
    """Render decimal quantities without insignificant zeros or exponent notation."""
    amount = Decimal(str(value))
    if amount == amount.to_integral():
        return f"{amount:.0f}"
    return format(amount.normalize(), "f").rstrip("0").rstrip(".").replace(".", ",")


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
        "invoice_type": ParagraphStyle(
            "invoice_type", fontName="Helvetica-Bold", fontSize=9.5,
            textColor=colors.white, alignment=TA_RIGHT, leading=12,
        ),
        "invoice_ref": ParagraphStyle(
            "invoice_ref", fontName="Helvetica-Bold", fontSize=18,
            textColor=colors.white, alignment=TA_RIGHT, leading=22,
        ),
        "meta_label": ParagraphStyle(
            "meta_label", fontName="Helvetica-Bold", fontSize=6.8,
            textColor=GREY_TEXT, leading=8,
        ),
        "meta_value": ParagraphStyle(
            "meta_value", fontName="Helvetica-Bold", fontSize=9,
            textColor=INK, leading=12,
        ),
        "client_name": ParagraphStyle(
            "client_name", fontName="Helvetica-Bold", fontSize=12,
            textColor=INK, leading=15,
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


def _invoice_page(canvas, doc, company, reference=None):
    """Draw the branded page furniture behind an invoice's flowables."""
    canvas.saveState()
    width, height = A4

    # Layered top-right ribbons frame the invoice identity.
    top_shadow = canvas.beginPath()
    top_shadow.moveTo(74 * mm, height)
    top_shadow.lineTo(width, height)
    top_shadow.lineTo(width, height - 42 * mm)
    top_shadow.curveTo(
        width - 24 * mm,
        height - 31 * mm,
        width - 58 * mm,
        height - 38 * mm,
        width - 91 * mm,
        height - 36 * mm,
    )
    top_shadow.curveTo(94 * mm, height - 35 * mm, 91 * mm, height - 14 * mm, 74 * mm, height)
    top_shadow.close()
    canvas.setFillColor(BRAND_DARK)
    canvas.drawPath(top_shadow, fill=1, stroke=0)

    top_ribbon = canvas.beginPath()
    top_ribbon.moveTo(87 * mm, height)
    top_ribbon.lineTo(width, height)
    top_ribbon.lineTo(width, height - 34 * mm)
    top_ribbon.curveTo(
        width - 27 * mm,
        height - 25 * mm,
        width - 57 * mm,
        height - 31 * mm,
        width - 83 * mm,
        height - 29 * mm,
    )
    top_ribbon.curveTo(105 * mm, height - 28 * mm, 103 * mm, height - 10 * mm, 87 * mm, height)
    top_ribbon.close()
    canvas.setFillColor(BRAND_BRIGHT)
    canvas.drawPath(top_ribbon, fill=1, stroke=0)

    canvas.setFillColor(ACCENT)
    canvas.rect(width - 42 * mm, height - 2.2 * mm, 42 * mm, 2.2 * mm, fill=1, stroke=0)

    if reference and canvas.getPageNumber() > 1:
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawRightString(
            width - PAGE_MARGIN_X,
            height - 9 * mm,
            f"{reference}  |  CONTINUAÇÃO",
        )

    # Bottom waves carry contact information and anchor the page visually.
    bottom_shadow = canvas.beginPath()
    bottom_shadow.moveTo(0, 0)
    bottom_shadow.lineTo(width, 0)
    bottom_shadow.lineTo(width, 34 * mm)
    bottom_shadow.curveTo(width - 37 * mm, 43 * mm, width - 72 * mm, 20 * mm, 0, 25 * mm)
    bottom_shadow.close()
    canvas.setFillColor(BRAND_DARK)
    canvas.drawPath(bottom_shadow, fill=1, stroke=0)

    bottom_ribbon = canvas.beginPath()
    bottom_ribbon.moveTo(0, 0)
    bottom_ribbon.lineTo(width, 0)
    bottom_ribbon.lineTo(width, 27 * mm)
    bottom_ribbon.curveTo(width - 38 * mm, 36 * mm, width - 77 * mm, 14 * mm, 0, 20 * mm)
    bottom_ribbon.close()
    canvas.setFillColor(BRAND_BRIGHT)
    canvas.drawPath(bottom_ribbon, fill=1, stroke=0)

    accent_wave = canvas.beginPath()
    accent_wave.moveTo(0, 20 * mm)
    accent_wave.curveTo(width - 78 * mm, 14 * mm, width - 39 * mm, 36 * mm, width, 27 * mm)
    accent_wave.lineTo(width, 28.4 * mm)
    accent_wave.curveTo(width - 39 * mm, 37.4 * mm, width - 78 * mm, 15.4 * mm, 0, 21.4 * mm)
    accent_wave.close()
    canvas.setFillColor(ACCENT)
    canvas.drawPath(accent_wave, fill=1, stroke=0)

    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.white)
    contact = "  |  ".join(
        part
        for part in [company["phone"], company["email"], company["address"]]
        if part
    )
    canvas.drawString(PAGE_MARGIN_X, 8 * mm, contact)
    canvas.drawRightString(width - PAGE_MARGIN_X, 8 * mm, f"Página {canvas.getPageNumber()}")
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


def _invoice_header_block(styles, reference, company):
    left = []
    logo_path = company.get("logo_path")
    try:
        if logo_path:
            left.append(
                Image(
                    str(logo_path),
                    width=44 * mm,
                    height=16 * mm,
                    kind="proportional",
                )
            )
    except Exception:
        pass
    left.append(Spacer(1, 2.5 * mm))
    left.append(Paragraph(company["legal_name"], styles["body"]))
    if company.get("nuit"):
        left.append(Paragraph(f"NUIT {company['nuit']}", styles["small"]))
    left.append(Paragraph(company["address"], styles["small"]))
    if company.get("email"):
        left.append(Paragraph(company["email"], styles["small"]))

    right = [
        Paragraph("FATURA PROFORMA", styles["invoice_type"]),
        Spacer(1, 1.5 * mm),
        Paragraph(reference, styles["invoice_ref"]),
    ]

    table = Table([[left, right]], colWidths=[105 * mm, 73 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ]
        )
    )
    return table


def _invoice_meta_strip(styles, invoice):
    order_reference = invoice.order.reference if invoice.order else invoice.reference
    cells = [
        ("EMISSÃO", _date(invoice.issue_date)),
        ("VENCIMENTO", _date(invoice.due_date)),
        ("REFERÊNCIA", order_reference),
        ("MOEDA", invoice.currency),
    ]
    data = [
        [
            [
                Paragraph(label, styles["meta_label"]),
                Spacer(1, 1.2 * mm),
                Paragraph(value, styles["meta_value"]),
            ]
            for label, value in cells
        ]
    ]
    table = Table(data, colWidths=[44.5 * mm] * 4)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_TINT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("BOX", (0, 0), (-1, -1), 0.5, GREY_LINE),
                ("LINEAFTER", (0, 0), (-2, -1), 0.5, GREY_LINE),
            ]
        )
    )
    return table


def _invoice_client_card(styles, invoice):
    client_identity = [
        Paragraph("FATURADO A", styles["label"]),
        Spacer(1, 1.5 * mm),
        Paragraph(
            invoice.client_company or invoice.client_name,
            styles["client_name"],
        ),
    ]
    if invoice.client_company:
        client_identity.append(Paragraph(invoice.client_name, styles["body"]))

    client_details = [
        value
        for value in [
            f"NUIT {invoice.client_nuit}" if invoice.client_nuit else None,
            invoice.billing_address or None,
            invoice.client_email,
            invoice.client_phone,
        ]
        if value
    ]
    details = [Paragraph(value, styles["small"]) for value in client_details]

    table = Table([[client_identity, details]], colWidths=[94 * mm, 84 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FBFCFA")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("BOX", (0, 0), (-1, -1), 0.5, GREY_LINE),
                ("LINEBEFORE", (0, 0), (0, 0), 3, ACCENT),
            ]
        )
    )
    return table


def _client_block(styles, title, lines):
    content = [Paragraph(title.upper(), styles["label"])]
    content += [Paragraph(line, styles["body"]) for line in lines if line]
    return content


def _items_table(styles, rows):
    data = [["Nº", "Descrição", "Qtd.", "Preço unit.", "Total"]]
    for row in rows:
        data.append(row)
    table = Table(
        data,
        colWidths=[12 * mm, 80 * mm, 18 * mm, 34 * mm, 34 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_BRIGHT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("TEXTCOLOR", (0, 1), (-1, -1), INK),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FBFCFA")]),
                ("LINEAFTER", (0, 0), (-2, 0), 0.8, colors.white),
                ("LINEAFTER", (0, 1), (0, -1), 0.35, GREY_LINE),
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
        ("TEXTCOLOR", (0, emphasize), (-1, emphasize), colors.white),
        ("BACKGROUND", (0, emphasize), (-1, emphasize), BRAND_BRIGHT),
        ("TOPPADDING", (0, emphasize), (-1, emphasize), 8),
        ("BOTTOMPADDING", (0, emphasize), (-1, emphasize), 8),
    ]
    for index, row in enumerate(rows):
        if row[0] == "Em dívida":
            style += [
                ("BACKGROUND", (0, index), (-1, index), GOLD_LIGHT),
                ("TEXTCOLOR", (0, index), (-1, index), GOLD_TEXT),
                ("FONTNAME", (0, index), (-1, index), "Helvetica-Bold"),
            ]
    table.setStyle(TableStyle(style))
    return table


def _invoice_summary_block(styles, invoice, totals_rows, total_row_index):
    terms = invoice.terms or DEFAULT_INVOICE_TERMS
    details = [
        Paragraph("CONDIÇÕES DE PAGAMENTO", styles["section"]),
        Paragraph(terms.replace("\n", "<br/>"), styles["small"]),
    ]

    if invoice.notes:
        details.extend(
            [
                Spacer(1, 2 * mm),
                Paragraph("OBSERVAÇÕES", styles["section"]),
                Paragraph(invoice.notes.replace("\n", "<br/>"), styles["small"]),
            ]
        )

    details.extend(
        [
            Spacer(1, 4 * mm),
            Paragraph(
                "Obrigado pela sua confiança.",
                ParagraphStyle(
                    "invoice_thanks",
                    parent=styles["small"],
                    fontName="Helvetica-Bold",
                    textColor=INK,
                ),
            ),
        ]
    )

    table = Table(
        [[details, "", _totals_table(totals_rows, emphasize=total_row_index)]],
        colWidths=[92 * mm, 6 * mm, 80 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return table


def _build(
    filename,
    company,
    story,
    footer_extra_note=None,
    page_decorator=None,
    top_margin=PAGE_MARGIN_TOP,
    bottom_margin=PAGE_MARGIN_BOTTOM,
):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=PAGE_MARGIN_X,
        rightMargin=PAGE_MARGIN_X,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        title=filename,
        author=company["legal_name"],
    )
    decorate = page_decorator or _footer
    doc.build(
        story,
        onFirstPage=lambda c, d: decorate(c, d, company),
        onLaterPages=lambda c, d: decorate(c, d, company),
    )
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
    for index, item in enumerate(quote.items.all(), start=1):
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
                f"{index:02d}",
                Paragraph(details, styles["body"]),
                _quantity(item.quantity),
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

    story = [
        _invoice_header_block(styles, invoice.reference, company),
        Spacer(1, 5 * mm),
        _invoice_meta_strip(styles, invoice),
        Spacer(1, 5 * mm),
        _invoice_client_card(styles, invoice),
        Spacer(1, 6 * mm),
    ]

    rows = []
    for index, item in enumerate(invoice.items.all(), start=1):
        rows.append(
            [
                f"{index:02d}",
                Paragraph(item.description, styles["body"]),
                _quantity(item.quantity),
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
        totals_rows.append([f"IVA ({_quantity(invoice.tax_rate)}%)", _money(invoice.tax_amount)])
    totals_rows.append(["Total", _money(invoice.total)])
    total_row_index = len(totals_rows) - 1
    if invoice.amount_paid:
        totals_rows.append(["Pago", _money(invoice.amount_paid)])
    if invoice.balance_due:
        totals_rows.append(["Em dívida", _money(invoice.balance_due)])
    story.append(
        _invoice_summary_block(
            styles,
            invoice,
            totals_rows,
            total_row_index,
        )
    )

    return _build(
        f"Fatura-{invoice.reference}",
        company,
        story,
        page_decorator=lambda canvas, doc, company: _invoice_page(
            canvas,
            doc,
            company,
            invoice.reference,
        ),
        top_margin=16 * mm,
        bottom_margin=34 * mm,
    )
