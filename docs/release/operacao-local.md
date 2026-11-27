# Operação local, observabilidade e release

Atualização de 25/11/2026: o web Render já está contratado e a adaptação/domínios foi
autorizada. [Estado atual e DNS Wix](render-paid-2026-11-25.md) distingue mudanças efetivas
de preparação. As restrições históricas de contratação abaixo não impedem configurar o
serviço existente; banco, custo adicional, revisão e dados reais conservam seus próprios gates.

## Variáveis e segredos

Copie `.env.example` para `.env.local`; o segundo arquivo é ignorado pelo Git. Chaves reais só existem no cofre/ambiente escolhido quando houver infraestrutura. Nunca registrar conteúdo de documentos, perguntas, respostas ou tokens em logs.

## Logs e telemetria

Todo evento futuro deve ter `timestamp`, `level`, `event`, `requestId`, `condominiumId` pseudonimizado, `actorId` pseudonimizado, `module`, `outcome` e duração. Conteúdo documental, prompts e respostas ficam fora do log padrão. Eventos de acesso, negação, upload, resposta, citação, abstenção, feedback e revogação devem ser auditáveis conforme a Spec 001.

## Flags e versões

Funcionalidade nova ou comportamento de IA com risco deve nascer desativável por flag documentada, com dono, data de expiração, público/condomínio alvo e plano de rollback. Prompts, modelos, índices e datasets de eval devem ter versão rastreável.

## Release

Antes de piloto ou produção: executar `pnpm run check`, auditoria de dependências, testes/evals aplicáveis, threat-model review, backup/migração testáveis e registro de rollback ou forward-fix. Um achado alto/crítico de dependência, vazamento de tenant ou regressão de segurança bloqueia o release.

## Preparação do piloto de 16/11/2026

Estado: **preparado, não ativado**. A nota
`docs/release/pilot-2026-11-16-infrastructure.md` reúne comandos locais, orçamento indicativo,
dependências e resultados da Spec 070. Região, serviços, pagamento, política e RPO/RTO/retenção
continuam decisões do usuário. Não executar esta sequência no ambiente remoto enquanto a
restrição de contratação, provisionamento, publicação e dados reais estiver vigente.

### Atualização futura, após autorização e gates

1. Designar operador, substituto e canal de suporte. Registrar revisão atual, candidata e
   última revisão recuperável dos dois serviços, sem credenciais. Concluir integração das três
   frentes e revisar o diff completo da candidata estável; executar testes/evals, cobertura e
   status checks contra a revisão a integrar. Não fazer merge com P0/P1 pendentes.
2. Decidir região e fornecedores, política de dados e orçamento. Criar **futuramente** piloto
   distinto da integração sintética, com logins restritos e operador de migrations separado.
   Conferir `infrastructure/pilot/verify-access.sql` com cada login: API/worker sem privilégios
   elevados alcançáveis, `app_runtime`/`app_worker` NOLOGIN/NOBYPASSRLS, RLS forçada, negação de
   leitura direta de códigos/sessões e provisionamento negado ao runtime. A API pode precisar
   de funções de leitura de originais; conferir o contrato real antes de reduzir os grants.
3. Antes de mudança de schema, congelar escritores e parar novas reservas do worker; guardar
   backup completo recuperável e a configuração sem valores secretos. Ensaiar migrations em
   cópia isolada; exigir compatibilidade com as duas revisões durante a troca. Não usar os
   comandos `db:migrate:neon`/`supabase` sintéticos em piloto. O Blueprint não executa migrations.
4. Publicar manualmente ambos os serviços no mesmo SHA revisado, com schema compatível e
   worker incorporado desligado. `/health` verifica processo; não comprova banco, IA, gravação
   ou worker. Fazer jornada **sintética** pelo caminho persistente: entrada, chat, upload 202,
   original idêntico, leitura/citação, ambos os lados do histórico após reinício e acesso negado.
   Teste com provedor pago continua proibido até decisão explícita; registrar essa limitação.
5. Conferir queue/lease, memória, erros e ausência de conteúdo nos logs. Só reabrir após provas
   e autorização do piloto; registrar horário, revisão e evidência agregada.

### Rollback e recuperação

- Regressão de código com schema compatível: interromper novos uploads/gerações pela manutenção
  operacional, drenar worker e restaurar os dois serviços para o mesmo SHA conhecido. Não
  presumir que rollback de build restaure banco ou segredos. Repetir jornada sintética.
- Schema incompatível: não executar down migration improvisada nem apagar fila/originais.
  Manter manutenção e decidir forward-fix ou restauração isolada com operador e política.
- Restaurar primeiro em banco isolado sem aplicação/worker conectados. Conferir dump/manifesto,
  extensões, ownership/funções, grants/RLS, contas/sessões, hashes dos originais, páginas,
  vetores, fila, fontes e conteúdo/ordem dos dois lados do histórico. Fazer leitura **e escrita**
  com conta autorizada e teste negativo entre usuários/condomínios. Replica/backup de journal
  sozinho não cobre o ambiente. O ensaio local preparado não certifica o Supabase efetivo.
