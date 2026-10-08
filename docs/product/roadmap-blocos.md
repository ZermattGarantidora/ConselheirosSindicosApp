# Cronograma e visão de futuro por blocos

**Status:** referência operacional do projeto  
**Atualizado em:** 2026-10-06

Este documento explica o caminho do produto em blocos. Cada bloco representa uma etapa compreensível do trabalho. A previsão abaixo é indicativa: um bloco só é dado como concluído quando o código, os testes, a segurança e a documentação estiverem coerentes.

## Em que ponto estamos

Os blocos **B1** a **B6** foram concluídos na fatia local com dados sintéticos. A separação entre condomínios, o fluxo documental, a recuperação, as respostas fundamentadas, o feedback, a auditoria e os 20 evals estão validados. O desenvolvimento segue por módulos enquanto o usuário testa; dados reais externos continuam sujeitos aos gates de privacidade e segurança.

## Cronograma

| Bloco | Quando, aproximadamente | O que faremos | O que ficará visível ao final |
|---|---|---|---|
| **B1 — Separar os condomínios** ✅ | Concluído em 02/09/2026 | Garantir que cada condomínio tenha seus próprios dados e que ninguém veja informações sem autorização. | Uma pessoa pode trabalhar com mais de um condomínio sem misturar as informações. |
| **B2 — Fechar a base atual** ✅ | Concluído em 02/09/2026 | Rodar os testes, revisar as alterações e deixar a fundação pronta para receber as próximas partes. | Uma base de desenvolvimento confiável para continuar construindo. |
| **B3 — Colocar os documentos para dentro** ✅ | Concluído em 03/09/2026 | Receber arquivos, guardar o original, ler PDFs, reconhecer documentos escaneados e controlar versões e datas de validade. | O síndico consegue enviar documentos e saber se estão prontos para consulta ou precisam de revisão. |
| **B4 — Encontrar os trechos certos** ✅ | Concluído em 04/09/2026 | Criar a busca que procura somente dentro do condomínio escolhido e encontra as páginas mais relevantes. | O sistema localiza a regra ou decisão relacionada à pergunta. |
| **B5 — Criar o chat confiável** ✅ | Concluído em 09/09/2026 | Permitir perguntas e continuações em linguagem natural, montar respostas com fontes, reconhecer falta de informação, mostrar conflitos e recomendar especialista quando necessário. | O síndico conversa sem aprender comandos, recebe uma resposta direta, confere a fonte e entende quando não há segurança para responder. |
| **B6 — Aprender com o uso** ✅ | Concluído em 09/09/2026 | Registrar avaliações, erros, facilidade de uso, tempo de resposta e custo; executar os casos de teste e corrigir problemas. | Sabemos se as respostas estão corretas, se a conversa é fácil, se as fontes ajudam e quanto custa cada resposta aprovada. |
| **B6.1 — Proteger a conta** ✅ | Concluído em 08/10/2026 | Verificar e-mail, recuperar e trocar senha, oferecer TOTP MFA e permitir que a pessoa revise e encerre sessões por dispositivo. | A conta tem recuperação segura, segundo fator opcional e controle explícito dos dispositivos conectados. |
| **B7 — Garantir leitura integral de PDFs** 🟡 | Próxima fatia | Ler todas as páginas, preservar linhas e tabelas, medir completude e impedir que páginas vazias ou ilegíveis sejam tratadas como prontas. | O síndico vê quantas páginas foram lidas, a qualidade e quais páginas exigem revisão. |
| **B7.1 — Interpretar fotos do condomínio** ⏸️ | Depois do B7 | Receber fotos pelo chat com envio explícito, produzir descrição visual e texto visível rotulados como interpretação de IA e indexar vetor multimodal isolado no PostgreSQL. A integração Gemini exige faturamento ativo, aviso claro e negação por padrão; fotos reais/pilotos continuam bloqueadas pelos gates de privacidade. | O síndico pode perguntar sobre uma imagem armazenada no condomínio, conferir a imagem original e distinguir observação de IA de evidência textual. |
| **B8.1 — Conferir o balancete** ⏸️ | Depois do B7.1 | Identificar tipo e competência, extrair valores com origem, permitir correção humana e recalcular receitas, despesas e saldo. | Um balancete produz números conferíveis e cálculos reproduzíveis. |
| **B8.2 — Analisar as finanças** ⏸️ | Depois do B8.1 | Organizar categorias, fornecedores, duplicidades, variações, orçamento versus realizado, perguntas naturais e documentos ausentes. | O síndico entende o período e abre a evidência de cada conclusão. |
| **B8.3 — Preparar a prestação de contas** ⏸️ | Depois do B8.2 | Montar rascunho, índice de evidências, impressão, feedback e auditoria final. | Um rascunho completo fica pronto para revisão humana, nunca para aprovação automática. |
| **B9 — Completar o produto por módulos** ⏸️ | Após cada fatia aprovada | Evoluir obrigações, comunicados, demais documentos, integrações e fluxo comercial em módulos end-to-end, testados continuamente pelo usuário. | O aplicativo cresce sem depender de uma etapa formal de piloto para liberar a próxima funcionalidade. |

