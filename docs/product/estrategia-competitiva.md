# Diretriz de estratégia competitiva

**Status:** ativa  
**Responsáveis:** produto e engenharia  
**Atualizado em:** 2026-10-09
**Revisão prevista:** trimestral ou quando surgir evidência relevante de uso

## 1. Autoridade e relação com a visão

Esta diretriz deriva do briefing canônico e da definição do MVP. Ela detalha a conversa como única
experiência (§§1, 5 e 6 do briefing), o sequenciamento por blocos (§7), a memória vetorial
preservada (§8), o contrato de evidência (§9) e os limites de segurança (§10).

## 2. Posicionamento

A Alvitra é uma assistente conversacional para síndicos, não um ERP condominial nem um conjunto de
módulos. A conversa é a interface; a memória documental isolada e verificável é o diferencial que
evita que ela seja apenas um chat genérico.

### Promessa

> Peça ajuda como falaria com uma pessoa; a Alvitra usa o contexto disponível, mostra de onde veio a
> informação e pede somente o que falta para continuar.

### Unidade de valor

Uma tarefa do síndico resolvida ou encaminhada com evidência e próximo passo claro, e não o volume
de mensagens, telas preenchidas ou documentos enviados.

## 3. Diferenciais obrigatórios

1. conversa natural como ponto único de entrada;
2. documentos pedidos sob demanda, sem onboarding obrigatório;
3. memória persistente e vetorial isolada por condomínio;
4. citações por documento, versão, página e trecho;
5. abstenção explícita quando a base não sustenta uma conclusão;
6. conflitos e incertezas visíveis;
7. análise longitudinal de balancetes quando houver histórico suficiente;
8. perfil construído gradualmente com informações confirmadas na conversa.

## 4. Gate de decisão

Toda proposta deve responder:

1. mantém o chat como experiência principal?
2. pertence ao bloco autorizado agora?
3. reduz atrito ou melhora utilidade, evidência, segurança ou recorrência?
4. preserva isolamento, abstenção, conflitos e confirmação humana?
5. por que é melhor do que o mesmo trabalho em uma IA genérica com arquivos anexados?
6. qual teste, eval ou observação demonstra que funcionou?
7. o benefício compensa a complexidade permanente?

Sem resposta suficiente, a proposta não entra em implementação.

## 5. Sequenciamento obrigatório

Os oito blocos do briefing são sequenciais por padrão. O usuário pode autorizar explicitamente
blocos compatíveis em paralelo; cada um continua exigindo conclusão, apresentação e aprovação ou
pedido de ajustes próprios. A infraestrutura pode permanecer preparada para capacidades futuras,
mas nenhuma tela, regra ou interação futura deve aparecer antecipadamente.

## 6. Fronteiras

Permanecem fora do escopo: contabilidade completa, operações bancárias, portaria, aplicativo de
moradores, marketplace, automação externa sem confirmação e parecer profissional definitivo. Um
dashboard ou módulo lateral não deve reaparecer como atalho para funções que pertencem à conversa.

## 7. Métricas

- tempo até a primeira interação útil;
- retorno semanal;
- tarefas resolvidas ou encaminhadas;
- respostas documentais corretas e fundamentadas;
- citações válidas e abstenções corretas;
- esforço para fornecer contexto ou documentos;
- incidentes de isolamento;
- custo por resposta aprovada.

## 8. Ativos defensáveis

- casos de eval representativos do trabalho de síndicos;
- relações entre documentos, versões, vigências e períodos financeiros;
- padrões de recuperação, conflito e abstenção;
- controles de isolamento reproduzíveis;
- aprendizado sobre quais perguntas e solicitações de documento geram valor sem criar atrito.
