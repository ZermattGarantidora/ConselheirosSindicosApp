# Continuação local de autoria documental — 16/11/2026

**Estado:** implementação e validação locais concluídas; sem autorização de produção ou IA real.
**Escopo:** Spec 073, RQ-7311–7313 e AC-7322–7326; preservação de RQ-7301–7310.
**Autoria/revisão:** Codex; revisão própria com a skill `code-review`, sem revisão independente
do branch inteiro, commit, merge, CI remoto ou liberação do piloto.

## Comportamento

- Salvar um rascunho na conversa pode apresentar uma oferta editorial contextual quando há
  agente explicitamente injetado. O texto proposto e as alterações ficam conferíveis; recusa
  encerra a oferta daquela revisão, e aceite cria nova revisão sem confirmar PDF. A primeira
  fatia preserva todos os tokens de palavras/números e sua ordem, além dos números literais.
  Não há agente/transporte padrão ou alteração do prompt de personalidade. Testes e navegador
  usam exclusivamente sugestões simuladas; não demonstram qualidade semântica de IA real.
- Word e rascunhos usam os adaptadores PostgreSQL existentes, com a migration 041 validada
  localmente. Original, blocos, fontes e revisão confirmada são recuperados em nova API e
  após backup/restore em destino vazio; contexto cruzado e fonte arquivada impedem PDF.
- Áudio tem armazenamento próprio, migration 042 e composição positiva exclusiva do harness
  sintético em loopback. RLS restringe usuário/condomínio/chat e associação vigente. Resultado
  de transcrição é durável antes do ACK; perda posterior do journal não exige outro ASR.
  Expiração nega leitura. Exportação inclui original, transcrição, histórico, atas, revisões
  e ofertas derivadas; purga remove conteúdo e mantém tombstone/estado de tentativa.
- Decisões de dispatch/purga ficam em journal privado fora do dump, com índice, checksums,
  escrita exclusiva e flush. Perda/corrupção ou decisões não reaplicadas negam acesso.
  Restore reaplica purgas e mantém unknown para tentativas ausentes posteriores ao snapshot,
  sem reenvio. Outro tenant continua acessível. Contagem agregada própria inclui chats ocultos;
  a função SECURITY DEFINER retorna somente os contadores do usuário/condomínio atuais.

## Verificações

Os resultados finais são registrados em `.local/authoring/final-gates.json`, relatórios JSON/JUnit
e cobertura em `.local/authoring/`. Manifesto dos 30 arquivos de código, configuração e testes:
`final-source-manifest.json`, conferido sem divergência após os gates.

| Gate da candidata estável | Resultado |
|---|---|
| Formatação global, ESLint, TypeScript | Aprovados pelos binários instalados |
| Unitários globais | 2.604 aprovados, zero falhas |
| Cobertura unitária | statements 86,21%; branches 82,46%; functions 91,77%; lines 88,15%; sem exclusões novas |
| E2E globais | 259 aprovados, zero falhas |
| Regressões focadas | 54 aprovadas em cinco arquivos, incluindo os mesmos cinco processos independentes da AC-7117 |
| Builds API/web e runtime compilado | Aprovados; runtime com dois PDFs e 20 perguntas sintéticas, zero chamadas de provedor |
| `evals` | 20/20 sintéticos aprovados |
| `evals:documentary` | 50/50 determinísticos aprovados; 50 semânticos e revisão especializada continuam pendentes |
| `evals:audio-minutes` | 26/26 com respostas roteirizadas; zero chamada real, sem avaliar qualidade de modelo real |
| Alinhamento | Gate estrutural aprovado para 73 specs; escopo desta tarefa conferido com briefing e estratégia |
| PostgreSQL e backup/restore | Dois cenários integrais aprovados em bancos novos; migrations 041/042, RLS, fonte atual, expiração, purga, exportação, outro tenant e unknown pós-snapshot |
| Navegador | Edge instalado, desktop/mobile, oferta/prévia/aceite, confirmação/PDF e reload aprovados; uma transcrição, redação, conferência e oferta simuladas; zero requisição externa de página |
| QA visual | Prévia de melhoria e editor inspecionados em desktop e 390 px, sem corte ou overflow; conteúdo do PDF e legenda de localizadores Word conferidos por extração, regressão e PostgreSQL |
| Scanner completo | Aprovado após os testes e geração de arquivos; nenhum padrão conhecido encontrado, escopo original preservado |

