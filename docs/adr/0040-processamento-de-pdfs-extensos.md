# ADR 0040 — Processamento e consulta de PDFs extensos

**Status:** aceito para implementação local sintética  
**Data:** 2026-11-05

## Contexto

A Spec 013 permite 500 páginas, mas a matriz densa anterior chega a oito. O pedido de 300 páginas
expõe trabalho repetido no índice em memória e milhares de round trips no PostgreSQL. Os ADRs
0008, 0024 e 0026 continuam delimitando parser, análise e demonstração.

## Decisão

- Manter PDF.js, limites, OCR e provedores existentes. Identificação examina páginas sem uma
  concatenação adicional do arquivo e deixa tipos conflitantes desconhecidos.
- Agrupar chunks por versão/página numa passagem, preservando validação de lacunas, conflitos,
  elegibilidade e autorização antes da reconstrução.
- Reutilizar vetores no próprio índice em memória por objeto de chunk com `WeakMap`, conferindo
  conteúdo e hash a cada acesso autorizado. Não há cache global, persistência ou retenção nova;
  remover o chunk retira imediatamente sua elegibilidade e permite coletar seu vetor.
- Calcular hash de cada feature distinta uma vez por vetor local, multiplicando sua contagem.
  O vetor resultante é idêntico ao algoritmo anterior; perfil e versão permanecem compatíveis.
- Evitar arrays integrais da página para cada referência estruturada: contar code points sem
  arrays e recortar o trecho com os offsets UTF-16 internos antes de publicar offsets em code points.
- Preparar até 25 páginas por vez e inserir páginas/chunks/vetores em comandos parametrizados
  de até 100 linhas. Manter transação única, papel `app_worker`, tenant/job ativo, índices globais,
  verificação vetorial, atualização final e rollback. Não há schema ou dependência nova.
- Medir runtime compilado em processo separado. A geração do corpus e tsx ficam fora do processo
  medido; o relatório contém somente métricas e contagens sintéticas, sem texto dos documentos.

## Consequências e limites

O banco passa a receber dezenas de comandos em vez de milhares para o caso de 300 páginas.
A transação ainda cobre a versão inteira e o embedding permanece sequencial; não se habilita
paralelismo ilimitado ou chamada externa nova. Integração real sob RLS continua obrigatória.

O benchmark local não é SLA do Render: seu guard de 320 MiB, concorrência, documentos acumulados,
OCR, limites de análise e memória volátil continuam valendo. PDF digitalizado ilegível não fica
pronto sem OCR suficiente. Validação semântica da resposta do modelo permanece separada.

## Alternativas

Aumentar somente timeout/limites não demonstra completude nem remove trabalho repetido.
Novo parser, serviço de OCR, vetorizador externo ou processamento distribuído acrescentariam
dependência e fronteiras de dados sem necessidade comprovada para esta fatia.
