# Revisão do autor — requisito de histórico completo

**Data:** 2026-10-29.  
**Estado:** decisão de produto documentada; implementação e validação completas pendentes.

O usuário pediu salvar também as falas da Alvitra e selecionou “As duas coisas” ao distinguir
histórico consultável e uso das respostas anteriores na continuação. Esclareceu que o produto
final deve guardar ambos os lados e que ainda não conhecia a limitação de reinício dos testes.

A leitura do código confirma que `AnswerPersistence` salva perguntas/respostas normais, com
implementações em RAM e PostgreSQL; o servidor local seleciona RAM no modo de demonstração.
A configuração e as falas sobre documentos usam estados separados em `App.tsx`, sem cobertura
completa no histórico. O replay atual de respostas documentais é restrito pelo ADR 0032.

A mudança desta etapa é documental: torna conservação completa/durável e recuperação um gate
explícito de lançamento, no briefing e MVP, e detalha os critérios na Spec 058. Mantém a
volatilidade de teste e distingue histórico salvo, contexto da IA e evidência documental.
Todas as lacunas foram registradas como pendentes na aceitação e na rastreabilidade.

Revisão integral do diff desta etapa contra as cópias em
`.local/chat-history-requirement-baseline/`: sem divergência silenciosa do briefing, sem nova
dependência, provedor, política de retenção ou dado real em teste. Alterações de outras tarefas
preservadas. Nenhum código de runtime, banco ou prompt foi modificado; a API não foi reiniciada
e nenhum conteúdo foi enviado a modelo nesta etapa. A definição de requisito não é apresentada
como funcionalidade implementada ou teste de durabilidade aprovado.

Gates aplicáveis: validação estrutural das specs e inspeção de whitespace. Testes de código
não são repetidos para uma mudança exclusivamente documental. As evidências de implementação,
integração, recuperação e evals de continuidade descritas na Spec 058 continuam obrigatórias
antes de sua conclusão e do lançamento.

Resultado desta etapa: gate de visão aprovado para 58 specs e `git diff --check` sem erros
de whitespace. Nenhum desses checks é evidência de implementação ou recuperação de mensagens.
