# Spec 044 — Conversas e documentos por condomínio

**Status:** implementada localmente; validação global e inspeção visual pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-12

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz o esforço para localizar conversas e documentos de cada condomínio. |
| Público | §3 | Ajuda síndicos com um ou vários condomínios autorizados. |
| Proposta de valor | §§5 e 6 | Mantém o chat e abre sua biblioteca como visualização contextual dispensável. |
| Prioridades do MVP | §7, Blocos 3, 4 e 6 | Organiza os controles existentes de conversas e documentos, conforme pedido explícito de 27/10/2026. |
| Segurança e confiança | §§8–10 | Revalida o contexto, busca somente seu catálogo e não transforma disponibilidade em promessa de acerto. |
| Validação e métricas | §13 | Testa acesso ao contexto correto, consulta verificável e zero mistura na troca. |

O ajuste solicitado em 2026-10-29 detalha briefing §§1, 2, 6 e 7 (Bloco 3): abrir a lateral
leva diretamente às conversas do condomínio atual; a carteira fica disponível pelo retorno
“Todos os condomínios”. Atende ao gate competitivo por reduzir um clique para retomar tarefas
na memória autorizada, preservando a conversa principal, o isolamento e a troca explícita de
contexto. Reutiliza o estado existente, sem antecipar blocos, dependência, serviço ou custo de IA.
Uma regressão de interface verifica abertura, reabertura e retorno à carteira.

O pedido de 12/11/2026 refina o Bloco 4 (§7): destaca quantos arquivos estão disponíveis,
mantém o percentual somente nos detalhes do processamento e separa balancetes dos demais
documentos. O usuário confirmou essa apresentação, sem mudar a métrica para uma promessa de
completude. A categoria exclusiva reutiliza texto já extraído no contexto autorizado (§§8–10),
sem nova análise de IA, OCR, serviço, migração ou módulo paralelo. Regressões verificam uma
convenção isolada, classificação pelo conteúdo e exclusão de documentos gerais da área financeira.

### Limites respeitados

- A biblioteca é um diálogo sobre o chat com retorno à conversa, sem rota ou módulo independente.
- Não exige anexos no cadastro, não cria pontuação comercial da conta e não altera prompts, recuperação ou análise.
- A porcentagem mede a parcela dos arquivos enviados disponível para consulta, não a fração de todos os problemas que a IA resolverá.
- Não adiciona provedor, dependência, persistência ou serviço externo; reutiliza os contratos atuais.

### Divergências da visão

Nenhuma mudança de público, proposta, prioridades ou segurança. O pedido explícito de mover os
condomínios da direita para a esquerda atualiza a composição visual do §7 na mesma decisão,
preservando controles auxiliares sobre o chat. Esta spec substitui apenas a localização e
organização visual descritas nas Specs 018, 019, 024 e 038.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Escolher um condomínio na lateral esquerda, acessar suas conversas e conferir somente seus
documentos à direita ou na biblioteca ampliada sobre o chat.

## 2. Promessa testada

> Encontro as conversas e os documentos do condomínio em que estou trabalhando, sem misturar contextos.

## 3. Usuário primário

Síndico profissional ou morador com associação vigente a um ou mais condomínios.

## 4. Escopo

Lateral esquerda recolhida com lista de condomínios, abertura de suas conversas, novo chat,
renomeação, exclusão e criação conversacional de outro condomínio. Painel direito com documentos
do contexto ativo e Perfil. Botão “Melhor visualização” abre biblioteca com categorias, busca,
filtros de estado, versão, data de envio e disponibilidade documental.

## 5. Fora do escopo

Dashboards, navegação independente, criação por formulário, avaliação semântica nova, estimativa
de acurácia/capacidade da IA e mudanças na memória documental ou no nível da conta.

## 6. Pré-condições

Identidade resolvida e associação revalidada pela API para cada operação de domínio.

## 7. Requisitos funcionais

### RQ-4401 — Condomínios e conversas à esquerda

A lateral começa recolhida. Ao acionar “Abrir conversas”, abre diretamente a seção de conversas
do condomínio do contexto autorizado atual, inclusive ao reabrir depois de fechar ou visitar a
carteira. Abrir a lateral não troca o condomínio, não altera a conversa ativa e não recarrega
seus chats. O botão “Todos os condomínios” mostra a carteira com os condomínios autorizados por
nome, sem mudar o contexto. Sem condomínio ativo, a lateral abre a carteira existente.
Escolher um condomínio na carteira abre sua seção de conversas após revalidar o contexto e
carregar os chats. Novo chat,
histórico, renomear e excluir continuam disponíveis dentro do condomínio. Falha preserva o
contexto anterior e apresenta erro recuperável. A troca limpa resposta, citação, rascunho,
anexo, confirmação e mensagens do contexto anterior; não mistura cadastro de outra conversa.

### RQ-4402 — Documentos do contexto ativo à direita

O painel direito abre os documentos do condomínio ativo e mantém acesso ao Perfil. A carteira de
condomínios sai desse painel. Só é solicitado o catálogo do contexto ativo; trocas e fechamento
cancelam leituras pendentes. Resultado atrasado não reaparece em outro contexto. Sem contexto,
há orientação para escolher/configurar um condomínio. Erro não é representado como catálogo vazio
nem como 0% calculado. Catálogo é atualizado ao reabrir, ao concluir envio/confirmação e enquanto
houver processamento em andamento, sem chamadas ao modelo.

### RQ-4403 — Biblioteca organizada sobre a conversa

