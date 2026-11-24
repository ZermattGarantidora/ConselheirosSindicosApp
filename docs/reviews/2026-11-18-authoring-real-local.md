# Spec 073 — execução real local sem API paga

- **Estado:** implementação e validação técnica locais concluídas; conclusão integral/liberação pendentes.
- **Data:** 18/11/2026.
- **Diff desta etapa:** 29 arquivos, incluindo este registro, em
  `.local/authoring-homologation/closure-20261118/source-manifest.json`.
  Alterações preexistentes do checkout foram preservadas.
- **Revisão:** própria, por Codex; não equivale à revisão independente do branch para merge.
- **P0/P1 conhecidos no escopo técnico revisado:** nenhum pendente.
- **Integração:** sem commit, merge, publicação, CI remoto ou liberação de dados reais.

## Decisões respeitadas

O usuário autorizou o Codex já contratado e transcrição local gratuita, sem cobrança adicional de
API, e determinou manter a proposta de limites inativa. ADR 0046 registra a composição opcional.
`proposta-operacional.json` permanece `enabled:false`, aprovações nulas, sem provedor/destino,
cron ou TTL real aplicado. Nenhum startup seleciona estes adaptadores. Não houve nova dependência
npm, contratação ou alteração da personalidade do chat. Codex usa a sessão ChatGPT; não foram
copiadas credenciais nem encaminhadas chaves de API. Isso não estima saldo/franquia ou fatura.

## Entrega e prova real

- Adaptadores explícitos de redação/conferência documental, atas e melhoria editorial via Codex.
  Processo isolado, ferramentas desabilitadas, stdin/schema, limites/cancelamento e rejeição de
  eventos inesperados. O schema já impede alteração factual/substantiva sem referência.
- whisper.cpp b5454 CPU e small-q5_1 MIT, binário/modelo fixados por SHA-256, sem rede no ASR.
  Preparação reproduzível em `scripts/prepare-authoring-local-asr.ps1`; recibo/licenças em `.local/`.
  WAV mono 16 kHz/16 bits, tempos, falantes sem identidade presumida e incerteza conservada.
- **24/24 casos semânticos** passaram nos contratos e resultados esperados, com redação e
  conferência reais separadas: sete documentos aplicáveis, dois pedidos de contexto, dois
  bloqueios, um original sem melhoria e doze atas, conforme as categorias individuais do pacote.
  A referência canônica é o resultado individual de cada um dos 24 casos.
  A avaliação não é um escore de aprovação humana ou de qualidade geral do produto.
- Dez amostras faladas sintéticas, 143,065 s, foram transcritas localmente. WER bruto ponderado:
  **15/220 palavras = 6,82%**; máximo por amostra 22,73%. Não normalizamos valores/números para
  melhorar a métrica. Voz única limpa não valida ruído, múltiplos falantes, diarização ou reuniões reais.
- O percurso real **ASR → Codex → conferência → confirmação simulada → PDF** produziu nove
  rascunhos; um caso de votos foi recusado com trecho marcado incerto. A recusa permanece registrada,
  sem preenchimento inventado ou nova chamada automática. Há dez execuções ASR do corpus e um
  smoke inicial local, sem API de transcrição.
- A prova semântica usa os roteiros exatos. Saída/incerteza do ASR altera a entrada e é avaliada
  separadamente; não herdou silenciosamente o gabarito do roteiro limpo. Tempos dos PDFs de
  roteiros são fixtures, não alinhamento acústico. O percurso com ASR conserva tempos medidos.
- Foram registrados 117 dispatches/resultados Codex durante desenvolvimento e ajustes resolvidos.
  A candidata final recupera **42 etapas concluídas**, sem novo Codex ou ASR. A reprodução pelo
  comando pnpm foi confirmada com cache existente e `COREPACK_ENABLE_NETWORK=0`.

Evidência real em `.local/authoring-homologation/real/run-a5a3c99497ab497f882ca8c3f5003c39/`:
`results.json`, resultados por caso, recibos, `asr-pipeline-results.json`, WAVs vinculados,
PDFs por hash, `results.junit.xml`, pacote do revisor e `review-form.pending.json`.
O formulário tem vínculos de execução preenchidos e revisão humana integralmente pendente.

