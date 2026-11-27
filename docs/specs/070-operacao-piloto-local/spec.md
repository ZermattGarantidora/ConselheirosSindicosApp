# Spec 070 — Preparação operacional local do piloto

**Status:** validação local executada; revisão da candidata e liberação externas pendentes  
**Responsável:** engenharia e operador a designar  
**Atualizado em:** 2026-11-25

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Evita perder o contexto necessário para continuar uma tarefa documental. |
| Público | §3 | Prepara a continuidade do atendimento aos síndicos no piloto autorizado. |
| Proposta de valor | §§5–6 | Conserva o trabalho da conversa e as fontes verificáveis em uma recuperação. |
| Prioridades do MVP | §7, Blocos 3 e 6; §8, Histórico das conversas | Detalha backup/restauração exigidos antes do lançamento, sem novas telas. |
| Segurança e confiança | §§8–10 | Confere contas, originais privados, RLS, páginas, vetores, fila e histórico juntos. |
| Validação e métricas | §§12–14 | Usa somente dados sintéticos e distingue preparação de prova operacional. |

### Limites respeitados

- Preparação local explicitamente retomada pelo usuário para 16/11/2026; não altera o prompt aprovado.
- Não cadastra cartão, contrata, provisiona destino remoto, publica ou chama IA paga.
- Não usa dados reais nem promove Neon sintético a piloto. Supabase de integração e piloto são distintos.
- Reutiliza PostgreSQL/pgvector e fila existentes; sem storage, pacote ou fornecedor adicional.
- Backup lógico integral significa todos os dados e objetos do schema `app`, inclusive originais
  `bytea`; não significa cópia do cluster, dos serviços Supabase ou dos segredos externos.
- Exportação/restauração implementadas nesta fatia recusam qualquer host remoto e só aceitam bancos
  locais descartáveis marcados. A adaptação ao ambiente efetivo depende de decisão e prova próprias.
- Reaplicar exclusões/revogações posteriores ao ponto restaurado usa somente política sintética
  explícita no ensaio local. A política real, sua aprovação e prova no destino permanecem pendentes.

### Divergências da visão

Nenhuma. Operação é requisito da memória durável do §8, sem antecipar blocos ou integrações futuras.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve a recuperação obrigatória da memória e do histórico.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para continuidade e zero incidente de isolamento.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Deixar configuração revisável, verificação de pré-condições sem conexão e ensaio executável de
recuperação integral local, com bloqueios e responsáveis explicitados antes do piloto.

## 2. Promessa testada

> Uma preparação incompleta fica identificada; recuperar os dados exige conferir a memória inteira,
> suas permissões e o acesso isolado antes de reabrir o serviço.

## 3. Usuário primário

Operador que dá suporte ao síndico e precisa recuperar conversas e documentos sem perda silenciosa.

## 4. Escopo

Pré-condições sem segredos/rede; Blueprint web/worker; backup consistente de `app` com checksum,
inventário de conteúdo e segurança; restauração em banco local vazio e distinto; runbook de
atualização, incidente, rollback e recuperação de segredos; levantamento oficial de custos.
Inclui plano restritivo sintético fora do ponto recuperado, reaplicado antes de conferir a
elegibilidade da cópia; não reabre serviço nem define retenção real.

## 5. Fora do escopo

Ativação, cron de backup remoto, contratação de cofre/monitor, política jurídica, aprovação de
fornecedor/região, RPO/RTO/retenção definidos unilateralmente, migração real e certificação de capacidade.

## 6. Pré-condições

Specs 011/040/058/069, ADRs 0002/0017/0030/0037/0040 (acesso)/0041/0042. Para o ensaio real local:
PostgreSQL com pgvector, CLI `pg_dump`/`pg_restore` compatível, somente fixtures sintéticas e ambiente
descartável. O CLI não carrega `.env.local` nem usa as conexões Neon/Supabase.
Configurações Vite/Vitest operacionais desativam explicitamente a descoberta de arquivos
de ambiente (`envDir:false`); ambiente filho mínimo, sozinho, não garante esse isolamento.

O CLI pode executar as ferramentas dentro de container Docker **local** existente e dedicado ao
ensaio quando elas não estiverem instaladas no Windows. A imagem PostgreSQL/pgvector já pertence
à stack. Exigir nome e labels sintéticos, imagem prevista, porta publicada somente em loopback,
diretório de saída dedicado montado em `/recovery` e engine local explícita. Não ler a configuração
pessoal do Docker, montar fonte/segredos ou baixar imagem automaticamente. Outros containers não
são alterados. Essa opção não autoriza container ou banco remoto.

`scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal` prepara essa opção em uma
engine já disponível, com imagem em cache (`--pull=never`), dados em tmpfs e ambiente filho mínimo.
Ao concluir, verifica ID/label e encerra somente o container que criou, sem remover containers,
volumes ou arquivos. O conteúdo de tmpfs é descartável; `-KeepContainer` conserva o próprio
ambiente sintético para diagnóstico. O wrapper exige confirmação antes de qualquer efeito.

## 7. Requisitos funcionais

### RQ-7001 — Preparação sem ativação

O verificador lê apenas Blueprint e decisões sem segredos, aponta pendências e sempre informa que
não autoriza ativação. Recusa configuração fora do subconjunto local suportado em vez de inferir defaults.
Não consulta contas, ambiente secreto ou serviços. Nenhuma aprovação é inventada a partir de testes.

Na adaptação autorizada de 25/11/2026, o contrato do Blueprint reutiliza o web existente
`alvitra-demo-sintetica` em Oregon e prepara somente o worker adicional. O plano já contratado
foi conferido no painel; esse fato não preenche decisões de política, banco, custo do worker,
restauração ou revisão. Os defaults negativos e `activationAuthorized=false` permanecem.

### RQ-7002 — Backup integral consistente

Exigir confirmação `synthetic-local-only`, loopback literal, nome descartável, marcador persistente e
papéis restritos. Exportar todos os objetos/dados de `app` em formato custom, sem suprimir ACLs,
e inventariar tabelas, sequências, funções, constraints, índices, RLS, grants e extensão no mesmo
snapshot. Conferir checksum SHA-256 do arquivo e guardar manifesto sem conteúdo ou credencial.
Manifesto só é concluído após dump bem-sucedido. Saída de subprocesso e erro do banco não viram log.

### RQ-7003 — Restauração isolada e verificada

Antes de gravar, exigir destino local marcado para restore, distinto da origem e sem schema `app`
ou outras tabelas de usuário. Não usar `--clean`, `--create`, TRUNCATE ou exclusão automática.
Exigir papéis e pgvector compatíveis. Restaurar em transação única com ACLs, recusar corrupção e
comparar inventário completo. Divergência mantém o destino em quarentena e falha explicitamente.
O ensaio completo verifica leitura/escrita, sessão, original/hash, histórico dos dois lados,
página/chunk/vetor, fila e acesso negado entre dois condomínios e usuários.

Com as migrations 039/040 atuais, semear e recuperar também resultados/estados do ledger,
recibos de orçamento e contadores de login. Executar os adaptadores com pools sintéticos
separados e mínimos, concorrência entre conexões e processos Node distintos antes/depois do
restore. Reuso sob outra revisão de política deve falhar sem reenvio, inclusive para resultado
incerto; a revisão original pode recuperar somente o resultado confirmado. Defaults reais
continuam negados. Política positiva existe exclusivamente no banco descartável de fixture.

### RQ-7004 — Operação, custo e decisões pendentes

Documentar atualização/rollback compatível, incidentes, alertas agregados sem conteúdo, dono e canal
de suporte pendentes, recuperação de segredos estáveis em custódia separada, RPO/RTO/retenção sem
aprovação presumida, reaplicação de exclusões e revogações após restore. Preços têm data, fonte
oficial, parcelas fixas/variáveis e limites. Nenhum valor é orçamento aprovado.

Preparar avaliação local de agregados sintéticos para os alertas propostos do runbook: isolamento,
integridade do original, saúde HTTP, fila sem progresso, falhas/leases, recursos, backup e frescor
da amostra. Fila ociosa não é falha. Ausência de métrica/RPO não pode parecer cobertura completa.
Entrada desconhecida ou inválida é recusada sem repetir valores. O relatório sempre identifica
limiares não aprovados, nenhuma notificação enviada e nenhuma autorização de ativação.

### RQ-7005 — Reaplicação restritiva após o ponto recuperado

No ensaio local guardado, registrar um plano privado versionado e autenticado fora do schema
`app` e do dump. A política/revisão sintéticas e a allowlist de UUIDs fictícios são explícitas;
ausência, adulteração, revisão, inventário ou escopo divergentes impedem a elegibilidade da cópia.
Conservar o plano e seu digest antes dos efeitos. Decisões posteriores ao snapshot têm sequência
e são reaplicadas de forma idempotente por um processo novo, com a cópia ainda em quarentena.
O processo auxiliar confere antes de conectar um recibo externo que vincula destino, rodada e
hash do manifesto. O orquestrador cria esse destino novo e o marcador de quarentena vinculado
à mesma rodada/snapshot; o auxiliar não prepara ou reutiliza um destino arbitrário.

