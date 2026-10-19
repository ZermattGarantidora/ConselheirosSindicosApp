# ADR 0021 — Render para demonstração sintética pública

**Status:** aceito para demonstração sintética
**Data:** 2026-10-15

> Em 2026-10-19, a proibição de provedor de conversa neste serviço foi revisada pela decisão
> explícita do usuário registrada no ADR 0025. Permanecem modo demonstração, ausência de
> banco persistente, somente dados fictícios e segredos fora do repositório.

## Contexto

É necessário testar a experiência web da Alvitra fora da máquina de desenvolvimento. O ambiente não
tem autorização para receber dados reais, executar piloto ou persistir documentos de clientes. Os
ADRs 0006, 0007 e 0012 preservam essas restrições.

## Decisão

- Usar um Web Service gratuito do Render somente para uma demonstração sintética.
- Executar API Fastify e build React sob a mesma origem HTTPS; a API serve os ativos produzidos pelo
  Vite para preservar cookies e rotas relativas sem liberar CORS entre origens.
- Fixar `DEMO_MODE=true`, desabilitar Gemini e não configurar `DATABASE_URL`, credenciais, chaves ou
  provedores de dados no ambiente.
- Declarar a configuração em `render.yaml`, com build reproduzível pelo lockfile, endpoint `/health`
  e diretório publicado explícito.

## Consequências

- A demonstração permite validação remota da interface, mas sem provedor não produz falas da
  Alvitra; reinícios apagam todo o estado em memória e nenhum dado real pode ser usado. A conversa
  gerada exige outra decisão de implantação e custo, conforme ADR 0022.
- A limitação de inatividade do plano gratuito é aceitável para prévia; não é SLA ou piloto.
- Um ambiente persistente exige decisão operacional adicional conforme Spec 011, incluindo região,
  backup, LGPD, autenticação, observabilidade e revisão de segurança.
