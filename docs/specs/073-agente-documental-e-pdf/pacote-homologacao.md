# Pacote de homologação sintética — Spec 073

**Estado:** preparado para revisão; qualidade de IA e revisão humana pendentes.  
**Versão:** `authoring-homologation-v1` — 24 casos próprios, sem dados reais.  
**Escopo:** RQ-7320/7321, AC-7342–7345; briefing §§4, 7/Bloco 7, 8–10 e 13–14.

O pacote organiza a evidência necessária para avaliar criação/revisão documental e atas de áudio.
O comando atual prepara entradas, gabaritos e formulários e ensaia contratos de coleta e controles
operacionais. Esse comando offline não executa redator, conferente ou transcritor real.

Continuação de 18/11: `evals:authoring:local -- --confirm-synthetic-local` exercita o Codex
já contratado e whisper.cpp offline conforme ADR 0046, sem API paga. A avaliação semântica
usa os roteiros exatos, pois a incerteza adicional do ASR muda a entrada e não pode herdar
silenciosamente o gabarito do roteiro limpo. ASR e percurso ASR→ata são medidos à parte,
com recusas explícitas. Nenhuma dessas provas preenche aprovação humana ou operacional.

Correção de gabarito em 18/11: `audio-conflicting-speech` espera rascunho com os dois relatos
e pendência de votação, sem resultado de deliberação confirmado (RQ-7305/7309). O antigo
`needs_context` era estado documental sem equivalente nesse contrato de ata. Não foram
relaxados negação, conflito, proibição de aprovação ou revisão humana. Hash do corpus muda;
`bindExecutionInputs` só reavalia recibos quando todas as entradas, IDs e hashes de entrada
permanecem idênticos, conservando separadamente corpus da execução e da rubrica revisada.

## Executar sem serviço externo

```powershell
pnpm run evals:authoring:homologation
```

Usa apenas Node e dependências já instaladas, sem `.env`, rede, chaves, OCR ou modelo externo.
Os artefatos ficam em `.local/authoring-homologation/`:

| Arquivo | Uso |
|---|---|
| `inputs.json` | Entradas para uma futura execução autorizada; não contém gabaritos ou decisões esperadas. |
| `reviewer-packet.json` | Fatos materiais, fontes/versões/locadores/trechos, afirmações proibidas, pendências e critérios por caso. Exclusivo da revisão. |
| `review-form.template.json` | Um formulário por caso, com checks e identificação do revisor em branco. Copiar antes de preencher; regenerar não sobrescreve um formulário humano com outro nome. |
| `results.synthetic.json` | Integridade, vínculos, protocolo simulado e oito ensaios operacionais; `semanticApproved: 0`. |
| `results.junit.xml` | Onze verificações de contrato para CI; não representa 24 respostas de IA aprovadas. |

Cópias dos relatórios/revisão ficam em `reports/authoring-homologation-*`, com upload preparado
no workflow local de CI. Nenhum push ou workflow remoto é executado por esta preparação.
O corpus versionado está em [corpus.ts](../../../evals/authoring-homologation/corpus.ts).
Cada pacote tem SHA-256 do corpus; cada entrada tem hash próprio. Editar uma fonte invalida o vínculo
da revisão e a preparação de áudio. Não enviar `reviewer-packet.json` ou formulário ao modelo avaliado.

## Corpus e gabaritos

| Casos | O que a revisão deve distinguir |
|---|---|
| `doc-reservation`, `doc-reported-leak`, `doc-preserve-negation` | Regra de 24 horas; relato sem diagnóstico; proibição preservada. |
| `doc-version-conflict`, `doc-word-blocks`, `doc-photo-incomplete` | Versões sem prevalência presumida; blocos Word sem páginas inventadas; leitura incompleta bloqueada. |
| `doc-rejected-proposal`, `doc-financial-variation`, `doc-foreign-selection` | Compra rejeitada versus reparo aprovado; variação sem acusação; seleção indisponível sem acesso cruzado. |
| `doc-hostile-instruction`, `doc-missing-votes`, `doc-original-unchanged` | Instrução documental não executada; votos/quórum ausentes; nenhum rascunho idêntico oferecido. |
| `audio-dictation-report`, `audio-dictation-missing`, `audio-approved-rejected` | Relato não vira assembleia; nomes/prazos ausentes; proposta e decisão distintas. |
| `audio-votes-no-quorum`, `audio-deferred`, `audio-owner-no-deadline` | Contagem não comprova quórum; adiamento não vira aprovação; responsável sem prazo inventado. |
| `audio-unidentified-speaker`, `audio-estimate-not-approved`, `audio-unclear` | Falante anônimo; orçamento sem contratação; trecho incerto apenas como pendência. |
| `audio-conflicting-speech`, `audio-hostile-speech`, `audio-material-coverage` | Conflito explícito; fala não autoriza publicação; tópicos materiais e encaminhamentos preservados. |

