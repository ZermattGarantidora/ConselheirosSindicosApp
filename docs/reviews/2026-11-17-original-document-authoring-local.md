# Proatividade sobre originais e demonstração — 17/11/2026

**Escopo:** RQ-7318/7319, AC-7338–7341 da Spec 073.  
**Estado:** fatia local concluída e validada; Spec 073 integral em andamento.  
**Restrições:** sintéticos, sem contratação, instalação, chamada paga, configuração `.env`, dados reais ou ativação.

Após síntese de um único original completo e confirmado, composição sintética explícita oferece
organização de espaços/quebras na conversa. Antes/depois integral e fontes acompanham a oferta;
palavras, pontuação, números e ordem de todos os blocos permanecem. O teto de mil caracteres
por bloco decorre do limite de citação integral, conferido antes do agente. Revisão mais ampla
continua no fluxo de pedido explícito. Não há promessa de correção semântica ou layout original.

Reutiliza proposta/redator/conferente, journal, orçamento, retenção e editor. Identidade por
contexto/versão/conteúdo conserva aceite/recusa e resultados; envio incerto não é repetido.
Texto idêntico tem estado `unchanged`, sem decisão/rascunho aplicável. Falha operacional de
avaliação é separada da síntese válida; mudança/revogação da fonte impede entrega. A origem
é comparada ao conteúdo efetivamente analisado e novamente antes de persistir o pedido.

Aceite abre novo rascunho, sem confirmar PDF. Edição humana e confirmação exata são recuperáveis;
original permanece intacto. A UI consulta ofertas sem chamar o agente, não insiste após recusa
e cancela a continuidade ao trocar de chat. Controles automáticos exigem permissão de upload.
Nenhum startup injeta modelo ou seleciona a nova composição por variável de ambiente.

## Verificação

Evidências desta rodada ficam em `.local/authoring-originals/`; manifesto de fontes e relatórios
JSON/JUnit/cobertura permitem conferir a candidata. Comandos diretos dos binários instalados
evitam instalação implícita do pnpm 11.

`test:authoring:originals:browser` compõe API e componentes reais em loopback, com modelo/conferente
simulados e bloqueio de destinos externos. Percorre análise, perda de resposta, oferta, aceite,
edição, confirmação, download e extração do PDF, reload, troca de chat e recusa sem insistência;
confere desktop e 390 px, captura telas e encerra seus servidores/navegador. API em memória:
reload não é prova de reinício/backup do produto. PostgreSQL tem gate separado.

Na primeira execução, o watcher do Vite tentou observar o PDF enquanto o Edge o gravava e
recebeu EBUSY. O harness passou a observar somente fontes relevantes, ignorando seus artefatos
PDF/PNG/relatórios; não mudou timeout, asserção ou scanner de segurança. A demonstração completa
foi repetida com sucesso após essa correção.

A primeira bateria global foi interrompida para incorporar correções da revisão, antes de ser
tratada como candidata final. Na candidata estabilizada, os 2.673 unitários passaram em 211
arquivos; cobertura final statements/branches/functions/lines: **85,23% / 81,86% / 90,93% / 87,13%**,
sem adicionar exclusões de produção. E2E com conexões reais ao servidor local encontraram
`connect EACCES 127.0.0.1` no sandbox; foram repetidos com acesso autorizado ao loopback.
Nenhuma asserção/timeout foi reduzida ou aumentada para passar.
Na conferência final foi corrigida também a projeção do histórico: recibos operacionais
automáticos permanecem no journal/exportação, mas não aparecem como mensagens humanas.
Oferta contextual e decisões reais permanecem consultáveis. Regressão HTTP verifica o histórico
público e o recibo interno; todos os gates foram repetidos contra o manifesto final, com quinze fontes.
Os **271 E2E em 43 arquivos** passaram na repetição completa com loopback autorizado, incluindo
os dez novos cenários de originais. Os treze novos unitários validam o contrato conservador.

| Gate | Resultado |
|---|---|
| Formatação, lint, tipos | Aprovados; fontes estáveis por SHA-256. |
| Unitários e cobertura | 2.673/2.673; quatro indicadores acima de 80%, sem exclusão nova. |
| E2E | 271/271, incluindo dez cenários novos. |
| Builds API/web e runtime compilado | Aprovados; runtime processou dois PDFs e respondeu vinte perguntas sintéticas, zero chamadas reais. |
| Evals | Núcleo 20, documental determinístico 50, áudio 26 e autoria geral 31 aprovados; qualidade de modelo real não avaliada. |
| Visão | 73 specs aprovadas; briefing e gate competitivo preservados. |
| Navegador | Originais, geral e áudio aprovados; arquivos `browser-gates.json`/`browsers-result.json`. |
| QA visual | Oferta desktop/390 px e PDF de uma página inspecionados; acentos, procedência e rodapé legíveis, sem corte. |
| PostgreSQL local | Dois cenários integrados de autoria/Word/áudio/RLS/restore aprovados, container encerrado. |
| Segredos | Scanner completo aprovado em 108,73 s, sem alterar escopo/exclusões; nenhum padrão conhecido encontrado. |

Fechamento verificável em `.local/authoring-originals/closure.json`: quinze fontes estáveis,
41 critérios mapeados, dezesseis recibos de gates/bundles aprovados, `localCompleted: true`,
`productionAuthorized: false` e `realProviderCalls: 0`. Recibos de navegador, PostgreSQL e scanner
estão vinculados ao SHA-256 do manifesto final. Não houve commit, merge ou publicação.

O Docker inicialmente estava parado. Após iniciar somente o Docker Desktop já instalado em
segundo plano, o wrapper concluiu em banco sintético local, sem pull/instalação ou destino remoto:
`.local/pilot-operations/container-77b1ef2f31044d5d8d77f0f9dbac7746/result.json` e prova em
`.local/pilot-operations/e1068e7d21874d7291fc6adf6f3e305a/authoring-proof.json`.
Prova cobre restore anterior ao dispatch, Word imutável, fontes, TTL, purga/reaplicação,
paridade SQL das seis finalidades e compromisso conservado sem repetir ASR/modelo.

## Revisão e limites

Revisão própria conforme `code-review`, sobre o diff contra a cópia inicial desta tarefa e os
arquivos novos; preservadas as demais alterações preexistentes do checkout. A revisão detectou
uma janela entre a leitura da análise e o segundo carregamento usado para preparar a proposta:
agora o hash esperado é conferido antes do dispatch, com regressão que exige zero chamada quando
a fonte muda nessa janela. Evita também consultar ofertas automaticamente para perfis sem upload.
Nenhum achado P0/P1 permanece pendente no diff desta fatia após essas correções.

Não é revisão independente do branch inteiro, CI remoto, commit/merge, homologação semântica,
política de retenção/custo ou liberação do destino. A Spec 073 continua em andamento. A
[matriz única](../specs/073-agente-documental-e-pdf/matriz-aceitacao.md) cobre os 41 critérios,
separa provas locais de qualidade real e consolida pendências históricas superadas.
