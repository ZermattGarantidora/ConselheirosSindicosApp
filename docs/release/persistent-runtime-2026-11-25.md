# Runtime persistente — candidata de 25/11/2026

**Estado:** candidata local validada; ativação e ensaio remoto pendentes.

**Decisão de consumo:** usuário aprovou R$100 por dia para todo o piloto em 25/11/2026.
Conservar BRL, sem converter recibos existentes nem multiplicar esse teto por conta/condomínio.
Liberação inicial somente sintética; dados reais continuam sujeitos à política própria.

## Destino observado sem alterar a política

No Render, web `alvitra-demo-sintetica` e worker `alvitra-pilot-documents` estão presentes.
O worker usa `node dist/api/worker/main.js` e revisão `6b78117`; seu preflight usa transação
somente leitura, assume `app_worker` e consulta a existência de `app.processing_jobs`.
Não confundir conexão aprovada com validação integral do fluxo documental.

Consulta somente leitura no Supabase confirmou schemas de orçamento e ledger existentes,
membership do serviço em `app_runtime`/`app_worker` e RLS/FORCE nas tabelas de chats,
anexos, `conversation_entries` e setup. A política de orçamento está **disabled**, em BRL,
com limites de quantidade/concorrência não configurados. Não houve UPDATE, migration,
gravação de conteúdo ou exposição de credenciais nessas consultas.

## Composição entregue

A Spec 078 liga a admissão de setup/pergunta/upload ao manifesto operacional e ao orçamento
PostgreSQL. Ausência do manifesto conserva o bloqueio anterior. Manifesto válido delimita
contas, data de expiração UTC, moeda, modelo e custos máximos por operação. Referências de
aprovação/dados são metadados da decisão competente, não aprovação produzida pelo software.

O SHA-256 canônico de todo o manifesto deve corresponder à revisão enabled no banco. A
migration `044_persistent_execution_admission.sql` acrescenta somente uma consulta booleana
privada; não habilita política nem concede acesso direto às tabelas de orçamento. A admissão
reconsulta essa função e o contexto atual em execução/replay. Recibos e reservas existentes
não são apagados ou convertidos. O valor contabilizado é o máximo conservador, não fatura.

A configuração TLS da API e da conexão de sessão verifica certificado remoto, inclusive
quando a URI usa `sslmode=require`. `DATABASE_SSL_CA` pode fornecer CA PEM. Nunca trocar
por `no-verify` ou desabilitar `rejectUnauthorized` para contornar erro.
Somente `sslmode` e `application_name` são aceitos na query string, sem duplicatas;
overrides como `host`, `hostaddr`, `ssl` e parâmetros de arquivos TLS são recusados.

Preflight do perfil autorizado confere schema/funções, RLS forçada e papéis antes do listener.
Falha fecha os dois pools e não abre demo como fallback. A primeira fatia contempla PDFs
textuais e as capacidades locais do worker. OCR/fotos/síntese hospedada continuam exigindo
autorização e controle próprios da Spec 071, sem liberação por flags antigas.

## Preparação concreta para decisão do operador

1. Copiar o [formulário vazio](../../infrastructure/pilot/persistent-execution-policy.example.json)
   para configuração privada e preencher somente as decisões efetivamente aprovadas.
   `null`/lista vazia tornam o formulário inválido; não são defaults de produção.
2. Selecionar a revisão da política de dados e referência da aprovação; definir contas, expiração,
   moeda e máximos conservadores de setup/pergunta/upload, incluindo reparos do fluxo existente.
   Definir também tetos diários/concorrência na política persistente da Spec 072.
3. Conservar o provedor aprovado no manifesto (`openai` ou `gemini`) e o mesmo modelo do
   ambiente. OpenAI exige `OPENAI_ANSWER_ROUTING=single`; Gemini mantém `GEMINI_MODEL` ou
   seu default existente. Desativar explicitamente o outro provedor para não haver fallback.
   O código não troca o provedor nem aplica otimização global silenciosamente.
4. Calcular a revisão com `budgetDigest(manifesto)` e revisar o conjunto completo antes de
   aplicar a migration 044 e a configuração no destino autorizado. Conferir funções/grants.
   Uma moeda diferente de recibos existentes exige decisão de manutenção; não zerar recibos.
5. Configurar `DATABASE_URL`, CA quando necessária, `ACCESS_CODE_SECRET`,
   `AUTH_ACCOUNT_SECRET_KEY` e a chave do provedor selecionado exclusivamente no serviço/cofre autorizado.
   `ALVITRA_PERSISTENT_EXECUTION_POLICY` recebe o JSON aprovado. Não imprimir valores.
6. Publicar API e worker no mesmo SHA revisado, sem serviço ou assinatura adicional.
   O fato de o serviço estar contratado não aprova gasto de IA ou documentos reais.
7. Executar jornada sintética própria, com custo máximo aprovado: código, setup, conversa,
   upload de PDF textual, processamento, pergunta/citação, histórico nos dois lados após
   reinício e outro aparelho, negativas entre contas/condomínios. Não usar TRUNCATE, os
   comandos de integração sintética ou dados reais no destino persistente.
8. Medir restauração em destino isolado antes de liberar participantes. Aplicar exclusões e
   revogações posteriores ao backup antes de reabrir. O ensaio local anterior não prova Supabase.

## Validação

`pnpm run test:persistent-runtime` não conecta serviços ou carrega `.env`; relatórios e
cobertura ficam em `.local/persistent-runtime/tests-<timestamp>-<pid>/`.
As evidências finais, tentativas iniciais e limites ficam no review desta candidata.
Não declarar que passou em SQL real, restaurou Supabase ou publicou com base nesses mocks.
