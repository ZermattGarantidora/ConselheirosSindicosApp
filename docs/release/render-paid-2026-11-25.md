# Render pago e domínios — 25/11/2026

## Escopo e autorização

O usuário informou Render contratado e pediu preparar site/API, worker documental separado e
domínio. Informou `alvitra.app` e `alvitraapp.com`, administrados no Wix. `alvitra.app` é o
principal proposto; o segundo e os `www` convergem para ele. Sem mudança de prompt, provedor,
política de dados ou schema. A conexão ao Supabase está sendo tratada em outro chat.

## Estado observado e alterações efetivas no painel

| Item | Resultado |
|---|---|
| Web existente | `alvitra-demo-sintetica`, `srv-db8gj3avcj2c73ab57t0` |
| Plano e região | `1c-2g`, Oregon; um único serviço ativo e nenhum worker |
| Origem Git | `ZermattGarantidora/ConselheirosSindicosApp`, branch `main` |
| Revisão publicada observada | `6b78117cd47601ec665b0b2b56b4c820c56955c3` |
| Build/início | API/web compilados; `node dist/api/app/main.js` |
| Health check | `/health`; configuração conferida, sem prova da jornada persistente |
| Publicação automática | Alterada de `On Commit` para `Off` e confirmada na interface |
| `alvitra.app` | DNS alterado e domínio `Verified` no Render; última resposta de certificado `Certificate Error` |
| `www.alvitra.app` | CNAME alterado e domínio `Verified` no Render; redirect ao principal configurado; última resposta TLS `Certificate Error` |
| `alvitraapp.com` e seu `www` | Preparados no código; ainda não cadastrados no Render ou DNS |
| Wix | Login concluído pelo usuário; A da raiz e CNAME `www` atualizados com confirmações de sucesso |

O painel não teve segredos abertos ou copiados. Nenhum deploy, migration, credencial nova,
worker, upgrade ou chamada de IA foi executado nesta etapa. A configuração histórica em
`render.yaml` ainda dizia `free`; foi corrigida localmente para preservar o plano pago em
sincronizações futuras. O Blueprint continua gerenciado pelo Render e precisa acompanhar a
revisão aprovada, sem sincronizar o arquivo antigo durante a transição.

## Arquivos preparados e validação

- `render.yaml`: mesmo web/plano/região, Node 24, uma instância, publicação manual e janela
  de encerramento de 300 segundos. Continua em demonstração até a transição validada.
- `render.pilot.yaml`: reutiliza esse web em vez de criar `alvitra-pilot-web`; worker
  `alvitra-pilot-documents`, mesma região/plano, chave de banco própria e nenhuma chave de
  conversa no worker. Não executa migrations automaticamente.
- `main.ts`/`server-shutdown.ts`: SIGTERM/SIGINT aguardam o fechamento Fastify uma única vez.
  Os hooks existentes encerram timers/pools; sinais repetidos não duplicam o fechamento.
  O host ainda pode terminar uma tarefa antes do prazo.
- `canonical-origin.ts`: origem HTTPS configurada exclusivamente no servidor, aliases
  explícitos, 308 antes das rotas, caminho/query preservados e health check sem redirect.
  Host desconhecido/Forwarded não controla o destino. Sem configuração, mantém o atendimento.
- `test:render`: unitários/smoke sintéticos com descoberta de `.env` desligada, cache e
  cobertura exclusivos. Não consulta Supabase/Wix/Render ou transporte de IA.

Resultados finais são registrados em [review da rodada](../reviews/2026-11-25-render-paid.md).
Nenhuma prova local equivale a DNS/TLS, persistência, recuperação ou capacidade do destino.

## DNS no Wix, após login e conferência dos registros atuais

### Execução após o usuário confirmar o login

Os dois domínios estavam sem site Wix atribuído. Na zona `alvitra.app`, o A
`185.230.63.171` foi alterado para `216.24.57.1`; os outros A padrão do Wix
(`185.230.63.186` e `185.230.63.107`) foram removidos para evitar destinos conflitantes.
O CNAME `www` passou de `cdn3.wixdns.net` para `alvitra-demo-sintetica.onrender.com`.
TTL de uma hora preservado. Cada alteração teve confirmação de sucesso no Wix.
Não havia TXT/MX no painel; nameservers `ns4.wixdns.net` e `ns5.wixdns.net` preservados.
Configuração anterior registrada antes das alterações em
[`alvitra.app.dns-before-2026-11-25.json`](../../infrastructure/render/alvitra.app.dns-before-2026-11-25.json).

A consulta pública ao Google DNS retornou A `216.24.57.1` e o CNAME novo. Consultas AAAA
e CAA retornaram `Status:0` sem Answer, com SOA da zona; não há registro AAAA conflitante
ou CAA restritivo nessa resposta. URLs consultadas no navegador:
`https://dns.google/resolve?name=alvitra.app&type=A`, tipos `AAAA` e `CAA`, e
`https://dns.google/resolve?name=www.alvitra.app&type=CNAME`.

