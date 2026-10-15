# Critérios de aceitação — Spec 025

## AC-2501 — Demonstração sem dados reais

**Dado** o serviço configurado no Render  
**Quando** ele é iniciado  
**Então** usa `DEMO_MODE=true`, não recebe `DATABASE_URL` nem chave de IA e atende somente dados sintéticos.

## AC-2502 — Interface e API na mesma origem

**Dado** o build web disponível  
**Quando** a pessoa abre a URL pública ou uma rota do navegador  
**Então** recebe o cliente React pela mesma origem que atende `/v1` e `/health`.

## AC-2503 — Saúde verificável

**Dado** uma implantação concluída  
**Quando** o Render consulta `/health`  
**Então** recebe `200` e a interface pode ser aberta para teste manual.
