# Notas de integração — Spec 031

## Integração final — 2026-10-16

O comando `evals:documentary` está registrado em package.json, README, AGENTS e CI. O executor exportado é exercitado pelo e2e e valida 41 cenários reais dos módulos disponíveis, mantendo nove determinísticos e 50 semânticos pendentes. As descrições abaixo registram o recorte anterior à integração; `observed-results.md` e a saída do comando são a referência atual. Revisão especializada e avaliação probabilística continuam pendentes e impedem declarar baseline de produto.

## Resultado observado em 2026-10-16

O executor local `evals/documentary-quality/run.ts` exercita `extractStructuredDocument`, `financialAmountsFromStructuredExtraction`, `compareFinancialPeriods` e `selectFinancialEvidence` somente quando a asserção corresponde ao caso descrito. Na execução observada, 13 cenários determinísticos passaram e 37 ficaram como `pendingIntegration`; os 50 semânticos também permanecem pendentes. Isto não é validação fim a fim de recuperação textual, gateway de resposta ou análise normativa.

## Dependências entre frentes

- Spec 028: falta a persistência/recuperação do derivado estruturado e a publicação estável do adaptador; campos `needs_review`, página, trecho e versão precisam chegar intactos.
- Spec 029: o comparador financeiro está coberto onde aplicável, mas o gateway de resposta documental ainda deve expor as respostas julgáveis por esta bateria.
- Spec 030: atas, convenções, regimentos e contratos têm cenários catalogados, mas seu contrato normativo ainda não foi integrado aqui.

## Registro global pendente

A divisão de trabalho proibiu alterações em `package.json`, `README.md`, `AGENTS.md` e `docs/quality/traceability.md`. Para conclusão integral, registrar um comando canônico que rode `node scripts/run-tsx.mjs evals/documentary-quality/run.ts`, documentá-lo e vinculá-lo à rastreabilidade e aos gates globais.

## Revisão especializada pendente

Nenhum contador, jurista ou síndico revisou os casos. Nenhum provedor/modelo foi chamado. Assim, os resultados determinísticos confirmam somente contratos locais; não são qualidade de modelo, baseline de produto ou autorização de rollout.

## Encaminhamento semântico

A Spec 036 converteu os 50 cenários semânticos em fichas sintéticas concretas e oferece replay opcional de um `AnswerGateway` fornecido. O replay local confirma somente contrato de fonte e citação; cada ficha permanece pendente de avaliação por contador, jurista e/ou síndico conforme seu tema.
