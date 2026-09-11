# GitHub — CI e proteção remota

**Status:** CI e proteção da `main` configurados
**Atualizado em:** 2026-09-11

O repositório remoto já existe, o workflow `.github/workflows/ci.yml` executa os gates técnicos no GitHub Actions e a proteção da `main` foi ativada em 2026-09-11. O registro local de review continua obrigatório como evidência do processo.

## Configurado

- Repositório remoto do projeto.
- Workflow de CI em pushes da `main` e branches `codex/**`, e em pull requests para `main`.
- Instalação com lockfile, lint, typecheck, cobertura, specs, scanner de segredos, E2E e build.
- Artefato de cobertura por execução.
- Permissão mínima de leitura do conteúdo do repositório.

## Configuração de proteção remota

- Proteção da `main` ativa, exigindo pull request, ao menos uma aprovação, branch atualizada, conversas resolvidas e o check `quality` verde.
- Bypass, force push e exclusão da `main` estão bloqueados.

## Pendências operacionais

1. Adicionar secrets de integração somente quando houver necessidade, com o Neon sintético dedicado e confirmação `synthetic-only`.
2. Ativar Dependabot ou equivalente, CodeQL/SAST, SBOM e `CODEOWNERS` conforme a adoção operacional do GitHub.
