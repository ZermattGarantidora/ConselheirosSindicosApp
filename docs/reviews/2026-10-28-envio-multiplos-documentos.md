# Revisão local — envio de múltiplos documentos

- **Status:** revisão do autor concluída; não é aprovação independente para merge
- **Autor e revisor local:** Codex
- **Data:** 2026-10-28
- **Escopo:** RQ-2007/AC-2008–AC-2010 e integração com RQ-2004, Specs 025, 037 e 045
- **P0/P1 introduzidos pela fatia e pendentes:** nenhum identificado

## Diff revisado

Mudanças desta tarefa em `App.tsx` e `styles.css` foram comparadas com a cópia anterior à
edição em `.local/multi-document-baseline/`, preservando o trabalho que já existia no diretório.
Também foram lidos integralmente `document-upload-batch.ts`, `ChatDocumentAttachments.tsx`,
os testes novos, os ajustes nos testes de interface, spec/aceitação, MVP e rastreabilidade.
O manifesto dos arquivos funcionais fica em `reports/020-multiple-upload-source-manifest.json`.

O fluxo foi percorrido para seleção incremental, remoção individual, metadados de repetição,
limites por tipo, confirmação por seta/Enter, pergunta única, erro parcial, timeout e descarte
de contexto. O cliente guarda referências aos arquivos, sem lê-los nem concatenar seus bytes
durante a seleção. Cada upload continua autorizado e isolado no endpoint privado existente.
Originais aceitos saem da seleção de repetição; falhas no processamento não os reenviam.
Pendências de nomes são enfileiradas por versão e não alteram o condomínio cadastrado.

## Validação

- Binários locais de Prettier, ESLint e TypeScript: aprovados; `pnpm`/Corepack indisponível por DNS.
- Vitest com cobertura e `--maxWorkers=2`: 153 arquivos e 1.370 testes aprovados;
  statements 91,89%, branches 87,39%, functions 96,79%, lines 93,59%.
- Helper de seleção/sequência: 13 testes, 100% nos quatro indicadores de cobertura.
- Builds de API/web, gate de visão e scanner de segredos: aprovados.
- Runtime compilado: dois PDFs, vinte perguntas, zero chamadas a provedores; pico local de 145 MiB.
- Evals documentais: 50/50 determinísticos; semânticos continuam dependendo da revisão existente.
- Navegador, em servidor isolado com perfil sintético e sem IA externa: três arquivos selecionados,
  remoção e acréscimo sem duplicação, três leituras prontas e duas pendências independentes;
  confirmar a primeira conserva a segunda, cujo cancelamento não desfaz o primeiro resultado.

Não foram alterados parser, prompt, modelo, recuperação, banco ou permissões. Não houve
migração nem nova dependência ou serviço de produção. O teste no navegador não mede o pico
de PDFs grandes, não comprova 512 MB no Render e não inclui chamadas a IA real.

## Falhas e limites registrados

A primeira rodada completa, com concorrência automática e outras verificações ativas, teve
nove timeouts de 5 segundos. A rodada com dois workers passou sem alterar asserções nem
os limites dos testes. O temporário do sandbox também negou renomeações; os testes usam o
cache gravável `node_modules/.cache/alvitra-tests`.

O runner adicional `node scripts/run-tsx.mjs evals/run.ts` reproduziu 19/20: EVAL-008, P0,
espera `conflict` e recebe `grounded`. Seu grafo importa somente backend/corpus existentes,
não importa os arquivos web deste diff, e nenhum desses arquivos de backend foi editado por
esta tarefa. O adapter sintético HTTP tem 20/20 na suíte completa. O resultado do runner
adicional não foi escondido nem seu gabarito alterado; o gate global de evals continua pendente.

Nenhum merge, publicação ou liberação de piloto foi executado. Uma integração exige review
independente da revisão final e resolução dos gates globais aplicáveis no commit a integrar.
