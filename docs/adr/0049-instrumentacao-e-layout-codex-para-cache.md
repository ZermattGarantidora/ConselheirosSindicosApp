# ADR 0049 — Instrumentação e layout Codex para cache

**Status:** validado tecnicamente na bateria sintética local r4; permanece opt-in, com revisão humana pendente
**Data:** 2026-11-24

## Contexto

O usuário autorizou instrumentar e otimizar cache sem aceitar regressão de qualidade, repetindo
a matriz 40/40 da Spec 077. A rodada corrigida passou em ambos os braços, com médias próximas
de 15,6 s; cerca de 13,9 s ficaram dentro do gateway. O schema Codex carrega IDs variáveis.

## Decisão

Instrumentar etapas com relógio monotônico e observadores protegidos. Contadores, durações e
hashes de layout genérico não carregam conteúdo ou identificadores privados. Marcos ausentes
são null; primeiro evento completo do CLI não equivale a primeiro token. Manter os controles
de processo, buffer, timeout, isolamento efêmero, ferramentas e descarte de erros arbitrários.

Um codec opcional `compact-v1` representa evidências por posição da lista autorizada e traduz
referências estruturadas do contrato, citações e claims. O servidor restaura os IDs reais antes
dos validadores existentes. A restrição do schema é equivalente por bijeção, incluindo fontes
pendentes; texto de fonte/pergunta/histórico não é reescrito. Mapas vivem somente na chamada;
o cache de provedor é automático. Não há cache de conteúdo local, nova sessão, pacote ou provedor.

Para o candidato, o cwd passa a ser um diretório genérico estável e vazio, verificado contra
symlink e conteúdo inesperado; schema e payload continuam privados por geração. Isso sucede
somente a exigência de cwd aleatório do ADR 0031 nesse layout: isolamento de sessão, stdin,
temporário de schema, limpeza, ausência de ferramentas, project docs e configuração do usuário
continuam. Nenhum dado de tenant entra no diretório compartilhado. O caminho estável busca
evitar prefixo variável no contexto do CLI; a hipótese só vale se o usage confirmar reuse.

O env explícito `CODEX_ANSWER_REFERENCE_FORMAT=compact-v1` habilita o candidato; `original`
preserva a baseline. Construtores diretos continuam originais. O manifest da rodada fixa a
opção. Nenhum candidato com regressão vira padrão. Medir reuse real de tokens e custo histórico
sem prometer aceleração, confundir fatura ou remover falhas do denominador. Sem rollout real.

## Fontes e limites

- [OpenAI — Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching): prefixos idênticos favorecem reutilização; schema faz parte do contexto de cache. Controles da API não são presumidos no CLI.
- [OpenAI — Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization): medir etapas, tempo inicial e ponta a ponta separadamente.

A hipótese de ganho pelo schema estável será julgada na execução, junto de 40/40 por braço,
gates determinísticos, isolamento e auditoria. Isso não substitui especialista humano ou CI/review.

## Candidato r3 reprovado e continuação

O candidato medido caiu para 38/40 no Sol, embora tenha ficado mais rápido; não foi adotado.
Preservar r3 e repetir em r4 após regressões específicas: recusar alias interno no corpo e
usar o reparo existente, sem remover texto; reconhecer no journal a negativa literal de
comprovação de aprovação em interpretação já validada. O journal conserva usuário, tenant,
estado, claims e hash; não se permite promoção de minuta. A abstenção sem a fonte exigida
continua incompleta na rubrica. Não alterar corpus/oracle nem ocultar custo da rodada reprovada.

## Decisão após r4

R4 entregou 40/40 completos por braço na revisão técnica por IA, mantendo o automático original
40/40 e 38/40 e justificando os desacordos de completude/abstenção conforme a regra já vigente.
O julgamento inicial de abstenção em r3 recebeu revisão complementar registrada, sem apagar
o score histórico; r3 permanece reprovada por entrega/aliases. Aprovação humana não é presumida.

Médias observadas caíram a 13,115/13,628 s e custos equivalentes a USD 1,0877432/0,84342878.
Cache reutilizou 28,23%/25,17% dos tokens. O P95 Sol melhorou, mas o híbrido subiu a 25,107 s
com três reparos. Manter original como padrão e compacto opt-in: não adotar globalmente por
velocidade nem mudar roteamento. Não atribuir todo o ganho ao cache ou afirmar SLA com uma rodada.