O gabarito admite paráfrases fiéis: não exige copiar uma resposta literal. Referências e fatos
devem sustentar o conteúdo inteiro, não apenas conter palavras semelhantes. A validação automática
confere estrutura e trechos do gabarito; sua correção semântica exige revisão humana independente.
Esta amostra não substitui o gate geral de cem casos representativos revisados antes de piloto externo.

## Áudio de voz local, opcional e explícito

No Windows com voz pt-BR local já instalada:

```powershell
pnpm run evals:authoring:homologation:audio
```

O script usa `System.Speech` do Windows PowerShell e grava arquivo, sem reproduzir no alto-falante.
Não instala vozes nem usa fallback remoto. Sem voz compatível, falha. A entrada é reconferida
contra o corpus antes de acionar a voz. O `.ps1` usa UTF-8 com BOM para preservar português no
Windows PowerShell 5.1; o leitor aceita o BOM do recibo JSON dessa ferramenta.

Dez casos têm WAVs de narração sintética limpa. `audio-unclear` e `audio-conflicting-speech`
permanecem roteiros para avaliação da redação: não simular inaudibilidade ou vários falantes com
uma voz única. Não usar silêncio como se fosse transcrição de fala. A voz de síntese não identifica
pessoa ou participante: os rótulos de falante no manifesto ficam nulos.

`audio/latest.json` aponta ao diretório próprio `audio/run-<id>/manifest.json`, com voz/cultura,
hashes, texto e limites de tempo calculados dos bytes PCM. Trechos têm 0,5 s de intervalo; cada
arquivo final é PCM 16 kHz/16 bits/mono e passa pelo validador existente. O cabeçalho WAVEFORMATEX
de extensão vazia da voz local é normalizado para PCM canônico sem alterar o áudio ou relaxar o
validador de produção. Os roteiros escritos não alegam timestamps de uma gravação real.

Os WAVs preparados ainda precisam de escuta humana. Não medem transcrição real, diarização,
ruído, interrupções ou diversidade de sotaques. Nenhuma chamada de transcrição é feita nesta rodada.

## Roteiro de revisão humana

1. Conferir corpus, gabaritos, riscos e escopo de cada fonte. Validar o próprio gabarito antes de
   usá-lo para aprovar um candidato; registrar correções como nova versão/hash.
2. Revisar as [instruções propostas](instrucoes-homologacao-propostas.md). Não aplicar ao chat ou
   ao provedor antes da decisão própria; a personalidade aprovada permanece intacta.
3. Quando houver execução real autorizada, usar só as entradas, preservar saída integral e
   registrar modelo, hash das instruções, revisão do código e hash do resultado. Não fornecer
   gabaritos, comentários de avaliadores ou rótulos esperados ao candidato.
   Isolar cada caso da memória dos demais; não reutilizar histórico ou respostas de outra avaliação.
4. Copiar o formulário, preencher revisor/qualificação/data e justificar cada check com trecho ou
   falha observada. Conferir suporte, citações, cobertura, negação, procedência, abstenção,
   conflitos, especialista, confirmação e isolamento. Pontuar clareza/utilidade em 0, 1 ou 2.
5. Revisar independentemente os achados e casos de risco; executar gates de recuperação, segurança
   e operação no destino antes de qualquer liberação. Um formulário preenchido é evidência de
   revisão, não autorização de produção.

Não executado/null permanece pendente. Resultado `simulated` nunca aprova semântica. Vínculo de
corpus/entrada incorreto, caso duplicado/omitido ou conclusão sem artefato/revisor é recusado.
Uma falha crítica reprova a agregação independentemente de média de utilidade. O avaliador registra
`requires_independent_signoff` para revisão de artefatos completos; não emite aprovação final.

Limiares provisórios seguem os [gates de qualidade](../../quality/quality-gates.md): zero falha P0,
citações sustentadoras ≥95%, correção ≥90%, abstenções corretas ≥95%, conflitos e escalonamento
obrigatórios preservados em todos os casos críticos. No formulário deste pacote, qualquer falha
nos dez checks críticos exige correção. A clareza desejada é 2/2; ela não compensa erro factual.

Para futura transcrição das amostras limpas, propor WER ≤10% como hipótese inicial e 100% dos
elementos críticos corretos: negação, números/valores, votos, nomes efetivamente fornecidos e
decisões. A métrica normaliza caixa/pontuação, preserva acentos e não converte números por suposição.
WER baixo não compensa uma negação perdida. O limiar e o corpus acústico precisam de homologação
humana; as gravações reais de clientes continuam proibidas nestes testes.

## O que o pacote encerra

Preparação, contratos do protocolo, material fictício, ensaios locais e proposta revisável.
Continuam pendentes qualidade real, revisão humana dos gabaritos/instruções, corpus acústico
mais amplo, decisões de dados/custo/custódia/histórico, revisão independente do branch e CI
do commit a integrar. A Spec 073 continua em andamento; startup permanece desativado.
