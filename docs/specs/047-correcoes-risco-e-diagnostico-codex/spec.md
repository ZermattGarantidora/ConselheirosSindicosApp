# Spec 047 — Correções de risco e diagnóstico do Codex

**Status:** integrada e validada tecnicamente com as Specs 043/046; revisão especializada pendente, sem autorização de rollout
**Responsável:** engenharia — fatia de risco e adaptador Codex
**Atualizado em:** 2026-10-27

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz encaminhamentos omitidos e indisponibilidades sem diagnóstico na conversa útil. |
| Público | §3 | Protege síndicos profissionais e moradores em decisões de maior consequência. |
| Proposta de valor | §§5 e 6 | Explica limites e próximo passo sem exigir anexos para ajuda emergencial. |
| Prioridades do MVP | §7, Blocos 2 e 6 | Corrige segurança de respostas já autorizadas, sem nova experiência ou módulo. |
| Segurança e confiança | §§8, 9 e 10 | Mantém evidência, validação humana, isolamento e confirmação para ações externas. |
| Validação e métricas | §§12 e 13 | Regressões medem escalonamento e diagnóstico minimizado, mantendo o mesmo adaptador e modelo. |

### Limites respeitados

- Não antecipa WhatsApp, portaria, movimentação bancária, parecer definitivo ou automação externa.
- Não altera prompt, modelo, dataset, relatórios originais, autenticação global ou contratos compartilhados.
- Correções centrais de evidências e memória pertencem à Spec 046/043; solicitações ficam em `integration-notes.md`.
- Sem nova dependência, serviço, provedor, fallback pago ou chamada de modelo adicional.

### Divergências da visão

Nenhuma. Detalha a validação humana e a observabilidade já exigidas no briefing e na Spec 042/ADR 0031.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual de 27/10/2026.
- [x] A spec resolve falhas observadas na hipótese de conversa útil e segura.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e exclusões foram respeitadas.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Classificar riscos relevantes sem depender da iniciativa do modelo e distinguir falhas do adaptador por códigos seguros.

## 2. Promessa testada

> A ajuda continua disponível com limites claros; uma pergunta não vira prova de fraude e uma falha operacional pode ser investigada sem expor seu conteúdo.

## 3. Usuário primário

Síndicos dos segmentos do briefing em demonstração sintética local; diagnóstico destinado à engenharia.

## 4. Escopo

`risk-classification.ts`, `codex-answer-gateway.ts`, `codex-process.ts`, testes próprios e esta documentação.

## 5. Fora do escopo

Memória contextual, caso de uso, prompt, recuperação, validadores de citação, seleção de provedor, banco, interface e execução de ações. A integração central e a nova rodada real completa pertencem ao primeiro chat.

## 6. Pré-condições

Specs 001, 026, 041, 042 e 043; ADRs 0003 e 0031; rodada original preservada. A indisponibilidade crosscutting-22 durou 7,65 s: causa desconhecida, sem prova de timeout. Retry diagnóstico posterior não altera a falha original.

## 7. Requisitos funcionais

### RQ-4701 — Risco proporcional ao contexto explícito

Preservar `RiskAssessment` e `classifyQuestionRisk(question)`. Alto risco com especialista para emergência física (gás, fumaça, resgate em elevador, elétrica perigosa, vidro danificado, integridade estrutural), decisões trabalhistas (justa causa, rescisão de empregado e cálculo de direitos), tratamento/divulgação sensível de dados, restrição de acesso e pedidos de executar ações externas. Cobrir também decisões jurídicas/técnicas/seguro observadas nos 51 turnos high_risk. Usar critérios de perigo, decisão e objeto, não o identificador ou tema do dataset. Leituras de prazo, função, salário, localização de câmera e status documental não viram high pela mera presença de elevador, funcionário, dados ou biometria. Variantes independentes e controles negativos são obrigatórios.

