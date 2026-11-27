"""Originais sinteticos, QA e compilacao; bibliotecas locais, sem rede."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader, PdfWriter
from PIL import Image, ImageDraw

source = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)
documents = json.loads(source.read_text(encoding="utf8"))
qa = out / "qa"
qa.mkdir(exist_ok=True)
writer = PdfWriter()
receipts = []
tiles = []
for entry in documents:
    doc = entry["document"]
    target = out / (doc["id"] + ".pdf")
    if not target.exists():
        pdf = canvas.Canvas(str(target), pagesize=A4, pageCompression=0, invariant=1)
        pdf.setTitle(doc["title"])
        for page in doc["pages"]:
            lines = page["lines"]
            assert 77 <= len(lines) <= 96
            assert max(map(len, lines)) <= 110
            leading = min(9.8, 748 / (len(lines) - 1))
            assert leading >= 7.8
            text = pdf.beginText(40, 800)
            text.setFont("Courier", 7.4)
            text.setLeading(leading)
            for line in lines:
                text.textLine(line)
            pdf.drawText(text)
            pdf.showPage()
        pdf.save()
    reader = PdfReader(target)
    assert len(reader.pages) == 50
    for page, expected in zip(reader.pages, doc["pages"]):
        assert page.extract_text().strip() == expected["expectedText"], doc["id"]
    writer.append(reader)
    # Primeira/central/ultima e todas as folhas com notas-alvo.
    numbers = sorted({1, 25, 50, *[i+1 for i,p in enumerate(doc["pages"]) if len(p["lines"]) > 77]})
    for number in numbers:
        prefix = qa / f'{doc["id"]}-{number}'
        if not prefix.with_suffix(".png").exists():
            subprocess.run(["pdftoppm", "-f", str(number), "-l", str(number), "-scale-to", "1700", "-singlefile", "-png", str(target), str(prefix)], check=True, capture_output=True, creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        image = Image.open(prefix.with_suffix(".png")).convert("RGB")
        image.thumbnail((275, 390))
        tile = Image.new("RGB", (295, 420), "#eef2f5")
        tile.paste(image, ((295-image.width)//2, 22))
        ImageDraw.Draw(tile).text((6,5), f'{entry["kind"]} p.{number}', fill="black")
        tiles.append(tile)
    receipts.append({"id":doc["id"],"pages":50,"samples":numbers,"sha256":hashlib.sha256(target.read_bytes()).hexdigest()})
writer.write(out / "bateria-estresse-350-paginas.pdf")
for start in range(0, len(tiles), 20):
    batch = tiles[start:start+20]
    contact = Image.new("RGB", (1180, 420*((len(batch)+3)//4)), "white")
    for i,tile in enumerate(batch):
        contact.paste(tile, ((i%4)*295,(i//4)*420))
    contact.save(qa / f"contact-{start//20+1}.png")
(qa / "receipt.json").write_text(json.dumps({"documents":receipts,"pages":350,"samples":len(tiles),"inspection":"pending"},indent=2),encoding="utf8")
print(json.dumps({"pages":350,"samples":len(tiles),"qa":str(qa)}))
