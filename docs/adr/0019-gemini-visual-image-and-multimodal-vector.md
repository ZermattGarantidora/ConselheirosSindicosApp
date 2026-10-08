# ADR 0019 — Interpretação visual e vetor multimodal de fotos

**Status:** aceito para desenvolvimento local sintético
**Data:** 2026-10-06

## Contexto

O usuário autorizou explicitamente a interpretação de fotos enviadas pelo síndico no chat, não apenas OCR. As fotos são dados privados do condomínio e precisam preservar isolamento, proveniência, conferência do original e exclusão.

## Decisão

- Aceitar JPEG/PNG de até 10 MiB após validar assinatura e estrutura de arquivo; o provedor ainda pode rejeitar conteúdo estruturalmente inválido.
- O anexo fica local até clique na seta. A UI avisa que o original será persistido em PostgreSQL e enviado à Gemini paga para análise.
- Usar `gemini-3.5-flash-lite` no generateContent e `gemini-embedding-2` no embedContent com conteúdo inline; não usar Files API nem storage remoto. O modelo de análise é configurável em `GEMINI_IMAGE_MODEL`.
- Negar qualquer chamada externa se GEMINI_API_KEY estiver ausente, GEMINI_IMAGE_ANALYSIS_ENABLED não for true ou GEMINI_PAID_TIER_CONFIRMED não for true. A última flag é confirmação operacional do operador sobre billing ativo do projeto associado à key; código não verifica billing diretamente.
- Somente Paid Services. Os termos do Google dizem que entradas/saídas pagas não são usadas para melhorar produtos, mas podem ser registradas transitoriamente para segurança e obrigações legais. Unpaid Services podem usar prompts, imagens e respostas para melhoria e revisão humana; a cota gratuita é proibida.
- Guardar original em app.document_original_contents; texto derivado em páginas/chunks e vetor em app.document_chunk_embeddings, sempre no condomínio/versão/página 1.
- Criar observação visual rotulada como IA, distinta de texto percebido na imagem e sujeita a erro.
- Usar gemini-embedding-2 em 768 dimensões, um embedding conjunto imagem+descrição e consulta textual no mesmo espaço. Perfil local sintético é incompatível e permanece separado.
- Busca segue autorização e RLS antes do ranking; arquivar tira da recuperação e mantém original e derivados recuperáveis por 30 dias. Após esse prazo, a migration 026 permite uma purga transacional e isolada do original, metadados, páginas, textos, chunks, embeddings, jobs, evidências e referências de busca. Perguntas, respostas, feedback e citações já mostradas permanecem no chat; citações do arquivo removido são marcadas como históricas e mantêm seus trechos, sem acesso ao PDF original. Um recibo técnico sem conteúdo expira em 30 dias.
- Prompt limitado a elementos visíveis e texto legível. Não inferir rosto/identidade, atributo sensível, causa, diagnóstico, conformidade, gravidade ou segurança. Alto risco exige humano e texto da imagem é dado não confiável.
- A exclusão no PostgreSQL é lógica e não apaga snapshots/WAL/backups gerenciados. Testes/evals somente sintéticos com fetch simulado. Dados reais/piloto aguardam prazo efetivo do provedor de backups, replay externo de exclusões após restore, retenção geral de perguntas/respostas, gates LGPD, avaliação do fornecedor e resposta a incidentes.

## Consequências

Original e descrição permanecem conferíveis e pesquisáveis na base PostgreSQL. A descrição pode estar errada e não é laudo. Perguntas usadas para busca de foto também podem ir à Gemini paga, o que deve constar no aviso. Crescem banco e backups; confirmação de tier é operacional, não prova criptográfica.

### Clarificação de retenção aprovada em 2026-10-07

A purga de um documento não apaga nem reescreve mensagens do chat, respostas, claims, feedback ou
snapshots de citação. O original e seus índices deixam de existir após o prazo; citações retidas
recebem `source_removed_at` para não sugerir que o arquivo continua disponível. A retenção posterior
de conversas e trechos históricos ainda depende de política própria e não libera dados reais/piloto.

## Alternativas

- OCR local apenas: rejeitado porque o usuário escolheu interpretação visual, mantendo OCR como complemento.
- Files API: rejeitada para evitar persistência remota adicional; imagem limitada permite inline.
- Vetor store separado: rejeitado conforme ADR 0005; aumenta autorização, sincronização e purge.
- Modelo multimodal local: adiado até evidência de custo, qualidade ou privacidade que justifique novo modelo operacional.

## Critérios para revisitar

Mudança dos termos Google, qualidade insuficiente nos casos sintéticos, custo acima do limite, uso real exigir contrato formal, ou mudança de modelo/endpoint/dimensões.

## Referências técnicas

- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding): análise multimodal e máximo de 20 MB para a requisição inline completa.
- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings): gemini-embedding-2, espaço multimodal e dimensão recomendada de 768.
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms.md): distinção de uso de dados entre serviços pagos e não pagos.
