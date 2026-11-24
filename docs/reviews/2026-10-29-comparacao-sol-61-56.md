# Revisão do autor — comparação Sol 6.1 / Sol 5.6

- **Status:** revisão do autor concluída; medição exploratória encerrada, sem aprovação de merge ou adoção
- **Diff revisado:** Spec 055, seleção Sol, cópia validada da aplicação R3, tarifas, dois testes e documentação do comando.
- **Revisor independente:** nenhum; não é aprovação para merge.
- **Autor:** Codex, auditoria técnica por IA.
- **Data:** 2026-10-29.
- **Achados P0/P1 de implementação da fatia:** nenhum identificado na revisão do autor.

## Escopo

Revisados integralmente os acréscimos em protocol.ts, run.ts e snapshot.ts, os dois testes
em conversation-comparison.test.ts e as alterações de package/README/AGENTS, Spec 055 e
rastreabilidade. A aplicação usada na bateria é a R3 imutável; foram conferidos inventário
e hashes de todas as fontes, com diferenças restritas a três arquivos do harness.
Alterações preexistentes de produto e seus documentos foram preservados.

O parâmetro baseline-run valida identificadores e recusa sobrescrever o run de origem.
A cópia histórica é validada contra seu manifesto; modificação durante a cópia é recusada
pelo hash final. Segredos de ambiente não entram no snapshot. Novas condições usam somente
o gateway Codex sintético autorizado, com modelo explícito e sem fallback para API paga.
Não há mudança de autorização, persistência, SQL, prompt ou roteamento da aplicação.

Tarifas/cache por modelo e todas as tentativas permanecem separadas de faturamento/franquia.
Tentativas sem usage têm consumo desconhecido. Testes verificam modelo solicitado, soma
mista com cache, preservação do código/dataset histórico e recusa de baseline adulterado.

## Gates executados

- 1.434 testes em 155 arquivos passaram com dois workers; cobertura 92,04% statements,
  87,72% branches, 96,87% funções e 93,72% linhas.
- Tipagem, lint global, formatação global, visão de 55 specs e whitespace passaram.
- 20 evals legados e 50 documentais determinísticos passaram.
- A primeira suíte ampla atingiu timeout no teste de upload; o log foi preservado e a
  repetição com menor concorrência passou sem alterar timeout, teste ou asserções.
- O primeiro comando de lint incluiu um diretório ignorado pela configuração; o comando
  global canônico passou. O teste real inicial falhou por acesso local; suas quatro
  tentativas sem usage foram preservadas separadamente do smoke acessível e da bateria.

Logs em `.local/sol-055-{tests-final,typecheck,lint-final,format,vision,whitespace,evals,documentary}.log`;
cobertura em `.local/sol-055-coverage-final/`. Usados os executáveis locais equivalentes
aos componentes do check, com diretório de cobertura isolado. A verificação preliminar
da bateria passou em 533 checkpoints/1.280 turnos, mas não certifica a execução completa.
Após o encerramento da bateria, o verificador passou em 560 checkpoints, 2.020 turnos,
2.200 chamadas, 2.688 citações e 160 decisões com hashes, sem divergência e com até duas
gerações por turno. A fonte histórica permaneceu intacta; os três arquivos novos do
harness são as únicas diferenças do snapshot. Nenhuma resposta histórica foi substituída.

No fechamento, o workspace compartilhado já continha alterações concorrentes de outras
fatias, preservadas e ausentes da aplicação histórica executada. A suíte atual passou
novamente em 1.595 testes/163 arquivos, com cobertura statements 92,26%, branches 88,21%,
funções 97,05% e linhas 93,92%. Tipagem, lint global, formatação, visão de 57 specs e
whitespace passaram; scanner executado após o fim dos processos desta bateria não
encontrou padrão conhecido de segredo. Logs em `.local/sol-055-tests-close.log`,
`.local/sol-055-coverage-close/`, `.local/sol-055-typecheck-final.log`,
`.local/sol-055-lint-close.log`, `.local/sol-055-format-final.log`,
`.local/sol-055-vision-final.log`, `.local/sol-055-whitespace-final.log` e
`.local/sol-055-secrets-final.log`.

## Decisão e limites

Esta revisão é do autor e não autoriza merge, seleção de modelo ou produção. A auditoria
de conteúdo é técnica por IA, não cega, sem revisão profissional independente. Pontos
parciais/falhos permanecem problemas observados; não se altera guard, oráculo ou resposta
histórica para aprová-los. Os 50 documentais semânticos e a aprovação especializada seguem
pendentes. [Resultados finais](../specs/055-comparacao-sol-61-56/observed-results-2026-10-29.md):
Sol 6.1 68/79 satisfatórias, 10 parciais e uma falha; Sol 5.6 57/79, 15 parciais e sete
falhas; Luna R3 histórica 59/79. Os custos e as tentativas sem usage foram mantidos,
inclusive nos smokes. Não houve commit, merge, deploy ou mudança da configuração do chat.