Reutilizar os controles da Segurança (`synthetic-maintenance-plan`/`synthetic-data-controls`)
e o callback transacional de expurgo da frente Documentos. Não implementar outra autorização ou
outra política de exclusão no runner. O plano declara o modo sintético do histórico/citações;
original, páginas, chunks, vetores e resultados derivados da versão excluída não podem reaparecer
como conteúdo atual. Reaplicar revogação de sessão/associação e, quando previsto no plano, expurgo
de conteúdo do condomínio. Verificar que outro tenant permaneceu intacto.

Comparar o fence dos recibos operacionais/ledger sem resultados: excluir conteúdo não pode apagar
compromisso, custo conservador ou estado incerto. Nenhuma reconciliação no ensaio autoriza envio
ou libera unknown sem prova durável de resultado confirmado ou cancelamento anterior ao dispatch.
Executar sem transporte de IA, chaves reais ou dados de cliente; o relatório permanece com
`activationAuthorized=false`. O ensaio não promete registro externo durável fora da falha no
ambiente real, não escolhe prazo/base legal e não altera o startup persistente negado.

## 8. Contratos

- `scripts/verify-pilot-preparation.ts`: análise local; `--require-decisions` falha com pendências.
- `infrastructure/pilot/operations-decisions.example.json`: metadados sem credenciais; pendente por padrão.
- `scripts/pilot-recovery.ts`: biblioteca local, sem efeitos ao importar; nomes
  `alvitra_ops_source_<hex>` e `alvitra_ops_restore_<hex>`; marcador `ops_control.environment`.
- `scripts/verify-pilot-recovery.ts`: ensaio explícito local; confirmação obrigatória; sem IA ou rede remota.
- Ensaio de RQ-7005: processo isolado e ambiente mínimo, plano privado fora do dump e controles
  injetados dos donos; conserva relatório exclusivo, hashes de entradas e evidência negativa.
- Wrapper `-Suite documents`: executa somente a configuração fixa
  `tests/vitest.pilot-document-lifecycle.config.ts`, de propriedade da frente Documentos, em
  dois bancos `source`/`restore` locais novos. Publica URLs/identificador somente no ambiente
  mínimo do filho, sem `.env`; config ausente é recusada antes de criar recursos. A configuração
  e seu teste produzem prova agregada exclusiva de ciclo documental, sem transporte externo.
- `PILOT_RECOVERY_DOCKER_CONTAINER`: opção explícita para as ferramentas de um container local
  `alvitra-ops-<hex>`, inspecionado sem ler `Config.Env`; ausente preserva ferramentas nativas.
- `.github/workflows/pilot-operations.yml`: execução manual, serviço PostgreSQL sintético efêmero,
  sem credenciais remotas; não dispara nesta entrega e não é evidência de CI aprovado.

## 9. Requisitos não funcionais

Nenhum segredo em argumentos de subprocessos, manifesto ou mensagens; ambiente filho mínimo,
sem herdar chaves de IA. Temporários exclusivos. Zero destino remoto ou dados reais; cobertura
focada >=80% nos quatro indicadores quando executada, sem substituir cobertura global.

## 10. Critérios de sucesso

Aceitação vinculada a testes e resultados registrados na nota da frente. O ensaio PostgreSQL
não executado continua bloqueando a prova de recuperação. Merge, prontidão do piloto e gates
globais exigem revisão da candidata coordenada e não são aprovados por esta spec.

## 11. Questões em aberto

Serviços, região, revisão a publicar, proprietário de operação/suporte, permissões finais de
logins, custódia/cifra dos backups reais, orçamento, RPO/RTO/retenção e operação efetiva das
exclusões pós-restore. A prova sintética de RQ-7005 não aprova essas decisões.

## Gate competitivo

Mantém conversa e blocos autorizados; melhora continuidade e confiança; conserva isolamento,
abstenção e decisão humana. Diferencia pela memória documental recuperável. Testes de restore e
isolamento demonstram a propriedade. Scripts locais reutilizam PostgreSQL e não criam SaaS novo.

## Gate para mudar o status

Não declarar validação integral sem execução de restore com PostgreSQL, ensaio de isolamento,
gates aplicáveis e revisão. Não declarar piloto pronto sem decisões operacionais e políticas
aprovadas e prova no ambiente efetivo, inclusive exclusões e revogações pós-restore.
