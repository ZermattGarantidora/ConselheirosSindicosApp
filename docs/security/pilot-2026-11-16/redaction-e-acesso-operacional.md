# Prova de minimização de registros e acesso operacional

**Estado:** contrato de ensaio sintético; configuração efetiva ainda não certificada.

## Contrato para os donos de API/worker/infraestrutura

Manter dados reais fora de logs, tracing, métricas, tickets, fixtures, evals e relatórios. Usar
somente event/status/errorCode fechados, contagens, duração, revisão e correlação pseudonimizada
necessária. Um ID correlacionável ainda pode ser dado pessoal; acesso e retenção precisam de
política. Não guardar segredo/código/cookie, corpo de request/response, pergunta/resposta,
payload de SQL, nomes de arquivos ou trecho de documento. Erro nativo não é diagnóstico seguro.

O logger do Fastify desligado não prova a plataforma. Inventariar separadamente API, worker,
router/proxy/CDN, host, banco, parser/subprocesso, gateway/provedor, observabilidade, storage,
console do navegador, backup, CI e atendimento. Não habilitar log_statement ou logs de queries
com parâmetros para investigar documento real. Backend de consumo também retorna erro fechado;
seu token de claim permanece apenas no processo e por hash no armazenamento privado.

## Matriz de ensaio — somente canários fictícios

| Entrada controlada | Falha/ação a disparar | Onde inspecionar |
|---|---|---|
| Código/token/cookie sintético, header Authorization e nome fictício | Login inválido, corpo enorme, sessão ausente, logout falho | API, proxy, console e trilha de suporte |
| Nome de arquivo e texto com canário sintético exclusivo por tenant | Upload inválido, parser/OCR falho, documento hostil, retrieval recusado | API, worker, parser, banco e artefatos de teste |
| Pergunta/resposta/model error sintéticos | Falha de transporte, timeout, cancelamento, protocolo ou citação inválidos | Gateway, logs de infraestrutura e diagnóstico público |
| Request UUID/fingerprint/claim sintéticos | Concorrência, falta de orçamento, commit perdido e resultado incerto | Recibo/counters sem payload/token aberto; erros fechados |
| Duas contas/condomínios fictícios | Consulta/export/purge/revogação cruzados | Todas as superfícies e relatórios minimizados |

Verificar saída esperada, ausência de canários privados/headers/corpos e ausência de conteúdo de
outro tenant. Registrar só código do cenário, superfície, status e hash do artefato sanitizado.
Não copiar logs reais para o repositório para fazer essa checagem. Evidência do destino precisa
ser observada por operador autorizado e revisor; testes unitários não certificam host/banco.

## Acesso operacional e mínimo privilégio

Separar migrador/provisionador, API, worker, suporte e revisor. API/worker não recebem segredo de
migration owner, permissões de faturamento ou acesso administrativo por conveniência. Validar
roles sem SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE, herança acessível e funções SECURITY DEFINER
com owner/search_path/grants revisados. Operador autentica pelo mecanismo aprovado com proteção
adequada e trilha; não presumir MFA cadastrado ou política de acesso aprovada.

Definir quem pode ler backup/export, restaurar segredo estável, rotacionar código, revogar acessos
e alterar limites. Toda alteração tem escopo, aprovação competente e evidência mínima; não
entregar segredos ao revisor ou participante como material de teste. Conta pessoal de IA não
autoriza payload real nem substitui contrato de fornecedor/gateway aprovado.

## Estado da evidência

Nesta frente, testes de acesso/budget verificam respostas genéricas, ausência de token/payload
nos cofres e erro do banco fechado. A frente documental declarou regressão sintética de logs
do worker. Nenhuma dessas provas certifica redaction do Render/Supabase/proxy ou configuração
de operadores. A inspeção efetiva e os responsáveis continuam dependências da liberação.
