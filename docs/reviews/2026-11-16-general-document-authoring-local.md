# Agente documental geral — validação local de 16/11/2026

**Estado:** implementação e validação locais concluídas; sem ativação de IA real ou produção.
**Escopo:** Spec 073, RQ-7314/7315 e AC-7327–7332; preservação dos fluxos anteriores.
**Revisão:** própria, com a skill `code-review`; não é revisão independente do branch.

## Resultado funcional

O chat reutiliza **Documentos em preparação** para pedir criação, revisão ou melhoria de um
tipo documental informado. O servidor resolve versões autorizadas e lê todas as páginas/blocos
selecionados; o cliente não fornece suposta evidência documental. Relato declarado é separado
de fato documental. Extração incompleta, vigência não confirmada, versões conflitantes do mesmo
documento e limites excedidos são recusados antes de chamar o modelo simulado.

Cada proposta contém parágrafos, procedência, antes/depois, justificativas, referências literais
com offsets e cobertura de todas as origens. Verificações determinísticas antecedem uma segunda
etapa de conferência com plano/fontes integrais. Insuficiência pede contexto sem documento
aplicável. Aceite por hash cria novo rascunho, sem alterar o original ou confirmar PDF.

Pedido, dispatch, resultados, proposta e decisão ficam no journal sob usuário/condomínio/chat.
Concorrência e resposta perdida não repetem chamadas; envio sem resultado confirmado exige
reconciliação. Resultado salvo permite retomar a etapa seguinte. Aceite repetido recupera a
revisão atual e conserva edição/confirmação humanas. A referência de procedência não pode ser
removida por uma edição; proposta, fontes e decisão são revalidadas também no PDF.

O startup continua sem modelo geral ou transporte. O harness injeta apenas funções simuladas;
não há serviço contratado, pacote instalado, dependência nova, chave ou chamada paga. O prompt
de personalidade não foi alterado. A fatia respeita o Bloco 7 e os limites do briefing/estratégia.

## Evidências

- Unitários: contrato, referências/offsets, números, cobertura, especialista, falta de contexto,
  recusa, replay, concorrência, timeout, falhas antes/depois do dispatch/decisão, fonte alterada,
  origem falsa, colisão com texto manual e revogação. Casos em `document-authoring.test.ts`.
- HTTP: `document-proposals.e2e.test.ts` percorre geração, aceite, confirmação, PDF, nova API,
  modelo posteriormente desabilitado e isolamento; comprova startup padrão negado e guard de
  recuperação aplicado às novas rotas. `document-authoring-ui.test.ts` cobre entrada explícita.
- `evals:document-authoring`: 31 cenários de saídas e conferências rotuladas manualmente,
  incluindo perda de negação, obrigação sem fundamento e instrução documental indevida.
  A rejeição semântica desses casos é simulada; não prova que uma IA real os detectaria.
- Navegador real com API/componentes e Edge já instalado: selecionar não gera; perda da resposta
  depois de persistida recupera o mesmo ID com uma redação e uma conferência; proposta, aceite,
  edição humana, confirmação, download e reload preservados. Desktop e 390 px sem overflow;
  zero requisição externa e zero erro de página. Arquivos em `.local/general-authoring/browser/`.
- PostgreSQL local descartável: proposta/decisão/rascunho confirmado recuperados em nova API e
  backup/restore em banco vazio, papéis restritos/RLS, três dimensões de isolamento e fonte
  arquivada negada. Duas chamadas simuladas conservadas após restore. O gate anterior de áudio
  durável também foi preservado. Prova final após o ajuste do journal:
  `.local/pilot-operations/1f045e13d3904dd6b5b08f930d7c1ba2/authoring-proof.json`;
  wrapper `container-f8fe13bfafc940eaa604f9d1c681bff9/result.json`, container próprio encerrado.
- QA visual: proposta/fundamentos em desktop/mobile e página integral do PDF inspecionados;
  texto, avisos, fonte e procedência visíveis sem corte. Render local com Poppler instalado.

## Gates globais

