# ADR 0016 — Base legal oficial compartilhada

**Status:** aceito  
**Data:** 2026-09-24

## Contexto

O usuário determinou que a legislação seja a base principal das conversas do aplicativo. Copiar a
mesma lei para cada condomínio aumentaria custo, dificultaria atualizações e poderia fazer uma fonte
pública parecer documento interno. Ao mesmo tempo, documentos particulares devem continuar isolados
por `condominium_id`.

## Decisão

Manter uma biblioteca legal global, versionada, somente leitura no runtime e sem dados de clientes.
Perguntas substantivas consultam essa biblioteca e o contexto autorizado do condomínio. A legislação
relevante recebe identificação própria na citação; documentos internos complementam fatos e regras
locais. A primeira fonte é a Constituição Federal obtida da Câmara dos Deputados.

A importação é administrativa, valida domínio HTTPS oficial, PDF, tamanho, hash, páginas e trechos.
Uma alteração de conteúdo cria versão imutável e marca somente uma versão como atual. O runtime só
pode ler a biblioteca quando há usuário e condomínio com associação ativa.

## Consequências

- uma atualização legal é feita uma vez e atende todos os condomínios;
- a origem legal não é confundida com convenção, regimento, ata ou contrato;
- a trilha de respostas registra se a evidência veio do condomínio ou da legislação;
- a legislação não enfraquece o isolamento dos documentos particulares;
- o sistema ainda precisa reconhecer quando uma lei é irrelevante ou quando outra norma específica
  deve ser incluída na biblioteca.

## Alternativas rejeitadas

### Copiar a lei para cada condomínio

Rejeitada por duplicação, atualização difícil e classificação incorreta como documento do cliente.

### Enviar a Constituição inteira ao modelo em toda pergunta

Rejeitada por custo, latência e piora de relevância. Apenas trechos recuperados participam da geração.