## Correções encontradas e revisão

1. A purga substituía mensagens já salvas por falas de exclusão atribuídas ao usuário. Autoria e
   purga direta de áudio agora removem payloads derivados e conservam mensagens públicas, IDs,
   papéis e ordem. Recibos internos continuam ocultos depois da purga. PostgreSQL/restore e
   projeção pública verificam a correção. A asserção SQL antiga que procurava texto em todo o
   histórico foi substituída por ausência no payload **e igualdade integral das mensagens**:
   apagar artefato não autoriza apagar conversa, conforme briefing §8/RQ-7323.
2. Conferente exigia pergunta sobre rascunho mesmo sem melhoria. A instrução condicional agora
   admite original idêntico sem fabricar oferta; referências e cobertura continuam obrigatórias.
3. O redator de ata criou ID só na cobertura. Instrução explicita a correspondência bidirecional
   entre claims e segmentos, sem relaxar o validador. Recomendações especializadas também foram
   reforçadas em relatos técnicos e pedidos de completar votos/quórum.
4. O gabarito de falas conflitantes esperava estado documental `needs_context`, inexistente no
   contrato de ata. Corrigido para rascunho que exibe ambos os relatos e pendência, sem confirmar
   deliberação, conforme RQ-7305/7309. Proibições e checks críticos foram mantidos. A entrada
   permaneceu idêntica; os hashes dos corpora de execução e avaliação ficam separados.
5. Retomada do harness reutiliza apenas bytes idênticos do original e resultados completos;
   dispatch sem resultado continua cercado. WAV com cabeçalho enganoso não induz conversão
   implícita. Novos testes cobrem as regressões.

Revisão própria percorreu processos/ambiente, validação de eventos/schema, fontes e proveniência,
cancelamento, persistência/replay, purgas, isolamento e instruções. Não aprovou as centenas de
alterações preexistentes do branch nem substituiu review independente/CI de integração.

## Gates finais

Binários já instalados foram usados diretamente para evitar remontagem de dependências pelo pnpm.
O primeiro uso do shim Corepack no sandbox não encontrou cache e falhou no download do gerenciador;
nenhuma dependência foi instalada. A reprodução posterior usou o cache do usuário, rede do Corepack
desligada e `pnpm_config_verify_deps_before_run=warn`, sem alterar asserções.

| Gate | Resultado |
|---|---|
| Formatação, lint global, lint explícito dos evals, TypeScript | aprovados |
| Unitários | 2.756 testes, 213 arquivos, zero falha |
| Cobertura statements / branches / functions / lines | 85,34% / 82,00% / 90,86% / 87,22%; sem exclusão nova |
| E2E completo | 271 testes, 43 arquivos, zero falha |
| PostgreSQL sintético local | dois cenários aprovados, migrations/RLS/restore; container próprio encerrado |
| Evals offline | 20 básicos; 50 documentais determinísticos; 26 atas; 31 autoria; oito ensaios operacionais e pacote de integridade aprovados |
| Visão | 73 specs aprovadas no gate estrutural; matriz 073 com 48 ACs |
| Builds API/web e runtime compilado | aprovados; runtime com dois PDFs/20 perguntas e zero chamada de provedor |
| PDFs reais do ensaio | três páginas renderizadas/inspecionadas, texto/referências completos sem corte ou sobreposição |
| Scanner completo | nenhum padrão conhecido encontrado; sem exclusões novas |

Logs, cobertura, manifestos e `closure.json` em `.local/authoring-homologation/closure-20261118/`.
PostgreSQL: wrapper `container-2bbecb11f1084053987a2afd9b430014`, prova filha
`7e8481104bb543ba8b2b073421aeed5b`, ambos em `.local/pilot-operations/`.

## Limite do encerramento

A etapa técnica local autorizada termina com código, evidência real, testes e documentação.
**A Spec 073 não está integralmente liberada:** faltam homologação humana/especializada dos
gabaritos/resultados, amostra acústica representativa e decisões operacionais/dados/custódia
que permanecem inativas. Revisão independente e CI contra o commit a integrar são gates de merge.
Não foram atribuídos aprovações, responsável operacional, prazo real ou qualidade humana por inferência.
