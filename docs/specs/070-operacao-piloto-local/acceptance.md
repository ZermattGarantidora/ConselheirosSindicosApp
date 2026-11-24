# Aceitação — Spec 070

- **AC-7001 / RQ-7001:** verificar os arquivos de exemplo não faz conexão, não lê segredo e
  mantém `activationAuthorized=false`; decisões pendentes bloqueiam `--require-decisions`.
  Alterar worker incorporado, auto-deploy, região incompatível, migração automática ou segredo
  literal torna a preparação inválida. Sintaxe não suportada falha fechada.
- **AC-7002 / RQ-7002:** conexão remota, banco sem nome/marcador adequado, confirmação ausente,
  papel inseguro ou arquivo já existente falha antes do dump. Snapshot de inventário é o mesmo
  do `pg_dump`; o manifesto só existe depois de êxito; erro não revela senha ou texto de stderr.
- **AC-7003 / RQ-7003:** corrupção, destino igual à origem, destino ocupado, marker inválido,
  extensão/papel incompatível e erro de restore impedem sucesso. Restore conserva ACLs, usa
  transação única e não usa clean/create/TRUNCATE. Qualquer diferença de conteúdo ou segurança falha.
- **AC-7004 / RQ-7003:** em dois bancos locais sintéticos, restaurar contas/sessões, originais,
  metadados, ambos os lados do histórico, páginas/chunks/vetores, fila e migrations; comparar
  fingerprints, RLS/grants/funções/constraints/sequências. Ler original e histórico como usuário
  correto, negar acesso cruzado; nova escrita funciona. Só execução real aprova este cenário.
  Incluir ACL padrão de sequência na fixture para conferir também `pg_default_acl` e a
  interpretação do catálogo PostgreSQL real, sem substituir a prova por mock de SQL.
  Identidades de objetos não podem ser truncadas pelo tipo PostgreSQL `name`: são texto e
  únicas por tipo/nome completo. ACLs comparam privilégios efetivos ordenados, incluindo o
  default do proprietário quando `relacl` é NULL; representações equivalentes não são falhas,
  e grant, grant option, grantor ou grantee divergentes continuam bloqueantes.
  Na cópia sintética, corrupção do dump e destino ocupado não executam restore; alterações
  transacionais de RLS, grants ou original são detectadas e revertidas. Executar SQLs de
  observação e conferir dois logins de serviço restritos próprios do ensaio, sem promover
  credencial de operador a runtime. Os logins sintéticos não são contas/credenciais de piloto.
  Conservar também uma conta fictícia com segredo MFA previamente cifrado: a chave estável
  correta recupera o conteúdo, uma chave diferente falha e a conta com MFA não aceita código
  simples. Nenhuma chave em claro é adicionada ao banco, dump, manifesto ou relatório.
  Se a migration 039 estiver presente, inventariar também `app_ai_executor` sem login ou
  privilégios elevados, sem concedê-lo à API/worker. Registrar hashes dos arquivos de migration
  e recusar prova cuja entrada mude durante o ensaio no checkout compartilhado.
- **AC-7005 / RQ-7004:** runbook contém sequência de atualização, rollback, incidente e
  recuperação de segredos sem valores; deixa RPO/RTO/retenção e política de exclusão pendentes.
  Fontes oficiais datadas sustentam custos e limitações; não há orçamento ou ativação presumidos.
- **AC-7006 / RQ-7002/7003:** opção Docker recusa nome/labels/imagem, porta ou mount divergentes,
  paths fora da saída e argumentos não previstos. Engine é local e configuração vazia exclusiva;
  nenhuma senha/chave é herdada ou passada nos argumentos. Arquivos são mapeados para `/recovery`.
  Com container sintético dedicado, executar AC-7004 com PostgreSQL/CLIs reais da mesma imagem.
  A pré-checagem de versão passa somente `--version` como primeiro argumento, sem iniciar conexão;
  opções de conexão não podem impedir a identificação da versão.
  Wrapper sem confirmação falha antes de criar recursos. Com confirmação, usa imagem em cache,
  loopback, tmpfs, somente saída sintética no bind e filho sem chaves de IA; ao terminar,
  confere ID/label e encerra somente o recurso criado. Evidências continuam no host.
  A prova usa SCRAM no acesso TCP, inclusive os dois logins restritos, para não depender de
  `trust`. A senha fixa exclusivamente sintética chega ao container por arquivo de fixture,
  sem valor nos argumentos; senhas do ambiente real não são consultadas ou geradas.
  Uma senha errada deve falhar com SQLSTATE `28P01`; um endpoint que aceite a senha errada
  não valida a prova de autenticação. A mesma pré-condição vale no caminho nativo.
