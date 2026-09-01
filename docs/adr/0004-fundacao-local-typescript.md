# ADR 0004 — Fundação local em TypeScript com pnpm

**Status:** aceito  
**Data:** 2026-08-31

## Contexto

O produto ainda não escolheu infraestrutura, provedor de IA ou plataforma Git hospedada, mas precisa iniciar a Spec 001 com disciplina de qualidade, isolamento e avaliações. O ambiente atual oferece Node.js 24, pnpm 11 e Git, mas não Docker.

## Decisão

Usar TypeScript estrito com pnpm e lockfile como fundação local. A aplicação continuará um monólito modular com worker assíncrono conforme ADR 0001; esta decisão não seleciona framework web nem serviços externos. Vitest/V8 aplica testes e cobertura; ESLint e Prettier padronizam o código; scripts PowerShell fornecem gates de specs e integração local.

O primeiro módulo de produção é uma primitiva de escopo de condomínio. Ela torna explícito, desde o começo, o invariante mais sensível do MVP sem antecipar persistência ou autenticação.

## Consequências

- Instalação e checks são reproduzíveis por `pnpm install --frozen-lockfile` e `pnpm run check`.
- O projeto não depende de GitHub para começar, mas a evidência de review continua obrigatória antes de integrar alterações locais.
- Proteção técnica de merge remoto permanece pendente até existir provedor hospedado; o bloqueio local reduz, mas não substitui, proteção de branch.
- Banco, fila, storage, observabilidade hospedada, framework web e provedor de IA serão decididos por ADRs específicos antes de entrarem em produção.
