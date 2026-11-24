# Matriz de aceitação — Spec 073

**Atualizada em:** 2026-11-18  
**Estado:** implementação e demonstração locais; caso financeiro de 300 páginas homologado com ajuste aplicado; spec integral em andamento.

“Local” significa contrato exercitado com sintéticos. “Simulado” significa saída de modelo
programada e conferente simulado; não é evidência de qualidade de IA. “PostgreSQL local” significa
bancos descartáveis com RLS e restore, sem banco remoto. Nenhuma linha autoriza produção/dados reais.

| Critério | Evidência executável principal | Estado e limite |
|---|---|---|
| AC-7301 | `document-authoring.test.ts`, `original-document-improvements.e2e.test.ts`, navegador de originais | Local/simulado; fluxo comum. Oferta automática só organiza espaços/quebras. |
| AC-7302 | `document-drafts.test.ts`, `document-authoring.e2e.test.ts` | Local: revisão/hash/idempotência, nova confirmação após editar. |
| AC-7303 | `document-drafts.test.ts`, `document-proposals.e2e.test.ts`, `authoring-operations.test.ts` | Local: fontes atuais e históricas, revogação e isolamento. Correção semântica real pendente. |
| AC-7304 | `document-proposals.e2e.test.ts`, `authoring-postgres.test.ts`, navegador de originais | Local: original preservado; derivado privado não promovido. |
| AC-7305 | `docx-reading.test.ts`, `authoring-postgres.test.ts` | Local: subconjunto DOCX restrito, blocos, pacotes hostis e extração incompleta. Sem suporte irrestrito. |
| AC-7306 | `audio-transcription.test.ts`, `audio-minutes.test.ts` | Simulado: tempos/falantes/incertezas. Acurácia de ASR real pendente. |
| AC-7307 | `audio-inputs.test.ts`, `authoring-operations.test.ts` | Local: limites por modo, indisponibilidade, reservas; preço/duração reais não aprovados. |
| AC-7308 | `document-drafts.test.ts`, `test:authoring:pdf`, `test:authoring:audio:pdf` | Local: multipágina, acentos, limites, rejeição sem corte. Sem reconstruir layout original. |
| AC-7309 | `document-authoring.test.ts`, `authoring-postgres.test.ts` | Local e PostgreSQL local: falhas, retomada, reinício e restore. |
| AC-7310 | `test:authoring:general:browser`, `test:authoring:originals:browser` | Navegador real com API/modelo simulados; revisão, confirmação e download. |
| AC-7311 | Harnesses sintéticos e startup; relatórios locais | Zero transportes reais nos ensaios; não aprova fornecedor ou contratação. |
| AC-7312 | `audio-minutes-ui.test.ts`, `test:authoring:browser` | Local: seleção não envia; pedido explícito e troca de contexto. |
| AC-7313 | `audio-minutes.test.ts`, `semantic-minutes-contract.test.ts`, `evals:audio-minutes` | Simulado: resumo, procedência e pendências; qualidade real pendente. |
| AC-7314 | `audio-minutes.test.ts`, `audio-minutes.e2e.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: fonte atual e isolamento. |
| AC-7315 | `audio-minutes.test.ts`, `audio-minutes.e2e.test.ts` | Local: perda de resposta, identidade e edição humana preservada. |
| AC-7316 | `audio-minutes.test.ts`, `test:authoring:audio:pdf` | Local: entrada completa, revisão longa e excesso explícito. |
| AC-7317 | `semantic-minutes-contract.test.ts`, `evals:audio-minutes` | Simulado: redação/tópicos; utilidade e síntese reais pendentes. |
| AC-7318 | `semantic-minutes-contract.test.ts`, `evals:audio-minutes` | Simulado: fontes/números falsos, incerteza e omissão rejeitados. |
| AC-7319 | `semantic-minutes-model.test.ts`, `evals:audio-minutes` | Simulado: conferência integral; desempenho real do conferente pendente. |
| AC-7320 | `audio-minutes.test.ts`, `authoring-operations.test.ts` | Local: concorrência/dispatch incerto sem fallback/reenvio. |
| AC-7321 | `audio-minutes.test.ts`, `audio-minutes-ui.test.ts`, navegador de áudio | Local: ausência de redator e retomada sem falsa ata extrativa. |
| AC-7322 | `document-improvements.test.ts`, navegador de áudio | Simulado: melhoria de rascunho com aceite/recusa; sem confirmar PDF. |
| AC-7323 | `document-improvements.test.ts`, `authoring-operations.test.ts` | Local: base modificada, concorrência, palavras/números e origem. |
| AC-7324 | `test:authoring:postgres` / `authoring-postgres.test.ts` | PostgreSQL local: Word, bytes/blocos, API nova, restore e RLS. |
| AC-7325 | `test:authoring:postgres`, `audio-inputs.test.ts` | PostgreSQL local: original/transcrição/ata, TTL, revogação e isolamento. |
| AC-7326 | `audio-recovery-journal.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: tombstone, cofre, falha de I/O e consumo preservado. |
| AC-7327 | `document-authoring.test.ts`, `document-proposals.e2e.test.ts` | Simulado: texto, antes/depois, justificativas e aceite separado. |
| AC-7328 | `document-authoring.test.ts`, `evals:document-authoring` | Local/simulado: offsets, números, fontes, cobertura e relato. |
| AC-7329 | `document-authoring.test.ts`, `evals:document-authoring` | Simulado: conferente separado; qualidade semântica real pendente. |
| AC-7330 | `document-authoring.test.ts`, `document-proposals.e2e.test.ts` | Local: claims, persistência e replay sem desfazer revisão humana. |
| AC-7331 | `document-proposals.e2e.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: fonte, contexto, colisão e recriação de API. |
| AC-7332 | `document-authoring-ui.test.ts`, navegador geral | Local: pedido explícito geral, sem geração por abertura/seleção; startup negado. |
| AC-7333 | `authoring-operations.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: seis finalidades, reserva/claim e resultado antes do complete. |
| AC-7334 | `authoring-operations.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: restore anterior ao dispatch, cofre externo e quarentena. |
| AC-7335 | `authoring-operations.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: TTL fixo e manutenção explícita; sem cron/política real. |
| AC-7336 | `authoring-operations.test.ts`, `authoring-postgres.test.ts` | Local/PostgreSQL local: exportação, fontes históricas, purga e reaplicação. |
| AC-7337 | Harnesses/gates locais, `server.test.ts`, guards de startup | Somente sintéticos/configuração explícita; destino/custódia reais pendentes. |
| AC-7338 | `original-document-improvements.test.ts`, E2E de originais | Local/simulado: blocos completos, espaços/quebras, fontes e confirmação separada. |
| AC-7339 | E2E de originais, navegador de originais | Local: identidade estável, concorrência, recusa, texto idêntico e recuperação sem agente novo. |
| AC-7340 | Unitários/E2E de originais, testes gerais de fonte/contexto | Local: bloqueios, perda de resposta, fonte revogada e erro operacional separado. |
| AC-7341 | `test:authoring:originals:browser`, E2E de originais, esta matriz | Demonstração simulada completa; recibos automáticos preservados internamente sem virar falas humanas. API em memória, sem alegar persistência entre reinícios. |
| AC-7342 | `evals:authoring:homologation`, `authoring-homologation.test.ts` | Pacote de 24 casos, entradas/gabaritos separados, fontes/versões/locadores e hashes. Revisão humana dos gabaritos pendente. |
| AC-7343 | `protocol.ts`, testes e relatório de contratos | Formulários humanos pendentes; simulação não aprova semântica; falha crítica bloqueia agregação. A execução real está em AC-7347. |
| AC-7344 | `evals:authoring:homologation:audio`, `audio.ts`, testes | Dez WAVs preparados por voz pt-BR local, com hashes/tempos. ASR real medido separadamente em AC-7347; escuta humana e corpus acústico amplo pendentes. |
| AC-7345 | `operations.ts`, `rehearsal.ts`, proposta operacional e testes | Valores revisáveis, orçamento externo zero, dez decisões pendentes e oito ensaios sintéticos. Política não aplicada; histórico permanente/custódia/destino exigem aprovação. |
| AC-7346 | `local-authoring-models.test.ts`, adaptadores Codex/whisper.cpp, ADR 0046 | Plano ChatGPT, processo isolado, ferramentas/chaves/fallback negados; schema alinhado ao domínio, cancelamento, hashes e PCM estrito. Somente composição local explícita. |
| AC-7347 | `evals:authoring:local`, recibos/relatórios de 18/11 | Redação/conferência reais; roteiros exatos avaliados separadamente do ASR. Dez transcrições locais e percurso ASR→ata com recusas conservadas. Gabarito de conflito corrigido com causa, entradas e origem dos recibos preservadas. Revisão humana pendente. |
| AC-7348 | `authoring-artifacts.ts`, `postgres-audio-storage.ts`, unitários e `authoring-postgres.test.ts` | Mensagens públicas intactas após purga; payloads removidos, internos ocultos; SQL/restore e contexto revalidados. Proposta de prazos permanece inativa. |
| AC-7349 | `evals:financial-300`, corpus/oracle separados | PDF sintético real com 300 páginas; todo texto extraído comparado ao anterior ao PDF; 293 documentos detalhados e 8.790 itens. Não é OCR arbitrário. |
| AC-7350 | `financial-dossier.test.ts`, análise e inventário | Grupos explícitos e referências originais verificadas. Tenant, qualidade, identificação, título, lacunas e teto falham sem truncar. |
| AC-7351 | `financial-review.test.ts`, `financial-report.test.ts`, oracle | Dez estados e valores do gabarito conferidos; totais e soma de todos os documentos detalhados. Parcial/duplicado não confirma suporte integral; valores de suporte parcial explicitados em AC-7355. Estados saudáveis preservados. |
| AC-7352 | `financial-report.e2e.test.ts`, prova Codex local | Redação e conferência reais separadas; rascunho comum, retomada, confirmação/PDF, fonte alterada na página 300 bloqueada sem chamada adicional. API reconstruída com RAM compartilhada; não prova sozinha durabilidade do relatório financeiro. |
| AC-7353 | `financial-report.test.ts`, E2E, prova local e revisão humana 2 | Rascunho comum e confirmação por hash; origem integral revalidada em entrega. Revisão 2 homologada com suporte parcial de Manutenção e R$ 305,95 pendentes explícitos, 207 referências e PDF de 27 páginas. Sem nova chamada de modelo, startup ou proposta operacional ativos. |
| AC-7354 | Unitários e `H073-001/002-corrected.json` | Classificação estrita do servidor conserva 24 horas e relato sem diagnóstico, sem revisão especializada da redação; investigação técnica em pendência e mudanças substantivas protegidas. Conferência real separada e saída bruta verificável; revalidação humana pendente. |
| AC-7355 | `financial-review.test.ts`, `financial-dossier.test.ts`, navegador e SQL financeiro | Suporte parcial automático: R$ 9.382,80 apoiados, R$ 305,95 pendentes, citações e pedido específico; completo/ausente preservados. |
| AC-7356 | `financial-review.test.ts`, gabarito integral | IDs repetidos, ambiguidade, lançamentos duplicados e excesso não certificam apoio. Outra competência excluída, sem parcela negativa. |
| AC-7357 | `financial-report.test.ts`, E2E e `test:authoring:financial:browser` | Seleção por título/página, sem modelo na consulta; pedido explícito no editor comum, recuperação sem modelo e paginação. Sem startup/limites ativos. |
| AC-7358 | Navegador financeiro e unitários | 300 páginas, resposta perdida sem repetir fases, edição, confirmação/PDF, reload, mobile e troca de chat. Resultados salvos materializados após falha de armazenamento sem modelo. |
| AC-7359 | `financial-report-postgres.test.ts`, `test:authoring:postgres` | PostgreSQL real local; processo novo e restore separado recuperam edição, confirmação, original e PDF por hash. Modelo ausente nos processos de recuperação. |
| AC-7360 | SQL financeiro, E2E e unitários | Página 300 alterada, acesso revogado/contexto cruzado e envio incerto bloqueados. v1 concluído recuperado sem reanálise; v1 incompleto exige reconciliação. |

