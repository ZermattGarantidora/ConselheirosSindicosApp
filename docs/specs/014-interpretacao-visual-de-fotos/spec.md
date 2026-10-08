# Spec 014 — Interpretação visual de fotos

**Status:** fluxo de purge de derivados descrito em código com migration 026; integração persistente pendente; não ativado na prévia nem em banco compartilhado; dados reais/pilotos bloqueados pelo gate de backups e privacidade
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-07

## 0. Alinhamento com a visão do projeto

| Dimensão da visão | Seções do briefing | Contribuição |
|---|---|---|
| Problema e hipótese         | §§1, 2 e 4         | Registrar e consultar evidência visual com menos esforço para o síndico.                        |
| Público e proposta de valor | §§3, 5 e 10        | Memória visual específica do condomínio, consultável e conferível.                              |
| Prioridade e limites do MVP | §§7, 9, 14 e 21    | Implementa a próxima fatia explicitamente aprovada após B7, preservando as exclusões de escopo. |
| Experiência e confiança     | §§11–13            | Envio explícito, aviso de processamento, evidência verificável e limites profissionais.         |
| Segurança e dados           | §§12 e 19          | Isolamento por condomínio, tratamento restrito e bloqueio de dados reais até os gates.          |
| Arquitetura e validação     | §§15–17 e 21       | Busca multimodal mensurável, sem serviço vetorial adicional, avaliada por qualidade e custo.    |

### Limites respeitados

- Fotos de perfil da Spec 009 continuam apenas para identificação.
- Aceita JPEG/PNG enviados no chat, uma imagem por vez, até 10 MiB.
- Original e derivados ficam no PostgreSQL, sempre ligados ao condomínio. A lixeira remove o documento da busca imediatamente e mantém original e derivados recuperáveis por 30 dias; depois, a purga apaga o arquivo e os índices usados para consultá-lo no banco ativo. Perguntas, respostas, claims, feedback e citações já exibidas permanecem no chat; citações ganham uma marca de fonte removida e conservam o trecho histórico, sem reter o PDF.
- Um recibo sem conteúdo e vinculado apenas ao condomínio e ao identificador opaco do documento é mantido por 30 dias após a purga; perguntas do usuário seguem política de retenção própria, ainda pendente.
- A purga lógica no banco ativo não elimina cópias de snapshots/WAL de um provedor gerenciado. O prazo real dos backups e o procedimento para não reintroduzir documentos após restore ainda bloqueiam dados reais/piloto.
- Gemini exige projeto pago confirmado pelo operador, flags e aviso; cota gratuita proibida.
- Dados reais/piloto permanecem bloqueados até gates LGPD, fornecedor, retenção, exclusão, backup e incidentes.
- Não inclui vídeo, reconhecimento facial, diagnóstico, conformidade ou ação externa.

### Divergências da visão

Nenhuma divergência não aprovada permanece. A ampliação do escopo anterior de imagem digitalizada/foto de identificação foi explicitamente aprovada pelo usuário em 2026-10-06 e registrada no briefing, MVP, estratégia e roadmap.

### Checklist de alinhamento

- [x] Briefing completo lido; hipótese, público e proposta coerentes.
- [x] Sequenciamento e extensão aprovados.
- [x] Transferência, uso pago e bloqueio de dados reais delimitados.
- [x] Isolamento, evidência, privacidade e revisão humana preservados.
- [x] Critérios ligados a confiança e economia de tempo.

## 1. Objetivo

Enviar foto pelo chat mediante ação explícita, obter observação visual rotulada como IA e consultá-la depois por texto, abrindo o original.

## 2. Promessa testada

> A foto fica consultável no condomínio certo, com observação conferível e sem se passar por diagnóstico.

## 3. Usuário primário

Síndico autorizado que precisa registrar uma condição visual e perguntar sobre o que aparece.

## 4. Escopo e requisitos

