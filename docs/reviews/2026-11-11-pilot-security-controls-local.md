# Controles de dados e identidade — validação local de 11/11

**Resultado:** controles da Segurança e integração r4 validados localmente. A r6 própria
recebeu revisão independente, inclusive o proxy Vite aninhado. Fechamento global em
`2026-11-11-pilot-integration-local.md`: 2.459 unidades, 247 E2E, quatro indicadores acima de
80%, builds/runtime/worker e 910 entradas sem mudança. Não aprova merge, serviço remoto,
dado real ou política de retenção.
A janela 02 permanece evidência histórica e não foi sobrescrita.

## Extensão r6 — instância Vite aninhada

Infraestrutura reproduziu uma guarda ausente no proxy criado dentro do E2E. `envDir:false`
da configuração Vitest não se propaga a outra instância Vite. A Spec 072/RNF/AC-7215 foi
ampliada antes da correção. O teste agora extrai por AST o objeto real da chamada e o resolve
em raiz temporária com canário sintético, sem iniciar listener nem ler credenciais reais.
Vermelho 7/8: `crossreview-env-1794423378674-10776/results.json`; verde 8/8:
`crossreview-env-1794423395649-29780/results.json`, ambos em `.local/pilot-security/`.
Tipos estritos, lint, formatação e visão de 72 specs passaram. Candidata r6: 24 fontes e
13 artefatos; produção/040 permanecem iguais. Infraestrutura concluiu a revisão independente
da r6 e repetiu oito canários. E2E final 247/247 e captura 03/r4 usam essa guarda e o leitor
documental corrigido; as execuções anteriores permanecem históricas.

## Histórico de revalidação — ambiente explícito e candidata r5

A candidata `.local/pilot-security/stage6-candidate-2026-11-11-r5.json` tem 23 fontes e 11
artefatos. Produção e migration 040 permanecem idênticas; o delta acrescenta `envDir:false`
às duas configs globais/cinco configs próprias, regressão AC-7215 e coerência documental.
Vite lê arquivos `.env*` por padrão: ambiente mínimo sozinho não demonstrava isolamento dessa
leitura. A presença do arquivo de credenciais foi conferida somente por metadados; a regressão
usa arquivo exclusivamente sintético no temporário, sem consultar seus valores.

Sete falhas antes/sete sucessos depois foram preservados; 43/43 unidades (plano + ambiente)
passaram. O teste recebeu helper de cleanup com a mesma guarda de raiz/prefixo após o lint
rejeitar throw no finally; sete unidades repetidas e tipos/lint/formatação do delta passaram.
Visão: 72 specs aprovadas. A composição foi repetida com a guarda explícita: **177/177**,
`integration-1794420526261-25620/results.json`, sem exclusões ou redução de assertivas.

**6/6 cenários SQL/HTTP** repetidos sob a guarda e com o callback documental corrigido:
`.local/pilot-security/postgres-1794420919101-11476/results.json`, JUnit adjacente;
`stage6-postgres-1794420951834.log`. Prova de manutenção em
`.local/pilot-operations/security-3684b196f7014f35944a35dfbae24553/maintenance-result.json`.
Revogação, tenant B, lost result, unknown/login, rollback, inventário e reconciliação
completed/cancelled/pending passaram, com zero transporte externo e sem reabertura.

Esta candidata exige conferir o delta de configuração por revisor distinto. A revisão anterior
dos módulos de produção continua identificada; não certifica automaticamente arquivos novos.
Gates globais aguardam o fechamento do replay documental e a candidata coordenada atual.

## Entrega e requisitos

RQ-7207/7208 / AC-7211–7214: plano imutável HMAC em arquivo exclusivo com flush, digest esperado
fora do dump, revisão/snapshot/allowlists explícitos, guardas de loopback/credencial fictícia/
marcador/schema/quarentena. Callback documental usa a mesma transação. Revogação de conta elimina
códigos, sessões e desafios; revogação de membership A preserva conta e vínculo B. O retorno
nunca reabre API/worker. Sem rota pública ou carregamento de `.env`.

Checkpoint contém recibos mínimos, contadores e metadados de chamada, sem resultado ou claim
aberto. Une transições comprovadas sem duplicar/reduzir consumo nem voltar a reserved, inclusive
com timestamps iguais. Resultado que falta na cópia vira uncertain e não ganha envio. Reconcilia
somente completed correspondente ou cancelled anterior ao dispatch; sem prova continua pending.
Invalidação posterior não é desfeita pelo checkpoint. Não há refund presumido ou nova geração.

RQ-6806 / AC-6821: a migration 040 reconhece UUID canônico da sessão quando auth_subject difere.
UUID ausente/bloqueado não cai em alias homônimo. Cinco funções legadas de condomínio/perfil
delegam identidade ao mesmo resolver; demais corpos, regras/grants/search_path preservados.
Migrations antigas não foram editadas. Requer banco novo migrado na preparação local.

## Evidências executadas

