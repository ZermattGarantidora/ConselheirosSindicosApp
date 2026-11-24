# Spec 065 — Pesquisa web pública na demonstração

**Status:** implementada e ativa na demonstração local; testes técnicos aprovados, sem liberação de produção  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Permite demonstrar pesquisa de orientação pública sem anexos. |
| Público | §3 | Atende ao síndico apresentando a Alvitra aos sócios. |
| Proposta de valor | §§5 e 6 | A Alvitra identifica a necessidade de orientação pública atual e pesquisa na conversa sem exigir um comando do síndico. |
| Prioridades do MVP | §7, Blocos 2 e 6 | Experimenta orientação geral com fontes oficiais, sem novo módulo. |
| Segurança e confiança | §§8–10 | Não envia documentos, cadastro, histórico ou pergunta livre ao pesquisador; só tópicos públicos predefinidos. |
| Validação e métricas | §§12–14 | Mede ferramenta real, links, isolamento, recusa e disponibilidade. |

### Limites respeitados

O usuário pediu liberar somente para testes de apresentação aos sócios. Desligada por padrão,
restrita a DEMO_MODE local com Codex, sem ambiente de produção, provedor novo ou API paga.
O gate competitivo mantém o chat, melhora utilidade da orientação sem diminuir o diferencial
documental; benefício é verificável por um smoke público e testes de privacidade. O custo
permanente limita-se a uma opção removível; não amplia os oito turnos ou oito fontes documentais.
Não pesquisa dados privados, PDFs ou pessoas, nem gera parecer definitivo. A correção do caso
de 04/11/2026 permite localizar empresas de limpeza/higienização de caixas d’água usando somente
serviço constante e município/UF explicitamente informados pelo usuário. Não é marketplace,
contato, orçamento ou contratação; respeita briefing §§4–6, 9–11 e o gate competitivo do chat.

### Divergências da visão

Nenhuma. Fontes públicas servem à orientação geral prevista no briefing §9. Não substituem
as evidências autorizadas dos fatos locais. O prompt global/persona aprovado permanece intacto;
o pesquisador recebe uma tarefa isolada, apresentada em prompt.md antes da aplicação.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Demonstrar uma pesquisa pública real decidida pela Alvitra conforme o assunto da conversa, com fontes clicáveis verificadas
no protocolo da ferramenta e sem oferecer pesquisa privada ou capacidade de produção.

## 2. Promessa testada

> Pergunte sobre um tema público compatível; quando precisar consultar fontes atuais, a Alvitra mostra “Pesquisando na internet” e depois responde com as fontes.

## 3. Usuário primário

Síndico demonstrando o app local aos sócios, com dados sintéticos.

## 4. Escopo

Perguntas sobre os tópicos públicos compatíveis acionam a pesquisa automaticamente, inclusive
sem os verbos pesquisar/buscar. Pedidos explícitos continuam aceitos. Uma recusa explícita de
pesquisa prevalece. Perguntas somente sobre documentos enviados ou fatos do condomínio não
trocam a base privada por uma pesquisa geral. Uma retomada ambígua não envia histórico à web.
Tópicos canônicos: assembleias virtuais, atribuições do síndico, prestação de contas,
convenção/regimento, manutenção preventiva, acessibilidade e proteção de dados em condomínios.
O texto livre serve somente para escolher o tópico no servidor: apenas a consulta pública
constante é enviada ao Codex. Fontes restritas a domínios oficiais brasileiros gov.br,
leg.br e jus.br. Até três links de resultados reais, consulta sem memória e geração isolada.

Exceção delimitada para descoberta de prestadores: perguntas que procuram empresas de
limpeza/higienização de caixas d’água em município reconhecido acionam pesquisa pública, sem
exigir comando. A localidade é validada contra lista pública do IBGE incorporada ao código;
somente nome canônico do município e UF atravessam a fronteira. Sites empresariais públicos
HTTPS podem apoiar nomes e área atendida; não comprovam qualidade, licença, disponibilidade
ou adequação. Não enviar endereço, nome/CNPJ do condomínio, contatos, perfil ou pergunta livre.

## 5. Fora do escopo

Pesquisa arbitrária, documentos/pessoas/CNPJ do usuário, notícias gerais, navegação automática
em toda resposta, fatos privados, lançamento, merge, migração e novas credenciais.
Outros serviços, ranking comercial, coleta de contatos, orçamento e contratação continuam fora.

## 6. Pré-condições

Specs 026/042/058/061, ADRs 0031/0038/0039, Codex autenticado e localhost.

## 7. Requisitos funcionais

### RQ-6501 — Opt-in local e decisão automática de pesquisa

