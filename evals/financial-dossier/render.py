"""Renderização local do corpus; não consulta rede nem serviços."""
import json
import sys
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth

data = json.load(open(sys.argv[1], encoding="utf-8"))
canvas = Canvas(sys.argv[2], pagesize=A4, pageCompression=1, invariant=1)
canvas.setTitle(data["title"])
for page in data["pages"]:
    canvas.setFont("Helvetica", 10)
    y = A4[1] - 45
    for line in page["lines"]:
        if stringWidth(line, "Helvetica", 10) > A4[0] - 80 or y < 40:
            raise ValueError("Página excede área útil: " + str(page["page"]))
        canvas.drawString(40, y, line)
        y -= 16
    canvas.showPage()
canvas.save()
