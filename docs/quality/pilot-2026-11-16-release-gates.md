# Registro de liberação — piloto presencial de 16/11/2026

**Estado em 11/11/2026:** NÃO LIBERADO. Validação local 03/r4 concluída; nenhuma aprovação real presumida.  
Data-alvo: 16/11/2026, America/Sao_Paulo. Responsável pela decisão: a nomear.

Fechamento local atual: `docs/reviews/2026-11-11-pilot-integration-local.md` e snapshot de
910 entradas/18 evidências. 2.459 unidades, 247 E2E, builds/runtime, worker e evals mecânicos
passaram; containers próprios encerrados e fontes iguais antes/depois. A revisão integral
do inventário teve leitura/conciliação técnica concluída por Infraestrutura, conforme
`docs/reviews/2026-11-11-full-candidate-infrastructure-review.md`, com escopos/autorias e hashes
no mapa. Aprovação integral independente, autorias preexistentes não comprovadas, commit/CI,
destino/política e demais decisões externas continuam pendentes. Resultados da janela 02
abaixo são históricos; não se repetiram testes por esta atualização documental.

Depois do fechamento, AC-2414 da Spec 024 recebeu um adendo de uma linha documental,
registrado em `.local/pilot-documents-2026-11-11/post-gates-ac2414.json` e no relatório global.
O snapshot original é preservado: esse hash posterior não é apresentado como entrada dos
testes r4; código/config/testes e artefatos de resultado permaneceram iguais.

## Identificação obrigatória da candidata

Preencher commit exato [ ], revisão do diff completo [ ], frontend/API/worker artefatos e hashes
[ ], schema/migrations [ ], configuração sem segredos e hash [ ], conta/plano/região e ambientes
[ ], gateway/modelos/prompts/limites [ ], fornecedor OCR/imagens/embeddings [ ], flags [ ], horário
[ ], responsáveis e substitutos [ ]. Não colar variáveis sensíveis, URLs autenticadas ou valores
de chaves. Working tree concorrente não é commit de release; toda mudança invalida evidências
afetadas e exige nova revisão. Dados reais nunca são usados para fazer o gate passar.

## Checklist de evidências por commit/configuração

| Gate | Evidência exigida | Estado desta frente / responsável a designar |
|---|---|---|
| Visão/spec/aceitação/rastreabilidade | Briefing atual, specs alinhadas e script validate-spec-vision; escopo aprovado e sem mudança de prompt implícita | Gate final passou para 72 specs na janela 03/r4; coerência semântica/review humano não presumidos |
| Software e cobertura | check; quatro indicadores unitários >=80% no commit a integrar, relatórios CI; sem exclusão que mascare segurança | Check local final aprovado: 2.459 unidades, cobertura 87,57/83,70/92,84/89,44; 247 E2E e builds/runtime/worker. CI remoto/commit a integrar pendentes |
| Revisão independente | Diff completo na revisão mais recente, revisor distinto dos autores, zero P0/P1 pendente | Leitura/conciliação técnica dos 744 arquivos concluída por Infraestrutura, com escopos/autorias no relatório e mapa; sem aprovação integral independente. Autorias preexistentes não comprovadas e commit a integrar continuam pendentes |
| Autenticação/revogação | Código, cookie Secure/HttpOnly, duas sessões, logout de uma, rotação/bloqueio, sem headers de bypass, após reinício e restore | Regressões locais de continuidade, recriação e relógio futuro aprovadas; WhatsApp só na abertura pública; validação/restore no destino pendentes |
| Isolamento integral | API, RLS sem BYPASSRLS, storage, fila, cache, vetores, histórico, upload/export/purge, leitura/erro/logs com canários sintéticos | Provas locais coordenadas passaram: seis SQL Segurança, dois SQL documentais, 17 RLS e worker. Configuração real/destino pendentes |
| Abuso/custos | Réplicas/reinício, origem confiável, cotas de entrada, budgets atômicos por tenant e global, concorrência/retry/cancelamento, teto antes de chamadas | Login, budgets e composição API/documental aprovados localmente, inclusive SQL 039/040/restore. Limites/moeda/fornecedor reais, borda e reconciliação continuam pendentes |
| Upload/parser/OCR/fotos | Assinatura/bytes/páginas/pixels, timeout/qualidade, parser isolado, autorização de cada formato, negativa de material incerto | Contratos sintéticos/local aprovados, incluindo fonte integral/arquivo/recuperação; acurácia OCR/IA efetivos e destino pendentes |
| Evals de produto | Corpus >=100 casos sintéticos representativos revisados conforme quality-gates; todos P0, citações/abstenção/escalonamento; gateway/modelo publicados | Determinísticos e contratos sintéticos passaram; zero aprovação semântica/modelo efetivo/especialista. Nenhuma chamada cobrada executada |
| Histórico durável | Ambos os lados/setup/confirmações/anexos, ACK só após gravação, replay completo após update/restart e dois aparelhos | PostgreSQL local/processos/restore e dois aparelhos testados; não substitui validação da configuração real nem política de direitos/retenção |
| Backup/restore completo | Banco + originais + derivados + histórico + fila + segredos; perda/reinício, versões compatíveis, RPO/RTO aprovados, restore isolado e conferência de integridade | Exercício integral local aprovado, incluindo controles novos; custódia externa/RPO/RTO/revogação pós-snapshot e destino real pendentes |
| Exclusão/exportação | Inventário total, histórico/snapshots, export escopado, outro tenant intacto; tombstones fora do snapshot, reaplicar exclusões/revogações antes de reabrir restore | Provas SQL locais de exportação/purga/órfãos/restore/revogação/B preservado aprovadas; política/custódia/retenção e destino reais pendentes |
| Segurança operacional | TLS, domínio, cookies, borda/proxy, serviço/roles mínimos, MFA de operadores quando aplicável, segredos, logs sem corpos/headers privados, alertas, audit de dependências | Frente operação + revisor independente; pendente |
| Política/fornecedor | D01–D09 aprovadas: base legal, papéis, retenção/WAL/backups, suboperadores/transferências, direitos e incidentes | Minutas preparadas; política sintética continua vigente |
| Participação/documentos | Termos/aviso/autorização finais e poderes por condomínio, coleta privada mínima, eventual gravação separada | Pendente de revisão competente e aceite individual futuro |
| Presencial/suporte | Roteiro e limites aprovados, celulares/computadores/rede ensaiados, suporte/especialistas/pausa e substitutos | Roteiro preparado; responsáveis e agenda pendentes |
| Aprovação final | Todos gates e revisores identificados por evidência, riscos residuais sem P0/P1, decisão explícita de liberar config/commit/coorte | NÃO LIBERADO |

