# Spec 069 — Worker documental contínuo e separado

**Status:** base validada com sintéticos; adaptação ao Render pago em preparação
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-25

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mantém a conversa disponível enquanto documentos são preparados para consultas fundamentadas. |
| Público | §3 | Prepara o piloto pequeno de síndicos profissionais e moradores, sem prometer capacidade pelo número de contas. |
| Proposta de valor | §§5–6 | O síndico envia documentos no chat e pode retomar o acompanhamento sem perder o original. |
| Prioridades do MVP | §7, Blocos 3, 6 e 7; §8 | Separa a execução da memória documental já autorizada, preservando histórico, páginas e vetores. |
| Segurança e confiança | §§8–10 e 12 | Conserva autorização por condomínio, RLS, versões, hashes, completude, abstenção e processamento reutilizável. |
| Validação e métricas | §§13–14 | Mede leitura, continuidade do chat, retomada e isolamento com documentos exclusivamente sintéticos. |

### Limites respeitados

- O usuário autorizou em 05/11/2026 preparar código, publicação e testes antes de contratar serviços.
- Reutiliza PostgreSQL, fila, processador e mesma base de código dos ADRs 0001/0006/0017.
- Em 25/11/2026, o usuário informou a contratação do Render e autorizou configurar site/API,
  processamento separado e domínio. A consulta ao painel confirmou o web existente `alvitra-demo-sintetica`,
  `1c-2g`, Oregon, sem worker ativo. Reutilizar esse web evita contratar um segundo site.
- A preparação não altera o banco tratado em outro chat, não gera credenciais e não ativa dados reais.
  Criar o worker continua dependendo de confirmar seu custo concreto e concluir a integração.
- Não altera autenticação da Spec 068, prompt, análise financeira, política de OCR ou provedor de IA.
- OCR real e síntese integral de lotes pela API continuam sujeitos às decisões próprias existentes; separar processos não autoriza novos envios de documentos.
- Configuração de hospedagem é preparada para revisão; a liberação de dados reais continua dependendo das Specs 011/040/058.

### Divergências da visão

Nenhuma. A separação é operacional e detalha os blocos já autorizados; não cria módulo ou fluxo de produto.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Processar documentos em execução independente da API, com fila durável, retomada após interrupções e resultado recuperável no chat.

## 2. Promessa testada

> O documento recebido continua na fila e sua leitura pode terminar após reiniciar o processador, mantendo páginas e evidências do condomínio correto.

## 3. Usuário primário

Síndico que envia PDFs e continua usando a conversa; operador que prepara um piloto de dez pessoas sem contratar infraestrutura nesta etapa.

A adaptação de 25/11 aproveita infraestrutura já contratada. Briefing §§6, 8 e 12 autorizam
mesma origem HTTPS, continuidade e encerramento coordenado; §§9–10 preservam autorização e
evidência. Usar os domínios informados (`alvitra.app` e `alvitraapp.com`, DNS Wix) não cria
tela, cadastro ou integração de produto. A comprovação depende dos testes abaixo e, separadamente,
de DNS, TLS e jornada persistente no destino. Nenhuma aprovação de piloto deriva da assinatura.

## 4. Escopo

- Worker contínuo compilado, uma tarefa de cada vez, espera interrompível e encerramento coordenado.
- Renovação da reserva de trabalho, bloqueio de resultados de tentativas vencidas e conclusão de tarefas esgotadas.
- API sem worker incorporado no perfil separado; arquivos e fila no PostgreSQL privado.
- Acompanhamento retomável do estado do documento no chat, sem gerar falas artificiais nem duplicar análises.
- Blueprint separado para o piloto, configuração local, comandos, procedimento de atualização e recuperação.
- Testes unitários, integração guardada e ensaio com API/worker em processos distintos, PDF longo e dez usuários sintéticos.

## 5. Fora do escopo

Contratar Render/Supabase, habilitar OCR ou IA externa, mudar prompts, refazer a autenticação, prometer capacidade para dez mil acessos, adotar Redis ou implementar um novo serviço de armazenamento. Backup lógico do histórico não será apresentado como backup completo do ambiente real.

## 6. Pré-condições

Specs 013/020/058/067; ADRs 0001/0002/0006/0017/0026 e 0041. Integração usa somente banco sintético dedicado com TLS, confirmação e marcador; nunca banco de piloto ou produção.

Exceção local de transporte para ensaio autorizado: `--provider=local` exige URL PostgreSQL
com loopback literal, nome `alvitra_ops_worker_<hex>`, confirmação `synthetic-local-only` e
marcador persistente com nome/purpose/política correspondentes. Não carrega `.env`, não usa
fallback remoto nem aceita banco existente não marcado. O wrapper cria banco exclusivo em
container sintético descartável; build/relatórios são exclusivos. A suíte RLS pode usar banco
separado `alvitra_ops_rls_<hex>` sob as mesmas guardas, sem mudar a matriz de isolamento.

## 7. Requisitos funcionais

### RQ-6901 — Execução contínua independente

O comando de worker contínuo aguarda novos jobs após ociosidade ou erro recuperável, reutiliza conexões limitadas e processa somente um documento por vez. Sinais de encerramento impedem novas reservas, interrompem a espera ociosa e permitem concluir a tarefa atual antes de fechar o pool. O comando anterior de uma tarefa permanece disponível para diagnóstico.

### RQ-6902 — Reserva renovável e publicação protegida

