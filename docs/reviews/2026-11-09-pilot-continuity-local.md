# Continuidade de acesso e histórico — verificação local

**Estado:** 47 testes focados aprovados; piloto e gates do destino continuam pendentes.  
**Data:** 09/11/2026. **Autoria/autorrevisão:** agente desta frente.  
**Revisão independente humana:** não realizada nem presumida.

## Decisão e escopo

O usuário reafirmou a entrada uma vez por aparelho e o histórico completo, incluindo todas as
mensagens da Alvitra. Esclareceu que WhatsApp será somente na abertura ao público e autorizou
seguir com a preparação local. A Spec 068 agora explicita esse sequenciamento e os critérios
AC-6817–6820; a Spec 011 explicita AC-1111. Não há mudança de visão, fornecedor, prompt ou do
comportamento de autenticação/histórico já implementado. Os novos testes protegem esses contratos.

Mantidas as restrições anteriores: checkout compartilhado, sem commit/merge/reset/stash ou
worktree/branch, serviços não ativados, somente dados sintéticos, sem cobrança, migrations remotas,
upload real, leitura de valores de segredo, mensagens para outros chats ou contatos externos.

## Evidência executada

| Verificação | Resultado |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config tests/vitest.pilot-security.config.ts --reporter=json --outputFile=docs/reviews/pilot-security-continuity-tests-2026-11-09.json` | **47/47 testes em nove arquivos**, zero falhas, sem cobertura |
| ESLint instalado nos dois arquivos novos de teste/configuração | Aprovado, exit 0 |
| TypeScript instalado, `--noEmit --target ES2024 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck` nos dois arquivos novos | Aprovado, exit 0 |
| Prettier instalado, `--check` nos dois arquivos novos e package.json | Aprovado, exit 0 |
| `scripts/validate-spec-vision.ps1` canônico copiado sem edição para diretório exclusivo com briefing e Specs 011/068 | **Aprovado para duas specs**, estrutural; não gate global |

A cópia isolada do gate ficou em
`.local/pilot-security/spec-vision-35a8956b37bb4de58495f1b68923abf6/`.
O script, briefing e conteúdo das duas specs são copiados dos arquivos atuais, sem adaptar ou
enfraquecer as asserções. Esse procedimento permite a verificação focada sem executar gate
global durante edições concorrentes. Não houve cobertura global, integração destrutiva,
eval pago, build de release ou certificação do commit a integrar.

## O que os três novos E2E demonstram

1. **Sessão lembrada:** após login, fechar/recriar API e serviço sobre o mesmo cofre e avançar
   o relógio da API até 09/11/2028 conserva a sessão. Não chama login novamente, renova cookie
   seguro e não depende de IP. Falha temporária retorna 503 sem limpar cookie; nova tentativa
   restaura a mesma identidade. O teste injeta o cookie e não simula sua retenção pelo navegador.
2. **Histórico da conta:** duas sessões independentes da mesma conta leem a abertura original
   da Alvitra, a mensagem do usuário e a resposta original. Logout de A preserva B e histórico;
   entrar novamente preserva o conteúdo. Outra conta com acesso ao mesmo condomínio recebe 404
   para esse chat; cabeçalho de desenvolvimento sem cookie não autentica.
3. **Falha sem falso sucesso:** erro ao gravar a conversa devolve 503; B vê histórico vazio
   nessa operação. Retentar a mesma chave registra exatamente uma entrada com os dois lados,
   e repetir a operação conserva a primeira resposta sem duplicar mensagens.

O store de conversa usado nesses E2E é RAM e a asserção exige `durable=false`; não se rotula
como persistência de produção. A recriação do teste 1 prova persistência **das sessões** no
cofre local, não dos chats em RAM. A Spec 058 e o restore integral da Spec 070 ainda precisam
de evidência operacional no destino autorizado antes de documentos reais.

## Revisão e rastreabilidade

Autorrevisão percorreu o novo teste inteiro, a configuração de testes, mudanças de scripts/
documentação/aceitação e o caminho de acesso e journal chamado pelo teste. A seleção inclui os
testes anteriores de código/sessão/abuso e os de journal/timeline. Cache fica exclusivo por PID
em `.local/pilot-security/`; temporários sintéticos têm prefixo próprio e são removidos após
verificação do caminho. Nenhum novo serviço ou dependência foi introduzido.

Hashes e resultado desta rodada em `pilot-security-continuity-snapshot-2026-11-09.json`.
Os snapshots e relatórios da primeira rodada foram preservados. O diff completo do checkout,
cobertura dos quatro indicadores, status checks e revisão independente continuam pendentes;
assim como política de dados, budgets distribuídos, fornecedor/gateway e restore efetivo.
