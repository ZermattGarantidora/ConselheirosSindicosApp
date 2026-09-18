# ADR 0012 — PostgreSQL gerenciado remoto para staging

**Status:** aceito para staging controlado  
**Data:** 2026-09-16

## Contexto

A autenticação real da Spec 006 precisa de PostgreSQL persistente. O Docker local
introduz uma dependência operacional no computador do usuário, enquanto a primeira
validação pode usar um banco gerenciado remoto. O ADR 0007 continua restrito ao banco
Neon de integração sintética e não autoriza dados reais.

## Decisão

- O código continuará usando PostgreSQL e a variável `DATABASE_URL`; nenhum provedor de
  identidade ou banco específico será embutido na aplicação.
- O staging poderá usar um PostgreSQL gerenciado remoto, com TLS obrigatório para hosts
  que não sejam locais (`sslmode=require` ou `sslmode=verify-full`).
- A aplicação pode permanecer local durante a validação e conectar-se ao banco remoto
  somente pelo servidor; o navegador nunca recebe a credencial do banco.
- `pnpm run db:migrate:remote` aplicará migrations em ordem e registrará cada arquivo em
  `app.schema_migrations`, evitando reaplicação acidental.
- A primeira execução exige um usuário administrativo capaz de criar o papel sem login
  `app_runtime` e conceder esse papel ao usuário da aplicação; a URL não deve ser exposta ao cliente.
- O banco remoto inicial deve conter somente dados sintéticos até que política de dados,
  retenção, região, backup e tratamento LGPD sejam aprovados para um piloto.

## Consequências

### Positivas

- Remove a necessidade de Docker no computador usado para a prévia.
- Mantém o PostgreSQL, o RLS e o isolamento por `condominium_id` já definidos nos ADRs
  0002, 0005, 0006 e 0011.
- Permite migrar a API para o mesmo provedor depois, sem alterar o contrato de persistência.

### Negativas e riscos aceitos

- Credenciais e dados de staging ficam sob responsabilidade de um terceiro e exigem TLS,
  segredo fora do repositório e revisão de privacidade.
- Um banco já existente sem histórico de migrations não é alterado automaticamente; a
  ferramenta interrompe para evitar duplicação e exige uma avaliação/baseline explícita.
- A disponibilidade do staging passa a depender de rede e do provedor escolhido.

## Fora do escopo

- Escolher ou contratar um provedor sem aprovação explícita.
- Enviar dados reais de clientes, documentos confidenciais ou credenciais ao repositório.
- Usar o banco Neon e o comando de integração sintética para produção ou contas reais.
- Trocar a autenticação própria por um SaaS de identidade.

## Gate para produção

Antes de um piloto público, registrar o provedor e a região, confirmar TLS e backups,
definir retenção/exclusão/exportação compatíveis com LGPD, habilitar observabilidade e
completar verificação de e-mail, recuperação de senha, rate limiting e revisão de segurança.
