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
  CA válida mantém `rejectUnauthorized:true` nas conexões de API e sessão. Overrides por
  query string e parâmetros duplicados são recusados; parsing real do driver conserva o host
  e a verificação TLS aprovados, sem abrir conexão.
- **AC-7807 / RQ-7803:** preflight só lê; schema/função/RLS/papel incompatíveis impedem listener,
  fecham pools e não caem para demo. URLs e erros nativos não aparecem em mensagens.
  Um login `NOINHERIT` sem acesso direto a `app` assume `app_runtime` antes da consulta;
  a identidade verificada continua sendo `session_user`, sem novo GRANT ao login.
  Supabase 5432 é aceito, 6543 deriva 5432 e a transformação é idempotente, preservando TLS.
- **AC-7808 / RQ-7804:** perfil aprovado conserva stores PostgreSQL e não habilita OCR/fotos
  pelas flags antigas. Ausência do manifesto mantém as regressões de startup 071/072.
- **AC-7809 / RQ-7804:** documentação informa candidata, comandos/resultados, estado da política
  e limites; nenhuma prova mockada é apresentada como ensaio Supabase/restore ou liberação real.
  O Blueprint efetivo mantém `DEMO_MODE=false` após sincronização da transição autorizada.
- **AC-7810 / RQ-7804 e RQ-6801/6802/6805:** login `NOINHERIT` sem acesso direto a `app`
  executa as funções privadas de identidade somente após assumir `app_runtime` em transação.
  Entrada por código, limite de tentativas e resolução/revogação de sessão usam essa composição;
  autenticação/segurança de conta também recebem o executor restrito. Falhas de BEGIN, papel,
  consulta ou COMMIT não confirmam resultado; rollback antecede release e sua falha descarta a
  conexão. Duas operações concorrentes usam conexões/transações próprias. O CLI administrativo
  permanece separado; nenhum grant, migration, credencial ou fallback em RAM é acrescentado.
