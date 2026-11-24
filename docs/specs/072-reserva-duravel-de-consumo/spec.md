# Spec 072 — Reserva durável de consumo e recibos

**Status:** preparação local autorizada; integração e liberação pendentes
**Responsável:** segurança, engenharia e operação
**Atualizado em:** 2026-11-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

<!-- prettier-ignore -->
| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Problema e hipótese   | §§2 e 4            | Evita consumo repetido sem concluir ou recuperar a tarefa.                           |
| Público               | §3                 | Protege a coorte de síndicos contra abuso e gasto sem controle.                      |
| Proposta de valor     | §§5–6              | Mantém a conversa útil dentro dos limites, sem simular sucesso.                      |
| Prioridades do MVP    | §§7–8              | Prepara quotas de upload, pergunta, OCR/foto/síntese e setup dos blocos autorizados. |
| Segurança e confiança | §§8–10             | Isola reservas por condomínio/conta, minimiza recibos e falha fechado.               |
| Validação e métricas  | §§12–14            | Mede consumo e concorrência sem inferir qualidade ou aprovação de fornecedor.        |

### Limites respeitados

Somente preparação sintética, sem serviço/dependência, faturamento, prompt ou integração WhatsApp
novos. PostgreSQL existente e arquivo sintético; produção nasce negada por padrão. Limites/moeda
reais dependem de decisão. Não promete exatamente uma execução externa nem recupera resposta
que não foi persistida. Setup pré-condomínio contém só metadados operacionais de conta; toda
operação documental exige condomínio autorizado. Não ativa o caminho hospedado da Spec 071.

### Divergências da visão

Nenhuma. A autorização para concluir todo trabalho local disponível inclui proteção de custo e
idempotência; não dispensa decisões externas. Mantém o chat e o sequenciamento autorizado.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve proteção de custo e continuidade descritas no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso verificam consumo, repetição e isolamento.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Reservar trabalho/custo antes de executar e conservar recibo mínimo que impeça repetição automática
após resultado perdido, reinício ou alternância entre instâncias.

## 2. Promessa testada

> Uma tentativa iniciada não ganha permissão para consumir novamente só porque perdeu a resposta.

## 3. Usuário primário

Síndico participante e operador que limita gasto sem misturar contas ou condomínios.

## 4. Escopo

Política durável; tetos diários UTC de custo/quantidade por escopo e global; concorrência
compartilhada; reserva idempotente; claim único; conclusão com hash/custo observado; cancelamento
somente antes de iniciar; resultado incerto conserva reserva. Adaptadores local sintético e
PostgreSQL, wrapper injetável e testes. Integração central pertence aos donos de rotas/worker.

## 5. Fora do escopo

Preço/modelo, contratação, teto real, ativação, inferência, resposta/documento dentro do recibo,
reexecução automática de resultado desconhecido, liberação por timeout e purge sem política.

## 6. Pré-condições

Specs 011/058/068/070/071; ADRs 0002/0037/0040 (acesso)/0043/0044. Contexto do servidor,
política revisada e autorização atual. SQL revalida conta/condomínio/membership. A migration
040 preparada foi exercitada somente em bancos locais descartáveis; exige revisão e prova
no destino autorizado antes do rollout real.

## 7. Requisitos funcionais

### RQ-7201 — Reserva atômica e política

Política explícita/habilitada e revisão correspondente definem custo, quantidade e concorrência
por escopo e global. Valores nunca vêm de headers/corpo de cliente. Ausência, corrupção,
indisponibilidade ou divergência negam sem executar. Dia vem do armazenamento em UTC. Todos os
usuários do condomínio compartilham teto; somente finalidade `setup` aceita escopo de conta.

### RQ-7202 — Idempotência e claim

UUID/fingerprint SHA-256 identificam operação, finalidade, payload, política e escopo. Repetição
devolve recibo sem somar; outro payload/usuário conflita. Só uma transição `reserved → started`
permite executar, com token aleatório persistido por hash; recriar serviço não emite outro claim.

### RQ-7203 — Conclusão e incerteza

Estados `reserved`, `started`, `completed`, `cancelled`, `unknown`. Conclusão exige token, hash
do resultado e custo observado <= máximo reservado. Teto conserva o máximo, sem reembolso
otimista. Só `reserved` pode cancelar/liberar custo e concorrência; cancelamento ainda conta
como tentativa. Reserva de outro dia/revisão não inicia, mas pode cancelar. Erro/timeout depois
do claim conserva custo/concorrência como `unknown` até reconciliação competente, sem takeover.

