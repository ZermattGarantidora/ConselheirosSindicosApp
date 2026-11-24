# Aceitação — Spec 071

**Status:** contratos para validação local sintética; não autoriza ativação  
**Atualizado em:** 2026-11-11

| Critério     | Requisito         | Cenário obrigatório                                                                                                                                                                                                                                                                                                                                           |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-7119 (P0) | RQ-7111           | API deriva escopo de sessão, nega orçamento/política/escopo inválidos e impede segunda execução após falha de journal. Setup, pergunta, upload e mensagem documental reservam antes do trabalho. Retentativa do journal salvo não consome novamente; startup persistente permanece negado.                                                                    |
| AC-7101 (P0) | RQ-7101           | Autorizador ausente, negativo, divergente, com exceção ou revogado impede chamada/publicação, inclusive cache. Nenhuma flag/chave habilita o startup preparado.                                                                                                                                                                                               |
| AC-7102 (P0) | RQ-7102           | OCR de PDF sintético de duas páginas envia somente seus bytes, nome genérico, orçamento e store:false; resultado mantém versão/páginas/hash.                                                                                                                                                                                                                  |
| AC-7103 (P0) | RQ-7102/7105      | PDF inválido, excedente, resposta incompleta, página ausente/duplicada, score baixo, timeout e falha remota não produzem ready nem cache de sucesso.                                                                                                                                                                                                          |
| AC-7104 (P0) | RQ-7103           | Duplicatas concorrentes usam uma execução; condomínio, versão, hash, usuário/chat, membership e política diferentes não compartilham resultados. Fila e cache obedecem aos tetos.                                                                                                                                                                             |
| AC-7105 (P0) | RQ-7102/7105      | Foto sintética conserva descrição/texto/limitações e página 1; negativa/falha mantém revisão. Nenhum embedding externo é executado no ensaio.                                                                                                                                                                                                                 |
| AC-7106 (P0) | RQ-7104           | HTTP com fábrica hospedada simulada gera uma síntese, mantém prompt/cálculos e fontes por versão/página/trecho; fonte fabricada ou catálogo/membership alterado não é publicado.                                                                                                                                                                              |
| AC-7107 (P0) | RQ-7105           | OCR financeiro com score alto sem conferência independente permanece em revisão. Repetição não muda essa decisão.                                                                                                                                                                                                                                             |
| AC-7108 (P0) | RQ-7104/7105      | Falha da geração/leitura/registro não retorna sucesso ou fallback; journal recupera a fala confirmada e repetição da mesma operação não gera outra fala. Logs de processamento/retenção usam códigos fechados, sem nome/mensagem nativos de exceção. O ensaio em RAM não comprova durabilidade PostgreSQL.                                                    |
| AC-7109 (P0) | RQ-7106           | JPEG/PNG sintéticos convertidos conservam imagem inteira e página 1. OCR retorna mais de 250 caracteres sem corte, com hash e offsets verificáveis; texto financeiro sem confirmação continua em revisão.                                                                                                                                                     |
| AC-7110 (P0) | RQ-7106           | PNG inválido, CRC incorreto, entrelaçado/profundidade não suportada, descompressão excedente, foto acima dos limites, página vazia ou saída incompleta falham sem envio ou publicação indevida.                                                                                                                                                               |
| AC-7111 (P0) | RQ-7107           | Reservas concorrentes de processos/instâncias respeitam teto do condomínio e global; orçamento excedido ou armazenamento falho impede transporte. Outro tenant/chat/hash não obtém resultado alheio.                                                                                                                                                          |
| AC-7112 (P0) | RQ-7107/7108      | Resultado confirmado sobrevive à recriação do controlador/processo; falha de ACK/journal recupera a mesma saída sem nova chamada e sem novo compromisso.                                                                                                                                                                                                      |
| AC-7113 (P0) | RQ-7108           | Interrupção após marcar envio, timeout, falha de transporte ou gravação do resultado impede retry automático, inclusive após reinício/virada do dia; custo continua comprometido.                                                                                                                                                                             |
| AC-7114 (P0) | RQ-7108           | Cancelamento comprovado antes do envio libera compromisso. Reserva não enviada expirada pode ser retomada; registro enviado não recebe essa exceção. Corrupção/lock/relógio regressivo negam execução sem zerar limites. Invalidação por versão apaga o derivado, impede replay/reenvio e preserva outro tenant e compromisso já consumido.                   |
| AC-7115 (P0) | RQ-7109           | Embedding de trecho tem destino/finalidade/condomínio/versão/hash exatos, dimensão finita válida e reserva durável; repetição retoma sem nova chamada. Outro tenant/versão não reutiliza o vetor. Hash incorreto, orçamento excedido e ausência de autorização impedem envio.                                                                                 |
| AC-7116 (P0) | RQ-7107           | Sem controlador durável, chave e autorizador positivo não habilitam OCR, visão, síntese ou embedding. A exceção interna de contrato sintético exige fetch injetado, não funciona em produção e não é ligada ao startup.                                                                                                                                       |
| AC-7117 (P0) | RQ-7103/7107/7108 | Concluir sob política A, recriar executor/ledger e consultar sob B não entrega saída de A nem executa novamente. Recibo legado sem revisão e envio incerto sob A também bloqueiam B. Repetir sob A recupera a mesma saída confirmada, com uma chamada e um compromisso.                                                                                       |
| AC-7118 (P0) | RQ-7110           | Executor + orçamento + ledger + journal são compostos localmente: teto antes do envio, replay sem outra reserva, duas instâncias, falha entre stores e falha no journal sem nova geração. Mudança de usuário/membership/condomínio/política e erro de autorização impedem execução/entrega. A composição é injetável, não conectada por flag ao startup real. |

