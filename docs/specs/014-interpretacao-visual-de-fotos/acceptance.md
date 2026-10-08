# Critérios de aceitação — Spec 014

**Status:** validação sintética local aprovada; migration 025 aplicada na prévia; migration 026 de retenção implementada localmente, ainda não aplicada nem validada em PostgreSQL; integração persistente e dados reais/pilotos bloqueados
**Atualizado em:** 2026-10-07

## AC-1401 — Seleção não envia (P0)

**Dado** uma foto selecionada **Quando** o usuário não clicou na seta **Então** não há requisição de upload, e remover o anexo não transfere bytes.

## AC-1402 — Aviso de transferência (P0)

**Dado** uma foto anexada **Então** a interface informa armazenamento no banco do condomínio, envio para análise Gemini paga, caráter gerado da descrição e restrição atual a imagens sintéticas.

## AC-1403 — MIME e tamanho (P0)

Arquivo que não tenha estrutura JPEG/PNG aceita, assinatura incompatível ou acima de 10 MiB falha antes de persistir ou chegar ao provedor; falha interna de decodificação do provedor não produz estado pronto.

## AC-1404 — Negar por padrão (P0)

Sem chave, confirmação de faturamento ou flags, não existe chamada externa e documento não fica pronto/pesquisável.

## AC-1405 — Análise válida (P0)

Imagem sintética com fetch simulado retorna página lógica 1 com descrição, texto percebido e limitações em campos separados; estado ready exige descrição e embedding de 768 dimensões válidos.

## AC-1406 — Falha segura (P0)

Timeout, resposta vazia/inválida ou dimensão errada deixa needs_review/failed e não publica chunk recuperável.

## AC-1407 — Busca cruzada (P0)

Consulta textual autorizada usa o mesmo perfil multimodal e pode recuperar página/trecho da foto, com documento, versão e página preservados.

## AC-1408 — Isolamento (P0)

Consulta no condomínio B não revela imagem, página, descrição, score nem ID de A.

## AC-1409 — Não diagnosticar (P0)

Resposta descreve só o visível, reconhece incerteza e recomenda especialista em tema técnico/de segurança, sem afirmar causa ou conformidade.

## AC-1410 — Recuperação até 30 dias (P0)

**Dado** um documento arquivado por síndico autorizado
**Quando** ainda não completou 30 dias
**Então** original, páginas, textos derivados, chunks e embeddings permanecem recuperáveis em conjunto
**E** a restauração só ocorre no mesmo condomínio e enquanto houver membership autorizada.

## AC-1411 — Limite de restauração (P0)

**Dado** um documento arquivado há 30 dias ou mais
**Quando** o síndico consulta a lixeira ou solicita a restauração antes da próxima execução do job
**Então** o documento não aparece como recuperável e a API recusa a restauração.

## AC-1412 — Purga completa e isolada (P0)

**Dado** um documento arquivado há pelo menos 30 dias
**Quando** a rotina privilegiada de purga o processa
**Então** original, metadados do documento, páginas/OCR/descrições visuais, chunks, vetores, jobs, evidências e referências de origem são removidos do banco ativo
**E** nenhuma consulta documental no mesmo ou em outro condomínio consegue recuperar conteúdo, trecho, vetor ou arquivo do documento
**E** um recibo técnico sem conteúdo permanece por até 30 dias, enquanto o histórico do chat segue AC-1413.

## AC-1413 — Histórico e idempotência (P0)

**Dado** uma resposta histórica que citou o documento expirado
**Quando** a purga termina
**Então** a pergunta, resposta, claims e feedback permanecem sem alteração no chat
**E** a citação mantém o título, versão, página e trecho que já apareciam na conversa, marcada como histórica com `source_removed_at`
**E** a interface informa que o PDF original foi removido e não oferece abertura ou recuperação desse arquivo
**E** apenas vínculos de busca e referências de rastreio aos artefatos removidos deixam de existir
**E** repetir a rotina não restaura nem duplica conteúdo ou recibos.

## AC-1414 — Transparência de backup (P0)

**Dado** que a purga do PostgreSQL é lógica e opera no banco ativo
**Então** a interface não promete remoção instantânea de snapshots, WAL ou backups gerenciados
**E** dados reais/pilotos continuam bloqueados até que o prazo efetivo dos backups e o procedimento externo de reaplicação das exclusões após restore sejam aprovados e testados.
