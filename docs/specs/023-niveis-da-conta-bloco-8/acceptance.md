# Critérios de aceitação — Spec 023

## AC-2101 — Campo de nível

**Dado** uma conta persistente  
**Quando** a migration é aplicada  
**Então** existe nível inicial e data de cálculo sem alterar permissões.

## AC-2102 — Cálculo ajustável

**Dado** e-mail confirmado e condomínios ativos confirmados  
**Quando** a política é avaliada  
**Então** retorna nível determinístico conforme limiar configurável  
**E** não define oferta, preço ou bloqueio.
