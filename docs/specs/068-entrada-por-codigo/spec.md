# Spec 068 — Entrada por código e aparelhos lembrados

**Status:** código, abuso e continuidade validados localmente; gates do destino pendentes, piloto não liberado
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-11

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1, 2 e 4 | Reduz o atrito para retornar à conversa e mantém o contexto autorizado. |
| Público e valor | §§3 e 5 | Síndicos acessam a mesma conta em aparelhos diferentes. |
| Experiência e prioridade | §6 e §7, Blocos 1 e 4 | Entrada mínima por código fornecido pela equipe e código no Perfil compacto. |
| Segurança e confiança | §§8–10 | Identidade validada no servidor; IP não autentica nem é persistido em texto; contagem de abuso usa somente HMAC temporário. |
| Validação | §§13 e 14 | Verifica retorno automático, conexão de aparelhos e isolamento. |

### Limites respeitados

- Sem cadastro público, telefone, integração com WhatsApp ou provedor novo.
- Perfil continua sendo um controle compacto sobre o chat.
- Persistir credenciais não torna durável o histórico da demonstração em RAM (Spec 058).
- Não altera prompts, recuperação documental, associações ou permissões.

### Divergências da visão

Nenhuma pendente. O usuário solicitou explicitamente em 05/11/2026 a substituição do nome de
usuário por código, permanência do acesso e conexão de aparelhos pelo Perfil. Esclareceu que a
equipe fornece os códigos agora e que cadastro pelo WhatsApp será posterior. Briefing e MVP
são atualizados na mesma decisão. A identificação do aparelho é implementada por cookie seguro;
IP compartilhado ou variável não é uma credencial.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A fatia reduz atrito para a conversa e o retorno.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Cadastro público e WhatsApp continuam posteriores.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso verificam recorrência e isolamento.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Entrar com um código fornecido pela equipe, retornar automaticamente neste navegador e consultar
o código em Perfil para conectar outros aparelhos à mesma conta.

## 2. Promessa testada

> Entro uma vez neste navegador e encontro em Perfil o código para acessar minha conta em outro.

## 3. Usuário primário

Síndicos profissionais e moradores já autorizados pela equipe.

## 4. Escopo

Entrada por código, provisionamento operacional, cookie persistente, retomada automática,
código copiável no Perfil e saída explícita apenas do aparelho atual.

## 5. Fora do escopo

Cadastro aberto, envio de códigos, recuperação por WhatsApp, fingerprint e autenticação por IP.

## 6. Pré-condições

Código provisionado pela equipe, segredo estável do servidor e armazenamento de credenciais
durável. Em demonstração local, arquivos privados em `.local/`; no modo real, PostgreSQL.

## 7. Requisitos funcionais

### RQ-6801 — Código fornecido

A entrada pede somente “Código de acesso”. Não existe botão de cadastro ou emissão pública.
Códigos desconhecidos, alterados, revogados e entradas malformadas não iniciam sessão. Uma
ferramenta operacional emite e rotaciona códigos para uma identidade escolhida explicitamente
pela equipe; a migração de um acesso sintético pode preservar seu identificador anterior.

### RQ-6802 — Aparelho lembrado

O servidor emite token aleatório em cookie HttpOnly, SameSite=Lax e Secure em HTTPS/produção.
O token é persistido somente por hash, não fica em localStorage e não depende de IP. Não há
expiração automática no servidor para esta sessão; o cookie dura até 400 dias e é renovado
no uso. Limites do navegador, limpeza de cookies, saída explícita e revogação podem exigir
nova entrada; a interface não promete persistência impossível após apagar dados do navegador.

Recarregar, abrir nova aba e voltar após reiniciar o navegador tentam restaurar a sessão antes
de pedir código. Falha de rede não é tratada como revogação e permite nova tentativa.

### RQ-6803 — Outro aparelho

Perfil mostra o código da própria conta e permite copiá-lo. O código é uma credencial: texto
próximo explica que quem o possui pode acessar a conta. Códigos não entram em URL, histórico
da conversa, logs ou fixtures reais. Conectar outro aparelho preserva usuário, permissões,
condomínios e histórico autorizado, criando sessão independente.

O histórico pertence à conta/condomínio/chat autorizado, nunca ao cookie do aparelho. Inclui
mensagens da pessoa e da Alvitra, conforme RQ-5801–5803 da Spec 058. Sair de um aparelho ou
entrar em outro não apaga nem transfere essas mensagens para outra conta. A continuidade exige
testes de acesso por código junto da recuperação dos dois lados; teste em RAM não certifica
persistência após perda do processo ou restauração de produção.

### RQ-6804 — Autorização e revogação

Código e sessão são validados no servidor antes da autorização por condomínio. Cabeçalhos de
desenvolvimento não substituem a sessão quando entrada por código está ativa. Sair revoga a
sessão atual e só limpa a interface após sucesso. Rotacionar o código revoga o anterior e suas
sessões, permitindo à equipe responder à perda de um aparelho. Contas bloqueadas não autenticam.

### RQ-6805 — Tentativas compartilhadas e persistentes

Antes de interpretar o corpo do login, reservar atomicamente uma tentativa no mesmo armazenamento
durável usado pelas instâncias. Limite inicial de dez tentativas por origem em 15 minutos e mil
tentativas globais em 15 minutos, incluindo entradas válidas e inválidas; os excessos não chegam
à verificação da credencial. As janelas iniciam no primeiro consumo; o PostgreSQL usa seu próprio
relógio. Reiniciar API ou alternar réplicas não renova a cota. Código/conta não são chaves de limite:
um atacante não pode bloquear seletivamente uma conta pelo código nem inferir sua existência.

