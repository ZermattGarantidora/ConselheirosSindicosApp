# Homologação sintética e proposta operacional — 17/11/2026

**Estado:** pacote local concluído e validado; Spec 073 integral em andamento.  
**Escopo:** RQ-7320/7321 e AC-7342–7345 da Spec 073.  
**Restrições:** sem contratação, instalação, configuração `.env`, provedor real, chamada paga ou dados reais.

O [pacote](../specs/073-agente-documental-e-pdf/pacote-homologacao.md) prepara 24 casos distintos:
12 documentais e 12 roteiros de áudio, com fontes/versões/locadores, fatos materiais, afirmações
proibidas e pendências. Entradas do candidato são separadas dos gabaritos e formulários humanos;
hashes vinculam corpus, entrada, candidato e revisão. Formulário nasce pendente e simulação
positiva conserva `semanticApproved: 0`/`productionAuthorized: false`. Falha crítica bloqueia
a agregação. Vinte e quatro casos preparados não equivalem a respostas reais avaliadas.

Dez casos têm amostras WAV geradas offline por Microsoft Maria Desktop pt-BR já instalada.
Original sintético, voz, hash e tempos medidos permanecem em manifesto. Trecho incerto e cenário
multifalante permanecem roteiros sem áudio falso. Nenhum modelo de transcrição foi chamado e
nenhuma identidade de falante é inferida. Escuta humana/robustez acústica continuam pendentes.

A [proposta operacional](../specs/073-agente-documental-e-pdf/proposta-operacional.md) apresenta
rascunhos por sete dias, áudio/transcrição por 24 horas, cotas, custódia, manutenção e metas de
recuperação como valores revisáveis. Dez decisões ficam pendentes, incluindo compatibilidade
de retenção/purga com o histórico permanente. Configuração disabled, gasto externo zero;
nenhuma política foi aplicada ao runtime, nenhum cron ou destino foi habilitado.

O ensaio composto executa oito situações com artefatos em memória e cofre/journal de arquivos
reais exclusivamente sintéticos: seis finalidades, unknown sem retry, restore em quarentena,
reaplicação de purga, isolamento, revogação, cofre ausente e expiração/manutenção. Usa política
própria com relógio acelerado, não os valores da proposta. Não é prova SQL no destino.

## Verificação

Comando novo `evals:authoring:homologation` gera entradas/revisão/formulário/relatórios JSON e
JUnit, sem rede. `evals:authoring:homologation:audio` é opcional no Windows e falha se faltar voz
local, sem download ou fallback. Ambos estão em package.json/README/AGENTS. O workflow de CI
foi preparado para rodar contratos sintéticos e guardar o pacote; não foi disparado remotamente.

Relatórios desta rodada em `.local/authoring-homologation/` e
`reports/authoring-homologation-*`. Fontes da aplicação não foram modificadas; os instrumentos
ficam em evals/scripts/testes/documentação. Não se executou banco remoto, novo restore PostgreSQL,
browser ou deploy para preparar material offline. As provas anteriores da aplicação continuam
identificadas no relatório da proatividade, sem serem reclassificadas como novos ensaios.

| Gate | Resultado |
|---|---|
| Formatação, lint global e lint explícito dos instrumentos | Aprovados; o lint explícito cobre os arquivos novos em evals sem alterar as exclusões existentes. |
| Typecheck | Aprovado. |
| Unitários | 2.716 testes em 212 arquivos, incluindo 43 testes novos. |
| Cobertura statements/branches/functions/lines | 85,24% / 81,87% / 90,93% / 87,14%; sem nova exclusão de produção. |
| Evals regressivos | Núcleo 20, documental determinístico 50, áudio 26 e autoria geral 31 aprovados; sem medir IA real. |
| Pacote | 24 casos preparados, formulários pendentes, onze contratos JUnit válidos e oito etapas operacionais aprovadas. |
| Voz local | Dez WAVs, 143,065 s no total, Microsoft Maria Desktop pt-BR; hashes/textos/tempos/PCM conferidos, zero transcrições externas. |
| Visão | 73 specs aprovadas; matriz contém os 45 ACs da Spec 073. |
| Integridade | Doze fontes/configurações por SHA-256; nove arquivos da aplicação conferidos contra o fechamento anterior, sem alteração. |
| Segredos | Scanner completo aprovado em 120,80 s, sem alterar escopo/exclusões; nenhum padrão conhecido encontrado. |

Fechamento em `.local/authoring-homologation/closure.json`: quatorze recibos/gates aprovados,
45 critérios mapeados, `localCompleted: true`, `productionAuthorized: false`,
`realProviderCalls: 0`, `realModelQualityMeasured: false` e `semanticApproved: 0`.
As dez decisões operacionais permanecem pendentes. Não houve commit, merge, deploy ou
execução de CI remoto, nem alteração das dependências de produção/desenvolvimento.

Manifesto final das amostras em
`.local/authoring-homologation/audio/run-97bdcd4a14634d02bad67b32f3a78b4b/manifest.json`,
com vínculo ao corpus `d0f59ca1377d599372c714570340f5a379699f935cf895922c25bf6e97c4cec6`.
Auditoria legível em `audio-audit.json`. A escuta humana permanece pendente; validação de bytes,
voz e roteiros não comprova acerto de ASR nem interpretação de um modelo.

O teste local encontrou duas particularidades do Windows: recibo JSON UTF-8 com BOM e WAV
System.Speech com WAVEFORMATEX de 18 bytes e extensão vazia. O leitor aceita BOM, e somente o
harness normaliza o cabeçalho vazio para PCM canônico. O validador de produção continua intacto;
regressões conferem que extensão não vazia, silêncio, corrupção e formato divergente falham.
Entradas também são reconferidas contra o corpus antes de acionar síntese, evitando WAV com
roteiro alterado e gabarito antigo. Scripts/recibos não contêm credenciais ou dados pessoais.

## Revisão e limites

Revisão própria do diff desta tarefa conforme `code-review`, preservando as alterações
preexistentes do checkout. Sem achados P0/P1 pendentes nesta fatia após as correções documentadas.
Não substitui revisão independente do branch, CI sobre o commit de integração ou aprovação humana
dos gabaritos/instruções/política. A Spec 073 continua em andamento; qualidade real e liberação
permanecem pendentes.
