# Operação local, observabilidade e release

## Variáveis e segredos

Copie `.env.example` para `.env.local`; o segundo arquivo é ignorado pelo Git. Chaves reais só existem no cofre/ambiente escolhido quando houver infraestrutura. Nunca registrar conteúdo de documentos, perguntas, respostas ou tokens em logs.

## Logs e telemetria

Todo evento futuro deve ter `timestamp`, `level`, `event`, `requestId`, `condominiumId` pseudonimizado, `actorId` pseudonimizado, `module`, `outcome` e duração. Conteúdo documental, prompts e respostas ficam fora do log padrão. Eventos de acesso, negação, upload, resposta, citação, abstenção, feedback e revogação devem ser auditáveis conforme a Spec 001.

## Flags e versões

Funcionalidade nova ou comportamento de IA com risco deve nascer desativável por flag documentada, com dono, data de expiração, público/condomínio alvo e plano de rollback. Prompts, modelos, índices e datasets de eval devem ter versão rastreável.

## Release

Antes de piloto ou produção: executar `pnpm run check`, auditoria de dependências, testes/evals aplicáveis, threat-model review, backup/migração testáveis e registro de rollback ou forward-fix. Um achado alto/crítico de dependência, vazamento de tenant ou regressão de segurança bloqueia o release.
