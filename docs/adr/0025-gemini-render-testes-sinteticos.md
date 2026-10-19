# ADR 0025 — Gemini na demonstração Render para testes sintéticos

**Status:** autorizado pelo usuário para o serviço de demonstração existente  
**Data:** 2026-10-19

## Contexto

O PR 14 foi integrado à `main`, mas o serviço `alvitra-demo-sintetica` ainda publicava o
branch `codex/defer-mfa-until-email`, commit `1600235`, sem provedor de conversa. Por isso,
a interface não apresentava a entrada com usuário e a configuração conversacional atuais.
O usuário pediu deixar a demonstração pronta para testes e autorizou explicitamente salvar
a chave Gemini local como segredo somente desse serviço. Antes da autorização, foi informado
que a URL é pública, chamadas podem consumir cota/saldo e não há teto financeiro global.

## Decisão

- Publicar o commit aprovado da `main` no serviço Render existente, mantendo o plano gratuito.
- Preservar `DEMO_MODE=true`, `DEMO_SEED_DOCUMENTS=false` e ausência de banco persistente.
- Usar a chave Gemini já existente somente no segredo `GEMINI_API_KEY` do serviço autorizado,
  com `GEMINI_ENABLED=true`; não registrar seu valor no código, cliente, logs ou relatórios.
- Manter o modelo já configurado para a conversa, sem trocar provedor ou criar credencial.
  Limitar retries operacionais durante os testes, sem alegar que isso é teto monetário.
- Não contratar planos, ativar faturamento, configurar OpenAI, OCR externo, análise de fotos
  ou persistência. Somente identidades, mensagens e documentos fictícios são autorizados.
- Verificar runtime e cliente publicados e executar uma rodada curta da jornada inicial;
  distinguir chamadas reais dessa conferência dos testes simulados e de evals semânticos.
- Em falha, informar indisponibilidade e não fabricar mensagens da Alvitra.

## Segurança, custo e limites

O nome de usuário provisório não é autenticação forte. O ambiente público pode receber
solicitações de terceiros; essa limitação e o consumo de cota/saldo foram aceitos explicitamente
para a ativação de teste. Não há promessa de custo zero nem de teto financeiro rígido.
O operador pode desabilitar a Gemini no serviço para interromper novas chamadas e deve
acompanhar a cota da conta do provedor. Revisão de orçamento e controles de abuso continua
pendente antes de ampliar a exposição ou convidar usuários externos.

Esta decisão operacional não autoriza dados reais nem substitui os gates de fornecedor,
privacidade, retenção, autenticação e piloto do ADR 0012 e Spec 011. Não altera a visão
canônica: detalha briefing §§1, 6, 10 e 12 e a jornada já autorizada nas Specs 026–027.
O ADR 0021 continua aplicável aos demais limites da demonstração.