Prova SQL final: `.local/pilot-operations/10dc2c63ba8f48fabd0c45515ae008ce/authoring-proof.json`;
wrapper `.local/pilot-operations/container-85660650a855429089f2c7f6d077e080/result.json`,
com container próprio encerrado e nenhuma ativação. Relatórios de interface e capturas em
`.local/authoring/audio-browser/`, inclusive `improvement-offer-{desktop,mobile}.png`.
Todas as provas usam somente sintéticos; nenhum resultado mockado é apresentado como inferência real.
Os 13 gates registrados em `final-gates.json` encerraram com exit code zero. O scanner completo
levou 281 segundos ao percorrer também temporários/relatórios do workspace; não foram acrescentadas
exclusões para abreviar a verificação. A candidata final de 30 arquivos manteve os mesmos hashes.

O comando canônico novo é `pnpm run test:authoring:postgres`, incluído em package.json,
README e AGENTS. O wrapper exige confirmação local explícita, imagem pgvector:pg17 já em cache,
configuração Docker vazia, ambiente mínimo, nomes/marcadores próprios e destinos de restore
vazios; encerra somente seu container. Não carrega `.env`, acessa remoto ou instala dependência.
Os gates usam binários já instalados para evitar resolução automática do wrapper pnpm.
O build web usa a configuração existente com `envDir:false` em harness local exclusivo.

## Achados corrigidos e regressões

1. Ordem de propriedades no JSONB alterava hashes de referência de áudio. Segmentos e referência
   são normalizados, com regressão unitária e percurso PostgreSQL real de confirmação/PDF.
2. Edição humana concorrente podia vencer a aplicação de melhoria e aparecer como aceite bem
   sucedido em replay. Agora a revisão realmente aplicada é conferida no recibo imutável.
3. Transcrição salva antes da falha do journal aparecia como tentativa incerta na lista.
   A recuperação consulta o resultado durável, sem repetir o transcritor.
4. Rascunho excluído/expirado podia ocultar outros rascunhos da conversa. Listagem ignora apenas
   o 404 daquela origem; falhas de banco ou autorização continuam explícitas.
5. Ocultar chat retirava tentativa incerta da contagem sujeita ao RLS de conteúdo. A contagem
   própria agregada conserva o consumo de chats ocultos, sem conceder leitura de seu conteúdo.
6. Exportação inicial não enumerava ofertas de melhoria e todas as mensagens derivadas. A mesma
   relação de procedência usada pela purga passou a incluir esses registros, com prova SQL.
7. Referências do PDF usavam sempre o rótulo página. A legenda distingue páginas PDF/fotos de
   blocos Word, sem presumir paginação original, com regressão unitária e PostgreSQL.

A primeira execução global teve 2.601 unidades aprovadas e dois timeouts de cinco segundos em
testes preexistentes (`hosted-call-ledger` e `long-conversation-regressions`), enquanto
coincidia com outras verificações. Evidência preservada em `continuation-unit.{json,xml,log}`.
Uma rodada de fechamento foi interrompida após o lint identificar anotação de tipo no teste
novo e a revisão identificar a enumeração incompleta da exportação. A anotação passou a import
de tipo explícito. Nenhuma assertiva, timeout ou exclusão de produção foi relaxada.

O timeout remanescente foi localizado em `hosted-call-ledger.test.ts` (AC-7117): cinco processos
seriados usavam a CLI intermediária do tsx, que abria outro Node por chamada. O helper agora
usa `node --require scripts/safe-os-user-info.cjs --import tsx`, preservando o preload seguro,
os cinco processos independentes, ambiente mínimo e todas as assertivas. O limite original
de cinco segundos continua igual. A rodada anterior permanece registrada e não é aprovada.
Na execução completa final, AC-7117 passou em 1.480 ms. A bateria completa foi repetida após
esse ajuste e a correção da legenda Word, com todos os 2.604 unitários e 259 E2E aprovados.
O lockfile foi preservado; não houve instalação de dependências. A revisão própria de todo
o escopo desta tarefa e seus chamadores não identificou P0/P1 remanescentes; não equivale a
revisão independente do checkout compartilhado ou autorização de merge.

## Limites

Sem assinatura de programa, novo fornecedor, instalação de pacote, chamada paga, chave,
migration remota, dado real ou transporte externo de IA. O navegador usa Edge já instalado,
servidores de loopback e fixture WAV de hash fixo; bloqueia requisições externas.

Retenção de uma hora, dez entradas/dia por usuário/condomínio e duas tentativas concorrentes
são parâmetros sintéticos do ensaio, não política real. A purga de expirados é explícita;
não há agendamento, orçamento monetário/global ou provedor habilitado. Startup persistente
genérico continua negado mesmo com um transcritor injetado isoladamente. O journal externo
exige custódia; não representa plano operacional real aprovado. A Spec 073 permanece em
andamento para seus requisitos gerais e qualidade real de IA. Não há autorização de produção.