O cronograma começa no ponto atual e pode ser ajustado conforme os testes. Se um bloco encontrar um problema de segurança, a prioridade será corrigi-lo antes de avançar.

## Visão de futuro em linguagem simples

No futuro, o síndico abrirá o sistema, escolherá o condomínio e poderá perguntar algo como:

> “O que a convenção diz sobre aluguel por temporada?”

O sistema procurará nos documentos autorizados daquele condomínio e responderá em cinco partes:

1. uma resposta curta e direta;
2. o documento, a versão, a página e o trecho usados;
3. pontos que merecem cuidado;
4. um próximo passo sugerido;
5. um aviso para consultar advogado, contador, engenheiro ou outro especialista quando o assunto exigir.

Se os documentos não forem suficientes, o sistema dirá isso claramente. Se duas fontes trouxerem regras diferentes, mostrará as duas em vez de escolher uma escondido.

Com o tempo, o mesmo lugar também ajudará o síndico a:

- acompanhar vencimentos, manutenções e obrigações;
- lembrar o que está atrasado ou próximo do prazo;
- preparar rascunhos de comunicados, sempre para aprovação humana;
- resumir atas, convenções e contratos;
- guardar a memória das decisões do condomínio;
- identificar problemas que se repetem;
- trabalhar com vários condomínios sem misturar seus dados.

Para o síndico, a experiência deve ser fácil: fazer uma pergunta, conferir a fonte e decidir o próximo passo. O produto pode ser sofisticado, mas a complexidade ficará por trás do sistema, que usará o recurso mais econômico capaz de dar uma resposta segura e registrará como chegou a cada conclusão.

## O que o produto não pretende virar agora

O projeto não começa tentando substituir o sistema inteiro de administração do condomínio. Permanecem fora do início contabilidade completa, boletos e banco, portaria, aplicativo completo para moradores, marketplace de fornecedores, envio automático de mensagens e decisões irreversíveis.

Essas escolhas mantêm o foco na pergunta principal: **o síndico consegue encontrar uma informação confiável e agir com mais segurança e menos perda de tempo?**

## Critério para avançar

Por decisão explícita de produto em 2026-09-24, um piloto formal não bloqueia mais o avanço do
desenvolvimento. Cada módulo pode seguir quando sua fatia vertical estiver utilizável, os testes e
gates de segurança passarem e o usuário puder testá-la no aplicativo. As métricas abaixo continuam
úteis para validar o produto durante o uso:

- voltam a usar o sistema semanalmente;
- economizam tempo de forma perceptível;
- confiam nas respostas porque conseguem conferir as fontes;
- aceitam pagar um preço acessível que ajude a cobrir o custo do serviço;
- geram um custo sustentável por condomínio;
- e, sem pressão, parte deles solicita conhecer ou simular os serviços da Zermatt.

O principal resultado econômico do produto será o número de oportunidades comerciais qualificadas e consentidas entregues ao time comercial. Recorrência, confiança, precisão e facilidade de uso permanecem condições obrigatórias, porque são elas que sustentam a geração dessas oportunidades ao longo do tempo.

Ausência desses sinais orienta ajustes, mas não impede construir a próxima fatia aprovada. Falhas de
isolamento, autorização, proteção de dados, cálculo ou evidência continuam bloqueando a entrega.

O fluxo comercial não muda os blocos B4, B5 e B6. A aproximação com a Zermatt continua sendo uma opção separada, acionada pelo próprio usuário e sem uso oculto dos documentos para prospecção.
