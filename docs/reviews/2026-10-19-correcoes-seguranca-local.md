# Correções de segurança e degradação local — 2026-10-19

## Escopo e resultado

Revisão local das correções pedidas pelo usuário, não aprovação independente para merge.
A árvore já continha mudanças extensas anteriores, preservadas. Nenhum commit, merge,
deploy, mudança de chave ou chamada real de IA foi realizado. Nenhuma ficha semântica foi alterada.

- **P0 tratado:** literais explicitamente marcados na evidência hostil são guardados só no
  pedido, fora da evidência segura. A saída bruta é conferida antes da validação e a saída
  pública completa/claims antes da persistência, incluindo erros e orientação geral/fallback.
  Saída insegura falha genericamente, sem tentar nova chamada para recuperar o vazamento.
- **P1 tratado:** OCR por ambiente exige chave específica e opt-in sintético fora de produção.
  Como flags não provam a origem de uploads, servidor persistido e worker usam sempre OCR
  indisponível; PDFs textuais continuam locais. ADR 0009, README e aceitação foram alinhados.
- **Bloqueio de demonstração mitigado:** runtime development/local abre a interface com
  aviso operacional sem fala inventada nem balão vazio. Novo perfil permanece pendente,
  com configuração e anexos desabilitados; não há bypass de cadastro ou autorização.

Inspeção percorreu política, pontos de geração, erros, fallback, transformação final e
persistência; fábrica OCR e chamadores servidor/worker; entrada local, aviso e controles
da interface; testes e documentação associados. Sem novo achado P0/P1 nas correções examinadas.
A skill de code review orientou a checagem dos caminhos de erro e das regressões concretas.

## Verificação executada

| Verificação | Resultado |
| --- | --- |
| `pnpm run check` | 638/638, 105 arquivos; formatação, lint, tipagem, 36 specs e segredos aprovados |
| Cobertura global | statements 89,04%; branches 82,72%; functions 95,77%; lines 91,31% |
| `pnpm run test:e2e` | 50/50 |
| `pnpm run evals` | 20/20, gateway local/sintético |
| `pnpm run evals:documentary` | 50/50 determinísticos; semânticos não executados |
| `pnpm run build:web` | aprovado |
| Integração Neon com `.env.local` e config de integração | 7/7, banco dedicado com guardas sintéticas; sem migração |
| Navegador local sem chave e sem banco | entrada de identidade fictícia nova, desktop e 390 × 844; aviso visível, sem erro de provedor e sem cadastro automático |

Uma asserção textual do novo teste de interface falhou na primeira execução devido à
quebra de linha JSX; passou após normalizar espaços, preservando a exigência do texto completo.
Na primeira tipagem, o teste usava `accountant` no enum; foi corrigido para `contador`.
O teste final completo acima ocorreu após essas correções. A integração emitiu aviso de
compatibilidade futura do driver TLS, sem falha; nenhuma configuração de segurança foi reduzida.

## Limites e bloqueios de liberação

- A defesa de literais é lexical, não proteção universal contra instruções ou exfiltração.
- O fluxo visual completo com IA real e a restauração de perfil já configurado não foram
  exercitados nesta sessão de navegador; testes existentes de identidade/retomada passaram.
- Novo perfil continua sem poder concluir cadastro offline; não se simulou uma conversa.
- OCR de uploads não será ativado por credenciais do chat. Classificação confiável e
  política de fornecedor/privacidade precisam de fluxo aprovado antes de dados reais.
- 50 fichas semânticas, revisão especializada e avaliação de modelo seguem pendentes;
  não são aprovação, nem foram iniciadas como quarta frente.
- CI remoto, revisão independente do diff completo atualizado e testes no commit a integrar
  permanecem requisitos para qualquer merge. Este documento não substitui o template de merge.
