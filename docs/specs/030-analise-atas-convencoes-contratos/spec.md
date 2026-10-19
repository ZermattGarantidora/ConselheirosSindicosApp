# Spec 030 — Análise verificável de atas, convenções, regimentos e contratos

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| Problema e hipótese             | §§2 e 4            | Reduz a releitura de regras, decisões e cláusulas, preservando a base documental.                        |
| Proposta de valor e experiência | §§5 e 6            | Prepara fatos verificáveis para respostas contextuais no chat, sem criar tela paralela.                  |
| Prioridade autorizada           | §7, Bloco 7        | Detalha uma fatia documental autorizada em paralelo, complementar ao raio-X de balancetes.               |
| Memória, evidência e confiança  | §§8, 9 e 10        | Exige fonte por condomínio, documento, versão, página, trecho e offsets; explicita incerteza e conflito. |
| Validação                       | §13                | Testa afirmações fundamentadas, citações sustentadoras, abstenções e isolamento.                         |

### Limites respeitados

- A fatia recebe fatos já estruturados; não promete parser universal, recuperação em runtime, persistência, prompt ou resposta conversacional.
- Não conclui validade jurídica, vigência, registro, quórum atingido, execução/inadimplemento contratual ou prevalência entre fontes.
- Não cria ação externa, módulo paralelo, provedor, dependência nem usa dados reais.
- A extração permanece na Spec 028 e a análise financeira na Spec 029.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente esta frente documental em paralelo, limitada à análise determinística local.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Representar fatos documentais estruturados de atas, convenções, regimentos e contratos com procedência verificável, incerteza explícita e conflitos visíveis.

## 2. Promessa testada

> Quando um fato já estiver extraído com prova, a Alvitra mantém o que cada fonte diz e deixa claro o que ainda exige validação humana.

## 3. Usuário primário

Síndico profissional independente ou síndico morador que precisa localizar decisão, regra ou cláusula sem receber conclusão jurídica não comprovada.

## 4. Escopo

Na integração final também são aceitos rótulos naturais explícitos com cabeçalho documental e assunto, como `Assunto: pintura` e `Deliberação: ...`. Artigos numerados preservam a linha inteira e não implicam equivalência de assunto entre documentos distintos. Texto livre sem rótulo continua na consulta textual, sem classificação automática.

- Atas: proposta, deliberação, resultado de votação, quórum registrado e exigido, responsável e prazo.
- Convenção e regimento: artigo, regra, condição e exceção.
- Contrato: objeto, valor, prazo, reajuste, rescisão, obrigação e aditivo.
- Validação de autorização, escopo de condomínio e fonte completa; comparação de fatos contraditórios com ambas as fontes e datas.
- Adaptador determinístico de páginas já autorizadas que reconhece exclusivamente anotações textuais explícitas de tipo, assunto e categoria, sem classificar texto livre.

## 5. Fora do escopo

- Extração direta de PDF/OCR, inferência semântica, classificação universal e integração de runtime fora do consumidor que chamar o contrato público desta spec.
- Decisão de qual fonte prevalece, cálculo de quórum ou conclusão de vigência e validade jurídica.
- Recomendação jurídica definitiva, execução de ação externa ou dados reais.

## 6. Pré-condições

- Contexto autorizado com `document:read` e `condominium_id` ativo.
- Fatos estruturados de fonte contendo condomínio, documento, versão, página, trecho, offsets, método e incerteza.
- Fixtures inteiramente sintéticas.

## 7. Requisitos funcionais

### RQ-3001 — Fato sempre citável

Cada achado preserva a fonte completa e rejeita referência incompleta ou de outro condomínio.

### RQ-3002 — Incerteza sem preenchimento

Campos desconhecidos ou em revisão permanecem com estado explícito e sem valor afirmado.

### RQ-3003 — Sem conclusão jurídica ou aritmética implícita

Quórum registrado e exigido são fatos independentes; a análise não declara atendimento. Prazo e data documental não declaram vigência. Cláusula não declara execução ou inadimplemento.

### RQ-3004 — Conflito visível

Valores conhecidos distintos para o mesmo assunto e categoria formam conflito, preservando todas as fontes, datas conhecidas e uma limitação que impede resolução silenciosa.

### RQ-3005 — Adaptação conservadora de páginas

`normativeFactsFromPages` aceita somente páginas já autorizadas e reconhece uma linha apenas quando ela declara literalmente `tipo`, `assunto` e `categoria` no formato documentado pelo contrato. Cada fato recebe fonte completa, offsets da linha, método, qualidade e incerteza. Texto livre, rótulos incompletos e página com qualidade inferior ao limiar não produzem afirmação conhecida.

## 8. Contratos

`StructuredNormativeFact` recebe tipo documental, assunto, categoria, estado, valor opcional e `NormativeSource`; a fonte contém também `qualityScore` de 0 a 1 e offsets em code points. `normativeFactsFromPages(context, input)` recebe `documentId`, `documentVersionId`, `documentTitle` e páginas autorizadas (`pageNumber`, `extractedText`, `extractionMethod`, `qualityScore`) e reconhece somente linhas no formato `[tipo: ata|convenção|regimento|contrato; assunto: chave; categoria: rótulo; data-documento: AAAA-MM-DD opcional] valor`. Esta anotação é um contrato de integração para dados já estruturados, não existe em PDFs comuns e não autoriza alegar leitura automatizada de atas, convenções, regimentos ou contratos reais. `analyzeNormativeDocuments` recebe contexto autorizado e fatos, devolvendo achados, conflitos e limitações. O contrato não possui estado `vigente`, `válido` ou `quórum_atendido`.

## 9. Requisitos não funcionais

- Determinístico, sem rede, modelo, cache ou log de conteúdo.
- Rejeita ausência de permissão, fonte incompleta e tenant cruzado.
- Fonte `review_required` não pode sustentar achado `known`; página com qualidade inferior a 1 produz `needs_review` sem valor afirmado.
- Não altera nem persiste os fatos de entrada.

## 10. Critérios de sucesso

- Todos os achados úteis nos testes possuem fonte verificável e escopada.
- Campos desconhecidos não se transformam em valores; conflitos mostram ambas as fontes e datas.
- Testes sintéticos cobrem atas, convenção/regimento, contratos, autorização, isolamento, exceções e evidência insuficiente.
- Testes cobrem o adaptador de linhas anotadas, offsets, qualidade, método e rejeição de texto sem rótulos explícitos.

## 11. Questões em aberto

- A adaptação do contrato público de extração estruturada depende da frente da Spec 028.
- A recuperação e a resposta conversacional precisam de especificação e aprovação de prompt/evals antes de ativação.
- A matriz de rastreabilidade e qualquer integração global serão coordenadas após as frentes paralelas.
