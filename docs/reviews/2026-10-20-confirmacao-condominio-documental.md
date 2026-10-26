# Verificação local — confirmação do condomínio no documento

- **Status:** validação local; integração e revisão independente pendentes. Sem aprovação de merge/publicação.
- **Base:** `f219fec49b52bb6a5b924f70a7d53a8eceef61e5` e árvore de trabalho, sem commit nesta tarefa.
- **Autor e revisão local:** Codex.
- **Revisor independente:** pendente.
- **Data:** 2026-10-20.

## Escopo e rastreabilidade

Spec 037, AC-3701–3705 e ADR 0027. Conferência determinística reutiliza texto/PDF/OCR existentes,
conserva nomes/procedência por versão e impede consultas antes da confirmação. A interface apresenta
os dois nomes e oferece confirmar/cancelar; pendências podem ser retomadas no catálogo do Perfil.

Arquivos revisados: comparador e processamento documental; upload e catálogo; adaptadores em memória
e PostgreSQL; migração 031; rotas de recepção/confirmação; acompanhamento do cliente; componente de
confirmação e suas ligações no App; CSS específico; testes unitários/E2E/integração; spec e ADR.
O restante da árvore contém outras mudanças preexistentes e concorrentes; este registro não aprova
a árvore inteira para integração.

## Decisões conferidas

- Nome selecionado vem do diretório do servidor, sem aceitar substituição pelo cliente/documento.
- Divergência usa `needs_review`; SQL e leitores de análise exigem estado pronto, e o retriever em
  memória mantém seu filtro de estado. O documento continua privado no contexto em que foi enviado.
- Confirmação valida associação/permissão de upload, tenant, versão mais recente e documento ativo.
  A decisão não modifica vigência nem resolve revisão de OCR.
- Atualização SQL preserva auditoria de usuário/data. A decisão concorrente em memória é síncrona
  antes da resolução da Promise; duas requisições produzem um 200 e um 409.
- Nome original do arquivo é persistido por versão em `source_description`, evitando comparar uma
  versão nova pelo título antigo do documento.
- UI escapa texto, bloqueia cliques durante a decisão e preserva a pergunta antes da confirmação.
- Migração é aditiva, herda RLS forçada e rejeita estado pronto com confirmação ainda pendente.

## Validação

- Casos focados de comparação, UI/transporte, API/recuperação e adaptadores aprovados.
- `pnpm run evals`: 20/20; `pnpm run evals:documentary`: 50/50 determinísticos, sem chamadas externas.
- Builds API/web e `pnpm run test:production` aprovados; ensaio compilado processou dois PDFs e
  vinte perguntas, sem provedor externo.
- `pnpm run check` final: 813 testes em 119 arquivos aprovados; formatação, lint, tipagem,
  alinhamento das 37 specs e scanner de segredos aprovados. Cobertura: statements 89,99%, branches
  83,88%, functions 95,95% e lines 92,21%; todos os pisos atendidos. Os testes de aparência/perfil
  alterados em paralelo já passaram nessa execução final.
- Com as variáveis sintéticas dos arquivos locais carregadas, a migração Neon falhou em resolução
  DNS (`ENOTFOUND`) antes de conectar. Migração 031 e integração real não foram validadas/aplicadas.
- Não houve inspeção visual em navegador; o markup da confirmação é validado por renderização React.

## Pendências para integração

Executar migração 031 e `test:integration` no Neon sintético com marcador/TLS; obter gate geral na
revisão estabilizada da árvore e revisão independente do diff completo. Não executar merge com
gates ausentes ou reprovados. Não houve merge, push ou publicação nesta tarefa.
