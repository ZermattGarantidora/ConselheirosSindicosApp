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

## AC-1107 — Candidata verificável

**Dado** o início pretendido em 16/11/2026 (America/Sao_Paulo)

**Quando** falta gate aplicável no commit/configuração efetivos, revisão independente ou cobertura >=80% nos quatro indicadores

**Então** o uso real continua bloqueado, ainda que ensaios anteriores de histórico/worker tenham passado.

## AC-1108 — Digitalizados e fotos

**Dado** PDF digitalizado ou foto autorizada

**Quando** OCR/interpretação, qualidade, limites, privacidade do fornecedor ou evidência no gateway de destino não foram validados com sintéticos

**Então** o caminho real permanece indisponível; material ilegível não sustenta afirmação nem citação inventada.

## AC-1109 — Avaliação presencial minimizada

**Dado** uma sessão preparada com tarefas em celular e computador

**Quando** participante realiza consulta, confere fonte, encontra limite de evidência e retoma histórico

**Então** facilitador mede tempo, conclusão, intervenções e confiança sem copiar conteúdo real para registros técnicos; áudio/vídeo/tela ficam desligados salvo consentimento específico aprovado.

## AC-1110 — Rascunho não libera dados

**Dado** termo, autorização, aviso ou matriz de papéis preparados

**Quando** base legal, controlador/operador, retenção/backups, fornecedores/transferências ou responsáveis competentes continuam pendentes

**Então** os materiais continuam rascunhos e a política sintética vigente não é substituída.

## AC-1111 — Piloto sem WhatsApp e com continuidade

**Dado** um participante do piloto fechado com código da equipe

**Quando** volta no mesmo navegador ou conecta outro aparelho autorizado à mesma conta

**Então** a sessão válida restaura sem digitar código novamente no aparelho lembrado e o
histórico completo de ambos os lados permanece disponível; não há etapa de telefone/WhatsApp.
Nova confirmação é necessária em novo aparelho ou nas exceções de saída, limpeza de cookie e
revogação. A integração WhatsApp fica reservada à abertura pública, sem bloquear a preparação
do piloto; restauração efetiva do histórico continua gate obrigatório.
