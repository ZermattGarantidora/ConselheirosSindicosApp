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

## AC-2003 — Mostrar dados confirmados

**Dado** um contexto autorizado com dados confirmados  
**Quando** a pessoa abre “Meus dados”  
**Então** vê os dados do síndico e do condomínio ativo  
**E** trocar de condomínio não mostra dados de outro contexto.
