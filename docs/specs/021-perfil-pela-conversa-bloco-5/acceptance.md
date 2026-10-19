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

## AC-2003 — Isolar dados confirmados

**Dado** mais de um contexto de condomínio
**Quando** dados confirmados são salvos ou consultados
**Então** permanecem vinculados ao condomínio autorizado
**E** nenhum dado de perfil cruza para outro contexto.
