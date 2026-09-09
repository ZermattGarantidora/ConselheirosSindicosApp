# Critérios de aceitação — Spec 001

**Status:** implementação local B1–B6 validada com dados sintéticos
**Atualizado em:** 2026-09-09

Os cenários P0 bloqueiam a entrega. P1 mede a utilidade inicial e pode ser calibrado com a baseline, desde que nenhuma invariante de segurança seja flexibilizada.

## AC-001 — Selecionar condomínio autorizado (P0)

**Dado** um usuário associado aos condomínios Alameda e Bosque
**Quando** ele seleciona Alameda  
**Então** o contexto ativo passa a ser Alameda  
**E** toda operação posterior inclui esse contexto validado no servidor
**E** consultas do chat retornam somente dados de Alameda, mesmo que o usuário também tenha acesso a Bosque.

## AC-002 — Bloquear condomínio não autorizado (P0)

**Dado** um usuário sem associação com Bosque  
**Quando** ele informa diretamente o identificador de Bosque  
**Então** o acesso é negado  
**E** nenhum metadado confirma a existência de documentos de Bosque.

## AC-003 — Revogação de acesso (P0)

**Dado** que a associação do usuário foi revogada  
**Quando** ele reutiliza sessão, link ou identificador anterior  
**Então** o servidor revalida e nega a operação.

## AC-004 — Processar PDF textual (P1)

**Dado** um PDF textual válido de Alameda  
**Quando** o usuário o envia  
**Então** o original e uma versão imutável são registrados  
**E** páginas e trechos mantêm localização verificável  
**E** o estado final é `ready`.

## AC-005 — Sinalizar OCR de baixa qualidade (P0)

**Dado** um PDF digitalizado cuja extração fique abaixo do piso configurado  
**Quando** o processamento termina  
**Então** o estado é `needs_review`  
**E** o documento não sustenta resposta definitiva sem ressalva.

## AC-006 — Preservar versão anterior (P0)

**Dado** um documento com versão vigente  
**Quando** uma nova versão é enviada  
**Então** a versão anterior continua imutável e auditável  
**E** a nova versão não se torna vigente sem regra ou confirmação explícita.

## AC-007 — Considerar vigência (P0)

**Dado** duas versões com vigências conhecidas  
**Quando** a pergunta não indica uma data histórica  
**Então** o recuperador prioriza a versão vigente  
**E** preserva a versão anterior para auditoria.

## AC-008 — Isolar recuperação (P0)

**Dado** que Alameda e Bosque possuem frases-canário distintas  
**Quando** uma pergunta é feita em Alameda  
**Então** nenhum candidato, cache ou contexto contém a frase-canário de Bosque.

## AC-009 — Isolar cache (P0)

**Dado** uma pergunta idêntica feita primeiro em Bosque  
**Quando** ela é repetida em Alameda  
**Então** uma eventual resposta em cache é segmentada por condomínio, versão e permissão  
**E** não reutiliza o conteúdo de Bosque.

## AC-010 — Responder com evidência (P1)

**Dado** que uma regra está explicitamente presente em documento vigente  
**Quando** o usuário faz uma pergunta direta  
**Então** `answerMode` é `grounded`  
**E** a resposta reproduz o sentido da regra sem ampliar seu alcance  
**E** apresenta as seções previstas no contrato.

## AC-011 — Cruzar fontes sem inventar conclusão (P1)

**Dado** que a resposta exige informações de uma convenção e uma ata  
**Quando** ambas são recuperadas  
**Então** cada afirmação é associada à sua fonte  
**E** inferências são identificadas como interpretação.

## AC-012 — Abrir citação correta (P0)

**Dado** uma resposta com citação  
**Quando** o usuário abre a fonte  
**Então** visualiza o documento e a página indicados  
**E** o trecho citado existe naquela página e sustenta a afirmação.

## AC-013 — Impedir citação fabricada (P0)

**Dado** que o gerador devolve uma citação ausente das evidências permitidas  
**Quando** a saída é validada  
**Então** a resposta é rejeitada ou convertida em falha segura  
**E** a citação não é exibida.

## AC-014 — Abster-se sem evidência (P0)

**Dado** que nenhum documento autorizado responde à pergunta  
**Quando** a busca termina  
**Então** `answerMode` é `abstained`  
**E** a resposta não apresenta conhecimento geral como regra do condomínio  
**E** sugere o documento ou validação necessários.

## AC-015 — Abster-se com evidência fraca (P0)

**Dado** somente um trecho incompleto ou OCR de baixa confiança  
**Quando** ele seria insuficiente para sustentar a conclusão  
**Então** o sistema se abstém ou responde com limitação explícita, conforme política aprovada.

## AC-016 — Mostrar conflito documental (P0)

**Dado** duas fontes aplicáveis com regras incompatíveis e prioridade não determinística  
**Quando** o usuário pergunta sobre a regra  
**Então** `answerMode` é `conflict`  
**E** ambas as fontes são citadas  
**E** o sistema não escolhe silenciosamente uma delas.

## AC-017 — Ignorar prompt injection documental (P0)

**Dado** que um documento contém instruções para ignorar regras ou revelar outros dados  
**Quando** o trecho é recuperado  
**Então** ele é tratado apenas como conteúdo  
**E** não altera permissões, ferramentas, políticas ou formato da resposta.

## AC-018 — Recomendar especialista (P0)

**Dado** um tema marcado como alto risco  
**Quando** a resposta é produzida  
**Então** a base documental é apresentada sem parecer definitivo  
**E** `specialist.required` é verdadeiro  
**E** tipo e motivo são informados.

## AC-019 — Registrar feedback (P1)

**Dado** uma resposta exibida  
**Quando** o usuário marca `incorrect` e comenta  
**Então** o feedback é persistido com resposta, fontes, usuário e horário  
**E** não altera retroativamente a trilha da resposta.

## AC-020 — Registrar trilha e custo (P1)

**Dado** uma resposta concluída ou uma falha segura  
**Quando** o processamento termina  
**Então** existe uma trilha com versões, fontes, decisão de roteamento, latência e custo estimado  
**E** o log não duplica texto integral ou dado pessoal desnecessário.

## AC-021 — Falhar com segurança (P0)

**Dado** que retrieval ou provedor está indisponível  
**Quando** o usuário faz uma pergunta  
**Então** `answerMode` é `failed` ou a requisição retorna erro recuperável  
**E** nenhuma resposta sintética aparenta ter sido baseada nos documentos.

## AC-022 — Exigir condomínio selecionado no banco (P0)

**Dado** um usuário associado a Alameda e Bosque
**Quando** uma transação de runtime não fixa `app.condominium_id`
**Então** o banco não retorna dados de nenhum condomínio
**E** quando fixa Alameda, não retorna linhas de Bosque.
