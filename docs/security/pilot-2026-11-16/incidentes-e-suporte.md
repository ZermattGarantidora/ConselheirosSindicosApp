# Incidente, suporte e resultado incerto — preparação revisável

**Estado:** procedimento proposto; sem contatos enviados ou execução em ambiente real.
**Referências:** Spec 011 RQ-1103/1104/1106, Spec 072 RQ-7203/7204, gates de liberação.

## Papéis e condições para atender

Nomear titular/substituto de suporte, segurança/operação, decisor de pausa e contato de
privacidade. Dúvidas jurídicas, contábeis, de engenharia ou segurança vão para profissional
competente; suporte técnico não confirma parecer. Canal, horários, objetivos de atendimento e
capacidade precisam ser aprovados antes das sessões. Não presumir disponibilidade 24 horas.

Fila de atendimento por dependência, sem lotes diários: receber → conter risco → validar
autorização → diagnosticar com metadados → corrigir/testar → revisão → decisão de retomada.
O prazo final de 16/11 não autoriza pular etapa. Casos independentes podem avançar enquanto outro
aguarda decisão, sem publicar ou contatar participantes nesta preparação.

## Registro mínimo privado

Campos: ID operacional, data/hora UTC, categoria fechada, componente, commit/configuração,
ID pseudonimizado de sessão/condomínio quando necessário, impacto estimado, estado, responsável,
ação autorizada, referências privadas de evidência e decisão de retomada. Não registrar
perguntas, respostas, nomes de arquivos/pessoas, páginas, prints, IP, códigos, cookies ou chaves.
Relação entre ID e pessoa fica somente no local privado aprovado, com acesso mínimo e retenção.

| Categoria | Primeira resposta operacional | Evidência sintética antes de retomar |
|---|---|---|
| Acesso cruzado ou autenticação revogada aceita | Pausar coorte e acessos afetados; preservar evidência mínima privada e acionar segurança | Canários negados em todas as camadas, revogação após reinício/réplicas, revisão independente |
| Segredo/conteúdo em registro indevido | Restringir acesso/propagação, preservar referência mínima e avaliar revogação/rotação pelo responsável | Redaction em API/worker/borda/banco/tickets, scanner/gates e verificação de remoção conforme política |
| Mensagem confirmada ausente ou histórico parcial | Pausar gravações afetadas, conferir ACK/journal e preservar original; não preencher com texto recriado | Ambos os lados, idempotência e restore integral na configuração candidata |
| Fato sem evidência, citação falsa ou instrução documental executada | Interromper uso da resposta e encaminhar ao especialista; pausar o fluxo afetado | Regressão inteiramente sintética, fontes e abstenção revisadas no gateway efetivo |
| Processamento preso/rede indisponível | Informar estado real e parar novos envios; conferir duplicação e fila antes da retomada | Retry/fencing, sinal de cancelamento, falha terminal e recuperação sem falso sucesso |
| Falta de autorização ou pedido de direitos | Suspender uso quando cabível, validar legitimidade e encaminhar ao responsável de privacidade | Procedimento de direitos aprovado e prova de isolamento/export/purge/revogação |
| Limite de consumo ou concorrência | Explicar bloqueio e conferir recibos; não apagar contadores ou trocar ID para liberar | Tetos compartilhados, política/revisão corretas e ausência de resultado incerto |

Contenção que afete pessoas, execução externa ou alteração irreversível exige a decisão humana
correspondente. Este documento não autoriza envio de comunicado nem muda a política sintética.

## Resultado incerto da Spec 072

1. Identificar operação por UUID/escopo, revisão, fingerprint e estado, sem conteúdo. Revalidar
   o solicitante e consultar o journal/resultado já persistido antes de qualquer retry.
2. `reserved`: ainda não houve claim. Pode cancelar pelo contrato somente se a operação não
   iniciou; o cancelamento conserva a quantidade consumida. Não iniciar reserva de dia/revisão antigo.
3. `started` ou `unknown`: pode ter ocorrido consumo externo. Conservar reserva e concorrência.
   Não apagar recibo, expirar lock lógico, mudar UUID, trocar réplica ou reprocessar para descobrir.
4. `completed`: recibo prova finalização/hash/custo, não contém a resposta. Recuperar apenas o
   resultado autorizado já persistido e conferir hash/fontes; sem esse resultado, declarar a
   pendência. Hash não serve como reconstrução de mensagem da Alvitra.
5. Reconciliar somente com evidência privada confiável da execução/consumo e autorização
   operacional competente. Ferramenta de reconciliação de produção e política de retenção ainda
   não estão implementadas/aprovadas; essa falta bloqueia ativação, não autoriza liberação manual
   improvisada pelo runtime. Nenhuma nova chamada paga integra o diagnóstico desta rodada.

Timeout/cancelamento do transporte após claim não demonstra ausência de cobrança. O executor
deve impor deadline/AbortSignal; a biblioteca de reserva não mata uma chamada remota nem promete
cancelamento financeiro. O estado seguro conserva a pendência e evita repetição automática.

## Comunicação preparada, não enviada

Modelo privado a revisar: “Identificamos um problema em [categoria sem conteúdo]. Interrompemos
[fluxo afetado] para conferir com segurança. Não repita o envio nem compartilhe seu código.
O atendimento pode ser acompanhado por [ID/canal aprovado]. Informaremos o próximo passo após
a verificação.” Preencher detalhes somente por pessoa autorizada, sem inventar prazo/resolução.

Avaliação de incidente de dados, necessidade, conteúdo e prazos de comunicação cabem aos
responsáveis competentes. Usar a [orientação oficial ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
na revisão; o roteiro técnico não determina sozinho obrigação jurídica ou destinatários.

## Retomada

Causa/impacto documentados, correção com regressão sintética, revisão independente, política e
gates afetados aprovados no commit/configuração efetivos, suporte pronto e decisão humana de
retomada. Incidente de isolamento exige decisão para toda a coorte. Material real observado não
vira fixture, eval, benchmark ou ticket, mesmo após anonimização.
