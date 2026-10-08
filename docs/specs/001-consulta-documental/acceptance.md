# Critérios de aceitação — Spec 001

**Status:** implementação local B1–B6 validada com dados sintéticos
**Atualizado em:** 2026-09-24

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
**E** pode oferecer orientação geral formulada para a pergunta, claramente identificada como não confirmada nos documentos e sem citação
**E** sugere o documento ou validação necessários.

## AC-015 — Abster-se com evidência fraca (P0)

**Dado** somente um trecho incompleto ou OCR de baixa confiança  
**Quando** ele seria insuficiente para sustentar a conclusão  
**Então** o sistema se abstém da conclusão documental
**E** pode oferecer orientação geral sem fonte, com a limitação explícita e sem transformar o trecho fraco em regra confirmada.

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
**Então** o sistema tenta oferecer orientação geral sem fontes quando o provedor de IA continua disponível
**E** usa `answerMode: failed` ou retorna erro recuperável apenas quando nem essa orientação pode ser gerada com segurança
**E** nenhuma resposta sintética aparenta ter sido baseada nos documentos.

## AC-022 — Exigir condomínio selecionado no banco (P0)

**Dado** um usuário associado a Alameda e Bosque
**Quando** uma transação de runtime não fixa `app.condominium_id`
**Então** o banco não retorna dados de nenhum condomínio
**E** quando fixa Alameda, não retorna linhas de Bosque.

## AC-023 — Processar documento confirmado sem etapa manual oculta (P0)

**Dado** um PDF textual enviado durante o cadastro
**E** o usuário confirmou que o documento pode fundamentar respostas
**Quando** o upload persistido termina
**Então** a confirmação fica registrada na versão documental
**E** o processamento enfileirado é executado automaticamente no ambiente integrado de teste
**E** a versão pronta possui páginas e trechos recuperáveis sem o usuário iniciar um worker separado.

## AC-024 — Reconhecer perguntas factuais sem palavra-chave documental (P0)

**Dado** um documento confirmado que registra fatos do condomínio
**Quando** o usuário pergunta, por exemplo, “Qual é o endereço?”, “Quem foi eleita síndica?” ou “Qual é o valor da cota ordinária?”
**Então** a pergunta segue o fluxo de recuperação documental
**E** uma resposta afirmativa exige página e trecho verificáveis
**E** a ausência de evidência não produz um valor, nome, data ou decisão inventados
**E** uma eventual orientação geral apenas explica a limitação e como obter ou validar a informação.

## AC-025 — Manter resposta documental durante indisponibilidade do provedor (P0)

**Dado** que a recuperação retornou evidência suficiente e autorizada
**E** o provedor generativo está temporariamente indisponível ou sem cota
**Quando** a resposta é solicitada
**Então** falhas transitórias são repetidas de forma limitada dentro do orçamento total de tempo antes do fallback
**Então** o fallback local pode responder somente por extração dos trechos recuperados
**E** mantém citações e validação pós-geração
**E** informa que operou em modo documental local
**E** apresenta uma frase curta e completa, sem copiar um bloco bruto, começar ou terminar no meio de palavra ou misturar campos de tabela
**E** se abstém quando não consegue formular essa frase sem ampliar o sentido da evidência
**E** erros de autorização, busca, evidência ou contrato não são mascarados pelo fallback.

## AC-026 — Manter cada resposta no turno correto (P0)

**Dado** um turno concluído no chat
**Quando** o usuário envia uma nova pergunta
**Então** o turno concluído é preservado no histórico
**E** a resposta anterior deixa a área ativa antes de aparecer o estado de espera
**E** nenhuma resposta é exibida como se pertencesse à nova pergunta
**E** um segundo envio permanece bloqueado enquanto a consulta atual estiver em andamento
**E** uma confirmação sonora curta é iniciada sem bloquear o envio, mesmo que o áudio não esteja disponível
**E** uma resposta concluída com sucesso produz um segundo som, diferente do envio, sem tocar como sucesso em caso de falha.

## AC-027 — Evitar metadados repetidos na geração (P1)

**Dado** que o recuperador forneceu evidências autorizadas com documento, versão, página e trecho
**Quando** o gateway solicita uma resposta documental ao provedor
**Então** cada citação gerada precisa informar somente o `evidenceId`
**E** os demais campos da fonte são reconstruídos localmente a partir da evidência autorizada
**E** uma identificação inexistente continua sendo descartada pela validação
**E** a redução do conteúdo de saída não altera as citações verificáveis exibidas ao usuário.

## AC-028 — Responder de forma direta sem repetir blocos (P1)

**Dado** um cumprimento ou uma pergunta social simples
**Quando** o agente responde
**Então** usa somente uma frase breve e natural
**E** não apresenta passos genéricos, risco, pontos de atenção ou fontes.

