# Reestruturação da Alvitra por blocos

**Status:** referência operacional
**Atualizado em:** 2026-10-09

## Regra de avanço

Por padrão, um bloco é executado por vez. Blocos compatíveis podem avançar em paralelo somente com
autorização explícita do usuário. Cada resultado é apresentado separadamente para aprovação ou
pedido de ajustes.

| Bloco                               | Estado                                              | Resultado esperado                                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — Limpeza e nova página inicial   | implementado; aguardando aprovação do usuário       | A raiz abre diretamente no chat; há somente um botão “Entrar”; formulários de login, cadastro, criação de condomínio e demais experiências paralelas são removidos; vetorização permanece. |
| 2 — Personalidade da Alvitra        | implementado; aguardando validação final do usuário | System prompt casual, humano, franco e orientado a próximos passos, aprovado pelo usuário e aplicado; o Bloco 7 atualizou o catálogo para `answer-prompt-v18`.                             |
| 3 — Múltiplos chats e barra lateral | implementado; aguardando validação final do usuário | Vários chats, barra esquerda recolhida, novo chat, renomear e excluir, responsivo.                                                                                                         |
| 4 — Menu sanduíche                  | implementado; aguardando validação final do usuário | Condomínios, Meus dados e Preferências no canto superior direito.                                                                                                                          |
| 5 — Perfil pela conversa            | implementado; aguardando validação final do usuário | Dados explícitos do síndico e do condomínio aprendidos aos poucos e exibidos em “Meus dados”.                                                                                              |
| 6 — Documentos sob demanda          | implementado; aguardando validação final do usuário | Documentos opcionais, pedidos quando necessários e mantidos na memória vetorial.                                                                                                           |
| 7 — Análise e raio-X                | implementado; aguardando validação final do usuário | Raio-X conversacional fundamentado: achados prioritários, pontos de conferência e comparação prudente de balancetes.                                                                       |
| 8 — Base para níveis                | implementado; aguardando validação final do usuário | Campo e cálculo ajustável de nível, sem regras finais ou telas elaboradas.                                                                                                                 |

## Fundamentos permanentes

- isolamento por condomínio;
- documentos e conteúdo derivado privados;
- vetorização e recuperação autorizadas;
- citações verificáveis;
- abstenção e exposição de conflitos;
- validação humana em alto risco;
- confirmação humana antes de ação externa.
