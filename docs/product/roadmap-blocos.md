# Cronograma e visão de futuro por blocos

**Status:** referência operacional do projeto  
**Atualizado em:** 2026-09-09

Este documento explica o caminho do produto em blocos. Cada bloco representa uma etapa compreensível do trabalho. A previsão abaixo é indicativa: um bloco só é dado como concluído quando o código, os testes, a segurança e a documentação estiverem coerentes.

## Em que ponto estamos

Os blocos **B1** a **B6** foram concluídos na fatia local com dados sintéticos. A separação entre condomínios, o fluxo documental, a recuperação, as respostas fundamentadas, o feedback, a auditoria e os 20 evals estão validados; GitHub/CI remoto, piloto e dados reais continuam fora deste escopo.

## Cronograma

| Bloco | Quando, aproximadamente | O que faremos | O que ficará visível ao final |
|---|---|---|---|
| **B1 — Separar os condomínios** ✅ | Concluído em 02/09/2026 | Garantir que cada condomínio tenha seus próprios dados e que ninguém veja informações sem autorização. | Uma pessoa pode trabalhar com mais de um condomínio sem misturar as informações. |
| **B2 — Fechar a base atual** ✅ | Concluído em 02/09/2026 | Rodar os testes, revisar as alterações e deixar a fundação pronta para receber as próximas partes. | Uma base de desenvolvimento confiável para continuar construindo. |
| **B3 — Colocar os documentos para dentro** ✅ | Concluído em 03/09/2026 | Receber arquivos, guardar o original, ler PDFs, reconhecer documentos escaneados e controlar versões e datas de validade. | O síndico consegue enviar documentos e saber se estão prontos para consulta ou precisam de revisão. |
| **B4 — Encontrar os trechos certos** ✅ | Concluído em 04/09/2026 | Criar a busca que procura somente dentro do condomínio escolhido e encontra as páginas mais relevantes. | O sistema localiza a regra ou decisão relacionada à pergunta. |
| **B5 — Criar o chat confiável** ✅ | Concluído em 09/09/2026 | Permitir perguntas e continuações em linguagem natural, montar respostas com fontes, reconhecer falta de informação, mostrar conflitos e recomendar especialista quando necessário. | O síndico conversa sem aprender comandos, recebe uma resposta direta, confere a fonte e entende quando não há segurança para responder. |
| **B6 — Aprender com o uso** ✅ | Concluído em 09/09/2026 | Registrar avaliações, erros, facilidade de uso, tempo de resposta e custo; executar os casos de teste e corrigir problemas. | Sabemos se as respostas estão corretas, se a conversa é fácil, se as fontes ajudam e quanto custa cada resposta aprovada. |
| **B7 — Preparar e conduzir o piloto** 🔴 | Semanas 8 e 9 | Fazer os últimos testes de segurança, definir uma cobrança acessível, organizar documentos autorizados ou anonimizados e começar um piloto pequeno. Depois que o núcleo demonstrar confiança, testar um convite separado e opcional para conhecer a Zermatt. | Síndicos testam a primeira versão com acompanhamento humano; medimos utilidade, confiança, custo e interesse comercial consentido. |
| **B8 — Evoluir depois da validação** ⏸️ | Após os gates e o piloto | Avaliar provedor real de IA, GitHub e CI remoto, uso de dados reais, integrações, automações e evolução do fluxo comercial somente quando houver autorização, política de dados e evidência de valor. | O produto evolui sem colocar confiança, segurança ou custo em risco. |

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

Depois do B7, só ampliaremos o produto se o piloto mostrar que os síndicos:

- voltam a usar o sistema semanalmente;
- economizam tempo de forma perceptível;
- confiam nas respostas porque conseguem conferir as fontes;
- aceitam pagar um preço acessível que ajude a cobrir o custo do serviço;
- geram um custo sustentável por condomínio;
- e, sem pressão, parte deles solicita conhecer ou simular os serviços da Zermatt.

Enquanto esses sinais não aparecerem, continuaremos melhorando o núcleo documental em vez de adicionar funções apenas por volume.

O fluxo comercial não muda os blocos B4, B5 e B6. Primeiro o produto precisa encontrar a evidência certa, conversar bem, errar o mínimo possível e demonstrar confiança. A aproximação com a Zermatt entra no piloto apenas como uma opção separada, acionada pelo próprio usuário e sem uso oculto dos documentos para prospecção.
