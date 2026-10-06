# Spec 013 — Leitura integral e verificável de PDFs

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-24

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1, 2 e 4 | Impede respostas baseadas em documentos lidos parcialmente. |
| Público | §3 | Dá ao síndico uma confirmação simples de que o arquivo inteiro foi processado. |
| Proposta de valor | §§5 e 10 | Fortalece evidência por página, qualidade explícita e confiança. |
| Prioridades do MVP | §§7, 9, 14 e 21 | Reforça a ingestão de PDFs antes da análise de balancetes antecipada. |
| Segurança e confiança | §§12, 13 e 19 | Trata PDF como dado não confiável e bloqueia conclusões quando faltam páginas. |
| Validação e métricas | §§16 e 17 | Mede completude, páginas revisáveis e ausência de publicação parcial. |

### Limites respeitados

- Não introduz contabilidade, auditoria, boletos, movimentação bancária ou ação externa.
- Não envia documentos reais a OCR externo; a autorização do ADR 0009 continua sintética.
- Não promete leitura automática de conteúdo manuscrito ou imagem quando não houver OCR autorizado.
- O módulo financeiro permanece dividido em três partes posteriores no roadmap.

### Divergências da visão

Nenhuma. A ordem foi alterada por aprovação explícita do usuário em 2026-09-24: leitura integral
de PDFs passa a preceder o módulo de balancetes. O briefing, MVP, estratégia e roadmap foram
atualizados na mesma decisão.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema descrito no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] A mudança de prioridade foi registrada nas fontes superiores.
- [x] Segurança, custo, isolamento e confirmação humana foram preservados.
- [x] Os critérios medem completude e confiança documental.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Garantir que um PDF só fique pronto para consulta quando todas as páginas esperadas tiverem sido
processadas com texto utilizável e origem verificável, mostrando ao usuário a completude e as
páginas que precisam de revisão.

## 2. Promessa testada

> O Alvitra informa quantas páginas leu e nunca apresenta um PDF parcialmente lido como completo.

## 3. Usuário primário

Síndico que envia documentos longos, textuais, mistos ou digitalizados e precisa saber se o
conteúdo inteiro pode fundamentar respostas.

## 4. Escopo

- extração local página por página de PDFs de até 500 páginas e 25 MB;
- preservação de quebras de linha úteis para listas e tabelas;
- resumo de completude por versão documental;
- contagem de páginas esperadas, processadas e pesquisáveis;
- lista de páginas vazias, ilegíveis ou abaixo do piso de qualidade;
- estado `needs_review` sempre que uma página esperada não puder sustentar consulta;
- exibição da completude no catálogo de documentos;
- rastreabilidade por página, hash e método de extração;
- testes sintéticos de documento longo, página vazia, PDF misto, OCR incompleto e isolamento.

## 5. Fora do escopo

- análise financeira e prestação de contas;
- OCR externo de documento real;
- reconhecimento garantido de manuscrito, assinatura, imagem ou tabela sem texto;
- edição do PDF original;
- resumo integral do documento em uma única resposta sem recuperação relevante.

## 6. Pré-condições

- contexto autorizado por `condominium_id`;
- PDF com assinatura válida e dentro dos limites;
- storage privado e worker escopado já existentes;
- confirmação do usuário de que o arquivo pertence ao condomínio.

## 7. Requisitos funcionais

### RQ-1301 — Inventário completo de páginas

O extrator deve registrar o total de páginas declarado pelo PDF e produzir exatamente um resultado
por página, na ordem original, com número humano, método, qualidade e hash.

### RQ-1302 — Preservar estrutura útil

A extração textual deve preservar quebras de linha indicadas pelo PDF e mudanças visuais de linha,
sem transformar toda a página em uma única sequência. Espaços redundantes podem ser normalizados,
mas texto não pode ser omitido para encurtar o documento.

### RQ-1303 — Completude antes do estado pronto

Uma versão só pode receber `ready` quando o número de páginas processadas e pesquisáveis for igual ao
total esperado e todas atingirem o piso aplicável. Página vazia, OCR ausente, OCR incompleto ou
qualidade insuficiente produz `needs_review` e identifica os números das páginas afetadas.

### RQ-1304 — Visibilidade para o usuário

O catálogo deve mostrar páginas lidas sobre páginas totais, método predominante, qualidade e, quando
necessário, os números das páginas que precisam de revisão. A interface não expõe JSON ou detalhes de
embeddings.

### RQ-1305 — Isolamento e minimização

O resumo de extração carrega `condominium_id`, segue RLS e não registra texto do PDF em logs. O
runtime não pode consultar o resumo de outro condomínio.

### RQ-1306 — Falha segura

PDF inválido, excedente, protegido, truncado ou com contagem inconsistente não deve publicar chunks
como prontos. O sistema informa uma falha ou revisão recuperável sem fabricar conteúdo.

## 8. Contratos

Cada versão expõe `expectedPageCount`, `processedPageCount`, `searchablePageCount`,
`unreadablePageNumbers`, `extractionCompleteness`, `extractionMethod` e `ocrQualityScore`. Contagens
nunca são inferidas pela interface.

## 9. Requisitos não funcionais

- zero recuperação entre condomínios;
- nenhum conteúdo documental em logs ou mensagens de erro;
- processamento assíncrono e limitado a 500 páginas e 25 MB;
- cobertura mínima de 80% nos quatro indicadores;
- compatibilidade com versões já processadas, cujo resumo pode aparecer como não medido até novo
  processamento;
- nenhum novo provedor ou serviço externo.

## 10. Critérios de sucesso

- todos os cenários P0 de `acceptance.md` passam;
- um PDF textual de várias páginas preserva todas as páginas e linhas;
- qualquer página ausente impede `ready`;
- o catálogo explica a completude sem linguagem técnica;
- os gates de spec, unidade, integração aplicável, E2E, cobertura e segredos passam.

## 11. Questões em aberto

- OCR local para documentos reais digitalizados exige decisão própria de custo, desempenho e pacote.
- PDFs protegidos por senha permanecem falha recuperável nesta fatia.

## Gate para mudar o status

Esta spec só é entregue com critérios de aceitação, rastreabilidade, testes determinísticos e gate
de visão aprovados. O módulo de balancetes não começa antes da conclusão desta fatia.
