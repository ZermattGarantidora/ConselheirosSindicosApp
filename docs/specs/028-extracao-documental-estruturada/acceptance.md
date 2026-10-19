# Critérios de aceitação — Spec 028

**Status:** aprovada para implementação local  
**Atualizado em:** 2026-10-19

## AC-2801 — Procedência de rubrica (P0)

**Dado** um balancete textual sintético autorizado com uma rubrica e um valor BRL inequívocos  
**Quando** o processamento termina  
**Então** o campo contém condomínio, documento, versão, página, offsets, trecho, método e incerteza  
**E** os offsets são contados em code points  
**E** `amountMinor` é uma string inteira exata.

## AC-2802 — Ambiguidade bloqueia extração financeira (P0)

**Dado** uma linha com dois valores monetários ou um período conflitante  
**Quando** o extrator a avalia  
**Então** não publica uma rubrica financeira como se a associação fosse certa  
**E** registra aviso e estado desconhecido ou em revisão.

## AC-2806 — Qualidade e moeda inseguras (P0)

**Dado** página com qualidade abaixo de 0,7, valor negativo, entre parênteses ou token monetário incompleto  
**Quando** o extrator a avalia  
**Então** não produz período ou tipo em estado `known` nem transforma o número em valor positivo  
**E** registra a incerteza ou o aviso verificável.

Regressões obrigatórias: sinais ASCII e tipográficos (`−`, `‒`, `–`, `—`, `―`, `﹣`, `－`) antes de `R$` e entre a moeda e o número, incluindo páginas oriundas de OCR. Um controle positivo com hífen interno na rubrica continua extraindo o valor e preservando a fonte original.

## AC-2803 — Período não é vigência (P0)

**Dado** um mês financeiro extraído  
**Quando** o contrato é produzido  
**Então** ele fica somente em `financialPeriod`  
**E** não altera vigência da versão documental.

## AC-2804 — Tipos conservadores (P1)

**Dado** texto com sinal direto de ata, convenção ou contrato, ou sem sinal suficiente  
**Quando** a identificação ocorre  
**Então** o tipo é conhecido somente no primeiro caso  
**E** o segundo fica explicitamente desconhecido.

## AC-2805 — Integração escopada (P0)

**Dado** um job de documento autorizado  
**Quando** o processador salva seu resultado em memória  
**Então** o resultado estruturado mantém o mesmo `condominiumId` e as fontes não podem apontar para outra versão.
