# Notas de integração — Spec 036

O harness está em `evals/documentary-quality/semantic/`. O teste e2e usa `createLocalSyntheticAnswerGateway` somente para confirmar a ligação de 50 fichas ao contrato real de gateway e ao validador de citações. Ele não chama provedor, não mede modelo e não aprova conteúdo.

Para avaliação probabilística futura, o integrador deve fornecer explicitamente um `AnswerGateway` autorizado e registrar o provedor, modelo, versão, custo, data, parâmetros e artefatos de revisão. Sem essa decisão, `replaySemanticCases()` deve ser chamado sem gateway e retornar `pending_gateway`.

O comando `pnpm run evals:documentary:semantic` está registrado em package.json, README e AGENTS. Exporta fichas para `reports/documentary-semantic-review.json`; a opção `--synthetic` usa somente o gateway local e exporta respostas/telemetria para `reports/documentary-semantic-synthetic.json`. Não carrega credenciais nem chama provedor. Fontes são fixtures independentes do gabarito; lacunas permanecem explícitas. A vigência fica pendente, e o replay direto não substitui o pipeline de elegibilidade/recuperação. Os formulários humanos continuam não preenchidos e o total semântico aprovado é zero.
