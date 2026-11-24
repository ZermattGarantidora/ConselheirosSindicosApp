# Revisão documental histórica — Documentos e IA — 11/11/2026

**Resultado:** concluída a leitura integral dos **98 arquivos das Specs 041–067**, incluindo
aceitação, prompts, investigações, planos e resultados. Nenhum novo achado P0/P1 foi confirmado
nesse recorte. Este complemento fecha a leitura atribuída a Documentos; não aprova o branch
inteiro, a autoria histórica, a qualidade semântica dos modelos ou o lançamento.

## Escopo efetivamente lido

Base do manifesto integral: `3b702db6f91dbbeb2ede1a6063053296298d913c`.
Os 98 arquivos somam **754.951 bytes**. Todos constam como `new` no manifesto de
Infraestrutura: o conteúdo integral lido corresponde ao diff adicionado completo de cada um.
O mapa registra caminho, SHA-256, escopo da leitura, observações específicas e limites por arquivo:

- `.local/pilot-documents-2026-11-11/historical-documents-review.json`;
- SHA-256 do mapa concluído: `508a629605c3f4083756daf7afa91b81609d85d24a1bf22eab613b7805c5219f`;
- conferência: `.local/pilot-documents-2026-11-11/historical-documents-review-verification.json`;
- recibos de leitura e notas por lote: `historical-read-receipt-*.json` e
  `historical-notes-*.json`, no mesmo diretório privado.

O recorte inicial continha também **47 relatórios narrativos históricos**. Infraestrutura
reassumiu sua leitura para evitar duplicação e registrou a conclusão no próprio manifesto.
Conferi os 47 caminhos/SHA e o estado de leitura integral atribuído pelo dono. No mapa de
Documentos eles estão `delegated-to-infrastructure`, com `readScope=not-read-by-documents`:
não são apresentados como leitura ou revisão independente desta frente. Não há arquivo
pendente no recorte que permaneceu atribuído a Documentos.

Relatórios atuais do piloto de 09/11 e 11/11 ficam fora deste recorte histórico. As notas de
autoria desta frente não receberam aprovação independente de si mesmas. Corpus, datasets,
JSONs de resultados e demais artefatos referenciados continuam no escopo próprio de
Infraestrutura; ler o relato não certifica o conteúdo de todos os arquivos que ele aponta.

## Conferências e conclusões

| Recorte       | Conferência efetiva                                                                | Conclusão e limite                                                                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Specs 041–044 | Contratos de conversa, memória recente e apresentação, planos e resultados         | Histórico salvo não amplia a janela; resultados mecânicos e amostras técnicas não equivalem a aprovação semântica.                                                                                                                                     |
| Specs 045–049 | Recebimento/leitura, reparo, risco, orientação contextual e conferência financeira | Documento continua dado não confiável; evidência, vigência, autorização e cálculos conservam limites. Textos de prompt históricos não foram aplicados.                                                                                                 |
| Specs 050–055 | Comparações de modelo/memória/custo, matrizes, investigações e regressões          | Conferidos denominadores, exclusão uniforme do alvo 54, transições de notas e rodadas interrompidas. Usage desconhecido não é zero; créditos equivalentes não são fatura.                                                                              |
| Specs 056–060 | Completude, fala conjunta, journal, recuperação e protocolo                        | Correções, contraprovas e revalidações offline são separadas das notas originais. Replay exige evidência atual; recusas e falhas operacionais permanecem identificadas. Eventos MCP recusados não comprovam efeito externo ou causa histórica ausente. |
| Specs 061–064 | Roteamento/cache, cópias revisadas em rascunho e avaliações com PDFs               | Cache genérico não inclui evidência privada; Spec 062 permanece rascunho com gates próprios. Perguntas independentes, comentários de lote e conversas longas têm evidências diferentes; HTTP 200 pode conter fallback.                                 |
| Specs 065–067 | Pesquisa pública local, variantes de teste e PDFs de 300 páginas                   | Opt-ins não autorizam produção ou dados reais. Limite web pós-processo não é teto preventivo de gasto. v1/v2/v3, ativação histórica e testes são distintos. Benchmark compilado não mede OCR, semântica ou hospedagem.                                 |

As falhas históricas permanecem visíveis: omissões e recusas de completude, lacunas de
recuperação, apresentação de protocolo/identificadores, incompatibilidade de modo/citação,
guardas monetárias e limites da janela. Relatórios posteriores registram correções ou
contraprovas quando existentes, sem apagar a rodada anterior. Não converti essas pendências
em novos defeitos atuais sem reprodução, nem apresentei sondagens ou revisão técnica do autor
como homologação humana, jurídica ou contábil.

Autorizações antigas de envio, pesquisa, restart e descarte de RAM foram lidas como fatos
datados e delimitados. Elas não autorizam operação atual. Os links e preços citados são
históricos; esta revisão não os renova como orientação jurídica, comercial ou técnica atual.

## Autoria e independência

Nenhum dos 98 arquivos foi editado por Documentos nesta rodada. Sua autoria anterior não é
inferida: a revisão é cruzada em relação à intervenção corrente, sem certificar independência
perante uma autoria histórica desconhecida. O mapa conserva `independentApproval=false`,
`wholeBranchApproval=false` e `semanticApproval=false`. Os relatórios originais mantêm suas
próprias declarações de autorrevisão e revisão especializada pendente.

## Integridade e operações

Na conferência de encerramento, os **145 hashes históricos** permaneceram iguais aos fixados
no mapa e no manifesto integral. As **96 entradas da candidata funcional r4** também permaneceram
idênticas. Zero mudança funcional, configuração, teste ou prompt foi feita neste complemento.
Não foram repetidos gates funcionais, inferências ou integrações; não houve leitura de arquivos
de ambiente, dados reais, ativação de serviço ou cobrança.

O ajuste anterior de uma linha em AC-2414 é um delta documental separado, já registrado no
[fechamento local](2026-11-11-pilot-documents-local.md): SHA posterior
`ab0e7c366a4773dd8c08a0a6ce104e4c91322f570d667dbeb0ad0929338f7999`, com gate de visão de
72 specs aprovado. Ele não altera os 98 arquivos deste recorte. Os 910 hashes sem diferenças
da janela global são um registro daquele gate; não ocultam os deltas documentais posteriores.

Os gates r4 e seus limites continuam no [relatório local](2026-11-11-pilot-documents-local.md).
CI, revisão independente do diff/commit completo, política, fornecedor, destino, orçamento
efetivo, dados reais e liberação do piloto não são aprovados por este complemento.
