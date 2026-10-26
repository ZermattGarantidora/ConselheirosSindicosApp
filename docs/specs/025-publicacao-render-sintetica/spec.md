# Spec 025 — Demonstração online sintética no Render

**Status:** demonstração publicada; conversa externa autorizada para teste sintético
**Responsável:** engenharia
**Atualizado em:** 2026-10-20

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Experiência principal | §§1 e 6 | Permite validar a conversa por uma URL, sem mudar a experiência. |
| Estratégia técnica | §12 | Mantém TypeScript, Fastify e React/Vite em uma implantação reversível. |
| Segurança e confiança | §§8–10 | Restringe a demonstração a dados sintéticos e mantém credenciais somente no servidor, sem banco persistente. |
| Validação | §13 | Permite observar tempo até a primeira conversa útil fora do ambiente local. |

### Limites respeitados

- Não recebe dados reais, documentos de clientes ou banco persistente. A chave de conversa autorizada fica somente no segredo do serviço, nunca no navegador ou no GitHub.
- Não inicia piloto, convite, autenticação definitiva, WhatsApp, ação externa ou funcionalidade de
  blocos futuros.
- Não substitui os gates da Spec 011 para piloto real.

### Divergências da visão

Nenhuma.

Em 2026-10-19 o usuário autorizou explicitamente a transferência da chave Gemini local para o
serviço Render existente e sua ativação para testes, após aviso de endereço público, consumo de
cota/saldo e ausência de teto financeiro global. O ajuste aplica briefing §§1, 6, 10 e 12 e
Specs 026–027; não libera piloto, dados reais, OCR externo ou fotos. O gate competitivo preserva
a conversa como interface e valida a jornada já autorizada com a menor mudança operacional,
sem novo provedor ou módulo. Conferência manual com identidade fictícia mede a jornada inicial;
não substitui avaliação semântica ou aprovação profissional. Ver ADR 0025.

A correção de memória solicitada em 2026-10-20 aplica §§6, 10, 12 e 13: reduz custo de
inicialização, preserva o pipeline documental e recusa excesso de trabalho sem perder documentos.
Continua no serviço/plano existente e mede disponibilidade da mesma conversa, sem ampliar blocos,
provedores ou público. A decisão técnica está no ADR 0026.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar uma URL HTTPS para testar remotamente a conversa sintética da Alvitra.

## 2. Promessa testada

> Consigo abrir a Alvitra pela internet e experimentar a conversa sem cadastrar ou expor dados reais.

## 3. Escopo

- Web Service gratuito no Render configurado por `render.yaml`.
- API e build web entregues pela mesma origem, com endpoint de saúde.
- Demonstração sem banco ou persistência no servidor; Gemini opcional, somente com autorização operacional registrada e segredo no Render.

## 4. Fora do escopo

- Piloto, banco remoto, uploads ou documentos reais.
- Dados pessoais, contas reais, e-mail, OAuth, WhatsApp, contratação ou mudança de plano.
- Habilitação de OCR, análise de fotos, OpenAI ou chamadas com documentos reais.

## 5. Requisitos

### RQ-2501 — URL demonstrativa segura

O ambiente mantém `DEMO_MODE=true`, sem `DATABASE_URL`. Sem autorização explícita, não recebe
chave de IA. Na exceção de teste autorizada pelo ADR 0025, somente a chave Gemini fica no
segredo do serviço; não é incluída no build, em logs ou no repositório. A entrada provisória
continua restrita a testes fictícios e não equivale a autenticação real.

### RQ-2502 — Mesma origem

O build React é servido pela API para que chamadas relativas e cookies continuem na mesma origem HTTPS.

### RQ-2503 — Implantação verificável

A configuração registra build com lockfile, comando de início e `/health` para verificar disponibilidade.

O serviço deve apontar para `main` e o commit publicado precisa ser conferido no Render.
Configurações de origem do Blueprint também devem ser verificadas antes de sincronizações
futuras para não voltar a publicar um branch antigo. Alteração operacional não faz merge.

### RQ-2504 — Conversa sintética autorizada

Com chave autorizada e `GEMINI_ENABLED=true`, o runtime deve informar `aiProvider: gemini` e
a jornada das Specs 026–027 deve perguntar o nome de tratamento e os condomínios após a entrada
com usuário fictício. Sem chave ou com indisponibilidade, a interface informa o limite, sem
fingir fala gerada. Não contratar plano ou ativar faturamento; chamadas podem consumir a
cota/saldo já existente. Limites de requisição e retry não são teto financeiro global.

## 6. Disponibilidade e capacidade

### RQ-2505 — Runtime de produção econômico

O build compila a API e o código compartilhado. O Render inicia JavaScript compilado diretamente
com Node, sem pnpm/tsx em runtime. PDF.js só é carregado quando houver extração, e caches de
página são liberados após leitura. O build deve manter as rotas, fontes padrão e contratos do
servidor de desenvolvimento, verificando originais completos e citações em ensaio sintético.

### RQ-2506 — Capacidade protegida

Na demonstração publicada, somente um documento é recebido/processado por vez. A reserva começa
antes do corpo e persiste após 202 até o fim da leitura; falha, rejeição ou aborto antes de
transferência libera a reserva. Ao atingir 320 MiB de RSS, novas operações POST recebem 503 com
`server_busy` e `Retry-After: 5`, antes de armazenamento/IA. Leitura de originais, catálogo,
histórico e saúde continuam disponíveis sob as autorizações existentes. Não excluir documentos
nem expulsar histórico silenciosamente. A recusa preserva texto/anexo para repetição.

### RQ-2507 — Verificação operacional de memória

Logs de produção contêm somente RSS, heap, memória externa e buffers agregados ao iniciar e a
cada minuto. O timer deve terminar no fechamento. Medição local usa dados sintéticos e não é
prova de uso no Render; a queda só pode ser considerada resolvida após publicação e conferência
no serviço existente. Limite de RSS na admissão não garante o pico de uma operação em andamento.

## 7. Critérios de sucesso

- a URL abre a página de entrada e a interface de chat; sem chave, a Alvitra comunica
  indisponibilidade em vez de gerar fala simulada;
- `/health` responde `200`;
- não há `DATABASE_URL`; uma chave Gemini só pode existir no serviço sob a autorização registrada;
- reinício apaga o estado em memória do servidor e os arquivos enviados; a retomada do perfil mínimo fictício segue a Spec 027;
- a publicação não afirma prontidão para piloto real.
- com Gemini autorizada, uma identidade nova percorre nome de tratamento, quantidade de condomínios, nome e unidades; a retomada não repete o cadastro;
- modelo e chamada real de teste são informados separadamente dos testes simulados e dos casos semânticos pendentes.
- build e ensaio compilado aprovados, sem provedor externo;
- excesso de concorrência/memória recusado antes de armazenar ou chamar IA;
- leitura, original, citações e isolamento preservados nos testes;
- consumo comparado antes/depois e limitação de validação em produção explicitada.
