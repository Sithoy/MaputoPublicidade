"""Geometry regressions for short, detailed and multi-page proposals."""

from decimal import Decimal

import pymupdf
import pytest
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

from apps.core.documents import build_quote_pdf
from apps.quotes.models import QuoteItem


@pytest.mark.django_db
@pytest.mark.parametrize(
    "count,description_words,long_terms",
    [(1, 8, False), (10, 8, False), (30, 40, False), (1, 1000, False), (10, 8, True)],
)
def test_proposal_final_zone_and_content(quote, tmp_path, count, description_words, long_terms):
    quote.items.all().delete()
    quote.commercial_pricing = True
    quote.tax_rate = Decimal("16")
    quote.estimated_delivery_days = 7
    quote.terms = ("Condições acordadas com o cliente. " * 240 if long_terms else "Validade conforme indicada.") + " FIMTERMOS"
    quote.notes = "Observações de produção. " * (180 if long_terms else 1) + " FIMNOTAS"
    quote.final_price = Decimal(count * 200) * Decimal("1.16")
    for index in range(count):
        QuoteItem.objects.create(
            quote=quote,
            description=f"ARTIGO{index:03d} - Personalização com acabamento premium",
            # Detail belongs in the supported TextField, not the 255-character
            # title. PostgreSQL enforces that limit even though SQLite does not.
            notes="acabamento premium " * description_words + f" FIMARTIGO{index:03d}",
            quantity=2,
            unit_price=Decimal("100"),
        )
    data = build_quote_pdf(quote)
    (tmp_path / "proposal.pdf").write_bytes(data)
    with pymupdf.open(stream=data, filetype="pdf") as document:
        texts = [page.get_text() for page in document]
        combined = "\n".join(texts)
        assert combined.count("Total da proposta".upper()) == 1
        assert "TOTAL DA PROPOSTA" in texts[-1]
        assert "CONDIÇÕES COMERCIAIS" in texts[-1]
        assert "DADOS BANCÁRIOS" in texts[-1]
        assert "FIMTERMOS" in combined
        assert "FIMNOTAS" in combined
        for index in range(count):
            assert f"FIMARTIGO{index:03d}" in combined
        # Every final closing starts at the same A4 coordinate, regardless of
        # item count, wrapping, discounts or complementary conditions.
        subtotal = document[-1].search_for("Subtotal")[0]
        expected_top = A4[1] - (32 + 85) * mm
        assert abs(subtotal.y0 - (expected_top + 8)) < 5
        heading = document[-1].search_for("CONDIÇÕES COMERCIAIS")[0]
        bank_heading = document[-1].search_for("DADOS BANCÁRIOS")[0]
        assert abs(bank_heading.y0 - (expected_top + 44 * mm + 7)) < 5
        assert bank_heading.y0 == pytest.approx(heading.y0, abs=1)
        assert heading.x0 < bank_heading.x0
        if not long_terms:
            notes_heading = document[-1].search_for("OBSERVAÇÕES")[0]
            assert notes_heading.x0 < subtotal.x0
            assert abs(notes_heading.y0 - subtotal.y0) < 5
            assert notes_heading.y0 < heading.y0
        for page in document:
            for word in page.get_text("words"):
                assert word[0] >= 0 and word[2] <= A4[0] + 1
                assert word[1] >= 0 and word[3] <= A4[1]
                # Footer email/page number is intentionally below this region.
                assert word[3] < A4[1] - 30 * mm or word[1] > A4[1] - 18 * mm
        assert "Qtd." in combined
        if count == 1 and description_words == 8:
            assert len(document) == 1
        if count > 10 or description_words > 100:
            assert len(document) > 1
        document[-1].get_pixmap(matrix=pymupdf.Matrix(1, 1)).save(tmp_path / "last-page.png")
