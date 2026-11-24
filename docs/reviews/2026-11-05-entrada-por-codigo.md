# Entrada por código e aparelhos lembrados — 05/11/2026

**Status:** implementação e validação local concluídas; aguardando validação do usuário  
**Escopo:** Spec 068 e ADR 0040; sem merge ou publicação  
**Revisão:** autorrevisão do diff desta tarefa contra os snapshots anteriores à edição em
`tmp/access-code-baseline`; não substitui code review independente para merge.

## Comportamento

A equipe provisiona o código por CLI. O site não cria contas publicamente. O login valida a
credencial no servidor e emite cookie HttpOnly persistente; recarga e nova aba restauram a
sessão. Perfil mostra o código da própria conta e permite copiá-lo para outro aparelho.
Cada aparelho recebe token independente. IP não autentica, não é persistido e não mistura
identidades. Logout revoga somente o token atual; provisionar novamente revoga código e
sessões anteriores. Contas reais bloqueadas ou com MFA não ganham bypass.

Código de acesso derivado por HMAC de segredo estável e revisão aleatória; o armazenamento
mantém somente hashes e revisões. Sessões não expiram no servidor, conforme pedido do usuário;
o cookie é renovável por até 400 dias. Limpar dados do navegador ou revogar exige nova entrada.
Esse limite e a responsabilidade de guardar segredo/cofre estão documentados no README.

## Segurança e revisão do diff

- Identidade de desenvolvimento é ignorada quando entrada por código está ativa; a associação
  por condomínio continua validada no servidor para perguntas, documentos e histórico.
- Credenciais não entram em URL, localStorage, conversas ou logs. Respostas usam `no-store`.
- Respostas de erro não ecoam códigos nem detalhes de storage/PostgreSQL; falhar ao gravar
  não confirma login e falhar ao revogar não limpa o cookie.
- Credenciais locais têm lock entre processos e gravação atômica com flush. A disputa no
  Windows pode retornar EPERM/EACCES, tratada por espera limitada sem dispensar exclusividade;
  testes conservam inicializações e logins concorrentes com a mesma identidade.
- Migration 037 é aditiva, RLS obrigatório nas tabelas privadas, privilégios explícitos e
  provisionamento indisponível para `app_runtime`. Não altera tabelas documentais nem memberships.
- CLI usa provisionamento operacional e suporta o identificador sintético anterior. Modo demo
  prevalece sobre eventual URL de banco, como no servidor; fora dele, exige TLS para URL remota.
- Nenhum prompt, modelo ou contrato de evidências foi alterado. Nenhuma dependência foi adicionada.

## Evidências

- 16 testes dedicados aprovados em quatro arquivos: `access-code.test.ts`,
  `access-code-cli.test.ts`, `access-session.test.ts` e `access-code.e2e.test.ts`.
- Integração Neon sintética: migration 037 aplicada pelo guard de confirmação/marcador e 17
  testes aprovados. O processo de testes selecionou apenas Neon, porque os arquivos locais
  também definem Supabase; nenhum arquivo de ambiente foi alterado para a seleção.
- Build web e compilação da API aprovados. Verificação no navegador: login, retorno automático
  por recarga, Perfil, cópia, temas claro/escuro, largura de 320 px e saída explícita.
- Captura com identidade exclusivamente sintética: `output/access-code-profile.jpg`.
- Gates finais na cópia estável `.local/access-code-final-validation`: formatação, lint,
  typecheck, **2.218 testes em 199 arquivos**, gate de visão e scanner de segredos aprovados.
  Foram usados diretamente os mesmos binários instalados que compõem `pnpm run check`, com
  `--maxWorkers=2` na cobertura. O pnpm tentou preparar dependências para o diretório copiado;
  a instalação foi interrompida e nenhum módulo foi reinstalado ou removido.
- Cobertura total: statements **91,92%**, branches **88,72%**, functions **96,35%** e lines **93,52%**.
- Cobertura exclusivamente unitária: statements **88,29%**, branches **84,10%**, functions
  **93,32%** e lines **90,03%**. Todos os pisos de 80% foram atendidos sem exclusões novas.
- Logs locais: `tmp/access-snapshot-gates.log`, `tmp/access-snapshot-unit.log`,
  `tmp/access-final-dedicated.log` e `tmp/access-integration.log`.
- Os nove arquivos centrais de credenciais, sessões, rotas, UI, CLI e migration conferem com
  o snapshot, normalizando somente CRLF/LF. Manifesto em `.local/access-code-review-manifest.json`,
  fingerprint SHA-256 `00465029a77982b4cc579de3f9c278191261531ea7c151e5d01fad02ff0ee133`.
  `create-api.ts`, `server.ts`, `App.tsx` e `styles.css` também conferem integralmente.

Os testes antigos que usavam `startServer` agora provisionam um código e entram por HTTP,
preservando as asserções documentais e de isolamento. A fixture não cria bypass de autorização.

## Trabalho paralelo e limites de liberação

Houve mudanças simultâneas da Spec 069 no mesmo checkout durante a validação. Uma execução
intermediária falhou em testes do worker em edição e dois timeouts; os 16 testes da Spec 068
continuaram aprovados. Esses arquivos foram preservados. A primeira tentativa de isolamento
não é evidência de aprovação: capturou arquivos do trabalho paralelo ainda em edição.
A cópia final contém o estado consolidado completo, sem restaurar ou excluir arquivos do worker;
a formatação pendente foi aplicada somente nessa cópia. O resultado final acima prevalece sobre
as execuções intermediárias. Mudanças posteriores no checkout compartilhado precisam de novo gate
antes de integração; esta validação não aprova automaticamente o trabalho futuro da Spec 069.

Autenticação persistente não torna durável o histórico da demonstração em RAM (Spec 058).
O preview de teste foi isolado e encerrado. Não foram emitidos códigos para contas reais,
alterado ambiente de produção, reiniciada uma API com dados em RAM, publicado ou integrado código.
Para ativação real: aplicar migration, configurar segredo estável e emitir códigos pela equipe.
Piloto público continua sujeito aos gates de histórico, recuperação e operação distribuída.
