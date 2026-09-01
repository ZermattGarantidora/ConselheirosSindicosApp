# Contribuindo

## Fluxo local obrigatório

1. Leia o briefing e a spec aplicável antes de alterar comportamento.
2. Crie ou atualize a spec pelo template quando a alteração mudar escopo, contrato, risco, IA ou dados.
3. Implemente testes junto com a mudança e execute `pnpm run check`.
4. Peça revisão independente do diff completo mais recente.
5. Registre a decisão em `docs/reviews/<identificador>.md` a partir do template.
6. Execute `pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md` antes da integração local.

Não integrar se algum gate falhar, se a cobertura ficar abaixo de 80% em qualquer métrica, ou se houver P0/P1 pendente.

## Convenções

- TypeScript estrito; não usar `any`.
- Módulos de domínio recebem `CondominiumId` explícito; não inferir tenant de variável global ou entrada não autorizada.
- Variáveis sensíveis ficam em `.env.local`, nunca em arquivos versionados.
- Prompts, modelos, mudanças de retrieval e regras de segurança precisam de eval/teste de regressão correspondente.
- Commits locais seguem `tipo(escopo): descrição`; os tipos aceitos são `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `refactor` e `test`.

## Dependências

Use `pnpm install --frozen-lockfile` para instalações reproduzíveis. Antes de release, execute `pnpm run audit:dependencies`; vulnerabilidades altas/críticas exigem correção ou aceite de risco documentado.
