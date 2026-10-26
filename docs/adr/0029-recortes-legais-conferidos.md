# ADR 0029 — Recortes legais conferidos e cópias de consulta

**Status:** aceito para implementação local pela autorização de 22/10/2026
**Data:** 2026-10-22

## Contexto

O usuário autorizou incorporar material necessário cuja existência e origem pudessem ser
confirmadas. O acervo ctresb/leis ajuda na descoberta, mas sua conversão não certifica vigência.
O acesso aos PDFs oficiais falhou; os textos oficiais em HTML puderam ser conferidos no navegador.
Inventar a página do HTML ou apresentar uma cópia própria como PDF oficial violaria o briefing.

## Decisão

Complementar o ADR 0016 com uma edição pequena de recortes literais conferidos no Planalto.
Preservar o texto capturado, dispositivos, origem, data, relações com leis modificadoras e limites.
Gerar cópias de consulta paginadas, determinísticas, identificadas como derivadas Alvitra.
O hash da captura não é apresentado como hash dos bytes originais do portal. O PDF tem hash próprio,
e a extração das suas páginas é a base única dos trechos e das citações.

A conferência é válida entre 22/10/2026 e 21/11/2026, limite exclusivo. Isso limita a evidência
disponível, sem declarar prazo de vigência legal. Consultas históricas não usam esta edição como
redação contemporânea ao fato. Cópias antigas permanecem verificáveis para auditoria.

A demonstração usa a edição pública imutável em composição com a memória privada. A persistência
reutiliza `app.legal_*` por importação administrativa e acrescenta os campos de conferência.
O runtime não escreve na base legal. Não há dependência nova, provedor novo, coleta automática,
treinamento, redistribuição de documentos de clientes ou mudança do prompt.

## Consequências

- As citações indicam página da cópia de consulta, nunca do Diário Oficial.
- Lei e documento privado continuam distinguíveis; associação vigente continua obrigatória.
- A edição expira para novas respostas até reconferência explícita.
- O corpus é parcial: outras normas e dispositivos exigem nova curadoria, sem conclusão por analogia.
- O importador antigo da Constituição não passa a ser considerado atualizado por esta decisão.
- Reproduzir a paginação requer o gerador local; comparar PDF, páginas e manifesto é um gate obrigatório.

## Alternativas rejeitadas

Importar todo o GitHub: custo e qualidade sem controle. Usar HTML como se tivesse páginas oficiais:
procedência enganosa. Inventar ou resumir a lei por IA: conteúdo sem correspondência literal.
Bloquear toda orientação por falta de PDF original: a cópia identificada preserva verificabilidade
sem confundir sua origem com a publicação oficial.