“Melhor visualização” abre diálogo acessível, fechável por botão e Escape, com foco contido e
restaurado. Mostra nome do condomínio, busca por título, categorias existentes, contagens, filtros
de disponibilidade, estados de processamento/confirmar condomínio, versão e data de envio.
Categorias e títulos têm ordem estável; versões do mesmo documento permanecem identificadas.
Permite abrir o original pelo visualizador privado existente. Filtros não alteram o indicador.
Trocar contexto fecha a biblioteca e o original. Funciona em 320 px, desktop e ambos os temas.

### RQ-4404 — Contagem disponível e percentual nos detalhes

O indicador principal “Arquivos disponíveis” mostra a contagem pronta e o total enviado, sem
porcentagem nem barra de progresso em destaque. Uma convenção isolada mostra “1 de 1”, sem
anunciar base completa. Somente nos detalhes fechados por padrão, o percentual de disponibilidade
dos envios é `arredondar(100 × versões disponíveis / versões enviadas)`
do catálogo ativo na área selecionada, deduplicado por versão, antes de busca e filtros.
A área Balancetes considera somente seus arquivos no numerador e denominador.
Disponível exige processamento `ready`, vigência
`confirmed` ou `not_applicable` (mesma elegibilidade da recuperação) e nenhuma confirmação de
condomínio pendente. O denominador considera as versões retornadas pelo catálogo atual, não
versões arquivadas/anteriores que a API não retorna. Mostra numerador, denominador e método. Com base vazia mostra
“Nenhum documento enviado”, sem percentual. Com carga/erro não mostra cálculo. A interface explica que esse
percentual indica quanto do material enviado pode apoiar consultas; não mede a capacidade de
resolver todos os assuntos, exatidão, completude temática, vigência ou qualidade jurídica.
Estados de vigência conflitantes/substituídos/pendentes continuam visíveis e 100% não certifica
ausência de conflitos. A orientação geral continua disponível sem anexos.

### RQ-4405 — Área exclusiva de balancetes

Painel e biblioteca oferecem acesso identificado como “Balancetes”. Na biblioteca, alternar
“Todos os documentos” e “Balancetes” mantém o diálogo sobre o chat; a segunda área mostra somente
balancetes reconhecidos no conteúdo extraído da versão atual, nunca convenções, atas, contratos,
regimentos, extratos ou outros apoios. O nome do arquivo não autoriza a classificação. Um cabeçalho
explícito de balancete/prestação de contas identifica o material; cabeçalhos de outros tipos ou
conteúdo ambíguo conservam o arquivo na organização geral. Sem texto suficiente, não presume o tipo.
Documentos existentes são reconhecidos pelas páginas privadas já extraídas, sem reenviar ou repetir
OCR. Busca, filtro, contagens e estado vazio da área usam somente seus balancetes. As pendências
de processamento, vigência e confirmação continuam visíveis e não se tornam disponibilidade.
Balancetes saem de “Outros documentos”; os demais arquivos continuam acessíveis nas suas categorias.
Trocar condomínio fecha a área e descarta o contexto anterior conforme RQ-4402/4403.

## 8. Contratos

Reutiliza `GET /v1/chat/condominiums`, `GET /v1/condominiums/:id/context`, chats, histórico,
catálogo e original. A API continua sendo a autoridade. Filtros e cálculo são determinísticos,
locais e não enviam conteúdo a outro serviço. Documento inclui ID de versão, tipo, processamento,
vigência, número de versão e data, já fornecidos pelo catálogo. O campo opcional
`isFinancialStatement` informa a classificação determinística pelo conteúdo e não altera o tipo
persistido, a elegibilidade ou as fontes. O catálogo PostgreSQL consulta apenas cabeçalhos limitados
das páginas da versão atual, com o mesmo tenant e RLS; o caminho em memória usa a mesma função.

## 9. Requisitos não funcionais

Nenhuma requisição documental a condomínios inativos; nenhuma persistência adicional no navegador;
nomes acessíveis nos controles, foco visível, modal nativo e layout sem overflow horizontal em 320 px.

## 10. Critérios de sucesso

Abrir chats de dois condomínios sem conteúdo cruzado; reencontrar conversas salvas; localizar e
abrir original por título/categoria/estado; comprovar numerador/denominador do indicador; manter
cadastro e conversas úteis sem anexos. Testes cobrem resultados atrasados, erros e acesso cruzado.
A abertura e reabertura da lateral mostram as conversas do condomínio atual sem passar pela
carteira; “Todos os condomínios” continua permitindo escolher outro contexto explicitamente.

## 11. Questões em aberto

Nenhuma bloqueante. Uma métrica futura de cobertura por tema exige rubrica validada e spec própria.

## Gate competitivo

1. Chat permanece principal; biblioteca contextual fecha para retornar a ele.
2. Refina Blocos 3, 4 e 6 já autorizados, sem antecipar capacidades.
3. Diminui ambiguidade de contexto e esforço de conferir fontes.
4. Preserva autorização, abstenção, conflitos e confirmação humana.
5. Expõe a memória documental isolada e reutilizável de cada condomínio.
6. Regressões determinísticas e inspeção visual verificam navegação, cálculo e isolamento.
7. Reutiliza API, metadados e visualizador; sem dependência nem custo adicional de IA.

## Gate para mudar o status

Exige aceitação, rastreabilidade, validação de visão, gates locais e revisão do diff completo.
Integração/publicação não fazem parte deste pedido.
