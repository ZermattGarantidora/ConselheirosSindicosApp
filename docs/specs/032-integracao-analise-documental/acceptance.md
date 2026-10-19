# Critérios de aceitação — Spec 032

## AC-3201 — Comparação no turno

Dadas páginas processadas de dois balancetes sintéticos autorizados, quando a pergunta informa dois meses AAAA-MM, então o endpoint retorna diferenças exatas com ambas as fontes e o chat exibe o relatório calculado.

## AC-3202 — Limite sem fabricação

Dado período ausente, rubrica duplicada ou leitura incerta, quando o relatório é produzido, então não inventa números e explicita a limitação. Dois meses iguais não constituem comparação.

## AC-3203 — Autorização e ciclo de vida

Dado outro condomínio, documento removido, versão pendente ou acima dos limites, quando a leitura ocorre, então nenhum trecho inelegível participa. A análise acima do limite falha integralmente, sem publicação parcial.

## AC-3204 — Normativo e degradação

Dado documento com rótulos explícitos e fonte completa, quando a análise ocorre, então preserva os achados e limitações da Spec 030. Falha do reader retorna relatório indisponível, sem quebrar a resposta gerada nem expor erro interno.

## AC-3205 — Cálculo e referências sem julgamento de IA

Dado relatório de páginas autorizadas, quando a conferência local é executada, então citações
com documento, versão, título, página, texto ou offsets adulterados são recusadas; caracteres
fora do BMP usam offsets em code points. Outra origem/condomínio, versão duplicada e página
duplicada também falham, sem seleção silenciosa. Uma única citação inválida impede publicar
o relatório inteiro. O caminho HTTP responde com relatório indisponível sem erro interno.

Dado dois balancetes elegíveis e gateway de conversa simulado que falha, quando a pergunta
chega ao endpoint, então o relatório ainda calcula a diferença correta com duas fontes.
O gateway não é repetido para fazer o cálculo. Testes diretos de cálculo e conferência não
usam rede ou gateway; mantêm ausência de permissão, remoção e isolamento como regras locais.
