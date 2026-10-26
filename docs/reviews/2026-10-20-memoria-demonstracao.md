# Redução de consumo e proteção de capacidade da demonstração

**Data:** 2026-10-20
**Estado:** implementação e medição locais; publicação e verificação no Render pendentes.

## Evidência e medição

O painel do Render registrou encerramento por exceder 512 MB em 20/10 às 14h33 e em 19/10 às
16h56, no horário exibido pelo painel (São Paulo). Fonte:
https://dashboard.render.com/web/srv-db8gj3avcj2c73ab57t0/events . Os eventos confirmam a falta
de memória, mas não identificam a operação que causou cada pico. As métricas detalhadas de
memória/CPU não estavam disponíveis no plano atual.

No Windows local, foi medido o RSS do próprio processo da API, sem documentos, após iniciar e
executar quarenta chamadas de saúde: aproximadamente 305 MiB antes e 70 MiB após compilar a API
e carregar PDF.js sob demanda, redução de cerca de 77%. Esses números não incluem os processos
externos do lançador anterior. Não foi usado o tempo de partida para alegar ganho de desempenho,
pois o estado dos caches dos ensaios difere.

O ensaio reproduzível `pnpm run test:production` iniciou a API compilada, enviou dois PDFs
sintéticos, verificou os bytes dos originais e executou vinte perguntas com citações. Mediu
83 MiB após iniciar, 124 MiB após os PDFs, 126 MiB após as perguntas e pico amostrado de 126 MiB.
Após o ajuste final de tipagem, o ensaio repetido passou com pico de 127 MiB (86 MiB na partida).
Esse processo também carrega a fixture TypeScript usando o suporte nativo do Node 24. O ensaio
não carrega `.env`, não usa dados reais e não chama provedor de IA. A amostragem não é um teto
absoluto nem comprova o consumo do contêiner Linux publicado.

## Alterações revisadas

- API compilada pelo TypeScript existente; Render passa a executar diretamente
  `node dist/api/app/main.js`. Desenvolvimento continua em tsx. O build do Render e o CI foram
  ajustados; não houve mudança de dependência, chave, plano ou custo contratado.
- PDF.js passa a ser carregado na primeira extração, com limpeza por página e destruição da
  tarefa ao terminar. Fontes padrão usam caminho de arquivo compatível com Windows/Linux.
- Na demonstração em produção, a reserva de um documento começa antes da leitura do corpo e
  continua durante o processamento assíncrono. Sucesso, falha e rejeição liberam a reserva.
  O hook de aborto também libera reservas não transferidas, mas não foi simulado aborto de
  socket real neste conjunto de testes.
- Novas operações POST recebem 503 `server_busy` e `Retry-After: 5` quando o RSS chega a
  320 MiB. A proteção mantém leituras autorizadas e não apaga dados para liberar memória.
- Logs agregados de RSS, heap, memória externa e buffers são emitidos na partida e a cada
  minuto; não contêm documentos, mensagens, identidades ou segredos. O timer é cancelado ao
  fechar e não mantém o processo aberto sozinho.
- ADR 0026, Spec 025, critérios de aceitação, README e rastreabilidade descrevem o comportamento
  e seus limites. Foram preservadas as alterações anteriores de anexos e do apelido `teste4`.

## Verificação

Os testes focados de extração, resposta documental e capacidade passaram. Foram exercitados
concorrência durante processamento após 202, retomada depois de sucesso e falha, reserva
liberada após validação/autorização recusadas, limite de RSS, métricas inválidas, liberação
idempotente e cancelamento do timer. Nenhuma asserção ou limite de qualidade foi relaxado.

Builds da API e da interface aprovados; vinte avaliações da consulta documental e cinquenta
avaliações determinísticas de qualidade documental aprovadas, sem chamadas externas de IA.
As cinquenta avaliações semânticas continuam pendentes de revisão humana/modelo, como antes.
O primeiro lint apontou uma anotação de tipo por `import()`; ela foi trocada por `import type`,
mantendo a importação de execução sob demanda.

O gate geral aprovou 767 testes em 114 arquivos; cobertura de statements 89,85%, branches
83,69%, functions 95,89% e lines 92,11%. Formatação, lint, tipagem, alinhamento estrutural das
36 specs e scanner de segredos passaram. `git diff --check` passou. O ambiente usou dois
workers de teste e TEMP/TMP na pasta temporária do workspace, sem alterar os limites dos testes.

## Limites e publicação

O RSS consultado é por processo. A proteção não cancela trabalho já admitido e não limita
alocações nativas de um PDF individual. Arquivos que expandam muito e ampliação de carga podem
exigir processamento isolado com orçamento próprio. Dados retidos também podem manter o RSS
acima do limite; não foi introduzido descarte automático nem persistência durável nesta fatia.

Não houve commit, push, publicação ou alteração no Render. Para verificar a estabilidade lá,
publicar o código com os comandos de build/início atualizados, conferir `server_memory`,
executar uma jornada sintética com anexos e acompanhar novos eventos de falta de memória.
O comportamento do provedor Gemini ao vivo não foi validado por este ensaio sem provedor.
