# GitHub — CI e proteção remota

**Status:** CI configurado; proteção da `main` pendente de ativação
**Atualizado em:** 2026-09-08

O repositório remoto já existe e o workflow `.github/workflows/ci.yml` executa os gates técnicos no GitHub Actions. Enquanto a proteção da `main` não estiver ativa, o registro local de review continua obrigatório.

## Configurado

- Repositório remoto do projeto.
- Workflow de CI em pushes da `main` e branches `codex/**`, e em pull requests para `main`.
- Instalação com lockfile, lint, typecheck, cobertura, specs, scanner de segredos, E2E e build.
- Artefato de cobertura por execução.
- Permissão mínima de leitura do conteúdo do repositório.

## Pendências para o bloqueio remoto

1. Proteger a `main` exigindo pull request, ao menos uma aprovação, conversa resolvida e o check `quality` verde.
2. Impedir bypass rotineiro, force push e exclusão da `main`.
3. Adicionar secrets de integração somente quando houver necessidade, com o Neon sintético dedicado e confirmação `synthetic-only`.
4. Ativar Dependabot ou equivalente, CodeQL/SAST, SBOM e `CODEOWNERS` conforme a adoção operacional do GitHub.
