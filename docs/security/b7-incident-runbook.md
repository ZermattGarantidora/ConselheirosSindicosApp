# Runbook de incidente da B7

**Status:** preparado para exercício sintético; não autoriza produção
**Atualizado em:** 2026-09-10

## Escopo

Este procedimento cobre vazamento entre condomínios, prompt injection, upload
malicioso, indisponibilidade de processamento, exposição de segredo e suspeita
de exclusão incompleta durante o piloto sintético.

## Regras imediatas

1. Interromper o piloto e desabilitar a flag do cenário afetado.
2. Suspender o usuário ou condomínio afetado sem apagar evidências.
3. Revogar sessões, links e jobs pendentes relacionados ao incidente.
4. Rotacionar segredos se houver suspeita de exposição.
5. Preservar somente identificadores, hashes, timestamps e metadados mínimos;
   não copiar conteúdo documental para logs ou tickets.
6. Classificar o incidente e designar responsável por segurança, produto e
   operação.
7. Corrigir por rollback ou forward-fix conforme a causa e repetir os testes P0.
8. Registrar decisão, impacto, comunicação e validação antes de reabrir o piloto.

## Critérios de bloqueio

- qualquer frase-canário de outro condomínio em resposta, prompt, cache, job ou
  log;
- acesso aceito depois de revogação;
- citação inexistente ou resposta sem evidência;
- execução de instrução contida em documento;
- segredo ou dado pessoal em fixture, log ou artefato;
- falha de purge, exportação ou restauração;
- vulnerabilidade crítica/alta sem tratamento ou aceite formal.

## Exercício sintético obrigatório

Executar pelo menos um cenário de cada classe: upload malformado, prompt
injection documental, tentativa de acesso cruzado, revogação, falha do parser e
falha de dependência. O resultado deve registrar apenas IDs sintéticos,
resultado, duração e ação tomada.

## Retomada

O piloto só pode ser retomado após revisão independente do diff e dos testes,
confirmação de ausência de P0/P1, atualização da rastreabilidade e nova execução
do checklist de release. Nenhum contato externo ou ação irreversível é parte da
retomada automática.
