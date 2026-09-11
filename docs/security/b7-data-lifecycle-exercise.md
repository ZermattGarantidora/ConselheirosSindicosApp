# Exercício sintético de ciclo de vida — T702

**Status:** concluído para o piloto sintético; não libera dados reais
**Data:** 2026-09-10

## Escopo exercitado

O exercício usa um inventário artificial com originais, páginas, chunks,
embeddings, perguntas, respostas, feedback, auditoria, cache e jobs de dois
condomínios fictícios.

Foram verificadas:

- exportação limitada ao condomínio solicitado;
- preservação integral do segundo tenant durante exportação;
- purge de todos os artefatos e derivados do tenant alvo;
- recibo minimizado por hash, sem conteúdo do corpus;
- remoção de artefatos vencidos segundo a data de retenção;
- revogação de leitura para um usuário em um condomínio;
- manutenção do acesso independente em outro condomínio.

## Evidência

`tests/unit/b7-data-lifecycle.test.ts` executa quatro cenários determinísticos.
O exercício comprova a regra de isolamento e o contrato operacional do piloto
sintético; não substitui a implementação de purge, exportação, backup e
retenção de uma infraestrutura com dados reais.

## Limitação declarada

O piloto não utiliza dados reais, armazenamento remoto ou autenticação real.
Antes de qualquer uso com dados de clientes, será necessária uma política
específica, ambiente separado, backup/restore operacional e testes contra os
serviços efetivamente escolhidos.
