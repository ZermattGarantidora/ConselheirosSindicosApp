# Critérios de aceitação — Spec 045

## AC-4501 — Recebimento antes da leitura

Dado upload autorizado com processamento pendente, quando o servidor registra o original, então a interface solicita a fala `received` antes de acompanhar a leitura. A fala não usa páginas e não afirma análise concluída; indisponibilidade não interrompe o processamento.

## AC-4502 — Arquivo sem pergunta

Dado arquivo legível autorizado e pronto, quando a interface acompanha o término do processamento, então solicita automaticamente o resumo local da versão exata, apresenta dados úteis e fontes, sem exigir texto no envio nem pedir genericamente o que fazer. Nenhum texto, título ou nome documental é enviado ao modelo, inclusive com o relatório disponível. Outros documentos do tenant não participam.

Exceção autorizada pela Spec 049: balancetes recebem conferência completa dos dez pontos com histórico e apoios elegíveis do mesmo condomínio, sem nova pergunta.

## AC-4503 — Segurança e validação

Dado documento de outro tenant, removido, revisão pendente, vigência pendente, ausência de permissão ou autorização revogada durante geração, então nenhum resumo factual é devolvido. Citação inexistente, página adulterada, conteúdo hostil e ausência de evidência suficiente falham de modo seguro. Limites de leitura ou de entrada são explícitos.

## AC-4504 — Confirmação e pergunta preservadas

Dado arquivo divergente com ou sem pergunta, quando a pessoa confirma seu uso, então o resumo é produzido somente se a versão ficar elegível; a pergunta original é respondida depois. Cancelamento não usa páginas. Nome e perfil não mudam.

## AC-4505 — Conteúdo proporcional e interface

Dado balancete, ata, contrato, convenção ou arquivo genérico sintético, então a tarefa orienta dados pertinentes ao tipo, limitações e próximo passo; não inventa comparações. Fontes exibem documento, versão, página e trecho abríveis, conteúdo é escapado, e resultado tardio não aparece em outro chat.