### RQ-7204 — Autorização e journal

Autorizador da Spec 071 é consulta sem efeito de consumo. Wrapper revalida antes de reservar/
iniciar e antes de devolver resultado. Recibo concluído é durável antes do retorno. Se geração
terminar e journal falhar, retentativa não chama provedor: recupera resultado salvo por outro
contrato ou informa pendência. Não tratar hash como resposta recuperada. Finalização com token
pode contabilizar após revogação, sem permitir leitura ou entrega ao usuário revogado.

### RQ-7205 — Isolamento e minimização

Domínio exige condomínio/membership atuais. Reserva/leitura/cancelamento privados ao usuário/
escopo; global contém somente agregados. Guardar só IDs, hashes, finalidade, revisões, estado,
horários e custos; nunca payload, nomes, perguntas, códigos, IP, cookie, token aberto ou erro
nativo. Tabelas privadas com RLS/FORCE, funções de search_path fixo e política exclusiva do operador.

Recibos operacionais conservam UUIDs sem FK/cascade para domínio: excluir condomínio não pode
apagar consumo global nem liberar operação iniciada. A função exige entidade ativa/membership
atual para acesso normal; recibo órfão não concede acesso. Retenção/exclusão desses IDs exige
decisão específica e não é declarada resolvida pela preparação desta fatia.

## 8. Contratos

### RQ-7207 — Decisões sintéticas fora do snapshot

Preparar mecanismo operador local, sem rota pública nem flag positiva no startup. Somente banco
sintético exclusivo em loopback, marcador persistente, política sintética explícita, inventário
de migrations correspondente e processamento parado. Plano imutável autenticado por HMAC,
hash esperado ancorado pelo chamador, revisão, vínculo ao snapshot e allowlist de UUIDs fictícios.
Persistir/flush antes dos efeitos; ausente/adulterado/divergente falha fechado. Arquivo privado
fora do dump de `app`. Reaplicar idempotentemente em transação de manutenção/quarentena.

Ações fechadas: revogar membership, revogar conta/sessões e solicitar expurgo de versão/conteúdo
ao adaptador documental do dono. Callback recebe a mesma transação e só o escopo autorizado.
Exportação documental pertence à Spec 071. A política escolhe explicitamente o modo sintético,
sem prazo/base legal/retentor real presumidos. Revogar membership A não bloqueia conta global
que ainda participa de B. Revogar conta invalida códigos, sessões e desafios de autenticação.
Nada reabre API/worker, ativa provedor ou atesta apagamento de backups automaticamente.

### RQ-7208 — Consumo e reconciliação após restauração

Antes de efeitos restritivos, checkpoint autenticado conserva os recibos operacionais mínimos,
metadados de chamadas sem resultados, contadores globais/relógio e tentativas de login do banco
sintético parado. Reaplicar no restore soma por identidade estável, nunca duplica nem reduz custo,
quantidade ou bloqueio; divergência de fingerprint/moeda/política nega. Resultado ausente no
snapshot não é reconstruído: chamada sem resultado vira cerca incerta e não ganha envio.
Claims não são reemitidos. O hash do checkpoint é ancorado externamente ao dump pelo chamador.

Reconciliação é privilegiada, explícita e sob os mesmos locks de manutenção: orçamento
started/unknown pode concluir somente com resultado completed validado e correspondente ao
mesmo tenant, pedido, finalidade, revisão, custo e ID determinístico do ledger. Contabilizar o
máximo conservador; sem entrega automática. Cancelar orçamento só com prova durável de que o
ledger cancelou antes de dispatch; conservar tentativa. Dispatched/uncertain ou falta de prova
conservam unknown e compromisso. Recibos e unknown do outro tenant permanecem intactos.
Não há retry, refund presumido ou reconciliação baseada só em timeout/relato do operador.

### RQ-7206 — Integração documental local

