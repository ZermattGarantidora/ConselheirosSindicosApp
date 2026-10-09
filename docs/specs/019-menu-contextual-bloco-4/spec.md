# Spec 019 — Menu contextual, Bloco 4 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Permite trocar o contexto documental autorizado sem abandonar a conversa. |
| Proposta e experiência | §§5 e 6 | Mantém o chat como experiência principal e mostra controles apenas de modo contextual. |
| Prioridade autorizada | §7, Bloco 4 | Entrega o menu com Condomínios, Meus dados e Preferências. |
| Memória e evidências | §§8 e 9 | Trocar contexto recarrega somente o histórico autorizado; não muda recuperação ou citações. |
| Segurança | §10 | A lista e a troca passam por resolução de associação no servidor; ID do cliente não autoriza acesso. |
| Validação | §§13 e 14 | Reduz atrito para retomar o condomínio correto sem reintroduzir uma tela paralela. |

### Limites respeitados

- Não cria formulário longo de condomínio, perfil editável, configurações ou dashboard.
- “Meus dados” e “Preferências” indicam que serão tratados contextualmente na conversa; sua implementação pertence aos blocos posteriores.
- A criação opcional começa pela conversa e não executa ação externa ou cadastro silencioso.
- Blocos 2, 5, 6, 7 e 8 não são implementados.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente o início do Bloco 4.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar no canto superior direito um menu compacto para visualizar e trocar condomínios autorizados e iniciar pedidos contextuais pela conversa.

## 2. Escopo

- menu “Condomínios”, “Meus dados” e “Preferências”;
- `GET /v1/chat/condominiums`, que lista somente contextos autorizados;
- troca de condomínio após nova validação por `GET /context` e recarga do histórico;
- atalho conversacional para solicitar a inclusão de outro condomínio.

## 3. Fora do escopo

- criar condomínio por formulário ou executar criação sem confirmação;
- edição de perfil, preferências persistentes ou coleta de dados pessoais;
- qualquer mudança no pipeline documental, vetorial, evidências ou conta.

## 4. Requisitos funcionais

### RQ-1901 — Menu contextual

Após iniciar um contexto autorizado, a pessoa pode abrir no canto superior direito um menu com as três entradas previstas no briefing.

### RQ-1902 — Condomínios autorizados

O servidor lista somente os condomínios cuja associação está vigente. Ao escolher um item, o cliente revalida o contexto e recarrega apenas o histórico autorizado.

### RQ-1903 — Criação pela conversa

O menu oferece um atalho que preenche uma solicitação no compositor; ele não cria registros nem executa ação externa automaticamente.

## 5. Critérios de sucesso

- o menu não vira uma navegação paralela;
- uma tentativa de trocar para ID não autorizado continua negada pelo servidor;
- perguntas, upload e fontes seguem o novo contexto autorizado depois da troca;
- a criação opcional começa por linguagem natural e requer ação explícita posterior.
