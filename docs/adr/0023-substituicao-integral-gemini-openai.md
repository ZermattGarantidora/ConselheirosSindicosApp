# ADR 0023 — Migração gradual da Gemini para OpenAI

**Status:** revisado por decisão do usuário; dados reais permanecem bloqueados
**Data:** 2026-10-15

## Contexto

OpenAI passa a ser o provedor preferencial, mas o usuário decidiu explicitamente em 2026-10-15 que
Gemini ainda não deve ser excluída. A migração não pode interromper a conversa, perder
vetorização, enfraquecer autorização ou impedir a conferência da imagem original.

## Decisão

- Respostas e mensagens usam OpenAI como primeira opção e Gemini quando OpenAI não estiver
  configurada. Se ambas estiverem configuradas, uma indisponibilidade do gateway OpenAI permite
  repetir a geração na Gemini; fallback local continua restrito à extração documental rotulada.
- Fotos JPEG/PNG usam o adaptador OpenAI preferencial ou, enquanto preservado, o adaptador Gemini,
  sempre com saída separando observação visual, texto percebido e limitações.
- OpenAI e Gemini mantêm perfis vetoriais versionados distintos. A consulta usa o mesmo perfil do
  índice ativo e não compara vetores incompatíveis silenciosamente.
- Uma migração de vetores continua sendo isolada por condomínio, idempotente e sem apagar original
  ou perfil anterior antes da validação do novo.
- Falha de modelo ou embedding deixa a foto em `needs_review`, sem afirmar que está pronta.
  Segredos ficam somente no servidor; dados reais não entram antes dos gates de fornecedor,
  privacidade, retenção e piloto.

## Consequências

Uma chave OpenAI é suficiente para os caminhos novos. Enquanto a retirada da Gemini não for
aprovada, uma chave Gemini também mantém conversa e, com os controles operacionais próprios,
análise e busca de imagens. A escolha do adaptador fica explícita no runtime e perfis incompatíveis
não são misturados. Testes sintéticos, custo e latência continuam obrigatórios antes de liberação.

## Fontes técnicas

- [OpenAI Docs — imagens e visão](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI Docs — embeddings](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenAI Docs — saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs)
