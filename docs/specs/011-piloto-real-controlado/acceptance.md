# Critérios de aceitação — Spec 011

## AC-1101 — Ambiente separado

**Dado** que a operação propõe receber um documento real  
**Quando** o ambiente não tem provedor, região, TLS, storage privado, backup testado e políticas aprovadas  
**Então** a entrada é bloqueada e nenhum dado real é recebido.

## AC-1102 — Consentimento e autorização

**Dado** um participante potencial  
**Quando** não há aceite do termo e confirmação de autorização documental  
**Então** ele não recebe acesso ao upload do piloto.

## AC-1103 — Isolamento em operação

**Dado** dois condomínios participantes  
**Quando** um usuário envia, consulta, exporta ou exclui dados  
**Então** a operação alcança somente o `condominium_id` autorizado e os testes de revogação e purge preservam o outro condomínio.

## AC-1104 — Resposta segura

**Dado** uma pergunta do piloto  
**Quando** há evidência suficiente  
**Então** a resposta exibe documento, versão, página e trecho verificáveis; caso contrário, se abstém e explica a limitação.

## AC-1105 — Incidente e encerramento

**Dado** um incidente, pedido de exclusão ou gate reprovado  
**Quando** a operação é notificada  
**Então** o piloto é pausado, o acesso é revogado conforme a política aprovada e nenhuma reabertura ocorre antes de revisão independente e novos gates aprovados.

## AC-1106 — Métricas minimizadas

**Dado** uma semana de piloto encerrada  
**Quando** a equipe consolida resultados  
**Então** mede uso, feedback, tempo, custo e incidentes com dados minimizados, sem copiar conteúdo documental nem qualificar comercialmente o participante por seu acervo.