## Evidências e pendências para conclusão integral

- A [continuação financeira no chat](../../reviews/2026-11-18-financial-chat-persistence-local.md)
  automatiza suporte parcial e comprova a persistência específica do relatório de 300 páginas,
  por processo novo e restore PostgreSQL. O navegador usa API sintética em memória; a prova SQL
  é separada e não depende dela. Zero chamada externa nesta continuação, proposta inalterada.

- Prova representativa de 300 páginas e gabarito independente do parser/modelo em
  [relatório de 18/11](../../reviews/2026-11-18-financial-300.md). Redação e conferência reais
  via Codex contratado. O usuário homologou o caso pelo chat com ajuste de clareza em Manutenção;
  a revisão 2 aplica o ajuste e tem confirmação, fontes e QA verificados, sem nova chamada de IA.
  Decisão em `.local/authoring-homologation/human-chat/session-20261118/decisions/003-financial-300.json`.
  Outras homologações permanecem pendentes. Proposta operacional inativa; nenhum startup,
  publicação ou liberação real habilitado.

- [Persistência Word/áudio](../../reviews/2026-11-16-authoring-continuation-local.md),
  [agente geral](../../reviews/2026-11-16-general-document-authoring-local.md),
  [controles operacionais](../../reviews/2026-11-16-authoring-operations-local.md) e
  [proatividade/demonstração](../../reviews/2026-11-17-original-document-authoring-local.md).
- A prova real local de redação/conferência e ASR foi executada com a autorização de 18/11.
  Aprovar qualidade humana/especializada e ampliar a amostra acústica continuam pendentes;
  não se deduz aprovação de uma revisão por modelo ou de WER isolado. O
  [relatório técnico](../../reviews/2026-11-18-authoring-real-local.md) distingue contratos,
  resultado semântico, ASR e bloqueios. O [pacote](pacote-homologacao.md) conserva formulários
  humanos pendentes. A [proposta operacional](proposta-operacional.md) permanece inativa por
  decisão explícita, sem adotar sete dias/24 horas ou aprovações automáticas.
- Aprovar destino, política/duração/custos/retenção, custódia dos cofres e journals externos ao dump,
  manutenção/agendamento e recuperação no ambiente escolhido. Nenhum serviço precisa ser contratado
  para preparar casos, limites propostos e ensaios locais.
- Revisão independente do diff inteiro do branch e CI sobre o commit de integração continuam gates
  de merge. A revisão própria e os gates locais desta rodada não os substituem.
- Proatividade automática mais ampla que espaços/quebras e fidelidade de layout da Spec 062 continuam
  fora da prova entregue aqui. Word/fotos/PDF dependem de leitura completa; áudio tem seu fluxo próprio.
