# Spec 031 — Avaliação transversal de qualidade documental

**Status:** 50 casos determinísticos integrados; avaliação semântica e revisão especializada pendentes  
**Responsável:** qualidade e engenharia  
**Atualizado em:** 2026-10-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede se tarefas documentais frequentes recebem resposta verificável ou limite explícito. |
| Proposta e experiência | §§5, 6 e 7 | Avalia a análise de qualidade e a comparação de balancetes do Bloco 7, sem criar tela paralela. |
| Memória documental | §8 | Exercita proveniência, versão, página, trecho e isolamento por condomínio. |
| Evidência e confiança | §§9 e 10 | Separa grounding, citações, conflito, abstenção, conteúdo não confiável e escalonamento. |
| Validação | §13 | Produz métricas por tarefa e modo de avaliação para correção, citação, abstenção e incidentes de isolamento. |

### Limites respeitados

- Não cria auditoria contábil, parecer jurídico, contabilidade, ação externa, dashboard ou nova integração de IA.
- Não usa documento real, dado pessoal ou chamada de provedor; todos os casos são sintéticos.
- Não afirma qualidade de modelo nem aprovação de contador, jurista ou síndico: a revisão especializada permanece pendente.
- Exercita a integração das Specs 028–032 quando disponível e registra as capacidades ainda ausentes como pendência, sem aprovação por proxy.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Manter uma bateria sintética, revisável e separada entre regras determinísticas e julgamento semântico para detectar regressões de qualidade documental antes de qualquer piloto.

## 2. Promessa testada

> Uma resposta documental só é aceita quando a evidência autorizada sustenta sua afirmação; caso contrário, ela expõe a limitação e o próximo documento mínimo.

## 3. Usuário primário

Síndicos profissionais, empresas pequenas de sindicatura e síndicos moradores descritos no §3 do briefing, beneficiados indiretamente por respostas mais conferíveis.

## 4. Escopo

- Inventário de 100 cenários sintéticos, cada um com tarefa, entrada, fontes esperadas, resultado, severidade e critérios de julgamento.
- Execução somente dos casos determinísticos que os contratos existentes conseguem aferir fielmente; os demais ficam pendentes de integração.
- Registro segmentado de cobertura para balancetes, tabelas, OCR, atas, normas, contratos, versões, citações, isolamento e instruções não confiáveis.
- Definição explícita de 50 casos semânticos para revisão humana e execução futura pelo caminho de resposta integrado.
- Integração dos mapas de tabelas e OCR e de cinco casos de instrução hostil pelo endpoint de perguntas; erro de executor ou ausência de qualquer dos 50 executores determinísticos bloqueia o comando canônico, sem aprovação por ausência de erro.

## 5. Fora do escopo

- Avaliar frase de prompt como substituto de correção documental.
- Declarar aprovação de especialista, baseline de modelo ou prontidão de rollout.
- Simular fim a fim contratos que as frentes 028/029/030 ainda não tenham conectado.

## 6. Pré-condições

- Os dados usados são exclusivamente sintéticos e vinculados a um `condominium_id` de teste.
- Para casos determinísticos, `compareFinancialPeriods` e `selectFinancialEvidence` permanecem disponíveis.
- Casos semânticos só recebem status aprovado após avaliador humano qualificado e caminho de resposta documental integrado.

## 7. Requisitos funcionais

### RQ-3101 — Inventário revisável

Devem existir exatamente 100 casos únicos, com os sete campos obrigatórios, divididos igualmente entre determinístico e semântico.

### RQ-3102 — Segurança não compensável

Isolamento, fonte verificável, abstenção, conflito e conteúdo não confiável são P0; nenhuma média pode compensar falha nesses casos.

### RQ-3103 — Execução honesta

O executor informa separadamente o que foi executado, o que apenas foi catalogado e se houve chamada de provedor ou revisão especializada.

### RQ-3104 — Métrica segmentada

O relatório agrupa totais por segmento e modo; não converte casos semânticos pendentes em aprovação.

## 8. Contratos

`evals/documentary-quality/dataset.ts` é o inventário público. `run.ts`, `integrated-executors.ts` e os mapas `tables`, `ocr` e `security` exercitam extração, processamento de OCR incompleto/discrepante, conversão financeira, comparação, cache escopado, recuperação autorizada, relatório normativo e falha segura pelo endpoint real. A integração PDF → relatório HTTP também é coberta em `tests/e2e/integrated-document-analysis.e2e.test.ts`, incluindo atas, contratos e balancetes. O conjunto não equivale à avaliação probabilística do modelo nem à navegação visual no browser.

## 9. Requisitos não funcionais

- Nenhum fixture contém dados reais, pessoais, segredo ou conteúdo de cliente.
- Casos P0 determinísticos precisam passar integralmente.
- O relatório deve declarar `providerCalls: 0`, `specialistReview: pending` e casos semânticos não executados enquanto essas condições forem verdadeiras.

## 10. Critérios de sucesso

- 50/50 cenários determinísticos e semânticos, com diversidade documentada por segmento.
- 100% dos determinísticos efetivamente executados contra contratos reais disponíveis, sem falha P0 observada; os não cobertos são declarados pendentes, não aprovados por proxy.
- Nenhum resultado semântico pendente é contado como aprovação; a revisão futura pode aferir as metas de §13 e dos quality gates.

## 11. Questões em aberto

- O cenário de troca de algarismo usa OCR simulado e confirmação independente sintética no processamento real: comprova o bloqueio da discrepância, não a acurácia visual de um provedor. Tabelas são textuais delimitadas, conforme Spec 033.
- Submeter casos semânticos a contador, jurista e síndico; calibrar critérios e baseline somente então.

## Gate para mudar o status

Esta spec só poderá ser declarada integralmente pronta após integração do comando no repositório global, execução fim a fim dos caminhos aplicáveis e revisão especializada registrada.
