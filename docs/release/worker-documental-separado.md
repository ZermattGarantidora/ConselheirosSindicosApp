# Operação do worker documental separado — Spec 069

Preparação local autorizada em 05/11/2026. Este documento e `render.pilot.yaml` não contratam,
publicam nem autorizam dados reais. A região Virgínia é uma proposta editável, sujeita à aprovação
de localização e tratamento dos dados antes de importar o Blueprint. O arquivo `render.yaml`
continua exclusivo da demonstração sintética em RAM.

## Executar sem contratar

Ensaio totalmente local adicional de 09/11/2026, sem carregar arquivos de ambiente:

```powershell
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal -Suite worker
```

Requer Docker local e imagem pg17 em cache; não baixa nem cria serviço remoto. O wrapper usa
SCRAM/loopback, banco exclusivo marcado, build/relatórios em `.local/pilot-operations/<hex>`,
API/worker compilados em processos separados e encerra somente o próprio container. A prova
inclui 300 páginas, dez identidades, interrupção/retomada e isolamento. `-Suite rls` executa
a matriz RLS em outro banco exclusivo. Evidências atuais e limites estão na nota de infraestrutura.
O caminho local não certifica Render/Supabase nem autoriza OCR/IA ou dados reais.

1. Instalar pelo lockfile com `pnpm install --frozen-lockfile` e usar Node 24.
2. Preparar PostgreSQL/pgvector local com `pnpm run db:up` e `pnpm run db:migrate`, quando Docker/WSL
   estiverem funcionando. Um destino remoto exige TLS e a decisão operacional do ambiente.
3. Guardar `DATABASE_URL` e segredos em `.env.local`, fora do Git. `DEMO_MODE=false` é obrigatório.
   Na API, definir `DOCUMENT_WORKER_IN_API=false`. As sessões e autorização continuam da Spec 068.
4. Executar `pnpm run dev:api`, `pnpm run dev:web` e, em outro terminal, `pnpm run worker:continuous`.
   O worker lê o mesmo original privado e a fila do banco; não utiliza arquivos locais da API.
5. Para simular a publicação, executar `pnpm run build:api`, `pnpm run build:web`, iniciar a API
   compilada por `pnpm start` e o worker por `pnpm run worker:start`. Esses comandos compilados
   recebem variáveis do ambiente; não carregam automaticamente o arquivo local.

O comando `pnpm run worker` continua sendo a ferramenta de diagnóstico de **uma tarefa**. O
processo contínuo é `worker:continuous` em desenvolvimento e `worker:start` depois do build.

## Ensaio automatizado em processos distintos

`pnpm run test:worker:separate -- --provider=neon` usa o Neon sintético dedicado já autorizado.
O padrão é Neon; para Supabase sintético validado, usar `--provider=supabase`. O runner carrega os
arquivos locais, mas envia aos filhos somente a conexão sintética escolhida, confirmação e
variáveis operacionais necessárias, sem chaves de IA ou credenciais da demonstração.

**O ensaio apaga fixtures do banco sintético escolhido com TRUNCATE CASCADE.** Confere protocolo,
host, TLS, confirmação `synthetic-only` e marcador persistente antes disso. Nunca aceitar URL
do piloto/produção nem remover as guardas. Migrations precisam estar aplicadas previamente pelo
comando guardado correspondente. Executar isoladamente de outras suítes no mesmo banco.

O runner inicia uma API compilada em fixture sintética e o worker compilado em processos distintos.
A API de ensaio usa identidades de teste no cabeçalho, como a integração existente; isso não é
autenticação de produção. Verifica upload 202 sem worker, original e journal após reinício,
queda durante leitura, retomada da reserva, PDF de 300 páginas, fonte na página 300, dez
identidades, dois workers, tentativa antiga, esgotamento e PDF digitalizado sem OCR. Nenhuma API
paga é chamada. O relatório é `reports/worker-separated/latest.json`; latências refletem a máquina
de desenvolvimento e o banco sintético, sem comprovar capacidade no Render ou qualidade de IA.

## Reservas, erros e encerramento

- Uma tarefa por vez por processo; várias instâncias usam reservas do PostgreSQL.
- `DOCUMENT_WORKER_POLL_MS=1000`, `DOCUMENT_WORKER_LEASE_SECONDS=300` e
  `DOCUMENT_WORKER_HEARTBEAT_MS=30000`; heartbeat deve ser menor que metade do lease.
- Se desejar credencial própria, `DOCUMENT_WORKER_DATABASE_URL` tem prioridade sobre `DATABASE_URL`.
  Se o banco exigir certificado raiz próprio, definir `DOCUMENT_WORKER_SSL_CA` com seu PEM;
  a conexão verifica o certificado e não usa `rejectUnauthorized=false`.
  O login deve poder assumir somente os papéis necessários; nunca usar credencial administrativa
  como login normal de produção. Guardar o segredo no serviço, nunca no navegador ou Blueprint.