## Coordenação das execuções

Durante edições concorrentes, somente testes focados, temporários únicos e leitura de código.
Não executar install, migrations, integração destrutiva, formatação/cobertura global ou runners
que sobrescrevam relatórios compartilhados. Cada frente registra comandos e hashes próprios.
Esta frente mantém o índice de evidências e integra comandos depois de ler as notas das demais;
não inicia tarefas externas nem envia mensagens a outros chats.

Depois de uma candidata estável coordenada, executar os gates aplicáveis da quality-gates.md e
AGENTS.md, incluindo check, E2E, integration sintética guardada, worker separado, scanners/audit,
evals e build/runtime. Comandos que exijam rede, cobrança, serviço ativado ou migration ficam
pendentes até autorização específica; não herdam autorização de preparação local. Cada runner
deve preservar saídas por candidata sem substituir evidências de outra frente. CI/status checks
obrigatórios também precisam passar no commit a integrar.

## Registro vazio para preenchimento posterior

| Campo | Valor |
|---|---|
| Candidata / configuração / gateway / modelo | Pendente |
| Gate / comando / data/hora | Pendente |
| Ambiente sintético guardado e confirmação | Pendente; sem segredo |
| Resultado e caminho do relatório imutável/hash | Pendente |
| Falhas P0/P1 / decisões e limitações | Pendente |
| Autor da evidência / revisor competente | Pendente |
| Decisão final, coorte e escopo liberado | NÃO LIBERADO |

## Histórico — integração da janela 02

P1 de reuso entre políticas corrigido e revalidado localmente: sete regressões red/green,
processos separados, PostgreSQL e restore recusam B e recuperam A sem novo envio. Registro em
`docs/reviews/2026-11-09-pilot-documents-security-review.md`; revisão parcial por IA de outro
autor em `docs/reviews/2026-11-09-pilot-security-infrastructure-review.md`. Não aprova diff inteiro.
Spec 072 recebeu composição documental, admissão central e prova SQL local. A candidata passou
pelos gates locais da janela 02; política real continua negada, CI/review completo/destino pendentes.

Passar mecânica em mock, ambiente Neon sintético, Codex local ou worker não certifica qualidade
semântica no gateway de IA escolhido nem política/aprovação de dados reais. O lançamento fica
bloqueado enquanto qualquer gate aplicável estiver faltando ou reprovado.
