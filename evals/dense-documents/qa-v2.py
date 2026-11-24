"""Combina originais e renderiza amostras do conjunto ampliado, sem rede."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

folder=Path(sys.argv[1]).resolve()
names=[f'dense-{k}.pdf' for k in ['financial','convention','draft','minutes','contracts']]
names += [f'varied-{k}.pdf' for k in ['narrative_minutes','narrative_contract','narrative_convention']]
names += ['regulamento-digitalizado.pdf']
qa=folder/'qa';qa.mkdir(exist_ok=True)
writer=PdfWriter();tiles=[];receipts=[]
for index,name in enumerate(names):
    source=folder/name;reader=PdfReader(source);count=len(reader.pages)
    writer.append(reader)
    samples=sorted(set([1,(count+1)//2,count]))
    for number in samples:
        target=qa/f'doc-{index+1}-page-{number}'
        subprocess.run(['pdftoppm','-f',str(number),'-l',str(number),'-scale-to','1400','-singlefile','-png',str(source),str(target)],check=True,capture_output=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        im=Image.open(target.with_suffix('.png')).convert('RGB');im.thumbnail((390,550))
        tile=Image.new('RGB',(410,580),'#e9edf2');tile.paste(im,((410-im.width)//2,25))
        ImageDraw.Draw(tile).text((10,5),f'doc {index+1} - pagina {number}',fill='black');tiles.append(tile)
    receipts.append({'document':name,'pages':count,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
combined=folder/'bateria-documental-134-paginas.pdf';writer.write(combined)
assert len(PdfReader(combined).pages)==134
for group,start in enumerate(range(0,len(tiles),9)):
    canvas=Image.new('RGB',(1230,1740),'white')
    for i,tile in enumerate(tiles[start:start+9]):canvas.paste(tile,((i%3)*410,(i//3)*580))
    canvas.save(qa/f'contact-{group+1}.png')
(qa/'receipt.json').write_text(json.dumps({'documents':receipts,'pages':134,'samples':len(tiles),'combined':str(combined),'visualInspection':'pending'},indent=2),encoding='utf8')
print(json.dumps({'pages':134,'samples':len(tiles),'contacts':(len(tiles)+8)//9}))
