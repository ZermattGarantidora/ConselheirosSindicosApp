# Prova financeira integral de 300 páginas — Spec 073

Somente sintéticos, sem `.env`, API paga, instalação ou ativação operacional.
O comando padrão usa modelo **simulado**. A opção explícita usa Codex/ChatGPT já
contratado para redação e conferência reais, sem chaves de API, ferramentas ou fallback.

```powershell
$python = '<executável Python local com reportlab, pdfplumber e Pillow>'
pnpm run evals:financial-300 -- --python=$python --run=offline-<identificador>
pnpm run evals:financial-300 -- --python=$python --codex --confirm-synthetic-local --run=codex-<identificador>
& $python evals/financial-dossier/qa.py .local/financial-300/codex-<identificador> output/pdf/financial-300-codex-<identificador>
```

O runtime de documentos do Codex já contém essas bibliotecas; obtenha seu caminho pela
ferramenta de dependências do workspace. Nenhum pacote é instalado pelo ensaio.
Repetir o mesmo `--run` conserva IDs e reutiliza somente saídas idênticas por hash.
Recibo de despacho sem resultado bloqueia reenvio. Uma tentativa deliberadamente nova
exige outro identificador; não apague recibos para repetir uma chamada.

`corpus.ts` prepara um ledger com 293 documentos detalhados (292 notas e um memorial
cancelado), 30 itens cada, e sete páginas de balancetes/apoio. `oracle.ts` usa apenas esse
ledger, antes do PDF, sem importar parser, conferência financeira ou modelo. Independência
entre implementações; não revisão externa por especialista. O gabarito não vai ao modelo.
`verify.ts` confere cada documento, quantidades, totais e soma de itens, os dez estados,
valores críticos, controles saudáveis e referências às páginas tardias.

O PDF passa pelo upload/extrator da API (Fastify inject), catálogo e armazenamento privado.
Compara-se **todo o texto de todas as páginas**. A análise integral usa cabeçalhos explícitos
e remapeia fontes lógicas ao original. O modelo recebe cálculos e evidências; não recebe as
300 páginas brutas em um único contexto. Rascunho comum, retomada, confirmação e PDF usam
as rotas da aplicação. Confirmações do harness são simuladas. Reconstruir a API com os mesmos
repositórios em RAM não comprova durabilidade de processo/banco. Alterar a página 300
bloqueia entrega e retomada sem inferência adicional.

Saídas em `.local/financial-300/<run>/`: ledger/gabarito anterior, páginas originais/extraídas,
inventário e hashes, análise/citações, entradas e saídas separadas de escrita/conferência,
recibos, `result.json` e JUnit. PDFs em `output/pdf/financial-300-<run>/`. `qa.py` gera o
caderno de conferência, verifica margens de todas as páginas, renderiza via Poppler e monta
contatos para inspeção visual. Layout e homologação humana são etapas distintas.

Limites: texto legível, cabeçalhos integrantes explícitos e classificação por rótulos.
Não comprova OCR real, tabelas arbitrárias ou qualquer balancete de cliente. O caminho
geral conserva vinte origens. Startup não injeta o modelo financeiro, não habilita retenção
ou cotas e não adiciona botão ao chat. Os dois ajustes humanos têm prova real separada em
`human-adjustments.ts`, sem atribuir aprovação dos novos candidatos ao usuário.