| Gate                                                    | Resultado / artefato                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Plano, HMAC, escopo, elegibilidade, união de transições | **36/36 unidades**, `.local/pilot-security/stage6-plan-unit-20261111-r6.json`, após a guarda explícita do temporário |
| SQL/HTTP/RLS e restore real local                       | **6/6 cenários amplos**, `.local/pilot-security/postgres-1794420919101-11476/results.json`, JUnit adjacente          |
| Detalhes de manutenção                                  | `.local/pilot-operations/security-3684b196f7014f35944a35dfbae24553/maintenance-result.json`                          |
| Log da prova SQL atual                                  | `.local/pilot-security/stage6-postgres-1794420951834.log`                                                            |
| Tipos estritos                                          | `stage6-types-20261111-r5.log`, aprovado                                                                             |
| Lint do escopo                                          | `stage6-lint-20261111-r3.log`, aprovado                                                                              |
| Visão                                                   | 72 specs aprovadas pelo comando obrigatório; coerência humana não presumida                                          |

Os seis cenários incluem: concorrência/claims/cotas entre conexões e RLS; dez tentativas por
origem/mil globais; login/cookie/membership com alias colidente, carteira/criação/perfil/saída/
exclusão; contraprova independente da FK; processos separados com revisão A/B e journal dos dois
lados após restore; decisões posteriores ao snapshot, callback falho/rollback, revogação efetiva,
outro tenant preservado, consumo/login perdidos na cópia reaplicados, falta de resultado cercada,
duas aplicações idempotentes e adulteração de RLS negada. ProviderCalls=0; somente sintéticos.

A execução anterior `postgres-1794417866442-25316`, seu log e a prova `security-eb6e...` seguem
preservados como históricos; não substituem o reteste posterior com a guarda de ambiente.

A fixture de CRUD ocorre em uma transação revertida. Para testar saída após criação, valid_from
é recuado somente nessa fixture: now() fica fixo no BEGIN, ao contrário de requisições reais
separadas. A constraint valid_until > valid_from e as assertivas foram preservadas.

## Regressões e falhas preservadas

- Identidade importada: primeiro AC-6821 retornou 403 no acesso legítimo. Vermelho em
  `postgres-1794417195815-29656/results.json`; a ampliação para carteira revelou o alias errado em
  `postgres-1794417452333-27528/results.json`. Ambos preservados; o verde acima cobre a correção.
- Exclusão/FK: vermelho original `stage5-delete-ledger-red.json`. Contraprova SQL independente
  atual exclui o domínio, expurga resultJson/resultSha256, mantém compromisso 10/recibo unknown,
  nega reserva após exclusão e leitura pelo executor do escopo órfão; tenant B idêntico.
- A integração ampliada passou **174/175** antes do ajuste do teste documental que proíbe toda
  SECURITY DEFINER em 039. A função restrita/trigger nova exige contrato atualizado pelo dono,
  sem remover RLS/grants/negativas. Evidência `integration-1794416755423-28768/results.json`.
  Não é gate aprovado; repetir após correção do dono.
  A revalidação focada do arquivo corrigido passou na seleção independente de **32/32** em
  `crossreview-current-1794419275808-23968/results.json`, sem retirar a falha histórica; a
  composição completa ainda aguardava a candidata estável naquele ponto. Posteriormente,
  a composição 177/177 e os gates globais 03/r4 passaram, conforme o fechamento atual acima.
- EPERM no temporário virtual impediu importar a primeira unidade; TEMP/TMP privados resolveram.
  A guarda SQL detectou revoked_at ausente e diferenças artificiais de inventário; foram
  corrigidos timestamp de revogação, nomes completos e ACLs efetivas normalizadas, sem afrouxar
  detecção de alteração real. Relatórios anteriores não foram substituídos.

## Reprodução e limites

`pnpm run test:pilot:data:local` usa somente arquivo temporário próprio, sem banco. O gate
`test:pilot:security:postgres` exige confirmação/recibo de container próprio conforme README;
cria bancos novos, sem TRUNCATE ou credencial real. Não executá-lo contra alvo remoto.

O Docker Desktop local foi iniciado somente após autorização específica do usuário em 11/11,
depois de bloqueio automático inicial. A imagem existente foi usada sem pull. O container próprio
de ensaio foi encerrado após conferência de identidade; recibo
`.local/pilot-security/container-stop-window03-1794424895784.json`. Relatórios/backups preservados.

Autorrevisão destes módulos não conta como independente. A revisão cruzada de Infraestrutura
foi recebida em `2026-11-11-pilot-security-infrastructure-review.md`: r6 com 24 fontes/13
artefatos e oito canários repetidos; mantém a leitura anterior de produção/040/plano,
36 unidades e manutenção SQL com hashes idênticos. Historicamente, r3 alterou somente a
descrição de três bancos em README/AGENTS; a r4
esclarece no ADR 0044 que a proibição é de migration real, distinguindo a prova local autorizada.
Esses deltas documentais não mudam produção/testes e estão identificados para conferência.
Documentos fornece callback/exportação/purga e correções HTTP/UI; gatilhos reproduzidos foram
corrigidos/revalidados em `2026-11-11-pilot-documents-security-review.md`. Gates globais/cobertura
03/r4 passaram. Revisão integral do branch segue no mapa da Infraestrutura; retenção, base
legal, fornecedor, limites reais, IA efetiva/semântica, destino e CI remotos não foram aprovados.