- SIGTERM/SIGINT param novas reservas e aguardam a tarefa atual. Se o host terminar o processo
  antes dela concluir, outro worker pode retomar após vencer o lease. O prazo de encerramento da
  hospedagem deve ser compatível com esse mecanismo; não há garantia de conclusão antes de kill.
  O Blueprint propõe `maxShutdownDelaySeconds: 300` (máximo documentado pelo Render), sem
  prometer que toda leitura termine nesse intervalo. O lease continua necessário.
- Renovação inválida/falha impede publicação pela tentativa; a transação conserva páginas e vetores
  atômicos. Uma tentativa vencida ou substituída não publica resultado antigo.
- Falha transitória volta à fila após cinco segundos. Esgotamento fica explícito como falha de
  leitura, inclusive quando o processo cai na última tentativa. Não redefinir tentativas em lote
  para esconder erro; investigar e usar o fluxo autorizado de reenvio de versão.
- Logs contêm somente códigos, contagens e duração. Acompanhar fila pendente, falhas repetidas,
  perda de lease, memória e tempo de leitura, sem copiar texto ou segredo para telemetria.

## Publicação futura e atualização

1. Concluir gates, revisão do diff e critérios operacionais das Specs 011/040/058; validar região,
   fornecedor, retenção, restauração completa e acesso individual antes de dados reais.
2. Provisionar banco de piloto distinto do sintético. Conferir versão/schema, fazer backup e
   aplicar migrations com `pnpm run db:migrate:remote` usando credencial de operador. O comando
   de integração e seu marcador não são migrations de piloto e nunca apontam para esse banco.
3. Revisar e importar `render.pilot.yaml` somente quando a contratação for decidida. O arquivo
   prepara dois serviços pagos e desliga deploy automático. Fixar ambos na mesma revisão revisada.
4. Configurar credenciais de API e worker e segredos estáveis de conta nos respectivos serviços.
   Somente a API precisa da chave de conversa. Validar workers com PDFs textuais sintéticos;
   o Blueprint não habilita OCR, análise paga de imagens ou gateway Codex local.
5. Publicar worker e API em revisão compatível, conferir saúde, fila, upload, conclusão e fonte.
   A ausência do worker preserva uploads na fila; não marcar recebimento como leitura concluída.
6. Em atualização, encerrar o worker coordenadamente e manter migrations compatíveis com as duas
   versões durante a troca. Recuar código somente se o schema e os contratos forem compatíveis;
   migrations destrutivas exigem plano próprio. Não apagar originais ou fila para liberar memória.

## Backup e recuperação

Antes do piloto, configurar e testar o backup completo do PostgreSQL, que inclui originais `bytea`,
documentos, fila, páginas, vetores, contas e histórico. Conservar separadamente a configuração e
os segredos estáveis necessários para restaurar sessões e cofres. Definir retenção, RPO e RTO.

Restaurar primeiro em destino isolado, verificar schema, permissões/RLS, originais/hashes,
histórico, páginas e consultas; só então alterar as conexões dos serviços. Jobs restaurados em
`processing` podem aguardar o lease e retomar; tentativas esgotadas falham explicitamente.
Testar leitura e escrita depois da restauração e conservar o ambiente anterior até validar o novo.
O ensaio de reinício desta spec e o backup lógico de journal da Spec 058 não substituem essa prova.

A Spec 070 acrescenta dump de todo `app` e comparação de conteúdo/segurança em dois bancos
**locais sintéticos**. Procedimento, decisões de custo, pendências de política e evidências em
`docs/release/pilot-2026-11-16-infrastructure.md`. A continuidade autorizada executou a prova
integral em PostgreSQL 17/pgvector local com SCRAM e ferramentas no container, incluindo
permissões, negação entre condomínios, corrupção, alterações revertidas e segredos de conta
exclusivamente fictícios. Isso não certifica restauração no Supabase efetivo nem libera piloto.
O script não aceita Supabase/Neon nem banco de piloto. Antes do ambiente efetivo, também é
obrigatório decidir como reaplicar exclusões e revogações ocorridas depois do backup.

## Limites de produto preservados

PDF escaneado sem OCR autorizado permanece em revisão. A síntese integral de lotes continua
restrita ao gateway Codex local autorizado; não é encaminhada à API por esta mudança. A adaptação
desse fluxo e a autorização de dados reais são trabalhos próprios antes de oferecer a mesma
experiência completa no ambiente hospedado. Nenhuma fala fixa é atribuída à Alvitra pelo monitor
de processamento e reabrir a conversa não dispara geração ou cobrança nova automaticamente.