## Extensão local do ciclo de dados e recuperação

Exemplos adicionais da revisão de 11/11, ainda sob os mesmos requisitos:

- AC-7125: no servidor sintético real, enviar PDF confirmado, perguntar, conferir a página
  citada integral e repetir a mesma chave com resposta idêntica. Negar outro condomínio e
  página/versão inexistente; memória não pode servir somente o primeiro chunk da página.
  Arquivar nega página integral/replay, mantém trecho histórico; recuperar restabelece fonte
  autorizada. Outro tenant não muda. O leitor exige catálogo ativo, inclusive fora do startup.

- AC-7121: sem observador, manter a asserção de um `set_config` por documento antes da purga.
  Com observador, ambas as preparações antecedem a primeira purga; falha na segunda não executa
  nenhuma purga nem COMMIT e conserva a decisão externa já registrada.

- AC-7125: mudar o conteúdo integral da página fora do trecho citado, mantendo o trecho e o
  catálogo idênticos, nega replay sem nova geração/reserva. Mesma página inteira permite replay;
  ausência de hash privado da página nega. Histórico literal permanece disponível.
- AC-7128 / RQ-7118: as duas configurações documentais resolvem Vite com `envDir:false` e não
  carregam canário `.env.test.local` sintético em temporário próprio. Não ler `.env` do workspace.

- AC-7121/7122: duas purgas na mesma transação preparam todas as invalidações externas antes
  do primeiro trigger/lock do ledger. Retenção e reaplicação não esperam circularmente; repetir
  ou falhar conserva decisão, consumo e atomicidade. Testar dois documentos em SQL real.
- AC-7126: purga de todo o conteúdo remove também bytes/objetos órfãos de upload interrompido,
  inclusive sem versões, preservando B e o histórico. Purga individual não amplia esse escopo.
- AC-7125: uma primeira explicação `conflict` de fonte pending/disputed é permitida conforme
  o contrato de evidência; não equivale a confirmar vigência. Replay só ocorre com dependências
  idênticas e autorização atual; mudança de estado continua negada.

- AC-7125: pergunta confirmada/citada não é reapresentada como resposta corrente depois de a
  vigência virar pendente, disputed ou superseded, mesmo com texto/página idênticos. Conservar
  a revisão do catálogo das dependências e o histórico literal; não gerar novamente.
- AC-7127: usar o mesmo validador de AnswerPayload do consumidor. `answer/citations` isolados
  não confirmam uma síntese; o snapshot válido de `analysisOnly` confirma a entrega sem fala.
- AC-7124/7126: cada restauração usa destino novo/vazio da própria rodada; conferir URL,
  current_database e marcador antes de qualquer efeito. Outro sufixo, marcador ausente/
  divergente ou schema ocupado falham. Não usar DROP para resetar uma cópia já preenchida.

- **AC-7125 / RQ-7115:** replay HTTP sob política alterada/revogada, hash/versão/catálogo diferente ou procedência ausente nega, mesmo após recriar API/ledger; mesma política recupera sem nova geração ou reserva. Histórico literal permanece consultável. Incluir controles operacionais em setup/pergunta/upload.
- **AC-7126 / RQ-7116:** excluir pelo diretório real com recibos completed/unknown/cancelled preserva custos, expurga resultados, nega novo envio e mantém tenant B intacto. Callback transacional de versão/condomínio reverte integralmente em falha e reaplica após restore sem ressuscitar artefatos ou apagar consumo.
- **AC-7127 / RQ-7117:** cabeçalho 200 seguido de falha de stream, JSON inválido ou contrato inválido conserva UUID no reenvio explícito; sucesso válido o descarta. Progresso e troca de escopo preservam o contrato, sem retentativa automática.

- **AC-7120 / RQ-7112:** exportação com original idêntico/checksum, páginas/vetores/versões e histórico literal próprio; negar outro condomínio/usuário, documento purgado e payload acima do limite. Sem credenciais ou entrega externa.
- **AC-7121 / RQ-7112/7113:** purga elegível registra decisão fora do dump, invalida derivados do ledger e remove artefatos ativos; histórico/citações anteriores permanecem históricos. Falha de journal bloqueia efeito/ACK; falha do banco conserva decisão pendente e retomada segura. Outro tenant permanece idêntico.
- **AC-7122 / RQ-7113:** restaurar snapshot anterior à purga em quarentena, reaplicar decisões e negar original/busca/OCR/job antigo. Decisões de consumo ausentes no snapshot mantêm novas transferências bloqueadas, sem resetar tetos ou repetir transporte; verificador ausente/corrompido nega.
- **AC-7123 / RQ-7114:** sem prova confiável, política/owner/checksum divergentes ou resultado inválido não resolvem unknown. Prova sintética explícita confirma somente resultado conhecido, sem chamada externa/novo compromisso ou liberação automática de recibo operacional incerto.
- **AC-7124 / RQ-7112–7114:** percurso integrado em PostgreSQL local guardado com sessão, API, worker, JPEG/PNG, OCR simulado, embeddings, fonte/página/trecho, restart, exportação, purga e reaplicação. Transportes, documentos e segredos são exclusivamente sintéticos; startup real permanece negado.
