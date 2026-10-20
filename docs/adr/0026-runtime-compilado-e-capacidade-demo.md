# ADR 0026 — Runtime compilado e capacidade da demonstração

**Status:** implementado localmente; publicação e medição no Render pendentes
**Data:** 2026-10-20

## Contexto

O Render registrou encerramento por exceder 512 MB em 20/10 às 14h33 e em 19/10 às 16h56.
O serviço iniciava `pnpm run start`, que executava tsx, e carregava PDF.js mesmo sem anexos.
Na medição local sem documentos, o processo chegou a aproximadamente 305 MiB após 40 chamadas
de saúde. Esse ensaio não identifica sozinho a operação responsável pelo pico no Render.

O plano atual não exibe métricas detalhadas de memória/CPU. Mudar o plano, ativar banco
persistente ou descartar documentos para aliviar a memória não faz parte desta correção.

## Decisão

- Compilar API e código compartilhado com o TypeScript já existente, por `tsconfig.api.json`,
  durante o build. Render inicia diretamente `node dist/api/app/main.js`, sem pnpm/tsx no
  processo publicado. Desenvolvimento permanece em tsx.
- Carregar PDF.js somente na primeira extração. Resolver fontes padrão como caminho nativo,
  compatível com Windows/Linux, e liberar os caches de cada página após obter seu texto. O
  original, texto, páginas, hashes, limites e contrato documental permanecem verificáveis.
- Na demonstração com `APP_ENV=production`, admitir somente um upload/processamento de
  documento de cada vez. A reserva antecede o corpo do upload e continua até o processamento
  em segundo plano terminar. Erros, rejeição e aborto antes dessa transferência liberam a
  reserva; a liberação é idempotente.
- Recusar novas operações POST quando o RSS do processo alcançar 320 MiB, antes de receber
  corpos grandes ou chamar IA. Responder 503 `server_busy`, com `Retry-After: 5` e aviso
  operacional. Leituras por GET e saúde continuam disponíveis, preservando autorização.
- Registrar somente RSS, heap, memória externa e buffers no início e a cada minuto. Não
  registrar conteúdo, identidade ou segredo; o timer termina no fechamento e não mantém o
  processo aberto.
- Verificar o build executando a API compilada com PDFs sintéticos, leitura binária do
  original e perguntas documentais, sem provedor externo, em `pnpm run test:production` e CI.

## Consequências e limites

A redução local não é uma garantia de consumo no Linux do Render. RSS é medido por processo;
o guard não é um teto de memória nativa nem cancela uma operação já iniciada. Um PDF individual
que expanda muito ainda exige isolamento em worker e orçamento próprios antes de ampliar carga.

O guard protege a disponibilidade com recusa explícita, sem exclusão ou eviction silenciosa.
Memória documental, histórico e cadastro da demonstração continuam efêmeros; esta decisão não
introduz retenção nova ou persistência durável. Se dados retidos mantiverem o uso acima do limite,
o serviço pode continuar recusando trabalho até liberação natural ou intervenção operacional.

O contrato persistente de PostgreSQL/RLS e a fila existente não mudam. O guard documental desta
fatia é exclusivo da demonstração. A telemetria agregada é habilitada em produção nos dois modos.

Antes de considerar a queda resolvida em produção, publicar o commit e os comandos atualizados
no serviço existente e conferir os logs, novos eventos e uma jornada sintética com documentos.
