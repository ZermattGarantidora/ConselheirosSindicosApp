# Aceitação — Spec 078

- **AC-7801 / RQ-7801:** ausência de manifesto conserva admissão negativa; flags e chave de IA
  não autorizam execução. JSON inválido, chave desconhecida, conta inválida/duplicada, custo
  inválido, expiração inválida e modo demo recusam a configuração sem reproduzir valores.
- **AC-7802 / RQ-7801:** revisão é SHA-256 canônico do manifesto imutável; modelo/provedor
  divergente é recusado antes da abertura. Nenhum modelo ou custo vem do HTTP.
- **AC-7803 / RQ-7802:** política corrente concordante e conta/contexto autorizados executam
  uma vez com reserva/claim anteriores ao efeito e finalização posterior ao resultado.
- **AC-7804 / RQ-7802:** conta fora da lista, expiração, contexto revogado, política disabled,
  revisão/moeda divergentes ou erro do banco impedem execução e replay. Erros não expõem origem.
- **AC-7805 / RQ-7802:** a reserva mantém os contratos de conflito, incerteza e concorrência da
  Spec 072; não se recria ID de operação para contornar recibo pendente nem se apaga consumo.
- **AC-7806 / RQ-7803:** URI inválida, TLS remoto ausente/inseguro e CA inválida são recusados;
  CA válida mantém `rejectUnauthorized:true` nas conexões de API e sessão.
- **AC-7807 / RQ-7803:** preflight só lê; schema/função/RLS/papel incompatíveis impedem listener,
  fecham pools e não caem para demo. URLs e erros nativos não aparecem em mensagens.
- **AC-7808 / RQ-7804:** perfil aprovado conserva stores PostgreSQL e não habilita OCR/fotos
  pelas flags antigas. Ausência do manifesto mantém as regressões de startup 071/072.
- **AC-7809 / RQ-7804:** documentação informa candidata, comandos/resultados, estado da política
  e limites; nenhuma prova mockada é apresentada como ensaio Supabase/restore ou liberação real.
