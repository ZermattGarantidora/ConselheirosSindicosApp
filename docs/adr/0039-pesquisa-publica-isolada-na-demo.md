# ADR 0039 — Pesquisa pública isolada na demonstração

**Status:** aceito para implementação do teste local explicitamente solicitado  
**Data:** 2026-11-04

A Spec 065 permite somente pesquisa pública por opt-in de demonstração. Reutiliza Codex local
com web_search=live e filtro de domínios oficiais. Não habilita web no gateway que recebe PDFs,
no cadastro ou nos comentários de documentos. Refina a proibição geral de ferramentas do
ADR 0031 somente para este subprocesso público, sem autorização de dados reais ou produção.

O servidor escolhe um tópico constante; pergunta livre, histórico, perfil e trechos não chegam
ao pesquisador. Citações públicas usam URLs dos resultados reais, data e links na fala geral;
não simulam página/versão de documento. Resposta preserva o contrato existente de orientação
geral, sem conclusão local e sem replay seguro. Não acrescenta provedor, dependência, chave,
API paga ou schema de banco. Limites de pesquisa são explicitamente experimentais.

Por pedido explícito de 04/11/2026, a decisão de pesquisar um tópico público compatível é
automática; não depende do síndico solicitar a ferramenta. O servidor sinaliza o início da
tentativa para o chat mostrar “Pesquisando na internet” antes da resposta. Uma negociação por
cabeçalho antecipa somente o estado operacional, com envelope final de status/resposta; clientes
existentes conservam JSON normal. Preserva opt-in local, tópicos constantes, privacidade,
idempotência e destinos. A tarefa isolada e o prompt global permanecem inalterados.

Correção posterior do caso de Pinhais, em 04/11/2026: a descoberta pública de empresas de
limpeza de caixa d’água usa a mesma infraestrutura, com contrato isolado próprio e fontes
empresariais públicas observadas. Não cria marketplace ou contato externo. O município/UF
vêm exclusivamente de pedido do usuário e são reconhecidos em lista incorporada do IBGE,
obtida da [API de localidades](https://servicodados.ibge.gov.br/api/docs/localidades).
Não há dependência ou requisição nova ao IBGE em runtime. A retomada explícita consulta
somente a última pergunta autorizada localmente, sem enviar memória ao pesquisador. Política
oficial e política de prestadores são selecionadas no servidor; o prompt global não muda.

Documentação oficial consultada: [pesquisa web](https://learn.chatgpt.com/docs/web-search) e
[configuração](https://learn.chatgpt.com/docs/config-file/config-reference). O protocolo real
instalado foi conferido com pesquisa pública sintética: web_search inclui resultados com URLs.
