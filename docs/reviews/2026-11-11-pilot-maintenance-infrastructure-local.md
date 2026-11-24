# Restauração e manutenção — evidência local de Infraestrutura

**Data:** 11/11/2026. **Estado:** composição local validada; dez entradas da candidata r2
revisadas independentemente por Segurança e Documentos. Gates globais concluídos na janela
03/r4, com 910 entradas estáveis. Não autoriza ativação nem aprova o branch inteiro.

O [fechamento global](2026-11-11-pilot-integration-local.md) registra 2.459/2.459 unidades,
247/247 E2E, cobertura acima de 80% nos quatro indicadores, builds API/web, runtime,
evals determinísticos e nove grupos do worker local. O
[snapshot final](pilot-integration-snapshot-2026-11-11.json) preserva os hashes das entradas.
O vínculo por arquivo desta frente está em
`.local/pilot-operations/final-window03-r4-closure-2026-11-11.json`.

Atualização de ambiente: operações/RLS agora usam `envDir:false`. O teste cria apenas um
arquivo fictício em diretório próprio, demonstra o carregamento no controle positivo e o
bloqueio nas duas configurações reais. Vermelho preservado em `vite-env-contract-red-2026-11-11.json`.
A suíte repetida passou **139/139**, com a mesma cobertura da tabela; RLS foi repetido em
PostgreSQL local e passou **17/17**, wrapper `container-34d2a184928947afa135984b38fe716a/result.json`.
Container próprio encerrado. Ambiente mínimo, sozinho, não garantia ausência de descoberta
automática de arquivos pelo framework; essa afirmação fica corrigida. A prova Node/SQL de
recovery abaixo não usa Vite e conserva seus inputs identificados.

RQ-7005 / AC-7010–7012 usam os controles da Spec 072 e o callback documental transacional da
Spec 071. O ensaio preserva a recuperação anterior e cria um terceiro banco novo, sem apagar
schema do destino anterior. Confere o backup/inventário original, aplica plano HMAC externo em
outro processo Node e mantém quarentena. A política é exclusivamente sintética e explícita.

O novo helper prepara dois resultados simulados posteriores ao snapshot, ancora plano/política
fora de `app` antes dos efeitos e verifica após restore revogação de conta/membership, expurgo
de original/páginas/chunks/vetores/resultados e histórico literal preservado no modo declarado.
Tenant B permanece intacto. Sem payload na cópia, o ledger fica uncertain e recusa nova reserva;
o recibo unknown, os compromissos e o contador global de login não são reiniciados.
O orquestrador ancora também destino/rodada/snapshot em recibo externo exclusivo com flush,
antes de conectar o auxiliar. O auxiliar recusa recibo ausente/divergente e apenas confere o
marcador de quarentena criado pelo orquestrador; não prepara outro destino arbitrário. As duas
regressões foram vermelhas antes dessa guarda e passaram depois.

| Evidência | Resultado |
|---|---|
| Unidades de operação | 139/139, seis arquivos, com guarda explícita de ambiente |
| Cobertura focada | statements 96,29%; branches 96,91%; functions 90,69%; lines 97,36% |
| Tipos estritos/lint/formatação | Aprovados no delta de código próprio |
| SQL real após atualização de 040/plano | Restore, inventário e manutenção aprovados |
| Negativas | Plano ausente/adulterado, chave/política/escopo/elegibilidade/RLS divergentes recusados |
| Repetição | Plano reaplicado sem alterar o estado de `app` |
| Isolamento/consumo | Tenant B intacto; nove recibos, seis chamadas e unknown/login preservados |
| Execução externa | Zero; dois transportes simulados na preparação, nenhum no restore |

Artefatos em `.local/pilot-operations/`: `operations-env-hermetic-green-2026-11-11.json`;
wrapper atual `container-3b3c9d49692440669f7c0fa1c7410955/result.json`; o campo
`childReportDirectory` aponta a `result.json` e `maintenance/result.json` adjacente. O recibo
contém os hashes dos módulos/migrations conferidos antes/depois. Container próprio encerrado.
Esta repetição já usa o callback documental que inclui órfãos na purga de conteúdo integral;
não reproduz por si só todos os gatilhos independentes de falha de upload e lote da Segurança.
Manifestações anteriores, inclusive a primeira falha de expectativa sobre recibo cancelled sem
versão, foram preservadas. A correção distingue cancelamento anterior ao envio, sem resultado
e com custo zero, de resultado privado que exige invalidação/expurgo.

Nove entradas foram revisadas por Segurança em
`docs/reviews/2026-11-11-pilot-maintenance-security-review.md`, incluindo 11 guardas repetidas.
O delta posterior (duas configs, regressão e Spec 070) está em
`maintenance-candidate-2026-11-11-r2.json`, com dez entradas; os hashes anteriores permanecem
preservados. O adendo da Segurança conferiu as dez entradas, releu os cinco deltas e repetiu
12/12 guardas operacionais, sem novo defeito nesse escopo. O perfil `documents` adota
config fixa e source/restore exclusivos; a execução positiva
do dono é separada da prova deste relatório. Documentos concluiu a revisão das dez entradas
em `docs/reviews/2026-11-11-pilot-infrastructure-documents-review.md`, sem achado reproduzido
pendente nesse escopo; sua execução SQL própria passou nos dois cenários amplos.

Check/cobertura, E2E e demais gates locais foram concluídos contra a candidata final r4.
A leitura/conciliação técnica do inventário foi concluída no
[relatório de escopo integral](2026-11-11-full-candidate-infrastructure-review.md), sem emissão
de aprovação independente global. Registro formal do diff/commit a integrar, CI remoto e
decisões externas permanecem separados.
Não há aprovação humana, de destino real, retenção, fornecedor, OCR/IA efetivos ou faturamento.
