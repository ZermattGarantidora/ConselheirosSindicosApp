# Critérios de aceitação — Spec 037

## AC-3701 — Nomes diferentes

**Dado** Residencial Alameda selecionado e arquivo que identifica Condomínio Bosque no título ou cabeçalho  
**Quando** termina a leitura  
**Então** o chat exibe ambos os nomes e pede confirmação para Alameda  
**E** a pergunta é uma fala gerada da Alvitra e a resposta usa o compositor normal, sem botões de sim/não ou cartão de aviso\
**E** o arquivo permanece indisponível para consultas e análise enquanto aguarda.

## AC-3702 — Equivalência e ausência de identificação

**Quando** há apenas variação de caixa, acento, pontuação ou prefixo genérico  
**Então** o envio prossegue sem confirmação extra.  
**E** cabeçalhos com o mesmo nome seguidos de “Outubro de 2026”, “Setembro 2026” ou “10/2026” prosseguem sem confirmação.\
**E** o título `Convencao_Condominio_Jardim_do_Horizonte_Preenchida.pdf` com cabeçalho `CONDOMÍNIO JARDIM DO HORIZONTE` não gera confirmação para o condomínio cadastrado “Condomínio Jardim do Horizonte”.\
**Mas** um nome adicional como “Norte” continua sendo divergência quando o cabeçalho identifica apenas o condomínio cadastrado.\
**Quando** não há nome explícito legível ou há somente menção incidental no corpo  
**Então** não inventa pertencimento nem uma divergência.

## AC-3703 — Decisão contextual

**Quando** a pessoa confirma para a versão pendente autorizada  
**Então** o documento pode ser consultado se os demais critérios de leitura e vigência permitirem  
**E** a mensagem junto do anexo pode ser consultada uma vez.  
**E** o nome, perfil e contexto selecionados permanecem idênticos aos anteriores à confirmação\
**E** a Alvitra comunica a decisão e limitações restantes na conversa.\
**E** uma versão liberada e elegível recebe raio-X local automaticamente, inclusive sem pergunta (AC-4504).\
**Quando** cancela  
**Então** o arquivo continua bloqueado e pode trocar o condomínio e reenviar, sem realocação automática.

## AC-3704 — Isolamento e retomada

**Quando** outro tenant, pessoa sem upload, associação revogada, versão antiga ou documento removido tenta confirmar  
**Então** a operação é negada sem liberar dados.  
**E** a pendência é retornada no catálogo após recarregar e a decisão no PostgreSQL registra o autor.

## AC-3705 — Fontes não confiáveis e revisão

**Dado** instruções hostis no documento, nomes contraditórios, OCR parcial ou vigência pendente  
**Então** nenhuma instrução altera contexto ou autorização  
**E** sinais explícitos divergentes pedem confirmação  
**E** confirmar pertencimento não remove revisão de leitura ou confirma vigência.

## AC-3706 — Conversa gerada e falha segura

**Quando** a leitura termina, requer confirmação, é confirmada ou tem seu uso cancelado\
**Então** a Alvitra conversa sobre o estado autorizado; o provedor recebe somente enums e marcadores\
**E** nomes e título permanecem locais como dados, sem poder alterar cadastro ou permissões.\
**Quando** o provedor falha, a associação é revogada ou o estado muda durante a geração\
**Então** nenhuma fala obsoleta ou fabricada é apresentada como resposta da Alvitra\
**E** o bloqueio documental e a mensagem original são preservados.

## AC-3707 — Decisão digitada e recuperável

**Dado** um arquivo com divergência real e pendente na conversa autorizada\
**Quando** a pessoa digita uma aceitação inequívoca, como “sim, pode usar”, ou uma recusa, como “não usar este arquivo”\
**Então** a decisão vale somente para a pendência atual e seu texto original aparece no histórico recuperado\
**E** a fala gerada continua no fluxo da conversa; não há botões de decisão\
**E** pergunta, ambiguidade, negação conflitante, aspas com exemplo ou conteúdo de documento não confirmam a versão\
**E** retentativa idempotente não duplica a decisão nem libera outro condomínio/versão.

**Dado** mais de uma divergência real no mesmo envio\
**Então** somente a pendência atual aguarda resposta, e a próxima fala é apresentada depois da decisão\
**E** reabrir um documento pela biblioteca mantém a ordem da fila e o vínculo com o lote.
