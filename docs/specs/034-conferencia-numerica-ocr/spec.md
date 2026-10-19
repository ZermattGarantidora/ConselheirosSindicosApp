# Spec 034 — Conferência numérica de OCR

**Status:** rascunho para revisão
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-19

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§2 e 4 | Evita que um algarismo lido incorretamente se transforme em comparação financeira enganosa. |
| Proposta de valor | §§5 e 6 | Explica o limite e pede a conferência mínima antes de concluir sobre valores locais. |
| Prioridade autorizada | §7, Bloco 7 | Melhora a qualidade do material financeiro analisado, sem criar contabilidade. |
| Evidências e confiança | §§8 e 9 | Exige fonte, página e confirmação independente para cada valor OCR usado financeiramente. |
| Segurança e validação | §§10, 12 e 13 | Falha com revisão explícita, usa dados sintéticos e mede abstenção correta. |

### Limites respeitados

- Não infere o algarismo correto a partir do texto OCR, do score ou de fixture.
- Não chama segundo provedor, não adiciona dependência e não envia documentos automaticamente.
- Não altera a extração estruturada, resposta, recuperação, banco ou interface.
- A confirmação independente é uma entrada explícita do operador ou de um fluxo futuro autorizado; não é alegada como existente quando ausente.

### Divergências da visão

Nenhuma. A fatia detalha os limites de qualidade e evidência do Bloco 7 autorizado.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Impedir que valor financeiro obtido somente por OCR, ainda que com score alto, fundamente comparação ou conclusão enquanto não houver conferência independente correspondente.

## 2. Promessa testada

> Se o OCR pode ter trocado um número, a Alvitra não escolhe um valor: ela mostra a limitação e pede a conferência da página original.

## 3. Usuário primário

Síndico que enviou balancete digitalizado e precisa de análise financeira verificável.

## 4. Escopo

- Contrato interno para confirmação por página, rubrica e valor em centavos.
- Estados `confirmed`, `unverified` e `discrepant`, com motivo e fonte de confirmação.
- Integração no processamento: valores financeiros OCR sem todas as confirmações exatas deixam a versão em `needs_review`.
- Caso sintético “OCR trocou 8 por 3” que demonstra discrepância, sem usar o valor esperado da fixture como lógica de produção.

## 5. Fora do escopo

- Reconhecimento visual próprio, segundo OCR automático, escolha de fornecedor, persistência de revisão ou UI de operador.
- Aceitar score alto como validação de número, corrigir automaticamente valor ou liberar resposta financeira parcial.
- Dados reais, chamadas pagas, validação estatística de acurácia ou baseline de provedor.

## 6. Pré-condições

- O processamento disponibiliza tipo, tabelas, avisos e entradas estruturadas sob `condominium_id` autorizado, inclusive quando não consegue identificar rubrica ou valor utilizável.
- Uma confirmação independente, se fornecida, vem de revisão do original ou segunda leitura autorizada e declara o valor observado; não contém instrução executável.

## 7. Requisitos funcionais

### RQ-3401 — OCR único é insuficiente para número financeiro

Quando uma versão PDF só tem OCR e possui entradas financeiras estruturadas, ausência de confirmação independente mantém a versão em revisão e explica que o original precisa ser conferido. Ausência de entradas não comprova ausência de valores: balancete sem entradas utilizáveis, avisos de extração monetária ou tabela financeira ambígua também mantêm revisão. Confirmar as entradas reconhecidas não libera conteúdo financeiro ainda não resolvido. OCR textual sem sinais financeiros não exige confirmação numérica.

### RQ-3402 — Divergência explícita bloqueia publicação

Quando a confirmação independente diverge de página, rubrica ou centavos do OCR, a versão fica em revisão; o sistema não escolhe nenhum dos valores.

### RQ-3403 — Confirmação exata e delimitada

Uma confirmação só vale para mesma página, rubrica e valor extraído. Uma confirmação de outro condomínio, documento ou versão é recusada. Todas as entradas financeiras OCR precisam estar confirmadas, sem conteúdo financeiro ainda não resolvido, para estado pronto.

### RQ-3404 — OCR externo desativado por padrão

A chave do chat não habilita OCR. O adaptador por ambiente exige chave específica `OPENAI_OCR_API_KEY`, `OPENAI_OCR_ENABLED=true` e `OPENAI_OCR_DATA_POLICY=synthetic-only`, e recusa `NODE_ENV=production` ou `APP_ENV=production`. Essas condições autorizam somente harness sintético direto; não comprovam que um upload é sintético. Por isso servidor persistido e worker de uploads usam OCR indisponível independentemente dessas flags, até existir classificação confiável e fluxo aprovado para dados reais. PDF textual continua extraído localmente; digitalizado fica em revisão, sem rede. Alinhamento: briefing §§8–10 e ADR 0009, sem novo provedor, UI de consentimento ou liberação de dados reais.

## 8. Contratos

`OcrNumericVerification` declara condomínio, documento, versão, página, rubrica normalizada, valor observado em centavos e método `operator_original_review` ou `independent_authorized_read`. `assessOcrFinancialConsistency` exige também o sinal `hasUnresolvedFinancialContent`, derivado do resultado completo da extração, e produz decisão imutável por entrada e uma decisão global de publicação. Esse sinal impede tratar uma lista vazia como comprovação numérica.

## 9. Requisitos não funcionais

- Lógica local, determinística e sem rede.
- Nenhum conteúdo documental é registrado em log.
- A verificação não usa score de OCR nem valor esperado de teste para decidir confirmação.

## 10. Critérios de sucesso

- OCR de alta qualidade com valor financeiro sem confirmação fica em revisão.
- Confirmação de `R$ 83,00` para OCR `R$ 88,00` é divergência, não correção automática.
- Confirmação exata de todas as entradas permite o fluxo já existente de prontidão.
- Testes mantêm isolamento de condomínio, versão e página.

## 11. Questões em aberto

- Persistência, autenticação e interface da revisão humana exigem spec própria.
- Uma segunda leitura automatizada só poderá entrar após decisão de provedor, privacidade, custo e ADR aplicável.

## Gate para mudar o status

Esta spec permanece em rascunho enquanto não houver fluxo de operador para produzir confirmações independentes e validação especializada da política de conferência.
