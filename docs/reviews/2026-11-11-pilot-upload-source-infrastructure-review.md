# Fonte do upload — regressão de arquivamento

**Data:** 11/11/2026. **Revisor por IA:** Infraestrutura, sem edição do novo leitor documental.

**Gatilho corrigido e revalidado:** `createSourceReader(catalog)` confere o catálogo ativo;
startup injeta o repositório real. A mesma contraprova do startup passou: fonte 200, arquivo
204, fonte 404 e corpo anterior não entregue. Resultados novos
`upload-source-archive-startup-{green,proof-green}-2026-11-11.json`; vermelho preservado.
Fonte/binding e unidade mantida de arquivo/recuperação/tenant B/versão histórica ativa foram
relidos. A captura final 03/r4 e os gates locais foram concluídos com 910 entradas estáveis,
2.459 unidades e 247 E2E, conforme o [fechamento global](2026-11-11-pilot-integration-local.md).
Não é aprovação do checkout inteiro. A descrição vermelha abaixo é histórica.
As **5/5 unidades mantidas** foram repetidas independentemente em
`upload-reader-r4-independent-2026-11-11.json`. O probe isolado original também passou em
`upload-source-archive-api-green-2026-11-11.json`, adaptando somente a construção do reader
para `createSourceReader(catalog)` e os nomes de artefatos; assertivas preservadas. Os 96
hashes da candidata documental r4 e os inputs da contraprova do startup foram conferidos iguais.

## [P2] Negar a página integral quando o upload é removido

O novo `sourceReader` de `development-document-memory.ts` consulta `sourcePages` somente por
permissão/tenant/documento/versão/página. O binding de `server.ts` o compõe com seeds/legislação,
mas a consulta da fonte não confere o catálogo ativo. Arquivar retira o documento do catálogo;
o mapa continua entregando o texto integral pelo URL já conhecido.

Contraprova com createApi, catálogo/memória privados e pipeline reais, PDF inteiramente sintético
e transporte `app.inject`: upload **202**, fonte **200**, DELETE **204**, catálogo sem o item e
GET da fonte ainda **200**, com corpo idêntico ao anterior. A regressão exige **404** e falha.
Não há listener, banco, serviço remoto ou IA. Temporário próprio foi removido após fechar a API.

Uma segunda reprodução confirmou os mesmos resultados no startup demo real, com cookie
emitido pelo helper sintético e `app.inject`. O listener local efêmero foi encerrado. Relatórios
`upload-source-archive-startup-{red,proof-red}-2026-11-11.json` no mesmo diretório. Essa prova
integra o binding real e é a referência para revalidar a correção. A prova isolada original não
obriga que a política de catálogo seja implementada dentro da memória, se a composição a aplicar.

Isso contraria Spec 020 RQ-2006/AC-2007: fonte removida conserva somente seu trecho histórico.
O leitor PostgreSQL já exige `documents.status='active'`. A leitura atual de página inteira
precisa revalidar o estado do documento; vigência pending pode continuar sendo fonte de conflito
sem equivaler a documento removido. Preservar histórico autorizado e recuperar documento segundo
o contrato existente, sem reduzir isolamento ou apagar o trecho já exibido.

Fonte da contraprova e relatórios imutáveis em `.local/pilot-operations/full-review/`:
`upload-source-archive-repro.test.ts`, `upload-source-archive-red-2026-11-11.json` e
`upload-source-archive-proof-red-2026-11-11.json`. Promover o cenário à suíte mantida e cobrir
recuperação/tenant separado antes da captura final. O leitor ainda estava em revisão; não houve
aprovação dessa implementação ou da candidata global.
