# Revisão do autor — evidências e continuidade

- **Status:** revisão do autor; revisão independente pendente; sem autorização de merge.
- **Diff revisado:** implementação e integração das Specs 043/046 e contratos centrais da Spec 047 na árvore compartilhada de 27/10/2026; fingerprints da rodada real no relatório da Spec 046.
- **Revisor independente:** pendente.
- **Autor:** Codex.
- **Data:** 2026-10-27.
- **P0 de código identificados e pendentes no escopo:** 0.
- **P1 de código identificados e pendentes no escopo:** 0.

## Escopo e fronteiras

Revisados os diffs de answer-use-case, answer-gateway, answer-persistence e seus adaptadores,
citation-validator, prompt-catalog, schemas OpenAI/Gemini, conflict-detection, retrieval-contract,
text-retrieval, postgres-scoped-retrieval e document-instruction-policy. Revisados também os
arquivos novos conversation-memory, chat-session-connection, retrieval-query e literal-sentences,
a revalidação da rota questions, a configuração do pool de sessão em server e os testes correspondentes.
O texto do prompt foi aprovado explicitamente pelo usuário antes da aplicação.

A integração dos códigos e da classificação da Spec 047 foi conferida com seus testes e notas;
os três módulos de propriedade daquela tarefa foram preservados. Alterações simultâneas de UI,
perfil, confirmação, biblioteca, raio-X, recomendação comercial e conversas longas não são
certificadas por esta revisão. Nenhum arquivo existente foi restaurado ou sobrescrito para
eliminar trabalho alheio. Não houve novo provedor, pacote, schema, commit ou publicação.

## Correções encontradas durante revisão e testes

- A guarda RAM global causava 409 entre armazenamentos sintéticos independentes. Cada adaptador
  passou a ter sua própria guarda; a regressão usa IDs iguais em dois armazenamentos.
- Lock de sessão sobre pool transacional não excluía clientes distintos no Neon real. O pool
  dedicado de sessão mantém a conexão sem transação longa; identidade canônica resolve aliases.
- A consulta de histórico podia repetir um turno por invocação. O JOIN LATERAL escolhe somente
  a invocação mais recente, com identidade e escopo conferidos.
- O índice PostgreSQL deve manter processing_status ready, mesmo ao diagnosticar qualidade ou
  recuperar pendências. A integração conserva a exclusão de documento sem confirmação de condomínio.
- O schema permitia especialista arbitrário que o validador recusava. Ambos agora usam a lista
  existente; não foram ampliados tipos nem relaxada a validação.
- A fixture ignorava sourceScope, mascarando teste de fonte legal. O teste agora exerce a origem
  correta e continua proibindo fato local sustentado somente por lei.
- A seleção de frase cortava números e escolhia cláusula introdutória. Regressões cobrem
  milhares/decimais, artigos, Markdown, offsets Unicode e seleção por assunto.
- A recuperação complementar de preço/vigência repete filtros e fica limitada à mesma versão
  contratual confirmada, dentro do orçamento de oito trechos; ataques nunca chegam ao fallback literal.

## Gates locais

As ferramentas instaladas executaram os equivalentes de format:check, lint, typecheck,
test:coverage, test:specs e test:secrets: 144 arquivos/1.234 testes aprovados; statements 91,17%,
branches 86,20%, functions 96,34% e lines 93,05%. Nenhum código de produção foi excluído da cobertura.
Os diretórios gerados .local e coverage-* foram retirados apenas do lint.

Integração Neon sintética dedicada: 12/12, incluindo persistência, autorização/RLS e concorrência
entre clientes usando pool de sessão. Builds API/web, scanner de segredos, diff sem erros de
whitespace e gate estrutural final de 50 specs passaram. Evals determinísticos 20/20 e documentais
50/50 passaram. O replay semântico sintético prepara 50 casos e verifica contratos; não aprova
qualidade de modelo. Logs exclusivos estão em reports/*046*.

O Corepack não acessou o registry por DNS; foram usados os binários já instalados, sem alterar
dependências. TEMP/TMP dos testes apontaram para cache no workspace após EPERM no temporário
do sandbox. A integração externa autorizada foi executada fora desse bloqueio, com confirmação
e marcador de banco sintético; credenciais não foram copiadas para snapshots ou relatórios.

Verificação posterior da árvore compartilhada v25: 145 arquivos/1.241 testes aprovados;
statements 88,31%, branches 82,34%, functions 91,95%, lines 90,52%. A cobertura inclui arquivos
de trabalhos simultâneos, inclusive conferência financeira em implementação; esta revisão
não os certifica. A rodada real usa o snapshot v24.

O scanner global havia passado. Duas tentativas finais foram interrompidas por ENOENT ao ler
arquivos gerados que outras execuções removeram (.vitest-temp e apps/web/dist), sem achado de
segredo. A verificação final executou o mesmo scanner e padrões, sem alteração, em cópia estável
dos 642 arquivos de fonte rastreados/não ignorados, excluindo relatórios e gerados ignorados:
aprovada. Escopo e hashes estão em reports/source-security-046-manifest.json; log em
reports/secrets-046-source-snapshot.log. Não é scanner de segredos do ambiente/runtime.

## Limites e decisão

A revisão de respostas reais e os resultados finais ficam em
../specs/046-correcoes-evidencias-e-busca/observed-results-2026-10-27.md. Revisão técnica por IA
não substitui validação profissional. A janela recente e a seleção lexical são heurísticas
limitadas; a capacidade do pool e a variância do modelo exigem medição antes de escala.

Esta revisão não aprova o branch inteiro, merge, deploy ou piloto. Os status checks remotos
não foram executados contra um commit a integrar, pois nenhuma integração Git foi solicitada.