A origem é a definida pelo servidor, transformada em HMAC com domínio próprio e segredo estável;
IP, código e cookie não são gravados no contador. O HMAC é dado operacional pseudonimizado,
não anonimizado. Contadores vencidos são descartados no próximo consumo, com cardinalidade
limitada pela cota global. No ambiente local o cofre/lock atende processos no mesmo volume;
isso não é solução de compartilhamento entre hosts. PostgreSQL serializa o consumo no banco.

Ao exceder, devolver 429 genérico e `Retry-After`, sem criar sessão. Falha/corrupção do contador,
migration ausente ou resposta inválida do banco devolve 503 genérico, sem fallback em RAM nem
emissão/remoção de cookie. Bloquear tentativas de login não revoga sessões já abertas. Proteção
de borda e budgets de upload/OCR/IA continuam gates separados da Spec 011.

## 8. Contratos

### RQ-6806 — Identidade canônica da sessão

O UUID retornado pelo login/cookie é a identidade canônica da conta no PostgreSQL, mesmo quando
`auth_subject` é diferente (por exemplo, em conta importada). A resolução privada reconhece esse
UUID e exige conta ativa antes de consultar membership/RLS. Identificadores legados não UUID
continuam resolvidos por auth_subject. Uma string no formato UUID é reservada à identidade
canônica: não pode cair no auth_subject de outra conta quando o UUID inexiste ou está bloqueado.
Não altera associações, permissões ou inventa conta. Sessão, catálogo, originais, fontes, chats e
histórico devem usar a mesma resolução; o cliente não escolhe a identidade por header.
Carteira, criação/saída/exclusão de condomínio e autorização de perfil também usam essa identidade
canônica, preservando as respectivas regras de manager/membership. As funções legadas não podem
listar, criar ou administrar condomínio em nome do auth_subject homônimo de outra conta.

- `POST /v1/access/login`: JSON `{ code }`, cookie e identidade pública sem credencial.
- `GET /v1/access/session`: sessão validada ou 401; renova o cookie.
- `GET /v1/access/code`: somente a própria sessão; devolve o código com `no-store`.
- `POST /v1/access/logout`: revoga a sessão atual e limpa o cookie.
- Erros de login são genéricos; reserva persistente antes do parsing, sem logs de IP, conforme RQ-6805.
- Modo real exige migration e segredo explícitos; ausência não ativa fallback sintético.

## 9. Requisitos não funcionais

Código com 128 bits de entropia derivada de HMAC-SHA256 e segredo aleatório de 256 bits. Sessões
com 256 bits aleatórios. Credenciais e tokens não são persistidos em texto puro. Formulário e
Perfil utilizáveis por teclado e em 320 px. Sem dependência externa nova. Adaptador PostgreSQL
e migration 040 preparados localmente não certificam concorrência ou implantação no destino:
isso exige ensaio sintético autorizado no banco e revisão independente antes do piloto.

## 10. Critérios de sucesso

Código fornecido entra; nova visita restaura sem digitação; outro aparelho entra na mesma conta;
IP igual não compartilha acesso; IP diferente não encerra a sessão; cabeçalho falso e código
inválido não autorizam; saída e rotação são efetivas. Gates de software e isolamento aprovados.

## 11. Questões em aberto

Cadastro e recuperação pelo WhatsApp serão especificados posteriormente, sem integração nesta fatia.
Em 09/11/2026, o usuário delimitou explicitamente o WhatsApp à abertura para todo o público.
O piloto fechado usa o código fornecido pela equipe e não depende dessa integração. A sessão
persistente e o histórico completo são obrigatórios já no piloto, não ficam adiados com WhatsApp.
Histórico durável de lançamento e implantação com várias réplicas seguem seus gates próprios.

### Decisão registrada para a evolução por telefone — 05/11/2026

Comportamento de produto aprovado, ainda não implementado nesta spec: cada novo aparelho informa
novamente o mesmo telefone e recebe um novo código temporário de uso único. Confirmar esse código
abre uma sessão independente da mesma conta, sem invalidar sessões dos outros aparelhos. Enviar,
reenviar, consumir ou expirar o código de uma tentativa não encerra sessões já autenticadas.
Sair encerra apenas a sessão atual. A confirmação deve pertencer à tentativa iniciada naquele
navegador; IP igual não dispensa código e IP diferente não impede uma confirmação válida.

Esse código temporário de confirmação terá ciclo de vida distinto do código permanente fornecido
na demonstração: a regra atual de rotação administrativa de RQ-6804 não se aplica à emissão de
um novo código temporário. Confirmar telefone não concede associações ou permissões de condomínio.
Os exemplos futuros estão separados dos critérios implementados em `acceptance.md`. Provedor,
entrega, vínculo seguro do telefone às contas existentes e recuperação exigem detalhamento antes
da implementação; nenhum serviço foi selecionado ou ativado por esta definição.

## Gate para mudar o status

Aceitação, rastreabilidade, testes de credenciais, sessões, isolamento e UI, cobertura e revisão
do diff da tarefa; nenhuma alteração de autorização ou prompt implícita.
