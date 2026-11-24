# Revisão do autor — pesquisa pública na demo

- Autor/revisor: Codex, IA; revisão não independente.
- Escopo: Spec 065, opt-in local autorizado pelo usuário para apresentação.
- P0/P1 identificados e pendentes neste delta: zero.
- Integração/lançamento: não autorizados por esta revisão.

Revisados integralmente os novos módulos shared/demo-web-research e answers/demo-web-research,
unitários e E2E. Conferidos os deltas do use case/server contra o snapshot anterior: a pesquisa
explícita pula memória/perfil/retrieval, escolhe apenas constantes públicas, usa gateway distinto
e impede replay seguro. A configuração/batch e o gateway que recebe PDFs mantêm web desabilitada.

Revisados os deltas de App.tsx e message-format: links oficiais HTTPS são React/texto, com
noopener/noreferrer/no-referrer; HTML e protocolos perigosos permanecem literais. Não foi
adicionado parser HTML, dependência ou tela. Formatação/negrito anterior foi conservado.

Revisados flag, comandos/documentação, spec/aceitação, ADR, rastreabilidade e relatório.
Alterações anteriores do workspace foram preservadas. Não há env/credencial no subprocesso
além da whitelist já existente do Codex; o prompt não recebe a pergunta livre nem contexto
privado. A aceitação exige URL realmente retornada por web_search, sem fingir citação de PDF.
O limite de seis operações é posterior à execução e está documentado sem promessa de teto de custo.

Os testes cobrem canários, configuração de produção, temas desconhecidos, falhas/eventos,
fontes/links, idempotência, gravação dos dois lados e controles de autorização 404/403. A
correção da expectativa 404 conserva o contrato de chat privado, com controle independente
de acesso sem condomínio; não foi relaxada a regra de autorização para aprovar o gate.

Gates: 2.062 testes, quatro coberturas acima de 80%, formatação/lint/TypeScript, 65 specs,
segredos e builds aprovados. Houve um probe público no Codex, um smoke pela API isolada e
outro no preview ativo, todos sem documentos privados. Um perfil/cinco PDFs restaurados e
cópias privadas temporárias removidas; histórico RAM descartado conforme aviso prévio.

Limite conhecido: URLs verificadas não substituem revisão especializada da interpretação.
Disponibilidade do Codex/fontes continua externa; falhas não simulam pesquisa nem migram para
API paga. Expansão de tópicos/domínios e uso público/remoto exigem decisão posterior.

[Resultados e ativação](../specs/065-pesquisa-web-demonstracao/results-2026-11-04.md).