Um job ativo renova seu prazo usando condomínio, job e número da tentativa. Tentativa vencida, substituída ou cuja renovação falhou não publica resultados. Uma tentativa nova pode retomar após queda; a gravação transacional não expõe páginas ou vetores parciais. A API e o worker não usam reservas vencidas para concluir trabalho.

### RQ-6903 — Falhas limitadas e recuperáveis

Falha transitória reenfileira o job e mantém o documento em processamento. Esgotamento de tentativas, inclusive queda na última tentativa, termina em falha explícita sem trabalho preso para sempre. Retentativa não duplica páginas, chunks, original ou resultado confirmado. Logs usam somente códigos, contagens e duração, sem texto, caminho privado ou segredo.

### RQ-6904 — Recepção e acompanhamento independentes

A API confirma o recebimento durável com 202 sem aguardar o worker. O cliente acompanha a versão autorizada; expirar a espera da página ou fechar o navegador não cancela a fila. Reabrir a conversa permite verificar o estado atual de anexos já recebidos. Estado operacional não é fala atribuída à Alvitra; original, confirmação de condomínio e falha de leitura permanecem disponíveis.

### RQ-6905 — Publicação revisável

Preparar serviços web e worker separados, mesma revisão do código e região, `DEMO_MODE=false`, worker incorporado desligado e credenciais somente no servidor. O worker não recebe tráfego público. O Blueprint sintético existente permanece distinto. Documentar migrations antes da ativação, retomada, rollback de código compatível e limitações de backup, OCR e síntese local.

Complemento operacional de 09/11/2026: Node 24 explícito e janela de encerramento proposta de
300 segundos nos dois serviços. O host ainda pode matar uma tarefa longa; renovar lease e
retomar continuam obrigatórios. Credenciais de conversa ficam só na API. OCR/imagens/Codex e
pesquisa de demo permanecem desabilitados no Blueprint até contrato e decisão próprios.
O verificador local da Spec 070 não ativa fornecedor nem prova saúde do ambiente; o ensaio
integral de recuperação não substitui a validação do worker em processos distintos desta spec.

### RQ-6906 — Validação sem contratação

Executar ensaio sintético em processos separados com banco dedicado, originais privados, documento de 300 páginas, consultas enquanto há trabalho pendente, retomada após interrupção e acesso negado entre condomínios. Simular dez identidades autorizadas, medir tempos sem apresentar resultado simulado como benchmark de IA ou capacidade do Render. O ensaio não chama APIs pagas.

### RQ-6907 — Encerramento da API na hospedagem

O entrypoint compilado trata SIGTERM/SIGINT chamando o fechamento do Fastify uma única vez,
para aguardar trabalho ativo e executar os hooks de timers/pools. Sinais repetidos durante a
espera não iniciam outro fechamento. Falha é comunicada por código fixo sem erro ou segredo,
com saída não bem-sucedida. A janela do host não garante conclusão antes de término forçado.

### RQ-6908 — Domínio principal e aliases explícitos

Preparar origem HTTPS principal `alvitra.app` e aliases explícitos `www.alvitra.app`,
`alvitraapp.com` e `www.alvitraapp.com`. A configuração é opcional e só entra no ambiente
após DNS/TLS verificados. Um alias reconhecido recebe 308 para a origem fixa, mantendo caminho
e query; Host/Forwarded/URL do pedido nunca determinam o destino externo. O principal não
redireciona para si. `/health` permanece acessível sem redirecionamento. Origem ou aliases
inválidos impedem a inicialização antes da conexão ao banco. Não substituir registros de e-mail.
DNS não é redirecionamento HTTP; o domínio alternativo também precisa de certificado próprio.

## 8. Contratos

- Preservar upload, catálogo, fontes e histórico existentes e seus estados públicos.
- `DOCUMENT_WORKER_IN_API=false` seleciona a API separada; o worker tem comando próprio compilado.
- Parâmetros de polling e lease são inteiros positivos com validação; heartbeat é menor que o lease.
- Jobs conservam `condominiumId`, `documentVersionId`, `jobId` e `attemptCount`; renovação e conclusão validam os quatro.
- Erros públicos não revelam conteúdo documental nem a existência de dados de outro condomínio.

## 9. Requisitos não funcionais

Zero publicação parcial ou cruzada; cobertura de linhas, funções, statements e branches >=80%; nenhum novo pacote; nenhuma chamada externa de IA nos testes; relatórios verificáveis. Processo terminado abruptamente pode exigir aguardar o lease antes da retomada. A máquina de desenvolvimento e o banco sintético não certificam desempenho da hospedagem futura.

## 10. Critérios de sucesso

Todos os critérios de `acceptance.md` executados, preparação de publicação documentada, relatórios distinguindo testes locais e integração, gates aplicáveis aprovados ou limitações concretas registradas. Histórico e isolamento não podem ser enfraquecidos para passar testes.

## 11. Questões em aberto

- Recursos, região, retenção/RPO/RTO, custo, contrato de dados e restauração completa no ambiente efetivo dependem da futura decisão operacional.
- OCR de PDFs digitalizados reais e síntese integral via API não são ativados por esta fatia.

## Gate competitivo

Mantém o chat e os blocos autorizados; reduz interrupções de leitura; preserva evidência, isolamento e confirmação humana; protege a memória documental verificável; valida por retomada, páginas, consultas e testes de carga sintética; reutiliza fila e PostgreSQL, limitando a complexidade permanente a um processo adicional.

## Gate para mudar o status

Alinhamento e critérios acima, rastreabilidade, testes/evals aplicáveis, cobertura e revisão do delta concluídos. A validação local não autoriza merge, contratação ou uso de dados reais.
