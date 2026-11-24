# Revisão do autor — contexto cadastral nas respostas

- **Status:** revisão técnica do autor; integração independente não solicitada.
- **Data:** 2026-10-29.
- **Autor/revisor:** Codex, no chat “Esclarecer pedido de ajuda”. Sem revisor independente.
- **Escopo:** Spec 021, RQ-2104/AC-2104; Spec 043, AC-4302b; ADR 0032; projeção cadastral,
  composição do contexto, caso de uso, rota HTTP e regressões sintéticas correspondentes.
- **P0/P1 identificados no diff desta fatia:** nenhum.
- **Base de comparação:** cópias privadas anteriores em `.local/profile-context-baseline/`;
  alterações preexistentes de outros trabalhos foram preservadas.

## Causa e correção

O cadastro inicial era exibido no chat, mas suas mensagens não pertenciam ao histórico de
perguntas persistidas usado na geração. A rota de perguntas também não fornecia o perfil
registrado. Assim, a primeira consulta podia receber uma janela vazia e negar um nome recém-salvo.

A API agora lê o perfil autorizado do condomínio e projeta identificador, nome e unidades em
`confirmedProfile`, com `source=registered_profile` e `documentaryProof=false`. Não transmite
contatos, endereço, CNPJ, fotos ou o histórico de configuração do navegador. O cliente não
pode substituir a projeção. Falha de leitura ou identificador divergente impede gerar resposta.

A projeção não é um turno fictício, fonte documental ou memória compartilhada entre chats;
ela é recarregada do cadastro atual, inclusive sem replay histórico. Continuações mantêm oito
interações. Perfil, turnos, foco e contrato de reparo respeitam juntos 12.000 bytes, removendo
turnos antigos inteiros quando necessário. Dados do cadastro não comprovam regras ou saldos.

Perguntas explícitas sobre cadastro usam esses dados sem busca documental ou aviso de ausência
de documentos. Os filtros contra afirmação local sem suporte continuam ativos; a exceção para
quantidade de unidades aceita apenas o número literal registrado e nenhuma regra adicional.
O prompt v27 não foi alterado, nem seu texto, provedor, roteamento, schema SQL ou persistência.

## Validação local

- 26 regressões novas em `confirmed-profile-context.test.ts` e
  `registered-profile-context.e2e.test.ts`: cadastro/consulta, chat novo, janela de oito turnos,
  replay desligado, isolamento, corpo forjado, falha de leitura, orçamento e controles documentais.
- Suíte final: **1.595/1.595 testes**, 163 arquivos, com cobertura e um worker.
- Cobertura: statements **92,26%**, branches **88,21%**, funções **97,05%**, linhas **93,92%**.
  Módulo novo com **100% nos quatro indicadores**.
- Formatação global, lint, tipagem, gate estrutural de 57 specs e scanner original de segredos
  aprovados. Binários locais equivalentes ao `pnpm run check`, cujo Corepack já estava bloqueado
  por DNS; sem instalar dependências. Logs em `.local/profile-context-*`.
- A primeira execução do teste HTTP esperava 200 ao criar chat; a rota existente retorna 201.
  A asserção foi corrigida para o contrato real, sem flexibilizar o resultado aceito.
- A primeira suíte ampla passou com 1.594 testes. A execução final incluiu os testes adicionais
  e a decisão de não buscar documentos em consultas estritamente cadastrais; não a substitui.

## Autorização e teste com Codex

A revisão automática rejeitou inicialmente o teste externo por considerar o payload cadastral
sem autorização específica. Nenhum envio daquele comando foi executado. A pergunta ao usuário
explicitou nome, quantidade de unidades e identificador do condomínio ativo enviados ao
Codex/OpenAI da sua conta ChatGPT. O usuário respondeu “Autorizar o cadastro no contexto”.

Depois da autorização, o primeiro harness direto falhou antes de invocar o modelo: omitia o
callback obrigatório de revalidação do chat. O teste seguinte usou as rotas HTTP completas,
associação e chat sintéticos, sem relaxar esse controle. Não acessou a sessão do usuário.

Três consultas com Codex gpt-6.1-sol e o cadastro fictício Residencial Aurora Sintético, de
64 unidades, passaram: resumo do que sabe, nome e unidades. O modelo usou o cadastro, com zero
citações inventadas e sem repetir a pergunta de nome/unidades. Preservou a distinção entre
cadastro informado e comprovação documental. No resumo, ainda sugeriu enviar convenção; essa
observação de estilo não é certificação semântica global nem motivo para ampliar o prompt.

As saídas sintéticas estão em `.local/profile-context-api-smoke.log`. O consumo dessas consultas
não foi exportado pelo smoke e não é tratado como zero. Não houve novo provedor ou teste com
dados reais. O bloqueio original e o erro do harness permanecem preservados.

## Aplicação

Reinício local coberto pela autorização anterior do usuário para atualizar a API, com ciência
de que a demonstração usa estado em memória. A aplicação e a confirmação de saúde são registradas
na conclusão desta etapa. Sem merge ou publicação.

Concluído em 29/10/2026: 20/20 evals legados e 50/50 documentais determinísticos aprovados,
build API aprovado e inicialização temporária respondendo HTTP 200. O processo da API local
13772 foi identificado pelo caminho/comando do projeto e substituído pelo processo 34400, em
janela oculta, mantendo os arquivos de ambiente. A API da porta 3000 e o proxy web da porta 5173
responderam `status=ok`, com Codex e autenticação de demonstração. A conferência foi por HTTP;
não foi feita interação visual na sessão do usuário. Para a página descartar o contexto antigo,
é necessário recarregar e entrar com a mesma identidade provisória. O fluxo existente restaura
o cadastro guardado no navegador; a janela de mensagens da demonstração continua volátil.
