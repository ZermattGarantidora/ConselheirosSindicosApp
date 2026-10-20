# Revisão local — envio e visualização documental

- **Status:** implementação local verificada; conferência visual e revisão independente pendentes.
- **Base do diff revisado:** `f219fec49b52bb6a5b924f70a7d53a8eceef61e5`.
- **Revisor independente:** não realizado nesta tarefa; este registro é autorrevisão.
- **Data:** 2026-10-20.
- **P0/P1 encontrados na autorrevisão:** nenhum pendente; não equivale à aprovação independente.

## Problema e escopo

O botão de envio priorizava o anexo e retornava sem enviar a mensagem. A demonstração aguardava
extração/indexação antes de confirmar o upload, e a interface mostrava avisos fixos em primeira
pessoa. O catálogo não abria os originais; as fontes abriam somente o trecho textual.

A Spec 020 e seus exemplos foram atualizados antes do comportamento, conforme briefing §§6, 8–10,
12–13 e gate competitivo. A correção cobre RQ-2004–2006 e AC-2004–2007.

Foram revisados integralmente os diffs de `create-api.ts`, `App.tsx`,
`document-upload-request.ts`, `styles.css`, Spec 020, aceitação, rastreabilidade e seis testes
existentes, além dos cinco arquivos novos: `DocumentViewer.tsx`,
`document-processing-request.ts`, `document-processing-request.test.ts`,
`chat-document-send.e2e.test.ts` e `wait-for-document.ts`.

## Comportamento e segurança

- A mensagem aparece no turno imediatamente; upload, espera pela versão exata e pergunta têm
  ordem explícita. Falha/revisão/timeout não dispara pergunta como se o anexo estivesse pronto.
- A guarda síncrona do compositor impede dois envios concorrentes por cliques/Enter repetidos.
- Recepção retorna 202 depois da persistência do original, com leitura demonstrativa em segundo
  plano. Encerramento normal aguarda os trabalhos locais; exceções tornam a versão `failed`.
- O cliente distingue revisão, falha e processamento, preserva o texto em erro e limita a espera.
- O original é buscado com sessão/cabeçalhos autorizados, sem identidade na URL. PDF/imagem são
  apresentados integralmente; HTML é rejeitado. O download é uma opção do visualizador.
- A API existente revalida associação e versão; testes cobrem falta de identidade, usuário sem
  associação, revogação, versão de outro condomínio e documento removido.
- O visualizador aborta carregamentos ao desmontar e revoga suas URLs temporárias ao fechar ou
  trocar contexto/documento. O diálogo mantém teclado e retorno de foco pelo comportamento nativo.
- Fontes removidas preservam a indicação e o trecho histórico; fontes legais sem original no
  catálogo mantêm a referência anterior.
- Nenhuma dependência, migração, serviço, parser, prompt ou provedor foi alterado.

Os testes que exigiam `ready` no retorno do upload passaram a exigir `uploaded` no 202 e `ready`
para a mesma versão no catálogo antes de consultar. Permanecem as asserções de conteúdo, fontes,
análise determinística e segurança; nenhuma asserção foi enfraquecida.

## Validação

| Comando | Resultado |
| --- | --- |
| `pnpm run check` | 112 arquivos / 745 testes; formatação, lint, tipagem, gate das 36 specs e segredos aprovados |
| Cobertura | statements 89,72%; branches 83,52%; functions 96,01%; lines 91,98% |
| `pnpm run test:e2e` | 13 arquivos / 70 testes aprovados |
| `pnpm run evals` | 20 casos locais aprovados |
| `pnpm run evals:documentary` | 50 casos determinísticos aprovados; avaliação semântica/especializada preexistente segue pendente |
| `pnpm run build:web` | aprovado |
| `git diff --check` | aprovado |

O ambiente foi executado com o pnpm 11.19.0 já instalado, `TEMP`/`TMP` apontando para `tmp` do
projeto e `VITEST_MAX_WORKERS=2`. A tentativa inicial pelo Corepack não alcançou o registro; o
diretório temporário padrão produziu EPERM. Uma execução inicial com concorrência padrão excedeu
5 segundos durante a inicialização de PDFs; a limitação de workers resolveu sem alterar timeout,
limiar ou asserção. O primeiro teste novo revelou a necessidade de usar o mesmo retriever/gateway
documental do servidor na fixture; isso foi corrigido sem remover a exigência de citação.

Integração Neon, auditoria de dependências e evals pagos não foram executados: esta fatia não muda
schema, adaptadores PostgreSQL/storage/fila persistente, dependências ou comportamento de modelo.
O caminho binário e a transição de estados foram verificados pela API e pelos testes locais de
storage/isolamento da suíte completa. Nenhum documento real ou chamada externa de IA foi usado.

## Limites e decisão

A tentativa de conferência visual usou um perfil e PDF exclusivamente sintéticos. O navegador
disponível não alcança o servidor local isolado (`ERR_CONNECTION_TIMED_OUT`); a requisição local
também encontrou bloqueio de socket. Portanto não há aprovação visual do diálogo, do PDF embutido,
do fechamento ou do fluxo pelo teclado. O fallback de download está implementado, mas a experiência
em navegador móvel ainda exige conferência.

A leitura semântica/OCR não foi ampliada: material ilegível continua exigindo revisão. O pipeline
demonstrativo continua em memória, como antes; não oferece fila durável após reinício.

Mudanças permanecem locais, sem commit, merge ou publicação no Render. A revisão independente do
diff final, os status checks do commit a integrar e a validação visual continuam necessários antes
do merge/publicação. Este documento não autoriza integração.