ALVITRA_DEMO_WEB_SEARCH_ENABLED=true exige DEMO_MODE=true, CODEX_ANSWER_ENABLED=true e ambiente
não production. Ausência mantém a web desligada. Consultas documentais e configuração não
recebem ferramentas. Tema não suportado recusa sem chamada; não usa a pergunta livre como fallback.
Com a opção ativa, a política local reconhece tópicos públicos que precisam de fonte oficial
atual, sem exigir que o síndico peça para pesquisar. Não amplia temas, domínios ou destinos.
Mantém consultas documentais no caminho de recuperação e respeita pedidos para não pesquisar.
Detalha briefing §§1, 4–6, 7 (Blocos 2 e 6), 9–10 e 13 e a solicitação de 04/11/2026.
O gate competitivo reduz atrito no chat e conserva isolamento e fontes, sem novo serviço ou
chamada de classificação. O contrato oficial e o prompt global não mudam; o contrato isolado
de prestadores está explicitado em RQ-6504.

### RQ-6504 — Prestador público e retomada explícita

O caso “empresa de limpeza de caixa d’água em Pinhais PR” deve iniciar pesquisa pelo mesmo
canal de progresso. “Pesquise na internet”, sem novo assunto, pode retomar somente o último
pedido do usuário no mesmo chat e condomínio autorizado, se ele resolver um tópico público
suportado. Não procurar em turnos anteriores a uma mudança de assunto, perfil, respostas da
assistente ou documentos. A memória é lida localmente apenas para escolher a consulta;
nenhum histórico bruto é enviado. Sem tema recuperável, seguir conversa normal em vez de
invocar o pesquisador com tópico vazio e retornar erro genérico. Recusa explícita prevalece.

Essa exceção altera apenas o contrato isolado de descoberta de prestadores, apresentado em
`prompt.md` antes da aplicação; o prompt global não muda. O backend seleciona a política de
fontes, sem opção controlável pelo corpo HTTP. O contrato oficial continua restrito a fontes
oficiais. URLs empresariais exigem resultados reais da ferramenta, HTTPS e hostname público,
sem IP, credenciais, porta alternativa, domínio local ou endpoint de ação/contato.

### RQ-6502 — Fronteira de privacidade e fonte

Pesquisa não carrega memória nem busca documental. Gateway recebe zero evidências e nenhum
conversationContext; exige esse contrato. O subprocesso recebe apenas tarefa fixa e tema público.
Todas as ferramentas locais/apps/MCP/agentes/skills seguem desabilitadas; somente web hospedada.
Eventos de ferramenta inesperados, fluxo incompleto, fonte fora da lista, link inventado ou
resposta sem referência verificável são recusados. Links precisam constar de resultados reais
de web_search e não podem ter credenciais, porta alternativa ou protocolo perigoso.

### RQ-6503 — Fala, histórico e limites

Resposta de orientação geral (abstained significa ausência de conclusão documental local),
com links públicos no próprio texto e data da pesquisa, sem fingir página/versão de PDF.
Mantém gravação normal e idempotência por condomínio/chat. Resposta web não entra no replay
de memória como evidência local. Falhas não simulam sucesso nem migram para outra API.
Renderer aceita somente links oficiais HTTPS; HTML continua literal e links usam noreferrer.
Ao iniciar a tentativa de pesquisa no servidor, o cliente mostra exatamente “Pesquisando na
internet”, como estado operacional acessível, antes da resposta. Não exibir esse estado em
consulta normal, falta de autorização, tema não suportado ou repetição já salva. Ao terminar
ou falhar, retirar o estado e apresentar resposta/falha pelo fluxo existente. Não atribuir uma
pesquisa concluída à Alvitra sem resultados reais. O aviso não é salvo como fala da assistente.
Exceção de apresentação da Spec 048: a raiz exata HTTPS da Zermatt verificada também pode
ser clicável; não é fonte legal nem amplia a lista de domínios permitidos ao pesquisador.

## 8. Contratos

Gateway isolado retorna orientação geral com referências [1] convertidas em links pelo servidor.
JSON intermediário exige answer e sourceUrls; URLs são confrontadas com resultados de ferramenta.
Sem alteração do contrato de citação documental ou persistência de produção.
O cliente pode negociar progresso por cabeçalho. Somente uma tentativa web iniciada antecipa
os cabeçalhos HTTP com um sinal de progresso; o corpo final carrega status e resposta. Clientes
sem negociação conservam o JSON normal. A autenticação, o condomínio e o chat são verificados
antes do sinal. Erro posterior continua erro no envelope, sem resposta vazia ou sucesso falso.

## 9. Requisitos não funcionais

Até 180 segundos por processo, diretório efêmero isolado e remoção após uso. Sem chaves no
subprocesso ou conteúdo privado em telemetria. Limite de tamanho do texto/resultados e máximo
de seis operações web aceitas; excesso é recusado (não é teto preventivo de consumo do provedor).

## 10. Critérios de sucesso

Smoke público com pesquisa real e links; testes determinísticos de opt-in, isolamento,
idempotência, falhas de protocolo/fonte e apresentação. Gates normais sem alterar resultados
das baterias anteriores ou afirmar validação especializada.

## 11. Questões em aberto

Expansão de temas/domínios e uso de produção dependem de nova decisão e validação.
Resultado, limites e ativação em [04/11/2026](results-2026-11-04.md).

## Gate para mudar o status

Aceitação, rastreabilidade, testes, smoke, revisão do delta e gates executados. Ativação local
preserva cadastro/PDFs; o reinício pode perder conversas da demonstração RAM, conforme briefing §8.