Ambos os nomes foram verificados no Render, com notificação `Verified`. A emissão de
certificado apresentou `Certificate Error`; uma nova tentativa no principal não resolveu
na última resposta visível. A navegação HTTPS ainda chegou à página do Wix de domínio não
conectado, inclusive após tentar `www`. Cache/propagação é uma hipótese coerente com essa
divergência, não uma causa comprovada da falha de emissão. Não foram removidos/recriados
domínios no Render, adicionados CAA especulativos ou ignorados avisos de segurança.
HTTPS e a página efetiva da Alvitra ainda não estão validados. Wix informa prazo de até
48 horas para propagação; confirmar o certificado e o site antes de anunciar disponibilidade.
O domínio alternativo permanece inalterado, sujeito à publicação do redirect e ao custo.

O Render mostrou estes destinos no diálogo de cadastro. Alterar somente os registros do site,
registrando os valores anteriores para reversão. Preservar MX, SPF, DKIM e DMARC e demais
subdomínios; não trocar nameservers nem remover registros de e-mail.

| Zona | Tipo | Host no Wix | Destino | Condição |
|---|---|---|---|---|
| `alvitra.app` | A | raiz (`@` ou vazio, conforme formulário) | `216.24.57.1` | Aplicado e confirmado no Wix/Google DNS |
| `alvitra.app` | CNAME | `www` | `alvitra-demo-sintetica.onrender.com` | Aplicado e confirmado no Wix/Google DNS |
| `alvitraapp.com` | A | raiz | `216.24.57.1` | Só após cadastrar o domínio adicional e confirmar eventual custo |
| `alvitraapp.com` | CNAME | `www` | `alvitra-demo-sintetica.onrender.com` | Mesma condição da raiz alternativa |

Não presumir que A/CNAME produz redirecionamento HTTP. O secundário precisa estar cadastrado,
verificado e com TLS no Render, e o código com `PUBLIC_APP_ORIGIN=https://alvitra.app` e aliases
precisa estar publicado. O Render já redireciona `www.alvitra.app` para a raiz cadastrada.
Registros AAAA conflitantes são tratados somente no hostname do site; não apagar a zona inteira.
Após propagação, usar **Verify** no Render e abrir o domínio com HTTPS. Não ignorar erro de certificado.
Só considerar o domínio disponível depois de validar HTTPS e o certificado correspondente.

Fontes oficiais consultadas em 25/11/2026:
[domínios Render](https://render.com/docs/custom-domains),
[DNS de outros provedores](https://render.com/docs/configure-other-dns),
[CNAME no Wix](https://support.wix.com/en/article/adding-or-updating-cname-records-in-your-wix-account).

## Dependências para ativar a versão persistente

1. Confirmar o banco de destino com a outra frente, migrations aplicadas, TLS, logins mínimos
   e RLS. Não usar os comandos de integração que fazem TRUNCATE no banco persistente.
2. Concluir o startup hospedado: atualmente `server.ts` injeta `deniedApiOperationControl`
   e adaptadores documentais sem autorizador positivo. Chaves/flags sozinhas não habilitam
   conversa/OCR/embeddings. Esta fatia não remove essas guardas nem declara a API utilizável.
3. Validar armazenamento durável de ambos os lados do histórico, originais e fila; reinício
   de API/worker, retomada, isolamento, citação e restauração de backup no destino autorizado.
4. Confirmar o custo do worker separado e a eventual cobrança dos domínios adicionais.
   O workspace Hobby inclui dois hostnames customizados; cada hostname excedente custa
   US$0,25/mês conforme documentação consultada. Root + `www` dos dois domínios podem totalizar
   quatro hostnames (US$0,50/mês adicionais), sujeito à conferência no painel antes do cadastro.
5. Revisar a candidata completa/CI conforme AGENTS e publicar API/worker no mesmo SHA.
   O checkout contém alterações concorrentes; não integrar o conjunto silenciosamente.
   Usar o perfil persistente como candidata para atualizar o Blueprint já existente com
   conteúdo revisado; não importar outro Blueprint que tente assumir o mesmo web gerenciado.
   Atualizar `render.yaml` para o perfil persistente na decisão de transição, mantendo os
   segredos no serviço e conferindo a sincronização manual.
6. Configurar DNS/TLS, testar entrada, cookies, retomada em aparelhos e aliases. Uma troca de
   hostname não transfere cookies do `onrender.com`: entrar novamente no domínio principal
   pode ser necessário, preservando os dados da conta no banco validado.

## Atualização, rollback e monitoramento

Conservar a revisão anterior e os valores DNS antes da troca. Rollback de código exige API e
worker na mesma revisão compatível com o schema; rollback não restaura banco, chaves ou DNS.
Não reduzir o plano pago por sincronização de Blueprint antigo. Falha de persistência mantém
a transição fechada; não cair silenciosamente para RAM.

`server_memory` e diagnósticos agregados do worker já existem. Conferir memória, HTTP 5xx,
fila sem progresso e leases na primeira jornada sintética. `/health` sozinho não comprova
banco, gravação, IA ou worker. Destinatário/canal de alertas e backup remoto precisam ser
definidos; nenhum monitor externo ou envio de mensagem foi ativado.
