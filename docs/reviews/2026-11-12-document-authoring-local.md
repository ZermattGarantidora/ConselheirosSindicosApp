# Agente documental — primeira fatia local, 12/11/2026

**Estado:** fundação implementada e testada; Spec 073 continua em andamento.
**Continuação:** interface de áudio e montagem extrativa de ata foram concluídas na rodada
`docs/reviews/2026-11-12-audio-minutes-local.md`; as pendências abaixo descrevem a primeira fatia.
**Limites:** sem ativação de serviços, cadastro de cartão, migration remota, dados reais ou chamada de IA/OCR/transcrição cobrada. Não é liberação do piloto, merge ou revisão independente do branch inteiro.

## O que está disponível localmente

- Criar/revisar texto de qualquer tipo documental informado no chat, selecionar a resposta para revisão e salvar o rascunho. O redator atual do chat continua sendo usado; nenhum novo prompt foi aplicado.
- Revisão de título, texto, alterações e pendências; confirmação do hash/versão exatos antes do PDF. Edição posterior invalida o download anterior. Retentativa idêntica conserva a decisão; edição e confirmação concorrentes não se sobrepõem.
- PDF privado, marcado como rascunho, com paginação própria, texto e referências completos. Não altera original, assina, envia ou promove a fonte vetorial. Repertório WinAnsi e layout linear; caracteres não suportados impedem a confirmação, sem substituição.
- Upload e leitura de DOCX textual simples, preservando o original. Pacotes/XML ativos ou inválidos são rejeitados. Numeração, tabelas, objetos e partes não interpretadas ficam pendentes de revisão; blocos Alvitra não são páginas Word. Original Word pode ser baixado para conferência.
- Contratos, API e ensaios de transcrição para relato e reunião: tempos, incertezas, falantes anônimos, limites separados e original privado na simulação. Recibo de tentativa impede reenviar automaticamente após falha incerta.
- Revalidação de usuário/condomínio/chat/permissão e fontes atuais, inclusive depois da leitura e antes de retornar consulta/download.

## O que ainda falta

1. Integrar a proposta proativa e a aplicação das melhorias ao agente, com preservação explícita de fatos, mudanças e pendências; o controle manual de revisão já funciona.
2. Implementar gravação/upload de áudio na interface e a redação de ata a partir dos segmentos. A transcrição preparada ainda não é uma ata.
3. Concluir storage, retenção/exclusão/restore e ledger para áudio persistente. Esse caminho está negado mesmo se um transcritor for injetado; o storage documental atual não o habilita.
4. Escolher/aprovar política e transporte de transcrição e validar qualidade real posteriormente. Nenhum startup injeta transcritor. Os testes usam mocks; não comprovam reconhecimento de voz ou correção semântica das atas reais.
5. Validar a migration 041 e a fatia persistente de Word/rascunhos em PostgreSQL local dedicado. Nenhum container estava em execução; não foi iniciado serviço para esse gate. Destino remoto permanece sem autorização.
6. Fazer a validação humana/independente e os gates completos da candidata integrada antes de release. O trabalho paralelo da biblioteca foi preservado.

Áudio local inicial: WAV PCM, até 25 MiB; relato até 10 minutos e reunião até 60 minutos, respeitando ambos os limites. Rascunho: até 18 mil caracteres. DOCX: 10 MiB, 256 entradas, 32 MiB de expansão total, 8 MiB por entrada, 500 blocos e 120 mil caracteres. Esses limites não aprovam fornecedor, custo ou dados reais.

## Evidências

| Gate | Resultado |
|---|---|
| `test:authoring` | 36 testes aprovados, seis arquivos; somente sintéticos/mocks |
| Unitários globais | 2.509 aprovados, zero falhas, na rodada final com dois workers |
| Cobertura unitária global | statements 87,18%; branches 83,23%; functions 92,94%; lines 89,11% |
| E2E globais | 250 aprovados; testes afetados de autoria/Word repetidos também na rodada específica final |
| Formatação global, ESLint e TypeScript | Aprovados pelos binários locais |
| Builds API/web | Aprovados; API recompilada após a revisão final |
| Runtime compilado sintético | Dois PDFs, 20 perguntas, zero chamadas de provedor; sem dados reais |
| Alinhamento de specs | 73 specs aprovadas no gate estrutural; não substitui revisão semântica humana |
| PDF visual | Duas páginas sintéticas renderizadas com Poppler e inspecionadas; texto final/acentos preservados, sem cortes |
| Scanner de segredos | Aprovado; resultado registrado em `.local/authoring/secrets.log` |
| PostgreSQL/migration 041 | Não executado; pendência explícita, sem provisionamento/ativação |

Logs, JSON e cobertura ficam em `.local/authoring/`. O arquivo de QA é
`.local/authoring/pdf/rascunho-sintetico.pdf`, com as duas páginas PNG ao lado.
O snapshot de 34 arquivos de código/contratos/testes/configuração está em
`.local/authoring/source-manifest.json`; inclui o hash do lockfile, sem instalar dependências.

O wrapper `pnpm run check` tentou resolver a versão do próprio gerenciador no registry e falhou
por indisponibilidade de rede. Não foi instalado pacote. Seus componentes foram executados pelos
binários já presentes; não se registra o wrapper como aprovado. Houve tentativas iniciais com
erros de rename no temporário da sandbox e concorrência/timeout; a rodada final usou temporários
próprios no workspace e dois workers, sem alterar asserções, exclusões ou timeouts. Os E2E por
HTTP precisaram de acesso ao localhost fora da restrição de rede da sandbox; continuaram sintéticos.

## Revisão da fatia

Revisão própria com a skill `code-review`, dos módulos novos e dos pontos de integração desta
tarefa; não cobre nem aprova todo o diff anterior do workspace. Foram corrigidos e receberam
regressões: revalidação final nas leituras/downloads, tabela Word que não podia ser tratada como
leitura integral, replay de áudio com original alterado e negação do áudio persistente sem
integração própria. Não foram identificados P0/P1 adicionais no percurso entregue; as funções
pendentes acima não são declaradas implementadas. Nenhum commit, merge ou publicação foi feito.

Referências: Spec 073/aceitação, ADR 0045 e matriz de rastreabilidade. A evidência desta rodada
não transforma os relatórios do piloto de 11/11 em aprovação automática das alterações posteriores.
