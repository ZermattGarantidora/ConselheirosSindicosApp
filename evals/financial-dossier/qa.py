"""QA integral via Poppler; caderno de conferência independente do PDF da aplicação."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import pdfplumber
from html import escape
from PIL import Image, ImageDraw
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

root, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
qa = root / "visual-qa"
qa.mkdir(exist_ok=True)
gold = json.loads((root / "oracle.json").read_text(encoding="utf-8"))
actual = json.loads((root / "analysis.json").read_text(encoding="utf-8"))
styles, story = getSampleStyleSheet(), []
def para(text, style="BodyText"):
    story.append(Paragraph(escape(str(text)), styles[style]))
    story.append(Spacer(1, 7))
def brl(value):
    return "R$ " + f"{value/100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
para("Alvitra - prova financeira de 300 páginas", "Title")
para("Caderno de conferência e gabarito sintético. Não é homologação humana nem aprovação de contas.")
para("Método e independência", "Heading2")
para("Ledger e gabarito preparados antes da extração e das chamadas de modelo. O oracle usa somente o ledger, sem importar parser, análise ou redação avaliados. Independência entre implementações e entradas; não é revisão externa por contador. O gabarito não foi enviado ao modelo.")
para("O PDF passou pela rota de upload da aplicação. Cada uma das 300 páginas extraídas foi comparada integralmente com seu texto anterior ao PDF. A análise local conferiu 9.126 valores e 8.790 itens de 293 documentos: 292 notas e um memorial de cancelamento.")
para("O Codex contratado redigiu a síntese e uma chamada separada a conferiu. Recebeu cálculos, evidências e identidade do conjunto integral, sem receber as 300 páginas brutas em um único prompt. O servidor acrescentou as dez verificações e fontes ao rascunho comum.")
para("Achados esperados e encontrados", "Heading2")
data = [["Conferência", "Gabarito e resultado", "Páginas"]]
for title, value, pages in [
    ("Fechamento", f"Diferença {brl(gold['closingDifferenceMinor'])}; calculado {brl(gold['calculatedClosingMinor'])}; informado {brl(gold['declaredClosingMinor'])}", "1"),
    ("Liquidez", "Disponível R$ 2.000,00; obrigações R$ 5.000,00. Necessidade adicional no gabarito: R$ 3.000,00.", "1 e 4"),
    ("Banco", "Diferença R$ 1.000,00; balancete R$ 50.000,00 e extrato R$ 49.000,00.", "1 e 3"),
    ("Orçamento", f"Excesso R$ 2.500,00; realizado {brl(gold['currentExpenseMinor'])}.", "1 e 300"),
    ("Inadimplência", "Aumento R$ 4.000,00; de R$ 4.000,00 para R$ 8.000,00.", "1 e 2"),
    ("Itens da nota", f"{gold['itemMismatch']['id']}: declarado {brl(gold['itemMismatch']['declaredMinor'])}; soma {brl(gold['itemMismatch']['itemSumMinor'])}.", str(gold['itemMismatch']['page'])),
    ("Suporte", f"Manutenção sem suporte integral: {gold['unsupported']['id']} é memorial cancelado, não nota válida. Não equivale a fraude ou pagamento.", str(gold['unsupported']['page'])),
    ("Reserva", "Uso R$ 500,00; saldo segregado R$ 5.000,00 confere. Finalidade e autorização não comprovadas.", "1 e 6"),
    ("Controles saudáveis", "Obrigações somam R$ 5.000,00; competência e responsável explícitos. Estados ok não aprovam contas.", "1 e 4")
]:
    data.append([Paragraph(escape(x), styles["BodyText"]) for x in (title, value, pages)])
table = Table(data, colWidths=[85, 345, 65], repeatRows=1)
table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e3edf4")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#b7c5ce")), ("BOTTOMPADDING", (0,0), (-1,-1), 7)]))
story.append(table)
story.append(PageBreak())
para("As dez verificações", "Heading1")
for check in actual["report"]["financialReview"]["checks"]:
    pages = sorted(set(c["page"] for c in check["citations"]))
    para(f"{check['title']}: {check['status']}", "Heading3")
    para(check["detail"].replace("−", "-").replace("→", "para"))
    if check["missingDocuments"]: para("Documentos a solicitar: " + " ".join(check["missingDocuments"]))
    if check["nextSteps"]: para("Próximo passo: " + " ".join(check["nextSteps"]))
    para("Fontes no original: páginas " + ", ".join(map(str, pages)) + ".")
story.append(PageBreak())
para("O que validar como síndico", "Heading1")
for text in ["As prioridades ajudam a decidir o que cobrar primeiro?", "A diferença entre valor divergente, documento faltante e conclusão não comprovada está clara?", "Os próximos passos permitem pedir uma correção concreta?", "A síntese e o detalhamento servem à sua rotina, sem esconder achado relevante?"]:
    para(text)
para("Os cálculos e localizadores têm conferência automática. Sua revisão avalia a utilidade do relatório completo; não precisa reler manualmente 300 páginas para compensar uma lacuna do teste.")
para("Ajustes humanos anteriores", "Heading2")
para("H073-001: regra de 24 horas preservada, requiresSpecialist=false. H073-002: relato e ausência de diagnóstico preservados, requiresSpecialist=false; apuração por responsável técnico mantida. Redação e conferência reais pelo Codex. Revalidação humana permanece pendente.")
para("Limites da conclusão", "Heading2")
para("Um caderno textual sintético e estruturado não prova desempenho em documentos escaneados, OCR ruim, tabelas arbitrárias ou dados reais. A rota financeira é uma composição local explícita; não está habilitada pelo startup nem adiciona botão ao chat. A reconstrução da API usa os mesmos repositórios em RAM; não comprova sozinha reinício de processo ou durabilidade PostgreSQL do novo relatório.")
para("Sem API paga, contratação, dado real ou publicação. A proposta de limites e retenção permanece inativa; nenhuma aprovação humana, operacional ou de produção foi atribuída.")
para("Evidências reproduzíveis", "Heading2")
para("ledger/oracle.json: gabarito anterior. pages/extracted.json: comparação integral. coverage.json: inventário por página. analysis.json: cálculos e citações. write/review-input/output.json e receipts/: fases reais. result.json e junit.xml: ensaio. PDFs do caderno e do relatório da aplicação entregues separadamente.")
packet = out / "caderno-de-conferencia-e-gabarito.pdf"
SimpleDocTemplate(str(packet), pagesize=A4, rightMargin=45, leftMargin=45, topMargin=45, bottomMargin=45).build(story)

violations, visual = [], []
files = [out / "caderno-financeiro-300-paginas.pdf", out / "relatorio-alvitra.pdf", packet]
def run(command):
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
for file in files:
    prefix = qa / file.stem
    with pdfplumber.open(file) as pdf:
        count=len(pdf.pages)
        for index,page in enumerate(pdf.pages):
            for word in page.extract_words():
                if word["x0"]<25 or word["top"]<15 or word["x1"]>page.width-20 or word["bottom"]>page.height-15:
                    violations.append({"file":file.name,"page":index+1,"text":word["text"]})
    run(["pdftoppm", "-scale-to", "200", "-png", str(file), str(prefix)])
    pngs = sorted(qa.glob(file.stem + "-*.png"))
    for batch in range(0, len(pngs), 100):
        sheet = Image.new("RGB", (1500,2250), "#d5dde2")
        draw = ImageDraw.Draw(sheet)
        for index, image in enumerate(pngs[batch:batch+100]):
            thumb = Image.open(image).convert("RGB")
            thumb.thumbnail((140,205))
            x,y = (index%10)*150, (index//10)*225
            sheet.paste(thumb,(x+5,y+17))
            draw.text((x+5,y+2),str(batch+index+1),fill="black")
        sheet.save(qa / f"{file.stem}-contact-{batch//100+1}.jpg")
    visual.append({"file": str(file), "pages": count, "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
for page in [1,90,166,300]:
    run(["pdftoppm", "-f", str(page), "-l", str(page), "-scale-to", "1200", "-singlefile", "-png", str(files[0]), str(qa / f"source-{page}")])
for page in [1,2,3,23]:
    run(["pdftoppm", "-f", str(page), "-l", str(page), "-scale-to", "1200", "-singlefile", "-png", str(files[1]), str(qa / f"report-{page}")])
result = {"files": visual, "bboxViolations": violations, "renderedAllPages": True, "visualInspectionPending": True}
(qa / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
if violations: raise ValueError("Texto fora das margens: " + str(violations[:5]))
print(json.dumps(result, ensure_ascii=False))
