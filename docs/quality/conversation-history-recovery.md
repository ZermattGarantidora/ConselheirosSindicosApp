# Ensaio de recuperação do histórico — Spec 058

O adaptador PostgreSQL conserva o journal canônico de cadastro, perguntas/respostas e falas sobre documentos. `historyPersistence=durable` no runtime identifica esse adaptador; `volatile` identifica a demonstração em RAM. A interface consulta o journal, carrega páginas anteriores e retoma valores confirmados do cadastro. Falha de leitura conserva o estado já carregado e informa o erro.

## Executar o ensaio sintético

Use somente o banco dedicado configurado conforme `scripts/neon-integration-guard.ts` (TLS, `NEON_INTEGRATION_CONFIRMATION=synthetic-only` e marcador persistente). A suíte principal continua `pnpm run test:integration`, após `pnpm run db:migrate:neon`. Ela limpa exclusivamente esse destino sintético. Não utilize `DATABASE_URL` de operação neste ensaio.

O teste AC-5801/5803/5809 grava mensagens dos dois lados e auxiliares, associa cadastro a chat, verifica idempotência e paginação, inicia outro processo Node e compara a recuperação. Gera um backup lógico com versão e SHA-256, serializa/deserializa a representação de arquivo e restaura em schema aleatório `history_restore_<32 hex>`. Compara IDs, textos e sequência, testa acesso cruzado e escrita posterior e remove somente o schema validado. Backup corrompido e destino `app` são rejeitados antes da escrita.

`scripts/conversation-history-backup.ts` implementa esse ensaio lógico. A restauração usa uma transação, cópia dos constraints/índices, FKs, RLS forçada e políticas do journal atual. Conserva o armazenamento original. O caminho Supabase usa seu próprio marcador quando esse ambiente estiver provisionado; a prova executada nesta tarefa é Neon.

## Ordem de recuperação e limites

1. Restaurar primeiro a fundação de contas, condomínios, vínculos e chats e as migrações correspondentes. O journal referencia essas identidades; o ensaio não substitui o backup completo do banco nem dos arquivos documentais.
   Na atualização inicial, drenar as instâncias antigas antes de executar o backfill da migração 034 e iniciar os novos escritores; o ensaio AC-5810 verifica a conservação das mensagens legadas. Não misturar escritores antigos sem journal com o adaptador novo durante esse corte.
2. Validar versão/checksum do snapshot e o destino isolado. Uma falha faz rollback, sem substituir o journal original.
3. Ler pelo adaptador `createPostgresConversationStore(pool, schemaIsolado)`, comparando contagem, IDs, conteúdos, ordem e isolamento. O schema alternativo só é aceito pelo código de ensaio, nunca por parâmetro HTTP.
4. Validar novamente autorizações e disponibilidade das fontes antes de disponibilizar leituras ou replay. Textos antigos permanecem históricos; fonte indisponível é marcada na consulta e não autoriza replay documental.

Os arquivos de backup contêm conteúdo integral e devem seguir a mesma proteção e retenção do banco. Neste trabalho somente dados sintéticos são permitidos. Nenhum conteúdo ou URL de conexão entra em logs ou fixtures.

A evidência sintética não valida retenção, RPO/RTO, chaves, agendamento ou recuperação de um ambiente real. Esses parâmetros e a revisão independente permanecem gates de lançamento. Não foi reiniciada nem migrada a demonstração aberta pelo usuário, e o banco principal não foi usado.
