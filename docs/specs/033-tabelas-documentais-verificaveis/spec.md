# Spec 033 — Tabelas documentais verificáveis

**Status:** aprovada para implementação local
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Evita que a leitura de balancete atribua valor a rubrica sem estrutura conferível. |
| Proposta de valor | §§5 e 6 | Preserva linha, célula e página para que o síndico possa conferir a origem do número. |
| Prioridade autorizada | §7, Bloco 7 | Detalha a qualidade documental necessária para a análise prudente de balancetes. |
| Memória e evidência | §§8 e 9 | Mantém procedência por documento, versão, página, trecho e offsets em code points. |
| Segurança e validação | §§10 e 13 | Recusa tabela cortada ou ambígua e mede abstenção correta com fixtures sintéticas. |

### Limites respeitados

- A fatia só interpreta tabelas textuais com delimitador `|` e estrutura consistente; não promete parser universal de PDF ou geometria visual.
- Não soma, concilia, compara períodos, conclui irregularidade nem produz recomendação financeira.
- OCR, processamento, schema, recuperação e resposta conversacional permanecem fora deste escopo.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente o fechamento das pendências de tabela da avaliação documental.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Representar uma tabela textual simples com linhas e células citáveis, extraindo rubricas financeiras apenas quando a estrutura sustenta a associação.

## 2. Promessa testada

> Quando a tabela estiver íntegra, cada valor mantém sua célula de origem; quando estiver cortada ou ambígua, a Alvitra pede material completo em vez de completar a estrutura.

## 3. Usuário primário

Síndico que envia balancete mensal em PDF e precisa conferir valores e subtotais diretamente no documento.

## 4. Escopo

- agrupar linhas textuais contíguas delimitadas por `|`;
- preservar procedência por tabela, linha e célula com offsets em code points;
- aceitar rubrica multilinha apenas quando uma linha de continuação imediatamente anterior sustentar a primeira célula;
- excluir subtotal/total da extração de rubricas e recusar estrutura cortada ou com contagem de colunas inconsistente.

## 5. Fora do escopo

- reconhecimento de tabela por coordenada, imagem, tabulação vaga ou colunas sem delimitador;
- cálculo de subtotal, conferência de soma, classificação contábil e comparação financeira;
- inferência de cabeçalho na página seguinte.

## 6. Pré-condições

- página já autorizada, com texto, página humana, método e qualidade conhecidos;
- dados e PDFs sintéticos nos testes.

## 7. Requisitos funcionais

### RQ-3301 — Procedência de célula

Cada célula reconhecida mantém texto e fonte com condomínio, documento, versão, página, trecho e offsets em code points. A linha preserva sua fonte completa.

### RQ-3302 — Subtotal não é rubrica

Rótulo explícito de subtotal ou total não gera `StructuredFinancialEntry`, mesmo que contenha moeda válida.

### RQ-3303 — Tabela cortada falha fechada

Linha com célula vazia terminal, delimitador ausente ou número de colunas incompatível marca a tabela `needs_review`; nenhuma linha desse grupo gera entrada financeira.

### RQ-3304 — Rubrica multilinha com suporte estrutural

Uma única linha imediatamente anterior, sem valor e sem delimitador, pode completar a primeira célula quando a linha seguinte é uma tabela íntegra. Sem essa estrutura, o texto permanece fora da extração financeira.

## 8. Contratos

`StructuredTable` expõe `rows`; cada `StructuredTableRow` expõe sua fonte e `cells`, cujas fontes são independentes. `StructuredFinancialEntry.source` cobre a linha textual integral usada para rubrica e valor.

## 9. Requisitos não funcionais

- determinístico, sem rede, modelo, cache ou log de conteúdo;
- nenhuma fonte pode sair do `condominiumId` de entrada;
- incerteza de qualidade permanece anexada a tabela, linha, célula e entrada derivada.

## 10. Critérios de sucesso

- subtotal sintético não duplica uma rubrica financeira;
- tabela cortada não produz entrada financeira e pede revisão;
- rubrica multilinha íntegra preserva o rótulo completo e fontes de linha/célula;
- testes e executores de avaliação cobrem os três casos pelo contrato real.

## 11. Questões em aberto

- A interpretação de tabelas sem delimitador textual depende de avaliação separada de layout de PDF.

## Gate para mudar o status

Exige testes determinísticos, validação da visão, cobertura aplicável e integração do mapa de executores pela frente de avaliação.