Compor com a Spec 071 por `createHostedOperationBudget`: escopo privado revalidado, UUID
determinístico do pedido e revisão SHA-256 da revisão autorizada. O orçamento da Spec 072
é autoritativo para custo/quantidade/concorrência; o compromisso documental espelha defesa
de replay, sem ser somado como outra despesa. Na ausência de custo medido, esta composição
registra o máximo como custo contabilizado conservador em `actualCostMicrounits`, não como
fatura observada. Conclusão do resultado precede conclusão operacional; falha entre ambos
retém a reserva e pode permitir só recuperar resultado confirmado, nunca outro envio.
Replay confirmado é consultado antes de reservar de novo. Rotas de setup/pergunta/upload têm
composição injetável testada com sintéticos; ligação positiva ao startup continua pendente.
A integração documental isolada não certifica a configuração real dessas rotas.

`BudgetScope`: usuário e condomínio+revisão para domínio, ou conta para setup. `BudgetRequest`:
UUID, finalidade fechada, payload hash, revisão e custo máximo. Store com reserve/start/complete/
cancel/markUnknown; erros fechados denied/limit/conflict/in_progress/already_completed/unknown/
unavailable. Sem detalhes de banco, arquivo ou provedor. Finalidades documentais distinguem
`pdf_ocr`, `photo_ocr`, `photo_analysis`, `batch_synthesis` e `embedding`; upload/pergunta/setup
continuam explícitos e não compartilham fingerprint por omissão da finalidade.

## 9. Requisitos não funcionais

Sem nova dependência. Dois consumidores/reinício não renovam orçamento/claim. Custos inteiros
em microunidades e uma moeda por política, sem câmbio automático. Não apagar idempotência para
permitir retry. Recibos conservam a moeda; trocar moeda com recibos existentes bloqueia novas
reservas/claims, evitando somar microunidades de moedas diferentes. Retenção/backup/reconciliação
dependem de política e integração; mocks não certificam atomicidade SQL ou privilégios efetivos.
Relógio anterior ao timestamp de recibo já confirmado nega consumo, sem resetar cota. O
transporte continua responsável por deadline/AbortSignal; cancelar após envio não prova custo zero.

As suítes de validação sintética desativam a leitura automática de arquivos de ambiente pelo
Vite/Vitest (`envDir: false`) e recebem somente o ambiente explícito do runner guardado.
Limpar o ambiente do processo não basta, pois a ferramenta pode ler `.env.local` por padrão.
Regressão com canário em diretório temporário próprio deve provar a ausência dessa influência;
nenhum arquivo de credencial do workspace é lido para executar essa prova.
Instâncias Vite criadas dentro de um teste também declaram `envDir:false`; a configuração
externa do Vitest não é herdada. O objeto real do proxy local deve passar pelo mesmo canário
temporário, sem iniciar listener ou inspecionar o ambiente real para provar a guarda.

## 10. Critérios de sucesso

Concorrência respeita tetos; operação repetida não executa duas vezes; falha/revogação não entrega
resultado; recibos sobrevivem à recriação; nenhum conteúdo/segredo persiste. Gates locais e
rastreabilidade com limites de evidência claros.

## 11. Questões em aberto

Tetos/moeda reais, ligação positiva ao startup, fornecedor/política e retenção real. A integração
local e a reconciliação sintética exigem as provas registradas; não autorizam o destino real.

### Continuação local de autoria — RQ-7209

Os controles da Spec 073/Bloco 7 reutilizam o mesmo total de consumo, sem segunda despesa:
`document_write`, `document_review`, `document_improvement`, `audio_transcription`,
`audio_minutes_write` e `audio_minutes_review`. Identidades incluem usuário/condomínio/chat,
origem, etapa/revisão e payload; mudar política não cria identidade que contorne claim antigo.
Essas finalidades exigem permissão de gestão no SQL e autorizador corrente na composição.
Migration 043 amplia a função privada, sem habilitar política ou conceder acesso a tabelas.

No ensaio de restore da autoria, cofre local compartilhado da Spec 072 permanece fora do dump
e conserva completed/unknown após restaurar ponto anterior; resultado continua no journal
privado de conteúdo. Valores são fictícios e usam máximo conservador. Nenhum transporte,
destino real, política/custódia pública, moeda/preço ou backend de arquivo em produção é aprovado.
Alinha-se ao briefing §§7 Bloco 7, 8–10 e 13; melhora recuperação/controle sem módulo ou serviço.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, testes focados, revisão e gate estrutural. Liberação exige
política real, ligação central, resultado durável, SQL/isolamento reais e revisão independente.
