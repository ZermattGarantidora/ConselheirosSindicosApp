# Runtime persistente autorizado — 25/11/2026

**Estado:** candidata local validada; não publicada/ativada no Render.  
**Revisão:** autorrevisão por IA do delta da Spec 078; não é aprovação independente.  
**Escopo:** manifesto operacional, admissão da API, TLS, preflight e migration 044.

## Resultado e limite

A API passa a poder compor os stores PostgreSQL existentes com a admissão persistente da
Spec 072. Ausência de manifesto mantém o bloqueio. Manifesto e política corrente precisam
concordar; contas, expiração, moeda, provedor/modelo e custos são configuração operacional
revisada, sem valores positivos escolhidos nesta tarefa. OpenAI e Gemini temporária já
autorizadas continuam suportadas, uma por manifesto, sem fallback silencioso.

O perfil inicial permite setup, perguntas e upload/processamento local de PDFs textuais.
Não habilita OCR/fotos/síntese hospedada, não altera o perfil vetorial, prompt ou fornecedor
por inferência da assinatura. Os contratos da Spec 071 continuam exigidos para esses formatos.

## Verificação do destino sem mutação de dados

No painel Render foram confirmados web e worker, ambos na revisão `6b78117`, processo do
worker e preflight de fila somente leitura. A API ainda tem as variáveis da demonstração e
Gemini; não foram encontrados `DATABASE_URL`, segredos de acesso/conta ou manifesto na lista
de variáveis/grupos vinculados do web. Nenhum valor secreto foi revelado/copiado.

No editor Supabase, transações `BEGIN READ ONLY`/`ROLLBACK` consultaram apenas catálogo e
estado operacional. Resultado: oito tabelas essenciais com RLS/FORCE, serviço sem superuser,
BYPASSRLS, CREATEDB, CREATEROLE ou replication; funções de orçamento/login existentes;
função nova 044 ainda ausente. Orçamento disabled, moeda BRL e limites não configurados.
Não houve INSERT/UPDATE/DELETE/TRUNCATE, migration, nova permissão ou criação de conta.

## Validação executada

- Focados da Spec 078: 59/59; cobertura statements/branches/functions/lines
  97,36/98,87/83,33/100%, sem exclusões. Relatórios exclusivos em `.local/persistent-runtime/`.
- Integração sintética/mocks existente de segurança/consumo: 177/177 em 15 arquivos.
- Primeira candidata global: 3.085 unitários; cobertura 85,78/82,17/91,07/87,61%.
  Adição posterior do caminho Gemini recebeu testes focados; o fechamento global final é
  registrado abaixo após sua execução, sem atribuir resultados anteriores a hash posterior.
- 275/275 E2E após permitir conexões HTTP locais; rodada inicial teve 37 EACCES em loopback,
  preservada separadamente. Não houve mudança de assertivas/timeouts para esse reteste.
- API e web compilados, tipos e ESLint aprovados. Formatação passou com os globs canônicos
  de `format:check`; validação estrutural aprovada para 78 specs; scanner passou na cópia
  publicável isolada, sem `.env` privado, caches ou credenciais.
- Evals determinísticos: 20/20 core e 50/50 documentários. Os 50 semânticos e revisão humana
  especializada permanecem pendentes; nenhuma inferência externa foi executada.

## Tentativas e correções

A primeira fixture esperava cancelamento automático após revogação entre reserva e claim;
o contrato existente conserva a reserva e seu compromisso. A asserção agora exige esse estado,
zero efeito e replay negado, sem mudar o runner. Outra fixture confundia o erro público da
falha inicial (`unavailable`) com o estado persistido (`unknown`): ambos são verificados, e a
segunda tentativa precisa ser negada como unknown sem novo efeito. Não se removeu proteção.

O primeiro segredo fictício do startup não tinha o formato hexadecimal exigido pelo serviço
de acesso; a fixture foi corrigida e o perfil agora valida as duas chaves antes de abrir pools.
Prettier no Markdown expandiu espaços do cabeçalho exigido pelo gate estrutural; o cabeçalho
foi restaurado, sem mudar o gate. A tentativa de formatação ampla de todos os documentos
encontrou 233 arquivos históricos fora dos globs canônicos; nenhum foi reformatado por isso.

A cópia isolada contém inventário/hash de 1.337 entradas; o junction de dependências foi negado
pelo sandbox, sem execução de instalação. Ferramentas estáticas resolveram dependências pelo
diretório ancestral. Unitários/E2E usam as fontes do workspace estabilizado e relatórios
exclusivos; alterações documentais posteriores têm seus gates repetidos e hashes próprios.

Uma chamada posterior do scanner pelo caminho do script manteve o diretório de trabalho do
workspace; foi interrompida sem resultado e substituída pela execução com `workdir` explícito
na candidata publicável. Somente essa execução isolada concluída é evidência aprovada.

## Pendências antes de ativar

Revisão independente da candidata completa e CI do commit; execução SQL guardada apropriada;
manifesto aprovado com contas, validade, política de dados e tetos; configuração das conexões
e segredos no web; migration 044; publicação conjunta e ensaio sintético com custo autorizado.
Backup/restore no destino e aprovação de dados reais continuam gates distintos.

Não houve rollout de política, chamada cobrada, uso de cliente real ou liberação do piloto.

## Fechamento da candidata local

A composição final, incluindo preservação de Gemini, passou **3.087 unitários e 275 E2E**,
com cobertura statements/branches/functions/lines **85,79/82,20/91,08/87,62%**. Fontes de
produção não mudaram depois dessas execuções. Relatórios finais:
`.local/persistent-runtime/final-unit-results.json`, `final-unit-junit.xml`,
`final-global-coverage/coverage-summary.json`, `final-e2e-results.json` e `final-e2e-junit.xml`.
Tipos/build API e lint repetidos após esse ajuste; formatação canônica e 78 specs aprovadas.

O usuário aprovou **R$100/dia** como teto global de IA para o piloto em 25/11/2026. Essa
decisão não aprova dados reais, novo fornecedor ou os demais limites propostos da Spec 073.
A ativação inicial permanece restrita à política sintética vigente e a uma conta de ensaio.
