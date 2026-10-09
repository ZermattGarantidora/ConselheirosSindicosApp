# Critérios de aceitação — Spec 022

## AC-2201 — Raio-X do mês

Dado um pedido de análise de balancete com evidências autorizadas, quando a Alvitra formular a resposta, então o prompt exige até três achados prioritários e os estados `ok`, `atenção` ou `não foi possível verificar` nos pontos de conferência.

## AC-2202 — Comparação sem inferência indevida

Dado um pedido de comparação sem mês anterior comparável, quando a Alvitra responder, então ela não inventa números nem variação e pede especificamente o balancete do período faltante.

## AC-2203 — Segurança financeira e evidência

Dado um pedido de raio-X, quando não houver extrato ou evidência equivalente, então a Alvitra não afirma conciliação bancária; para risco relevante, orienta revisão humana e mantém citações restritas à evidência autorizada.