Resultados finais em `.local/general-authoring/verified-gates.json`, com a conferência estática
final em `static-recheck.json`, logs JSON/JUnit e cobertura própria. `closure.json` reúne os 14
gates efetivos (usando as conferências estáticas finais), exige todos aprovados e confere os hashes.
Manifesto de 22 arquivos de código/configuração/testes em `final-source-manifest.json`.
Comandos usam binários locais já instalados, evitando resolução automática do pnpm; configs
de teste e build web usam `envDir:false`. Scanner completo será executado após os temporários
dos testes, preservando seu escopo original.

| Gate | Resultado |
|---|---|
| Unitários globais | 2.643 aprovados em 209 arquivos, zero falhas |
| Cobertura unitária | statements 85,92%; branches 82,36%; functions 91,59%; lines 87,83%; quatro pisos atendidos, sem exclusões novas |
| E2E globais | 261 aprovados em 42 arquivos, zero falhas |
| Formatação, lint e TypeScript | Conferência final global aprovada em `static-recheck.json`, após corrigir o import de tipo do teste |
| Builds API/web e runtime | Aprovados; dois PDFs e 20 perguntas sintéticas, zero chamadas de provedor |
| Evals existentes | 20/20 principais, 50/50 documentais determinísticos e 26/26 de atas simuladas; semântica documental real/revisão especializada continua pendente |
| Evals gerais | 31/31 cenários simulados aprovados; não mede modelo real |
| Alinhamento | Gate estrutural aprovado para 73 specs; coerência desta fatia revisada com briefing e estratégia |
| PostgreSQL/restore | Dois cenários integrais aprovados, incluindo proposta geral e regressão de áudio; container próprio encerrado |
| Navegador/PDF | Aprovados com mocks, uma redação/conferência, resposta perdida retomada, edição humana preservada e zero requisição externa |
| Scanner completo | Aprovado após os testes; nenhum padrão conhecido encontrado, escopo original preservado |

Nenhuma exclusão foi acrescentada ao scanner ou à cobertura. O manifesto final conserva os
hashes dos 22 arquivos verificados; os 14 gates efetivos têm exit code zero. As rodadas anteriores
e a falha de lint anterior à conferência final permanecem nos logs originais, sem ocultar reprovações.

## Revisão e limites

Diff desta tarefa comparado com cópias anteriores em `.local/general-authoring/baseline/`,
incluindo arquivos novos, chamadores, contratos, autorização, falhas e persistência. Alterações
preexistentes do checkout foram preservadas. Sem commit, merge, CI remoto ou liberação.
A revisão própria do escopo final não identificou P0/P1 remanescentes nesta fatia; não é aprovação
independente do checkout compartilhado.

A revisão encontrou referência de parágrafo que poderia não aparecer junto aos fundamentos
quando não fosse repetida na alteração. A interface agora reúne antes, apoio da mudança e
apoio do parágrafo, eliminando duplicatas; o ensaio de navegador contém essa regressão.

A primeira rodada global registrou 2.637 unidades aprovadas e um EPERM ao substituir o índice
do journal de áudio no Windows. O ajuste conserva lock e rename atômico, com até cinco tentativas
somente para erros transitórios e falha/quarentena nos demais. Cinco casos novos verificam
retomada, teto, índice anterior preservado e ausência de confirmação falsa. Nenhum timeout ou
assertiva foi enfraquecido. O gate PostgreSQL foi repetido após esse ajuste.

Na mesma rodada, 37 E2E de HTTP real falharam com `connect EACCES 127.0.0.1`; o sandbox não
permitia essas conexões. A repetição usa a permissão para loopback, mantendo sintéticos e sem
ativar transporte de IA. Os arquivos `final-*` preservam a rodada reprovada. Formatação de uma
rota e anotação de import de tipo no teste novo foram corrigidas; os gates correspondentes são
reexecutados contra os arquivos finais. Esses resultados iniciais não aprovam a candidata.

Startup real, qualidade de criação/revisão com IA efetiva, política/retentor/custódia, expiração
operacional dos derivados, integração ao orçamento monetário/global e revisão independente do
branch continuam pendentes. Os tetos desta fatia são de entrada/saída e não representam orçamento
financeiro. Propostas privadas não entram automaticamente na base vetorial. A Spec 073 permanece
em andamento; estes testes não aprovam destino, fornecedor ou dados reais.
O restore comprovado contém os recibos da proposta. Restore de snapshot anterior ao envio geral
aguarda integração com ledger/decisões fora do dump e quarentena antes de qualquer ativação real.
