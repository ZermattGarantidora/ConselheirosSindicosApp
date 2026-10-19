# Critérios de aceitação — Spec 030

## AC-3009 — Divergência dentro da mesma versão (P0)

Dadas duas regras conhecidas distintas com a mesma chave explícita de assunto e categoria na mesma versão, quando analisadas, então ambas são preservadas e a divergência é sinalizada, sem escolher uma silenciosamente.

## AC-3008 — Rótulos naturais sem classificação universal (P0)

Dado cabeçalho de ata, convenção, regimento ou contrato e rótulos naturais explícitos, quando o adaptador lê a página, então preserva o trecho inteiro com offsets em code points. Proposta não vira deliberação; texto livre sem rótulo não vira fato classificado; artigos de documentos diferentes não são tratados como mesmo assunto automaticamente.

**Status:** aprovada para implementação local  
**Atualizado em:** 2026-10-16

## AC-3001 — Ata estruturada e citável (P0)

**Dado** fatos sintéticos de proposta, deliberação, votação, quórum registrado/exigido, responsável e prazo  
**Quando** a análise é executada  
**Então** cada fato preserva fonte verificável  
**E** a saída não declara que o quórum foi atingido.

## AC-3002 — Regra com condição e exceção (P0)

**Dado** artigo, regra, condição e exceção sintéticos da convenção ou do regimento  
**Quando** a análise é executada  
**Então** as quatro categorias permanecem distintas e citáveis  
**E** não há conclusão de validade jurídica.

## AC-3003 — Contrato incompleto (P0)

**Dado** contrato sintético com reajuste desconhecido e demais cláusulas citáveis  
**Quando** a análise é executada  
**Então** reajuste fica `unknown` e sem valor  
**E** a limitação declara que a base não foi completada por inferência.

## AC-3004 — Conflito sem resolução silenciosa (P0)

**Dado** duas fontes datadas com regras distintas para o mesmo assunto  
**Quando** a análise é executada  
**Então** devolve um conflito com ambas as fontes e datas  
**E** não escolhe uma regra prevalente.

## AC-3005 — Autorização, tenant e evidência (P0)

**Dado** contexto sem `document:read`, fonte incompleta ou fonte de outro condomínio  
**Quando** a análise é solicitada  
**Então** a operação é recusada sem produzir achado documental.

## AC-3006 — Página anotada e autorizada (P0)

**Dado** página sintética autorizada com linha que declara literalmente tipo, assunto e categoria  
**Quando** `normativeFactsFromPages` é executado  
**Então** devolve fato com documento, versão, página, trecho, offsets, método, qualidade e incerteza  
**E** não calcula quórum, validade, vigência ou prevalência.

## AC-3007 — Texto livre e qualidade incerta (P0)

**Dado** texto sem os rótulos completos ou página OCR com qualidade inferior a 1  
**Quando** o adaptador é executado  
**Então** o texto livre não gera fato  
**E** a linha anotada de qualidade incerta fica `needs_review`, sem valor afirmado e sem suportar estado `known`.