### RQ-4702 — Motivos não probatórios e ajuda imediata

Motivo descreve risco da análise ou decisão, nunca afirma indício de fraude, culpa ou ilegalidade. Classificação não requer evidência/upload nem executa ação. Emergência tem prioridade de proteção e atendimento; integração não pode retardar essa orientação para coletar documentos. Continuação considera contexto autorizado no chamador (Spec 043), sem mudar a assinatura ou usar memória como prova.

### RQ-4703 — Falhas controladas por estágio

Processo distingue inicialização, término malsucedido, timeout e buffer; transporte distingue falha de stdin; parsing distingue JSONL inválido, turno incompleto e resposta estruturada inválida; saída recusada distingue ferramenta inesperada, turno explicitamente falho e rejeição pela validação documental. Eventos remotos sem causa estruturada conhecida continuam com causa indeterminada, sem inferir timeout por duração ou por texto livre. Erro operacional tipado continua sendo `AnswerGatewayUnavailableError`, com código e estágio controlados para integração; mensagem pública fixa. `InvalidAnswerValidationError` mantém seu tipo e código de validação, com mensagem local fixa, para preservar a fronteira do chamador. Não copiar stderr, mensagens originais, prompt, documento, credencial ou causa arbitrária para erro/telemetria.

### RQ-4704 — Observação minimizada e invariantes do adaptador

Callback opcional de diagnóstico recebe somente código, estágio e latência, em sucesso ou falha. Falha do observador não altera a geração. Temporários próprios limpos inclusive em erro; falhas de preparação/limpeza são normalizadas. Mantém ChatGPT, sessão efêmera, ferramentas desabilitadas, ambiente por allowlist, stdin, timeout/buffer e ausência de fallback. Sem retry automático: a única falha observada não demonstra transitoriedade nem causa elegível. Parsing, autorização, citação, segredo protegido e saída recusada nunca são repetidos neste adaptador. Qualquer futura política de retry exige evidência e nova aceitação.

## 8. Contratos

Mantém `RiskAssessment`, `AnswerGatewayInput/Result` e assinatura de `runCodexProcess`. Exporta erro Codex tipado e diagnóstico opcional apenas dentro dos módulos próprios. Contratos de integração e uso seguro do código ficam nas notas; HTTP e auditoria central não são alterados nesta fatia.

## 9. Requisitos não funcionais

Cobertura >=80% em statements, branches, functions e lines; regressões determinísticas sem rede; ausência de conteúdo sensível em erros e observação; temporários eliminados; zero mudanças em dataset/gabaritos ou relatórios originais.

## 10. Critérios de sucesso

51 turnos marcados high_risk classificados como high, além de variantes novas, sem promover consultas rotineiras de controle. financial-14/handover-09 deixam de insinuar prova. Cada estágio de falha possui regressão, limpeza e erro seguro verificáveis. Gates locais são informados separadamente da aprovação global e da qualidade semântica especializada, ainda pendentes.

## 11. Questões em aberto

Classificação determinística não compreende toda paráfrase nem substitui revisão especializada. A integração das Specs 043/046 preserva o maior risco contextual e captura códigos tipados nas três rotas centrais. A rodada real r7 classificou high e exigiu especialista nos 51/51 turnos originalmente marcados; orientação emergencial e demais respostas tiveram revisão técnica por IA, sem aprovação profissional. Resultados e limitações na Spec 046. Não há evidência suficiente para retry automático.

## Gate competitivo

Mantém o chat, corrige capacidades autorizadas, melhora segurança/utilidade, preserva isolamento e confirmação, diferencia pela política consistente sobre evidência e risco, comprova por regressões/evals e limita complexidade a módulos existentes.

## Gate para mudar o status

Exigir aceitação, gate de visão, testes/cobertura, evals aplicáveis e revisão do diff próprio; notas claras de integração. Esta fatia não aprova a aplicação inteira, merge ou piloto.
