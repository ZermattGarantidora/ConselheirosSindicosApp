"""QA visual do corpus sintético; sem instalar bibliotecas ou acessar rede."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

folder = Path(sys.argv[1]).resolve()
qa = folder / "qa"
qa.mkdir(exist_ok=True)
writer = PdfWriter()
tiles = []
receipts = []
for kind in ["financial", "convention", "draft", "minutes", "contracts"]:
    source = folder / f"dense-{kind}.pdf"
    reader = PdfReader(source)
    assert len(reader.pages) == 24
    assert all("FICTICIO" in page.extract_text() for page in reader.pages)
    writer.append(reader)
    for number in [1, 12, 24]:
        prefix = qa / f"{kind}-{number}"
        subprocess.run(
            ["pdftoppm", "-f", str(number), "-l", str(number), "-scale-to", "1400",
             "-singlefile", "-png", str(source), str(prefix)],
            check=True, capture_output=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        image = Image.open(prefix.with_suffix(".png")).convert("RGB")
        image.thumbnail((390, 550))
        tile = Image.new("RGB", (410, 580), "#e9edf2")
        tile.paste(image, ((410 - image.width) // 2, 25))
        ImageDraw.Draw(tile).text((12, 6), f"{kind} - pagina {number}", fill="black")
        tiles.append(tile)
    receipts.append({"document": kind, "pages": 24,
                     "sha256": hashlib.sha256(source.read_bytes()).hexdigest()})
combined = folder / "caderno-denso-120-paginas.pdf"
writer.write(combined)
assert len(PdfReader(combined).pages) == 120
contact = Image.new("RGB", (1230, 2900), "white")
for index, tile in enumerate(tiles):
    contact.paste(tile, ((index % 3) * 410, (index // 3) * 580))
contact.save(qa / "contact.png")
(qa / "receipt.json").write_text(json.dumps({"documents": receipts, "pages": 120,
    "samples": 15, "combined": str(combined), "visualInspection": "pending"}, indent=2), encoding="utf8")
print(json.dumps({"pages": 120, "samples": 15, "contact": str(qa / "contact.png")}))