- Antes de reabrir, reaplicar exclusões e revogações posteriores ao ponto recuperado conforme
  política aprovada e fonte durável que não seja perdida no mesmo restore. Não reviver arquivo
  excluído, membership revogada, código antigo ou aparelho revogado silenciosamente. Esse
  registro e sua execução ainda dependem da frente de segurança e **bloqueiam liberação**.
- Só alterar conexões após comparação e autorização; preservar origem anterior sob retenção
  e acesso definidos. Jobs `processing` retomam após o lease; não zerar tentativas em massa.

### Recuperação de segredos

`ACCESS_CODE_SECRET` recompõe os códigos e valida suas revisões; perder/regenerar o segredo não
é uma restauração transparente. `AUTH_ACCOUNT_SECRET_KEY` protege segredos de conta existentes.
Preservar ambos em custódia separada do banco, com acesso nominal, titular/substituto, versão e
ensaio de recuperação, sem expor valores ou colocá-los no manifesto. URL/senha de banco,
credenciais de provedor e recuperação das contas Render/Supabase também precisam de inventário
e acesso de emergência separados. Esta entrega não escolhe cofre nem gera segredos reais.

Recuperação sem indício de comprometimento: restaurar versões compatíveis, conferir sessão/código
sintéticos e recursos de conta em destino isolado. Se houver comprometimento: conter primeiro,
revogar/rotacionar a credencial atingida e seguir o runbook de segurança; não restaurar confiança
ou sessões antigas apenas por terem passado no checksum. Segredos de IA podem ser reemitidos
futuramente pelo operador autorizado; não substituem os segredos estáveis de dados de conta.

### Observação, alertas e suporte

Nada foi conectado a monitor ou destinatário externo. Preparar alertas no provedor somente após
definir dono/canal, retenção e autorização. O operador pode usar
`infrastructure/pilot/operational-observation.sql` em canal privado; a consulta é somente leitura
e retorna agregados, sem identidades ou conteúdo. O limite de cinco segundos evita observação
pesada indefinida; medir custo antes de automatizar a consulta de hashes dos originais.

As duas consultas foram executadas em PostgreSQL 17 sintético na continuidade da Spec 070.
O SQL de acesso funciona com login NOINHERIT sem conceder USAGE, resolvendo objetos por OID.
O avaliador local `scripts/verify-pilot-observation.ts` classifica somente agregados sintéticos
e declara sinais/RPO ausentes, amostra antiga e nenhuma notificação enviada. Não é coletor ou
aprovação de thresholds. Procedimento completo de recuperação:
`pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal`.
Exige engine local, imagem pg17 em cache e recursos exclusivos; usa SCRAM e encerra só o
container que criou. A nota da frente contém recibos, escopo e limites do ensaio.

| Sinal | Limiar inicial proposto, a calibrar | Resposta operacional |
|---|---|---|
| Isolamento, exposição ou fonte fabricada | Uma ocorrência | Conter acesso/geração afetados imediatamente; preservar evidência mínima e acionar responsável de segurança. |
| HTTP 5xx/saúde falhando | Três verificações consecutivas em até cinco minutos | Verificar processo, banco e última revisão; manutenção se gravação não puder ser confirmada. |
| Fila sem progresso | Pendência por >10 min e nenhum término em 10 min | Conferir worker ativo, lease, conectividade e códigos de erro. Não apagar job. |
| Lease expirado/falha repetida | Qualquer job esgotado ou repetição de perda de lease | Investigar recurso/rede e retomada; reenvio somente no fluxo autorizado. |
| Memória/CPU/conexões/disco | Sustentado >80% do recurso ou limite conhecido | Reduzir novas admissões com sinal claro; medir e decidir dimensionamento, sem descartar histórico. |
| Backup atrasado ou restore divergente | Idade superior ao RPO decidido ou uma divergência | Suspender mudança/liberação; verificar cópia e recuperação com operador. |
| Custo | Faixas do orçamento a decidir | Rever uso e optar por limitação explícita, sem fallback pago; não presumir spend cap como teto global. |

Esses limiares são propostas, não SLO/SLA aprovados. Processo ativo e fila ociosa são diferentes:
ausência de conclusões sem pendência não é alerta de worker parado. O log atual do worker usa
`worker_started`, `worker_stopped`, `worker_queue_failed`, `worker_processing_failed`,
`worker_retry_failed`, `worker_lease_lost` e `worker_document_completed`; não emitir texto do job.
Métricas de CPU/memória/processo vêm do fornecedor depois da ativação, sem agente novo nesta fatia.

Em incidente: registrar início, código/sintoma e revisão; conter; confirmar durabilidade antes
de orientar retentativa; comunicar ao participante pelo canal humano aprovado somente o impacto
e próximo passo; escalar tratamento de dados ao dono de segurança; recuperar em isolamento;
validar e documentar causa/regressão sintética. Não copiar documento, resposta, token ou segredo
para ticket. O suporte do piloto precisa de titular/substituto e contato definidos antes do dia
16; nenhum canal, destinatário ou atendimento 24h foi inventado ou ativado aqui.
