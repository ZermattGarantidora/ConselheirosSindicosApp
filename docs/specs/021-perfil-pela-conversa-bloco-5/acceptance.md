# Critérios de aceitação — Spec 021

## AC-2001 — Pedir contexto aos poucos

**Dado** que uma informação do síndico ou condomínio é necessária para ajudar  
**Quando** a Alvitra precisar dela  
**Então** faz uma pergunta natural por vez  
**E** não exige cadastro ou formulário.

## AC-2002 — Aprender somente declaração explícita

**Dado** uma pessoa que escreve “Meu nome é Ana Souza e o condomínio tem 84 unidades”  
**Quando** a mensagem é processada no contexto autorizado  
**Então** somente nome e quantidade de unidades são atualizados  
**E** uma pergunta ambígua ou um documento não altera o perfil.

**Dado** um condomínio já cadastrado como Residencial Alameda\
**Quando** o síndico confirma o uso de um documento identificado como Condomínio Bosque,
ou apenas relata/cita esse nome\
**Então** o nome salvo continua Residencial Alameda.\
**Quando** pede “Altere o nome do condomínio para Residencial Horizonte”\
**Então** somente esse pedido explícito autoriza a troca no contexto atual.\
**E** perguntas, negações, hipóteses e pedidos citados dentro de outra mensagem não renomeiam.

## AC-2003 — Isolar dados confirmados

**Dado** mais de um contexto de condomínio
**Quando** dados confirmados são salvos ou consultados
**Então** permanecem vinculados ao condomínio autorizado
**E** nenhum dado de perfil cruza para outro contexto.

## AC-2105 — Respeitar a forma de tratamento confirmada

**Dado** que a pessoa responde “Síndico” ou “Síndica” quando perguntada como prefere ser chamada,
inclusive nas variantes sem acento\
**Quando** o servidor confirma essa preferência na conversa\
**Então** a demonstração consegue gravar e restaurar o tratamento junto ao cadastro\
**E** não apresenta “Informe como você prefere ser chamado” para esse valor confirmado\
**E** a preferência não é usada para conceder papel ou permissão\
**E** saudações, frases ambíguas, caracteres de controle e dados de outro usuário mantêm suas recusas.

## AC-2104 — Lembrar os dados cadastrados no chat

**Dado** que um síndico sintético cadastrou o Residencial Aurora com 64 unidades pela API usada
na configuração da conversa, sem enviar documentos\
**Quando** pergunta o nome, a quantidade de unidades ou o que já informou sobre o condomínio\
**Então** o gateway recebe esses dados do perfil, com procedência cadastral e sem evidência documental inventada\
**E** a resposta gerada pode informá-los sem pedir novamente nome, unidades ou anexos.\
**E** isso continua válido em chat novo, depois de mais de oito turnos e com histórico desligado.

**Dado** outro condomínio ou outro usuário sem associação\
**Então** não recebe o perfil anterior. Campos extras enviados pelo cliente não substituem o cadastro.\
**E** uma falha de leitura ou perfil retornado com outro `condominiumId` impede gerar uma resposta.\
**E** regras, saldos e informações não cadastradas continuam exigindo evidência pertinente.\
**E** perfil, turnos, foco e contrato respeitam juntos 12.000 bytes, mantendo turnos inteiros e sem transmitir dados de contato.