**Dado** que o usuário pergunta, sem incluir um assunto condominial específico, “Como a Alvitra pode me ajudar?”
**Quando** o agente responde
**Então** explica brevemente que pode consultar e explicar documentos do condomínio
**E** não realiza busca documental nem mostra limitação, risco, ponto de atenção ou fonte.

**Dado** uma pergunta substantiva sem evidência documental suficiente
**Quando** o agente oferece orientação geral
**Então** a resposta começa pela orientação útil, sem introdução ou despedida
**E** usa no máximo três frases curtas ou dois passos quando uma sequência for necessária
**E** a limitação documental aparece uma única vez nos pontos de atenção
**E** nenhum bloco vazio de fontes é exibido.

**Dado** uma resposta documental fundamentada de risco baixo ou médio
**Quando** a resposta é exibida
**Então** não são criados pontos de atenção nem próximo passo genéricos
**E** a resposta começa pela conclusão e inclui um ou dois detalhes úteis presentes na evidência, quando existirem
**E** permanece com até 90 palavras, sem alongar o texto com conteúdo genérico
**E** qualquer condição indispensável para compreender a conclusão aparece de forma curta na resposta direta
**E** a interface não apresenta cada parte da resposta como uma mensagem separada.
**E** a interface não adiciona etiquetas rotineiras de “Com base nos documentos” ou “Risco baixo”; as fontes verificáveis são o sinal da base documental.

**Dado** uma abstenção, falha, conflito, risco alto, validação profissional ou degradação relevante do serviço
**Quando** uma ressalva ou ação for essencial
**Então** no máximo um ponto de atenção e um próximo passo são exibidos
**E** eles aparecem dentro do mesmo cartão da resposta direta.
**E** um indicador visual adicional só aparece quando identifica um conflito, uma falha, risco alto ou uma validação humana relevante.

## AC-029 — Consultar legislação oficial como base principal (P0)

**Dado** um usuário com acesso ativo a qualquer condomínio
**E** uma versão vigente da Constituição Federal importada de fonte oficial
**Quando** ele faz uma pergunta substantiva
**Então** a recuperação consulta a legislação compartilhada e os documentos do condomínio autorizado
**E** uma fonte legal relevante tem sua origem identificada como legislação oficial
**E** documento interno e legislação não são confundidos nem misturados com outro condomínio
**E** a citação legal aponta para título, versão, página e trecho verificáveis
**E** um trecho legal irrelevante não é exibido somente para preencher a resposta
**E** uma nova versão legal preserva a anterior e passa por importação administrativa, sem upload do usuário.

## AC-030 — Enviar e identificar documento pela conversa (P1)

**Dado** um usuário autorizado com permissão de envio no condomínio selecionado
**Quando** ele escolhe um PDF válido pelo botão de documento na conversa
**Então** o arquivo fica somente anexado localmente, com nome visível
**E** não é enviado até que o usuário clique na seta de envio da conversa
**Quando** ele clica na seta de envio
**Então** o arquivo é enviado somente ao condomínio ativo
**E** a conversa mostra que o usuário enviou o documento, com seu nome
**E** a conversa confirma que a leitura foi iniciada sem afirmar que o documento já está pronto
**E** após a extração, sinais textuais suficientes classificam o documento como convenção,
regimento interno, ata ou contrato
**E** ausência de sinal suficiente mantém o tipo como `other`
**E** conteúdo do PDF não altera permissões, instruções ou o escopo do condomínio.

## AC-031 — Visualizar e remover documento pelo síndico (P0)

**Dado** um usuário autorizado no condomínio selecionado
**Quando** ele abre um PDF no catálogo
**Então** o original é servido do banco de dados somente após validar o contexto autorizado
**E** nenhum arquivo local é necessário para a visualização.

**Dado** um síndico autorizado com permissão de envio no condomínio selecionado
**E** um PDF registrado nesse condomínio, independentemente de quem o enviou
**Quando** ele confirma a remoção explícita
**Então** o documento deixa de integrar a memória consultável do condomínio
**E** a interface informa que ele pode recuperá-lo por 30 dias
**E** o PDF original permanece protegido e recuperável até o prazo
**E** um processo interno apaga original, derivados de busca e evidências do banco ativo após 30 dias sem recuperação
**E** perguntas, respostas, claims, feedback e citações históricas permanecem no chat sem alteração do conteúdo
**E** a citação informa que o original foi removido e mantém o trecho que já aparecia na conversa
**E** o PDF original não pode mais ser aberto e o documento não pode ser recuperado pela busca
**E** a ação não alcança documento nem PDF de outro condomínio.

**Dado** que o síndico envia uma nova ata e existe outra ata registrada no condomínio
**Quando** ele confirma o envio
**Então** a interface pergunta se deseja remover a ata anterior
**E** não a remove sem essa confirmação.
