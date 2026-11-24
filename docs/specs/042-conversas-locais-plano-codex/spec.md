# Spec 042 — Conversas locais com o plano do Codex

**Status:** validada tecnicamente para uso pessoal local com dados sintéticos
**Responsável:** produto e engenharia
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1, 2 e 4 | Permite experimentar toda a conversa com geração real, inclusive antes dos anexos. |
| Público | §3 | Valida a experiência destinada a síndicos com o operador em ambiente pessoal sintético. |
| Proposta de valor | §§5 e 6 | Preserva a conversa como interface e o contexto fornecido progressivamente. |
| Prioridades do MVP | §7, Blocos 2, 5 e 6 | Usa o mesmo gateway para boas-vindas, configuração e respostas documentais. |
| Segurança e confiança | §§8–10 | Mantém evidências autorizadas, validação de citações e isolamento; documentos nunca autorizam ferramentas. |
| Validação e métricas | §§12 e 13 | Exercita o provedor substituível e registra tokens e latência sem converter a cota em preço de API. |

### Limites respeitados

- Somente uso pessoal no computador do operador, solicitado explicitamente em 2026-10-26.
- Não cria login público com ChatGPT, telas de configuração, WhatsApp, novo bloco de produto ou hospedagem remota.
- Não libera dados reais nem amplia OCR, embeddings, análise de fotos ou outros serviços externos.
- O gate competitivo é atendido: mantém o chat, reduz atrito dos testes autorizados, preserva a memória verificável e é validado por contratos e smoke sintético. O adaptador é opt-in e reversível, sem nova dependência de pacote.

### Divergências da visão

Nenhuma. Detalha a substituição de provedor prevista no §12; mantém o prompt padrão e a jornada
do produto. O contexto opt-in de simulação local é delimitado pela Spec 066.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa a hipótese da conversa útil e documental.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Executar todas as mensagens geradas da Alvitra local pelo Codex CLI autenticado com ChatGPT, consumindo o plano do operador.

## 2. Promessa testada

> Posso conversar com a Alvitra local usando meu plano, com o mesmo contrato de evidências e sem troca silenciosa para uma API paga.

## 3. Usuário primário

Operador desenvolvendo e testando pessoalmente a experiência de síndicos com dados sintéticos.

## 4. Escopo

- Adaptador de `AnswerGateway` para `codex exec`, selecionado por `CODEX_ANSWER_ENABLED=true`.
- Boas-vindas, configuração inicial, orientação geral e respostas com evidências usam esse adaptador.
- Modelo, executável e timeout configuráveis; autenticação é gerenciada exclusivamente pelo CLI.
- A configuração local do operador é ativada sem copiar credenciais do Codex para o projeto.

## 5. Fora do escopo

Distribuição ou hospedagem pública, dados reais, OAuth próprio, novas ferramentas, mudanças do
prompt padrão, OCR e embeddings pelo plano e aprovação semântica automática de evals.

## 6. Pré-condições

CLI instalado e autenticado por `codex login` com ChatGPT; modelo disponível na conta; ambiente local de demonstração sintética (`DEMO_MODE=true`, `APP_ENV` diferente de `production`).

## 7. Requisitos funcionais

### RQ-4201 — Seleção exclusiva local

Opt-in explícito seleciona Codex antes dos gateways de API para todas as mensagens da conversa. Sem opt-in, o comportamento existente permanece. Recusar ativação fora da demonstração local. Falha do Codex não aciona OpenAI API ou Gemini.

### RQ-4202 — Contexto e execução isolados

Cada geração inicia uma sessão efêmera nova em diretório temporário próprio, sem histórico compartilhado ou retomada. Prompt entra por stdin, sem shell intermediário. Não carregar configurações, instruções de projeto, MCPs, plugins, hooks, memórias ou ferramentas de execução, navegação, imagens e subagentes. Forçar autenticação ChatGPT e excluir chaves de API do ambiente filho. Remover o diretório temporário ao encerrar.

### RQ-4203 — Mesmo contrato documental

Usar o prompt aprovado sem alterações. Saída documental usa JSON Schema e as citações são reconstruídas somente a partir das evidências recebidas. O validador existente continua obrigatório. Saída geral e configuração seguem o contrato atual; resposta incompleta, vazia, inválida, ferramenta inesperada, limite ou erro de processo causam indisponibilidade segura.

Contexto adicional opt-in solicitado em 04/11/2026 é delimitado na
[Spec 066](../066-documentos-teste-locais/spec.md): evita recusa apenas pela origem sintética
e avisos rotineiros de simulação, exclusivamente local. Preserva personalidade e validadores;
setup e comportamento sem opt-in permanecem iguais. Essa é a única extensão local ao prompt
autorizada por essa decisão.

### RQ-4204 — Operação observável

Telemetria identifica `codex`, modelo, hashes, tokens e latência, sem prompt ou credenciais. Campo legado de custo em BRL não representa custo da cota; documentar essa limitação. Timeout e buffer limitados; stderr do CLI não é exposto ao usuário. Runtime identifica Codex na API e na interface.

## 8. Contratos

Mantém `AnswerGatewayInput`, `AnswerGatewayResult`, evidências e validação local. Usa JSONL de `codex exec` e exige evento de turno concluído com mensagem final. Configurações: `CODEX_ANSWER_ENABLED`, `CODEX_ANSWER_MODEL`, `CODEX_CLI_PATH`, `CODEX_ANSWER_TIMEOUT_MS`. Não cria variável de chave do plano.

## 9. Requisitos não funcionais

Sem novos pacotes ou acesso direto a arquivos de autenticação; zero fallback de cobrança; timeout padrão de 120 segundos; limpeza dos temporários mesmo em erro; quatro indicadores de cobertura unitária >=80%.

## 10. Critérios de sucesso

Conversas sintéticas chegam ao gateway Codex, contratos de grounding e isolamento passam, seleção não usa API mesmo com chaves existentes e smoke pessoal confirma inferência com ChatGPT. Evals mecânicos não significam aprovação semântica.

## 11. Questões em aberto

Qualidade probabilística e consumo da cota variam por modelo e conta; os resultados deste adaptador incluem o harness do Codex e não equivalem a uma chamada direta de produção.

## Gate para mudar o status

Exigir [aceitação](acceptance.md), rastreabilidade, gate de visão, testes, evals aplicáveis e revisão do diff. Não autoriza merge, rollout remoto ou piloto real.
