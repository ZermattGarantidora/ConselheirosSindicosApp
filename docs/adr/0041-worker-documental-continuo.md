# ADR 0041 — Worker documental contínuo e separado da API

**Status:** aceito para preparação e validação sintética local; publicação não autorizada  
**Data:** 2026-11-05

## Contexto

O usuário autorizou preparar a separação completa antes de assinar hospedagem. A fila PostgreSQL,
os originais privados e o processador já existem. O comando `worker` atual processa uma tarefa e
fecha o pool; o modo incorporado compartilha CPU e memória com o chat. Separar sem renovar
reservas ou testar retomada permitiria repetir trabalho demorado ou abandonar a última tentativa.

## Decisão

- Mesma base de código, API e worker em processos diferentes, conforme ADR 0001.
- Reutilizar `app.processing_jobs`, RLS e armazenamento privado no PostgreSQL; nenhum pacote,
  fila externa, serviço contratado ou provedor de IA adicional.
- Worker compilado contínuo, uma tarefa por vez, pool limitado e polling interrompível.
- Renovar o lease da tentativa ativa; validação antes da publicação recusa reserva vencida ou
  substituída. Retentativas não publicam páginas parciais. Jobs esgotados têm falha explícita.
- SIGINT/SIGTERM impedem novas reservas e aguardam a tentativa ativa; morte abrupta é recuperada
  pelo vencimento da reserva. A hospedagem pode impor seu próprio prazo de encerramento.
- Configuração revisável de piloto separa web e worker e desliga o worker incorporado. Os dados
  reais continuam bloqueados pelos gates operacionais existentes, inclusive backup completo.
- A interface acompanha o estado atual sem fabricar falas nem reexecutar análise automaticamente
  ao reabrir a conversa.

## Consequências

API e parsing têm recursos separados; uma falha do processador preserva fila e originais. O banco
continua compartilhado e precisa ser dimensionado. Heartbeats dependem de progresso do processo
e não impedem interrupção externa. Leitura correta exige completude/OCR e evals próprios; esta
decisão não muda a restrição de OCR real ou do gateway Codex local.

## Validação e alinhamento

Spec 069, briefing §§2, 4–10 e 12–14; mantém os blocos autorizados e o diferencial de memória
documental verificável. Validar com dados sintéticos, processos distintos, queda/retomada,
isolamento, PDF de 300 páginas e dez identidades. Nenhuma garantia de capacidade na nuvem é
inferida dessas medições.