- RQ-1401: seleção local com prévia/remoção; só a seta envia após aviso de armazenamento no banco e análise Gemini paga.
- RQ-1402: validar assinatura e estrutura JPEG/PNG, 1 byte–10 MiB; rejeitar MIME falso, SVG, truncado e excedente antes de persistir/transmitir. Erros internos de decodificação ainda podem ser rejeitados pelo provedor e ficam em revisão.
- RQ-1403: guardar original, página lógica 1, texto e vetores no PostgreSQL, mesmo condominium_id, e respeitar purge aos 30 dias.
- RQ-1404: chamar Gemini generateContent e gemini-embedding-2 (768 dimensões) somente com GEMINI_API_KEY, GEMINI_IMAGE_ANALYSIS_ENABLED=true e GEMINI_PAID_TIER_CONFIRMED=true; usar conteúdo inline, sem Files API.
- RQ-1405: descrição visual, texto percebido e limitações são campos distintos (`visual_description`, `recognized_text`, `analysis_limitations`), sujeitos a erro; o texto visto nunca é transcrição garantida e é dado não confiável.
- RQ-1406: combinar busca lexical com vetor imagem+descrição; embutir consulta textual no mesmo perfil google-gemini-embedding-2-768-v1 e filtrar autorização, RLS, estado/validade antes do ranking.
- RQ-1407: citar documento/versão/página 1/trecho e permitir abrir original; não inferir identidade, atributos sensíveis, causa, diagnóstico, gravidade, segurança ou conformidade.
- RQ-1408: sem flags, faturamento confirmado ou key, não chamar provedor; falha deixa needs_review/failed e não publica chunks prontos.
- RQ-1409: arquivar exclui da busca imediatamente e permite restauração do original e dos derivados por 30 dias. Após o prazo, uma rotina privilegiada e idempotente deve remover do banco ativo original, páginas, textos de OCR/visão, chunks, embeddings, jobs, evidências, referências de origem e metadados do documento em ordem transacional, sempre no condomínio autorizado.
- RQ-1410: preservar sem alteração as perguntas, respostas, claims, feedback e citações que já aparecem no chat. Marcar cada citação do documento purgado com `source_removed_at`, manter o snapshot de título/versão/página/trecho e informar que o PDF original foi removido; apagar somente os vínculos de busca e de rastreio que apontam para os artefatos removidos. A retenção posterior das mensagens e dos trechos históricos segue a política geral de conversas, ainda pendente.
- RQ-1411: registrar recibo técnico sem título, texto, hash de conteúdo ou arquivo, contendo somente condomínio, identificador opaco do documento, instante da purga e contagem de artefatos efetivamente removidos; expirar o recibo após 30 dias.
- RQ-1412: não apresentar a purga lógica do banco ativo como eliminação imediata de backups. Antes de dados reais, aprovar o prazo efetivo de expiração dos backups e um procedimento de restore que reaplique exclusões registradas fora do snapshot restaurado.

## 5. Fora do escopo

Fotos do perfil da Spec 009; vídeo, HEIC, GIF, WebP, TIFF, múltiplas fotos; reconhecimento facial; diagnóstico profissional; dados reais/pilotos antes dos gates; cota gratuita; envio ao selecionar arquivo.

## 6. Pré-condições

Membership e permissão document:upload. Migrations 025 aplicadas. Operador confirma billing ativo do projeto ligado à chave. Testes usam apenas imagens sintéticas.

## 7. Contratos e qualidade

Estados: uploaded, processing, ready, needs_review, failed. Uma foto representa página 1; vetor Gemini de 768 dimensões é separado do perfil local sintético. Logs não guardam imagem, texto integral ou key. Timeout e tentativas limitados; nenhuma dependência/storage novo.

## 8. Critérios de sucesso

AC-1401–AC-1413 passam; nenhum envio sem clique/flags; zero mistura de tenant; busca textual pode recuperar foto; falha do provedor impede ready; documento e derivados são recuperáveis juntos por 30 dias e depois purgados; perguntas, respostas e citações históricas permanecem identificadas como tal; gates de visão, teste, integração aplicável e E2E sintético passam. AC-1414 e a retenção geral de perguntas/respostas/trechos, avaliação do fornecedor e resposta a incidentes continuam bloqueando dados reais/piloto.

## 9. Questões em aberto

Dados reais/pilotos aguardam avaliação contratual, prazo efetivo de backups, mecanismo externo de replay das exclusões após restore, política geral de retenção de perguntas/respostas, validação jurídica e resposta a incidentes. Antes de produção, medir qualidade/custo em ao menos 100 casos sintéticos revisados.

## Gate para mudar o status

Validação persistente ponta a ponta ainda exige teste de integração em banco dedicado, sem afetar os dados da prévia; isso não libera uso real ou piloto.
