# Critérios de aceitação — Spec 029

## AC-2901 — Variação reproduzível e citada

Dado dois valores sintéticos da mesma rubrica, condomínio e moeda em meses distintos, quando a comparação for executada, então retorna diferença absoluta em centavos, percentual determinístico e as duas fontes com documento, versão, página, trecho e offsets.

Variações fracionárias positivas e negativas são truncadas em duas casas, sem arredondamento
monetário ou uso de modelo. Valor anterior de um centavo e valor atual no limite inteiro seguro
não produzem percentual impreciso: retornam `precision_limit`, mantendo a diferença exata.

## AC-2902 — Denominador zero e ausência

Dado valor anterior zero ou rubrica presente em apenas um período, quando a comparação for executada, então o percentual é indisponível ou a rubrica fica marcada como ausente, sem variação inventada.

## AC-2903 — Incerteza e duplicidade

Dado OCR/extração marcada para revisão ou dois valores para a mesma rubrica e período, quando a comparação for executada, então a primeira vira limitação explícita e a segunda é recusada para revisão humana.

## AC-2904 — Isolamento na recuperação financeira

Dado valores sintéticos de dois condomínios, quando a seleção usar o contexto do condomínio A, então nenhum valor do condomínio B é devolvido, mesmo se período e rubrica coincidirem.

## AC-2905 — Avaliação separada

Dado a bateria sintética, quando o executor de eval rodar, então valida os casos determinísticos pelo código real e registra os casos semânticos para julgamento com rubricas, sem alegar revisão humana ou validação de provedor que não ocorreu.
