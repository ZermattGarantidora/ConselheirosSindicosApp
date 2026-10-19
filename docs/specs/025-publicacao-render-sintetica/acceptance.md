# Critérios de aceitação — Spec 025

## AC-2501 — Demonstração sem dados reais

**Dado** o serviço configurado no Render  
**Quando** ele é iniciado  
**Então** usa `DEMO_MODE=true`, não recebe `DATABASE_URL` e atende somente dados sintéticos.
Sem autorização operacional, não recebe chave de IA; a exceção do ADR 0025 permite somente
o segredo Gemini no serviço autorizado, sem chave no build, nos logs ou no GitHub.

## AC-2502 — Interface e API na mesma origem

**Dado** o build web disponível  
**Quando** a pessoa abre a URL pública ou uma rota do navegador  
**Então** recebe o cliente React pela mesma origem que atende `/v1` e `/health`.

## AC-2503 — Saúde verificável

**Dado** uma implantação concluída  
**Quando** o Render consulta `/health`  
**Então** recebe `200` e a interface pode ser aberta para teste manual.

## AC-2504 — Publicação e conversa conferidas

**Dado** o commit aprovado integrado à `main` e a autorização operacional do ADR 0025  
**Quando** a publicação termina  
**Então** o Render identifica esse commit e `/v1/runtime` informa `aiProvider: gemini`  
**E** a página apresenta “Nome de usuário” antes do chat  
**E** uma identidade fictícia nova recebe pergunta gerada sobre o nome de tratamento, seguida da quantidade de condomínios, nome e unidades  
**E** ao retornar com o mesmo usuário não repete o cadastro  
**E** as chamadas reais, limitações e resultado observado são registrados sem credenciais.

Falha/ausência de chave não pode ser contada como teste de conversa aprovado; a interface
degradada sem fala fictícia segue AC-2706. Não habilitar dados reais ou ampliar permissões.
