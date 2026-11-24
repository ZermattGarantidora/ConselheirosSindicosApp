# Aceitação — Spec 072

- **AC-7201 / RQ-7201:** política ausente/disabled/divergente, corrupção ou falha de persistência
  impedem execução sem fallback ou detalhes privados.
- **AC-7202 / RQ-7201:** instâncias compartilham quantidade/custo/concorrência; usuários do
  condomínio compartilham teto. Setup é escopo de conta, sem domínio documental global.
- **AC-7203 / RQ-7202:** repetir conserva reserva; outro payload/usuário conflita; só um claim
  executa em corrida e após recriar armazenamento/serviço.
- **AC-7204 / RQ-7203:** conclusão conserva hash/custo observado e máximo reservado; cancelamento
  só antes de iniciar libera custo/concorrência, conservando a quantidade. Falha não repete chamada.
- **AC-7205 / RQ-7203:** dia novo não apaga recibo/claim/concorrência antiga; reserva antiga
  não inicia. Somente o teto diário de novas reservas é renovado.
- **AC-7206 / RQ-7204:** geração concluída + falha no journal não gera novamente; falta de
  resultado é pendência. Falha de finalização não retorna sucesso; revogação não entrega resultado.
- **AC-7207 / RQ-7205:** outro usuário/tenant não lê/altera recibo; documento sem condomínio é
  negado. Cofre/recibo não contêm payload, token, canários, código ou erro nativo.
- **AC-7208 / RQ-7205:** PostgreSQL usa transação/contexto parametrizados, rollback, funções
  privadas e relógio do banco. Mocks não aprovam execução SQL nem configuração de produção.
- **AC-7209 / RQ-7201/7203:** voltar relógio após recibo confirmado nega nova execução; nenhuma
  cota é reiniciada. OCR de foto tem finalidade distinta da análise visual, mantendo escopo/fingerprint.
- **AC-7210 / RQ-7206:** composição documental reserva antes de enviar, persiste resultado antes
  de confirmar e recupera após falha de journal sem outra chamada/reserva. Falha de conclusão
  operacional não entrega sucesso inicial; reserva incerta permanece, mesmo quando o resultado
  confirmado puder ser recuperado. Mesmo tenant compartilha tetos; escopo alterado/revogado nega.
- **AC-7211 / RQ-7207:** plano ausente, HMAC/hash/snapshot/revisão/inventário divergentes,
  UUID fora da allowlist, alvo não local/não marcado ou trabalho ativo negam antes de mutar.
  Arquivo é exclusivo/flush e não contém conteúdo/token aberto. Falha mantém quarentena.
- **AC-7212 / RQ-7207:** revogar membership A, conta e expurgar conteúdo/versão por callback
  transacional são reaplicáveis após restore anterior às decisões. Segunda aplicação é idempotente;
  tenant B permanece intacto. Callback falho desfaz os efeitos da transação, plano persiste.
- **AC-7213 / RQ-7208:** consumo/login e cercas posteriores ao snapshot sobrevivem à restauração;
  repetir checkpoint não duplica/reduz gasto nem reemite claim. Conteúdo/resultados não são
  exportados pelo checkpoint. Fingerprint divergente falha fechado, sem habilitar política.
- **AC-7214 / RQ-7208:** prova completed correspondente reconcilia unknown sem chamada externa;
  cancelled anterior ao dispatch libera só custo/concorrência da reserva, conservando tentativa.
  Sem prova, dispatched/uncertain/invalidação ou política divergente mantém bloqueio. Ensaio SQL
  real local usa dois tenants, processo recriado e restore; mocks não substituem essa evidência.
- **AC-7215 / RNF de validação sintética:** configurações globais e focadas da Segurança usam
  `envDir: false`. Resolver a configuração em diretório temporário com `.env.test.local`
  integralmente sintético não importa o canário; não ler o `.env.local` do workspace, conectar
  banco ou ativar transporte para provar esse isolamento.
  Incluir a instância Vite aninhada do proxy E2E: resolver seu objeto real contra a mesma
  fixture isolada, sem iniciar servidor, confirma `envDir:false` e ausência do canário.
- **AC-7216 / RQ-7209:** finalidades de autoria distinguem etapas e exigem gestão; mocks e SQL local validam reserva/claim/conclusão e negam advisor. Cofre externo no restore conserva custo/quantidade e incerteza, sem chamada repetida ou refund.
