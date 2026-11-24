# Revisão local — três conflitos documentais

- **Data:** 24/11/2026.
- **Status:** revisão técnica do autor por IA; revisão independente e especializada pendentes.
- **Escopo:** RQ-7607 e AC-7610/7611/7612 da Spec 076, sobre a implementação de 23/11.
- **Snapshot medido:** `c72bfaae4d489e9260f7f5dd1cd87e4d503fb6ab6c41b25e147b050c550643bf`.
- **P0/P1 identificados e pendentes neste delta:** nenhum na revisão do autor.
- **Merge/deploy:** não executados; esta revisão não aprova o diff preexistente inteiro do branch.

## Revisão do delta

Lidos o briefing vigente, a diretriz competitiva, Spec 076/aceitação e ADRs relacionados.
Spec e exemplos de aceitação foram atualizados antes da alteração de comportamento.
Os arquivos anteriores relevantes estão preservados em
`.local/dense-conflicts/2026-11-24-before/`; não houve limpeza do workspace existente.

Conferidos os três diffs de produção contra esses originais, o módulo novo
`record-note-conflict.ts`, seus 22 testes, o E2E denso e os deltas de documentação.
A detecção exige ID completo, registro tabular, valor divergente explícito não conciliado,
mesmo condomínio/documento/versão e trechos distintos prontos/elegíveis, sem instrução hostil.
Não codifica IDs ou valores da bateria em produção e não elege qual valor é verdadeiro.
O formato suportado é intencionalmente restrito; linguagem livre fora dele permanece limite.

A detecção existente de versões pendentes conserva precedência. Modo `conflict` não foi
liberado genericamente. O contrato inicial/reparo recebe os IDs das evidências detectadas,
deduplicados e filtrados pelo conjunto recuperado. Um contexto vazio só é criado após a
tentativa normal de foco, para não inventar requisitos de síntese na pergunta de fraude.

O caso de uso exige associação ID/dois valores/pendência e citações da linha e nota antes
de aceitar o resultado. A cobertura financeira só aceita essa prova específica em lugar
da palavra-chave; não remove outros tópicos, grounding, validação de citações ou política
de risco. Guardas de tenant/versão, abstenção e encaminhamento jurídico permanecem.
Modelos, preços de referência, budgets, retry, prompt da personalidade e recuperação não mudaram.

Não há migrations, dependências, serviços novos ou ativação de dados reais. O resultado
local não autoriza merge, integração remota ou liberação de produção.

## Evidência

- Primeiras saídas reais antigas dos seis pares reaplicadas: **6/6** aceitas, sem nova
  inferência; identifica a recusa da aplicação independentemente da variação do modelo.
- Nova execução real: **60/60** factuais/completas em cada braço, revisão do autor por IA.
  DENSE-017/027/031 passaram em ambos, uma tentativa cada, modo de conflito e fontes corretas.
- 120 tentativas, 120 marcadores/recibos com usage, zero reparos, falhas HTTP, reenvios ou
  consumo desconhecido. Usage confrontado com eventos brutos e escopo de cada envio.
- Custo equivalente USD **1,8861304** Sol e **0,9517409** híbrido, redução **49,54%**;
  médias **12,654 s** e **12,953 s**. Tarifa congelada de 30/10; não fatura/franquia/SLA.
- Híbrido usou 28 Sol + 32 Luna; os três conflitos continuaram direcionados a Sol.
- Corpus/oracle/ledger e PDFs iguais aos anteriores; transcrição OCR reutilizada, zero
  nova chamada visual. Código atual e snapshot medido coincidem.

O check automático v2 permanece 57/60 Sol e 49/60 híbrido. Divergências lexicais, fonte
redundante e abstenção legítima foram justificadas individualmente por hash. Ressalvas de
apresentação: quatro avisos sintéticos Sol; uma recomendação de especialista desnecessária
e um marcador de citação no texto híbrido. Aprovação factual não encobre essas ressalvas.
Campos da revisão humana continuam em branco. Detalhes no
[relatório desta rodada](../specs/076-recuperacao-e-conferencia-integral/results-2026-11-24.md).

## Gates

Com binários locais, sem instalação automática:

- Formatação global, ESLint, TypeScript e build da API: passaram.
- Unitários: **2.899/2.899**; E2E: **273/273**.
- Cobertura statements/branches/functions/lines: **85,45 / 81,88 / 90,84 / 87,32%**.
- Evals determinísticos: **20/20** e **50/50** documentários. Os 50 semânticos pendentes
  anteriores não são apresentados como validação desta tarefa.
- Alinhamento final das 76 specs: aprovado. Scanner de segredos: passou, nenhum padrão conhecido encontrado.

Relatórios em `.local/dense-conflicts/`: `unit-2026-11-24.json`, `e2e-2026-11-24.json`,
`coverage-2026-11-24.json`, `evals-2026-11-24.json` e `documentary-2026-11-24.json`.
Artefatos da comparação em `.local/dense-documents/2026-11-24-dense-conflicts-r1/`.
Hashes finais dos 13 arquivos desta revisão registrados em `reviewed-files.json` ali.
Nenhum teste aplicável conhecido falhou; gates SQL guardados não foram executados por não
haver alteração nesse contrato. Não substitui a revisão independente exigida antes de merge.
