# Spec 028 — Extração documental estruturada e verificável

**Status:** aprovada para implementação local
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Problema e hipótese             | §§2 e 4             | Reduz o esforço de localizar valores em balancetes sem substituir a interpretação humana.                  |
| Proposta de valor e experiência | §§5, 6 e 7, Bloco 7 | Prepara o raio-X de balancetes com dados rastreáveis e pedidos de complemento quando o material não basta. |
| Memória documental              | §8                  | Mantém procedência por condomínio, documento, versão, página, trecho e método.                             |
| Evidências e confiança          | §§9 e 10            | Representa incerteza explicitamente e não permite transformar texto ambíguo em afirmação financeira.       |
| Validação e métricas            | §13                 | Mede extrações com fonte verificável e abstenções corretas.                                                |

### Limites respeitados

- A fatia reconhece somente sinais conservadores de balancete, período e rubrica; não calcula variações, não interpreta saúde financeira e não conclui irregularidade.
- Convenções, regimentos, atas e contratos ficam preparados por tipo e procedência, sem extrair obrigações, vigência ou validade jurídica.
- Não adiciona provedor, dependência ou envio de documentos; OCR continua sujeito aos ADRs 0008 e 0009.
- Período financeiro não é vigência documental e nunca preenche `valid_from` ou `valid_until`.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente esta frente do Bloco 7 em paralelo, limitada à extração.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Produzir, junto ao processamento de PDF, um contrato estruturado que exponha apenas valores, períodos e tipos documentalmente sustentados, cada um com procedência verificável e incerteza explícita.

## 2. Promessa testada

> Quando o balancete permitir leitura segura, a Alvitra preserva os valores como foram escritos e mostra exatamente de qual trecho eles vieram; quando não permitir, ela não inventa uma estrutura.

## 3. Usuário primário

Síndico que envia balancetes mensais e, futuramente, atas, convenções e contratos para consulta contextual e verificável.

## 4. Escopo

- contrato público de extração estruturada em `apps/api/documents/structured/`;
- extração determinística de período mensal inequívoco, rubrica e valor em centavos de BRL;
- identificação conservadora de `financial_statement`, convenção, regimento, ata e contrato;
- fonte com condomínio, documento, versão, página, offsets, trecho, método e incerteza;
- integração do resultado ao `DocumentProcessingOutcome`.

## 5. Fora do escopo

- cálculo, comparação, classificação de saúde, recomendação financeira ou resposta conversacional;
- OCR adicional, reconhecimento universal de tabelas, planilhas ou manuscrito;
- confirmação de vigência, validade, registro ou obrigação contratual;
- persistência do contrato estruturado para consumo por outro serviço nesta fatia.

## 6. Pré-condições

- processamento autorizado por `condominium_id`;
- texto de página extraído com método e qualidade já registrados;
- somente fixtures sintéticas nos testes.

## 7. Requisitos funcionais

### RQ-2801 — Fonte imutável e escopada

Todo campo estruturado contém `condominiumId`, `documentId`, `documentVersionId`, página humana, offsets em code points e trecho correspondente à página original, além de método e incerteza.

### RQ-2802 — Valor financeiro exato

Um valor só é extraído quando uma linha contém exatamente uma rubrica não vazia e um único valor monetário positivo em BRL inequívoco. Valor negativo, parênteses contábeis, token incompleto ou coluna ambígua ficam em revisão. O valor é representado como `amountMinor` decimal inteiro em texto, nunca ponto flutuante.

### RQ-2803 — Período e tipo conservadores

Um período mensal só é publicado quando o texto contém mês e ano inequívocos em página com qualidade suficiente. Um tipo só é identificado por sinal direto; ausência, conflito, qualidade insuficiente ou tabela ambígua permanecem explicitamente desconhecidos ou em revisão.

### RQ-2804 — Estrutura sem fabricação

Linhas são preservadas em ordem. O extrator nunca atribui colunas, soma valores ou escolhe qual dos vários números de uma linha é saldo, receita ou despesa.

## 8. Contratos

`StructuredDocumentExtraction` retorna `documentKind`, `financialPeriod`, `financialEntries`, `tables` e `warnings`. Todo valor tem `StructuredSourceReference`; tipo, período e tabela carregam estado `known`, `unknown` ou `needs_review`.

## 9. Requisitos não funcionais

- nenhuma chamada externa, log de conteúdo ou acesso fora do condomínio autorizado;
- processamento determinístico e sem ponto flutuante para moeda;
- o resultado é derivado somente de páginas já processadas e não torna uma versão em revisão pronta.

## 10. Critérios de sucesso

- balancete sintético com linha inequívoca produz rubrica, valor e período com fonte verificável;
- linha com dois valores ou período ambíguo não gera dado financeiro enganoso;
- tipos de ata, convenção e contrato só surgem sob evidência direta;
- testes demonstram que o contrato acompanha o processamento escopado.

## 11. Questões em aberto

- A persistência e consulta do contrato estruturado dependem da integração com a frente de análise, sem alterar retrieval nesta fatia.
- Coordenadas geométricas e reconhecimento de colunas requerem avaliação própria de qualidade por formato de PDF.

## Gate para mudar o status

Esta spec exige critérios de aceitação, validação de visão e testes determinísticos antes de ser considerada entregue.
