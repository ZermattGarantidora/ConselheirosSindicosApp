# Aceitação — Spec 052

AC-5201 a AC-5206 descrevem a entrega inicial e seus testes locais. AC-5207 registra a bateria real solicitada posteriormente, sem substituir esses gates por aprovação semântica.

- **AC-5201:** finalize/termine/aquela/reenviei retomam as perguntas recentes; pergunta independente não as incorpora. Mudança de assunto explícita corta o assunto anterior, inclusive com “mudar de assunto”. Foco contém apenas perguntas da janela atual e nenhum texto de resposta documental, cenário ou oráculo.
- **AC-5202:** pergunta de disponibilidade com convenção tangencial recebe contexto de lacuna financeira e orientação geral sem importar valores de outro condomínio. Balancete relevante continua elegível. Menção a CCT faltante não satisfaz confirmação de piso; instrumento coletivo identificado e recuperado remove essa lacuna, sem dispensar validação humana.
- **AC-5203:** síntese que omite um de dois tópicos explícitos recebe uma correção; resposta que trata do tópico como não verificável é aceita. Correção geral ocorre uma única vez, conserva fontes/modelo e registra as duas tentativas. Saída protegida ou claims sem evidência continuam bloqueados.
- **AC-5204:** escopo de memória, orçamento de bytes incluindo foco, filtros de tenant/usuário/chat, revalidação e limite de fontes permanecem; dados derivados não reintroduzem perguntas filtradas ou fatos de respostas antigas.
- **AC-5205:** evals:luna apresenta 280 cenários/1.010 turnos, memória ligada e modelo gpt-6-luna como única condição, zero chamadas sem --execute. Comparações antigas preservadas; nenhum modelo é executado nesta entrega.
- **AC-5206:** typecheck, lint, formatação, visão, testes e cobertura passam; alterações rastreadas e diff revisado; resultados reais continuam identificados como pendentes.

- **AC-5207 — etapa posterior solicitada:** executar 280 cenários/1.010 turnos somente Luna com memória, sobre snapshot congelado e mesmos casos/oráculos. Comparar com Luna/memória da R2, revisar os mesmos 80 alvos (79 válidos), conferir hashes/modelo/memória/escopo e preservar todas as falhas e tentativas. Créditos observados, usage desconhecido e USD hipotético permanecem distintos de fatura/franquia. Resultados e limitações em [observed-results-2026-10-28.md](observed-results-2026-10-28.md); não converte a implementação local ou a amostra IA em aprovação semântica especializada.
