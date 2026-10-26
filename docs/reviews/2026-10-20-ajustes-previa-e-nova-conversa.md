# Ajustes da prévia e nova conversa sem duplicação

- **Status:** revisão própria e gates locais concluídos; sem aprovação para merge
- **Base:** `f219fec49b52bb6a5b924f70a7d53a8eceef61e5`, árvore local com alterações anteriores preservadas
- **Revisor independente:** pendente
- **Autor:** Codex
- **Data:** 2026-10-20
- **P0/P1 encontrados no incremento:** nenhum

## Escopo e causa

RQ-3805/AC-3806: o cadastro e a saudação eram renderizados a partir de uma lista global em
todos os chats. Agora pertencem à conversa de origem. Novo chat recebe UUID, turnos e anexos
vazios; limpa o compositor e mantém conversas salvas. A atualização funcional da lista conserva
o último turno enquanto descarta somente rascunhos vazios não salvos. Renomeações salvas e
chats com anexos permanecem na lista.

RQ-3703/AC-3701: pendência documental abre somente o cartão azul-escuro, sem um segundo alerta
repetindo a mesma instrução. A pergunta continua preservada e não é consultada antes da decisão.
Erros reais continuam visíveis; a autorização e o bloqueio da versão pendente não foram alterados.

RQ-2405/RQ-2407 e AC-2406: menu direito chega à base da viewport, mantém itens no topo e permite
rolagem interna. O atalho documental redundante e sua tela foram retirados; documentos e
confirmações continuam em Perfil → Documentos enviados, com identificação por condomínio.
O perfil não contém um atalho Ver condomínios; a lista permanece no menu principal.

## Regressões e revisão

`chat-session.test.ts` exercita IDs distintos, histórico/anexos preservados, eliminação de
rascunhos vazios repetidos e mensagens iniciais limitadas ao chat de origem. Os testes estáticos
da sidebar e da página principal agora verificam a lista de mensagens visíveis do chat ativo,
em lugar de exigir a renderização global que causava o bug. O teste do atalho documental foi
atualizado conforme a retirada explicitamente solicitada, mantendo exigências do catálogo
autorizado e do perfil.

Diff incremental completo inspecionado em código, testes, specs, MVP e rastreabilidade.
Sem nova dependência, provedor, prompt, API, migração ou alteração de isolamento/autorização.
As alterações anteriores da árvore não foram descartadas nem integradas.

## Conferência no navegador

- Nova conversa eliminou a saudação anterior e o rascunho digitado, sem repetir o cadastro.
- Cliques sucessivos conservaram somente um chat vazio e o chat anterior salvo.
- Selecionar o chat anterior recuperou sua referência ao PDF enviado.
- PDF sintético de outro condomínio abriu um único cartão azul-escuro, com ambos os nomes e
  confirmação/cancelamento; o alerta repetido não foi renderizado.
- Menu: base em 800 px para viewport 1280×800 e em 640 px para viewport 320×640; sem overflow
  horizontal no celular. A viewport foi restaurada ao tamanho original.
- Perfil conferido com nome, aparência, documentos e saída, sem atalhos redundantes.
- Build atualizado servido em `http://127.0.0.1:3003/`; processo preservado para teste do usuário.

## Gates

- Testes específicos: 20/20 aprovados; typecheck aprovado.
- Build web: aprovado.
- `pnpm run check`: aprovado com `VITEST_MAX_WORKERS=2`, 832 testes em 122 arquivos;
  formatação, lint, typecheck, gate de 38 specs e scanner de segredos aprovados. Cobertura:
  statements 90,16%, branches 84,34%, functions 96,12% e lines 92,33%.
- Não foram aumentados timeouts nem enfraquecidas asserções. A execução concorrente anterior
  encontrou timeouts de PDF/avaliação documental; um teste estático também precisou refletir
  o novo escopo das mensagens iniciais. A repetição com dois workers passou integralmente.
- Integração de banco/provedor não é aplicável a este incremento de interface; pendências de
  integração e revisão das Specs 037/038 anteriores continuam registradas em seus próprios reviews.

## Decisão

Prévia local atualizada. Sem merge, push ou publicação. O registro não substitui code review
independente da revisão mais recente exigido antes de integrar a árvore completa.