- **AC-7007 / RQ-7004:** avaliação sintética local distingue fila ociosa de fila parada,
  sinaliza isolamento/integridade, falhas/leases, saúde, recursos e amostra antiga/futura.
  RPO/métricas ausentes ficam pendentes, dados inválidos ou campos estranhos são recusados
  sem eco de valores. O resultado não envia notificações nem aprova limiares ou operação.
- **AC-7008 / RQ-7003:** com 039/040, dois processos Node distintos semeiam e verificam após
  restore os adaptadores reais de ledger/orçamento/login em PostgreSQL local/SCRAM. Pools de
  runtime, worker e ledger recebem apenas seus papéis próprios. Corridas não excedem teto nem
  produzem dois claims. Resultado sob A não é entregue sob B nem reenviado; resultado incerto
  mantém bloqueio. Recibos completos, reservados e incertos, contadores e compromissos são
  comparados no backup e retomados sem zerar limites. RLS/grants negam leitura direta e acesso
  cruzado; sessão/código, journal e jobs continuam nos cenários anteriores. Não habilitar
  política real, transporte externo ou flags do Blueprint para executar a fixture.
- **AC-7009 / RQ-7003:** wrapper `-Suite worker|rls` cria banco local próprio marcado, executa
  build/processos ou matriz RLS com ambiente mínimo e saídas exclusivas, sem `.env`/fallback
  remoto. URL, nome, confirmação e marcador inválidos bloqueiam fixtures/TRUNCATE. Encerrar
  somente o container próprio após conferir identidade; nenhum dado existente é alvo do ensaio.
  Nas configurações Vitest operations/RLS, um arquivo de ambiente fictício criado em raiz
  temporária isolada é carregado pelo controle positivo e ignorado pelo gate com `envDir:false`.
  A regressão não lê arquivos de ambiente do checkout.
- **AC-7010 / RQ-7005:** com confirmação local e política inteiramente sintética, gerar backup
  anterior às decisões e guardar o plano autenticado/ordenado fora do dump antes dos efeitos.
  Restaurar em destino novo, conferir inventário e reaplicar decisões com outro processo Node
  antes de qualquer elegibilidade. Original/páginas/chunks/vetores/resultados expurgados e
  sessões/associações revogadas continuam indisponíveis. Repetir o plano não duplica efeitos;
  tenant B, seu original e seu histórico permanecem intactos. Conferir histórico/citações segundo
  o modo declarado na política sintética. Nenhum serviço ou worker é iniciado para reabertura.
- **AC-7011 / RQ-7005:** plano ausente, HMAC/digest adulterado, política/revisão, inventário ou
  allowlist divergentes falham antes do efeito e mantêm a cópia inelegível. Expurgo/revogação
  preservam o fence mínimo de recibos/consumo e unknown; não há reset, reenvio ou liberação
  otimista. Resultado confirmado pode ser conciliado apenas com prova durável; ausência dessa
  prova permanece bloqueada. Relatório usa agregados/IDs fictícios, sem conteúdo, segredo ou
  aprovação real de retenção. Gate depende de execução PostgreSQL real local, além das unidades.
  Auxiliar sem recibo externo de destino, com rodada/snapshot/destino divergentes, falha antes
  de conectar. Antes de efeitos, confere também o marcador de quarentena vinculado pelo
  orquestrador ao alvo novo; não instala esse marcador em destino arbitrário.
- **AC-7012 / RQ-7003/7005:** `-Suite documents` aceita apenas a configuração fixa revisada e
  disponível antes da criação do container; cria source migrado/restore vazio marcados no mesmo
  PostgreSQL local, sem tocar bancos existentes. O filho recebe confirmação, URLs explícitas,
  ID e diretório de saída exclusivos, além da referência guardada ao container para os CLIs.
  Resultado exige Vitest aprovado e prova agregada do teste com zero transporte externo;
  erro/relatório ausente ou divergente falha. Outros perfis worker/RLS/recovery conservam seus
  contratos. Configuração não disponível é pendência de integração, nunca aprovação da prova.
