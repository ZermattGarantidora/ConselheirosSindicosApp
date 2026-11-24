# Aceitação — Spec 058

**Estado:** implementação e validação técnica sintética concluídas em 31/10/2026; evidências e limites em `technical-validation-2026-10-31.md`, sem aprovação de lançamento.

- **AC-5801 / RQ-5801:** enviar mensagens sintéticas e receber falas de abertura, cadastro,
  perguntas/respostas, confirmações e comentário de lote. Reabrir recupera cada mensagem
  entregue, com autoria, sequência e referência corretas; nenhum conteúdo é recriado por IA.
- **AC-5802 / RQ-5802:** dois usuários, dois condomínios e chats distintos preservam isolamento,
  inclusive após trocar contexto e revogar associação. Cadastro anterior ao condomínio é
  vinculado somente ao destinatário autorizado e não aparece em outro condomínio.
- **AC-5803 / RQ-5802:** paginação com horários iguais, novas abas e retentativa não omitem nem
  duplicam mensagens. Ocultar conversa conserva a política auditável e fontes removidas não
  aparecem como fontes atuais disponíveis.
- **AC-5804 / RQ-5803:** após confirmar gravação dos dois lados em armazenamento durável,
  reiniciar processos e aplicar uma atualização recupera exatamente as mensagens confirmadas.
  Injetar falha antes da gravação impede confirmação falsa; repetir depois não duplica registros.
- **AC-5805 / RQ-5803:** restaurar backup em destino sintético isolado, validar identidade,
  conteúdo, vínculos e ordem dos dois lados e comprovar o procedimento de recuperação definido.
  Histórico faltante, recuperação não demonstrada ou teste não executado bloqueiam lançamento.
- **AC-5806 / RQ-5804:** a continuação considera uma resposta geral anterior e suas opções.
  Para resposta documental, fontes e dependências são revalidadas; remoção, versão diferente,
  revogação e dependência transitiva desconhecida impedem usar afirmação antiga como fato atual.
  Histórico completo continua consultável quando uma parte não cabe na janela do modelo.
- **AC-5807 / RQ-5804:** usuário não forja fala da assistente por envio de histórico no cliente;
  conteúdo de mensagem/documento não altera regras. Preservar limites de contexto até decisão
  específica e manter grounding, citações, abstenção e escalonamento.
- **AC-5808 / RQ-5805:** no teste em RAM, recarga do navegador preserva o histórico enquanto a
  API está ativa e reinício pode apagá-lo. O resultado não é usado para aprovar AC-5804/5805.

Cada cenário deve ter vínculo a teste/eval e evidência de execução antes de marcar a spec pronta.

- **AC-5815 / RQ-5804:** enviar uma convenção fictícia de oito páginas preenchidas, receber
  comentário citado sobre coleta pendente e responder “quero ajuda” ou “sim, por favor”. A
  consulta recupera fontes atuais do assunto, preserva a pergunta original e produz resposta
  citada, sem replay irrestrito da fala anterior nem pedido indevido de reenvio. Referências de
  busca são locais, limitadas e não entram na memória serializada ou como evidência antiga.
  A pergunta final de ajuda pode identificar a intenção aceita no foco da tarefa, somente
  com fonte atual da mesma versão/página; o corpo da análise anterior continua omitido.
  Nova pergunta independente, outro chat, janela vazia, instrução hostil, referência grande ou
  fonte indisponível não autorizam reaproveitar o conteúdo. A validação recusa “não consigo
  acessar o arquivo para conferir a convenção” diante de evidência atual; lacuna de aprovação,
  assinatura ou trecho específico permanece uma limitação legítima.

- **AC-5809:** respostas auxiliares são registradas antes do sucesso HTTP; falha de gravação gera
  indisponibilidade explícita. Retentativa com chave igual conserva o primeiro resultado,
  payload divergente conflita e não permite fala da assistente enviada pelo cliente.
- **AC-5810:** consulta completa reúne legado e novas falas, com cursor estável e escopo
  autorizado; recarga recupera cadastro/abertura/documentos, além das consultas normais.
- **AC-5811:** fonte/documento removido permanece identificado como histórico indisponível para
  citação atual. Replay documental exige ledger completo revalidado; dependência faltante,
  versão/hash diferente ou transitividade desconhecida impedem reutilização na IA.

- **AC-5812:** retomar um cadastro com condomínio já autorizado reconstitui o contexto e o chat,
  inclusive após correção de nome/quantidade durante outra etapa. Falha do journal após criar
  o condomínio permite repetir a criação na mesma sessão sem cadastrar outro condomínio.
- **AC-5813:** chave repetida em outra versão documental ou com metadados de upload diferentes
  conflita; síntese local e canônica não aparecem duplicadas e paginação preserva páginas já lidas.
- **AC-5816 / RQ-5801:** confirmação ou recusa documental digitada reaparece literalmente no
  histórico da conversa e versão autorizadas. Pergunta ou ambiguidade não confirma o arquivo.
  Falha de gravação impede confirmar salvamento; retentativa com a mesma chave conclui o registro
  uma vez, inclusive se a autorização documental já foi aplicada antes da falha.
- **AC-5817 / RQ-5801:** legenda inequívoca de envio e análise do lote reaparecem no mesmo chat
  e condomínio autorizados. O texto é literal; retentativa com a mesma chave não duplica a
  legenda ou a análise, e conteúdo diferente conflita. Pergunta não passa pelo contrato de legenda.
- **AC-5814 / RQ-5802:** um anexo pronto aparece uma vez antes e depois da chegada/atualização do
  histórico, na posição anterior à resposta. A entrada confirmada conserva o acesso ao original e
  o progresso, pendência ou erro do mesmo upload. Sem histórico, a bolha temporária permanece.
  Nomes iguais em versões distintas não são fundidos; outro condomínio não suprime o anexo atual.
