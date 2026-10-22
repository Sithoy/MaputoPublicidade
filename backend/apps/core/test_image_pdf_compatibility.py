from io import BytesIO

import pymupdf
import pytest
from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas


@pytest.mark.parametrize('image_format, mode', [
    ('PNG', 'RGB'), ('PNG', 'RGBA'), ('JPEG', 'RGB'), ('WEBP', 'RGB'),
])
def test_uploaded_image_formats_can_be_decoded_and_embedded_in_pdf(image_format, mode):
    image_data = BytesIO()
    color = (0, 128, 64, 128) if mode == 'RGBA' else (0, 128, 64)
    Image.new(mode, (32, 24), color=color).save(image_data, format=image_format)
    content = image_data.getvalue()
    with Image.open(BytesIO(content)) as image:
        image.verify()
    with Image.open(BytesIO(content)) as image:
        image.load()
        assert image.size == (32, 24)

    pdf_data = BytesIO()
    canvas = Canvas(pdf_data, pagesize=(100, 100))
    canvas.drawImage(ImageReader(BytesIO(content)), 10, 10, width=64, height=48, mask='auto')
    canvas.save()
    with pymupdf.open(stream=pdf_data.getvalue(), filetype='pdf') as document:
        assert len(document) == 1
        assert document[0].get_images()
        rendered = document[0].get_pixmap()
        assert (rendered.width, rendered.height) == (100, 100)
