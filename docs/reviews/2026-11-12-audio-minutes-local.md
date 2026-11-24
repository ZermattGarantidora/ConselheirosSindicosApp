# Áudio e rascunho de ata — fechamento local de 12/11/2026

Registro histórico da fatia extrativa. A continuação de redação semântica e seus gates estão
em [relatório próprio](2026-11-12-semantic-minutes-local.md); estes números não validam alterações posteriores.

**Resultado:** interface e fluxo local de pedido, transcrição, rascunho, revisão e PDF implementados
e verificados com dados sintéticos. Selecionar arquivo não dispara processamento. A transcrição
real permanece desligada; esta rodada não libera serviços, cobrança, dados reais ou produção.

## Comportamento entregue

1. No menu de anexos, **“Enviar áudio e pedir ata”** abre o controle contextual no chat.
2. O síndico grava externamente, seleciona o WAV, pode ouvi-lo e escolhe relato ou reunião.
3. Somente **“Enviar áudio e preparar ata”** inicia o envio. Sem transcritor disponível, o arquivo
   não é enviado. O pedido é preservado no histórico quando aceito.
4. A transcrição conserva tempo, incerteza e falantes anônimos. O primeiro rascunho é extrativo:
   organiza todas as falas em um modelo de ata, sem resumo semântico ou fatos adicionais. Dados
   da reunião e deliberações não comprovadas ficam para conferência.
5. O rascunho abre no editor existente. O síndico ajusta a redação, salva e confirma a revisão
   exata antes de baixar PDF. Não há assinatura, envio, publicação ou indexação automática.
6. “Recuperar áudios já enviados nesta conversa” retoma transcrição e pedido. Após recarregar,
   conserva a revisão editada/confirmada; não gera outra proposta nem repete a transcrição.
   Novo pedido/alteração de instrução usa nova identidade. Tentativa incerta não é reenviada.

Mudar de conversa ou fechar cancela a continuidade da interface. Original e transcrição são
revalidados no mesmo usuário/condomínio/chat em leitura, edição, confirmação e download. Alterar
ou retirar a origem impede o PDF. Rascunho mantém hash do original/transcrição e tempos no texto.

## Limites explícitos

- Entrada desta implementação: WAV PCM, 25 MiB; relato até 10 minutos e reunião até 60 minutos,
  respeitando ambos os limites. Outros formatos de gravadores não foram habilitados.
- Rascunho: até 160 mil caracteres e 175 mil bytes JSON; PDF até 100 páginas. O texto integral
  fica na revisão, sem duplicação em mensagem longa do journal. Excesso falha sem truncamento.
- Não foi aplicado novo prompt nem escolhido um novo redator. O modelo extrativo é um documento
  editável; não substitui uma redação semântica/resumo produzido e avaliado por IA.
- Nenhum startup injeta transcritor. Áudio persistente continua negado até integrar storage,
  retenção/exclusão/restore e ledger de consumo. Os ensaios positivos usam storage em memória.
- Qualidade de reconhecimento de voz real, diarização e documentos reais não foi validada com
  mocks. Permanecem as decisões de fornecedor, política, orçamento e dados reais antes da liberação.
- Proatividade documental e demais requisitos ainda pendentes da Spec 073 não são declarados prontos.

## Verificações

| Gate | Resultado |
|---|---|
| Autoria/áudio focados | 53 testes, nove arquivos, aprovados |
| Unitários globais | 2.519 aprovados, zero falhas |
| Cobertura global | statements 86,61%; branches 82,71%; functions 92,59%; lines 88,53% |
| E2E globais | 257 aprovados, zero falhas |
| Formatação global, ESLint, TypeScript | Aprovados pelos binários instalados |
| Builds API/web | Aprovados |
| Runtime compilado sintético | Dois PDFs, 20 perguntas, zero chamadas de provedor externo |
| Alinhamento | 73 specs aprovadas no gate estrutural |
| Scanner de segredos | Aprovado, sem padrão conhecido encontrado |
| PDF | Relato e reunião renderizados/inspecionados com Poppler: uma página cada, sem cortes, negação e incerteza preservadas |
| Navegador | Componentes reais, API real local, desktop e viewport de 390 px, sem transbordamento horizontal |
| Recuperação no navegador | Reload recuperou revisão confirmada e PDF, com uma única transcrição simulada |
| Transporte do navegador | Zero requisições de página externas; fixture WAV de hash fixo; zero chamada real de IA |

Evidências em `.local/authoring/`:

- `audio-unit-results.json`, `audio-coverage/`, `audio-e2e-results.json`;
- `audio-format.log`, `audio-lint.log`, `audio-typecheck.log`, `audio-build-*.log`, `audio-runtime.log`, `audio-secrets.log`;
- `audio-pdf/ata-dictation.pdf`, `audio-pdf/ata-meeting.pdf` e páginas PNG inspecionadas;
- `audio-browser/result.json`, `desktop.png`, `mobile.png` e `ata-revisada.pdf`;
- `audio-source-manifest.json`, captura da candidata desta fatia.

O ensaio de navegador usa um harness sintético dos componentes integrados; não é uma sessão de
produção nem validação de provedor real. Usa Playwright já instalado no runtime e navegador
isolado, com servidores temporários em loopback encerrados no `finally`. O adaptador simulado
recusa bytes diferentes da fixture. Acesso ao localhost e lançamento do navegador precisaram
ocorrer fora da restrição da sandbox. Não foram instaladas dependências nem alterado o lockfile.
O wrapper pnpm não foi usado para contornar resolução de versões pela rede: os componentes dos
gates foram executados pelos binários locais, mantendo asserções, limites e cobertura.

## Revisão e rastreabilidade

Revisão própria da mudança e integrações correspondentes, seguindo `code-review`. O teste de
navegador e o typecheck detectaram e impediram um identificador incorreto no início do pedido;
o fluxo corrigido gera um ID novo no primeiro envio e reutiliza o ID salvo na recuperação.
Regressões cobrem perda da resposta/corpo, revisão posterior preservada, chamada única,
cancelamento antes da geração, origem alterada, escopos cruzados, transcritor indisponível,
negação no áudio, trecho incerto e rascunho longo integral.

Não foram identificados P0/P1 adicionais na fatia entregue. Este registro não é revisão
independente do diff inteiro preexistente, CI remoto ou autorização de merge. Não houve commit,
merge, migration, provisionamento ou publicação. A Spec 073 permanece em andamento nos pontos
explicitamente excluídos deste fechamento. Visão/aceitação: briefing Bloco 7, Spec 073
AC-7312–7316, ADR 0045 e `docs/quality/traceability.md`.
