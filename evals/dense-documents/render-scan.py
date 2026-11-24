"""Rasteriza origem sintética e cria PDF sem texto; ferramentas já instaladas."""
from pathlib import Path
import json
import subprocess
import sys
from pypdf import PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from PIL import Image

folder=Path(sys.argv[1]).resolve()
source=folder/'scan-source.pdf'
subprocess.run(['pdftoppm','-r','200','-png',str(source),str(folder/'scan-page')],check=True,capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
images=sorted(folder.glob('scan-page-*.png'))
assert len(images)==2
target=folder/'regulamento-digitalizado.pdf'
output=canvas.Canvas(str(target),pagesize=A4,invariant=1)
for image in images:
    output.drawImage(str(image),0,0,width=A4[0],height=A4[1])
    output.showPage()
output.save()
reader=PdfReader(target)
assert len(reader.pages)==2
assert all(not (page.extract_text() or '').strip() for page in reader.pages)
contact=Image.new('RGB',(1200,850),'#eeeeee')
for i,path in enumerate(images):
    im=Image.open(path).convert('RGB'); im.thumbnail((580,820));contact.paste(im,(i*600+10,10))
contact.save(folder/'scan-contact.png')
print(json.dumps({'pages':2,'textLayer':False,'images':[str(p) for p in images],'pdf':str(target)}))
