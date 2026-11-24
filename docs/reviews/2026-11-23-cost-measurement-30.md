# Revisão do autor — medição de custo e amostra pareada

- **Status:** REVISÃO DO AUTOR — NÃO AUTORIZA MERGE
- **Commit ou diff revisado:** delta da Spec 074 no workspace preexistente; arquivos e hashes em `.local/cost-074/reviewed-files.json`.
- **Revisor independente:** pendente
- **Autor/revisor desta etapa:** Codex, com a skill local `code-review`
- **Data:** 2026-11-23
- **P0 abertos no código do delta:** 0 encontrados
- **P1 abertos no código do delta:** 0 encontrados

## Escopo revisado

Tarifário/parser de consumo, telemetria de sucesso/erro, preservação das classes de erro,
roteamento sem fallback novo, recibos no evento privado existente e amostra/runner/agregador.
Revisados integralmente os arquivos novos e os deltas desta tarefa nos módulos já alterados
do workspace, seus chamadores e contratos de persistência. Alterações anteriores preservadas;
este registro não aprova o branch inteiro ou atribui sua autoria a esta tarefa.

Verificados contagem única de leitura/escrita/raciocínio, TTL misto, contexto extenso,
contadores incompatíveis, estimativa desconhecida, tarifa não encontrada e proteção contra
nomes herdados de `Object.prototype`. Consumo é registrado antes de rejeitar saída ou HTTP.
Reparo conserva ambas as tentativas. Contadores inválidos não contaminam os campos legados
da persistência; recibos não contêm chave, pergunta, saída, trecho ou mensagem arbitrária.

O recibo usa os eventos já vinculados à pergunta/resposta/condomínio, sem schema ou SQL
novo. Teste confere os parâmetros enviados à transação SQL existente, sem banco remoto.
Telemetria de erro é associada internamente por `WeakMap`, preservando o erro original para
o fluxo de segurança e reparo. Validadores, prompts, autorização e policy de risco não foram
afrouxados. O percurso Codex congelado permanece com hashes iguais aos módulos atuais.

A amostra é fixa, usa memória própria por cenário/braço, não injeta gabaritos e distingue
esforços atuais dos evals históricos. Checkpoints e failures não foram substituídos. O
agregador exige caso/turno/hash/justificativa, não aprova falha mecânica e inclui os custos
rejeitados no numerador. Não confunde revisão técnica por IA com revisão especializada.

## Comandos executados

As etapas do `pnpm run check` foram executadas pelos binários locais equivalentes, sem instalar
dependências: Prettier global, ESLint global, `tsc --noEmit`, Vitest unitário com cobertura,
`validate-spec-vision.ps1` e `scan-secrets.mjs`. Corepack tentou baixar pnpm sem rede; a versão
11.19.0 instalada no cache foi conferida e o launcher não foi usado para remontar dependências.

- Unitários: 2.818/2.818; cobertura statements 85,47%, branches 81,92%, functions 90,99%, lines 87,33%.
- Módulo novo `usage-accounting.ts`: 100% nos quatro indicadores, sem exclusão.
- Formatação, lint, tipos, 74 specs e scanner: aprovados.
- `evals`: 20/20 e zero falhas P0; `evals:documentary`: 50/50 determinísticos.
- Comparação real: 60 cenários-braço, 72 turnos, 73 tentativas com usage; auditoria técnica integral.
- E2E completo final: 272/272 em 44 arquivos, incluindo a fixture corrigida; resultados preservados em `.local/cost-074/e2e-final-tests.json`.

## Causas dos gates inicialmente vermelhos

A primeira execução E2E teve 37 falhas `connect EACCES 127.0.0.1` pelo sandbox. Os mesmos
testes passaram com acesso aos servidores locais próprios; mocks e ausência de `.env` foram
mantidos. Não houve desvio para rede/banco remoto ou IA externa nos testes determinísticos.

O smoke Codex tinha uma fixture que devolvia uma frase de rotina até para emergência elétrica.
A regra de suficiência já existente solicitava um reparo, resultando em cinco chamadas quando
o teste esperava quatro. A fixture agora responde à emergência. A asserção de quatro chamadas
foi mantida e foram acrescentadas asserções de não tocar no quadro e recomendar especialista.
Nenhum comportamento de produção ou critério de segurança foi alterado para fazer o teste passar.

`git diff --check` no workspace inteiro identifica espaços finais preexistentes em quatro linhas
de `docs/specs/016-chat-unico-bloco-1/acceptance.md`; o gate restrito aos arquivos do delta passa.
Essas linhas fora da tarefa não foram alteradas.

## Achados de avaliação, separados da revisão de código

Dois turnos do braço híbrido reprovaram na auditoria técnica: encaminhamento contraditório em
`CONV-handover-03/1` (Luna) e valor recuperado sem citação final em `CONV-conventions-15/1` (Sol).
Ambos permanecem registrados com os hashes da resposta; o segundo viola o invariante documental
e impede tratar a rodada como aprovação de liberação. A instrumentação não introduziu nem
ocultou esses resultados. Correções de qualidade exigem spec/evals próprios antes de mudar o
comportamento do produto. Uma rodada de 30 cenários não substitui os gates da Spec 041.

## Decisão

O delta de medição e a comparação estão revisáveis, com resultados positivos e negativos em
`docs/specs/074-medicao-custo-e-comparacao-30/results.md`. Sem aprovação de integração/produção,
revisão independente, CI remoto, dados reais, mudança de provedor ou autorização de merge.
