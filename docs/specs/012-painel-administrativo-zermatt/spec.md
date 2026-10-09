# Spec 012 — Painel administrativo da Zermatt

**Status:** interface retirada pela Spec 016 e fora da visão canônica atual
**Responsável:** produto, segurança e operação  
**Atualizado em:** 2026-09-22

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese   | §§2, 4 e 6         | Permite acompanhar adoção e recorrência sem transformar o conteúdo privado do produto em fonte de prospecção.          |
| Público               | §§3 e 16           | Acompanha a entrada dos síndicos do público inicial por contagens agregadas, sem expor sua operação condominial.       |
| Proposta de valor     | §§5 e 10           | Mantém a confiança e a separação entre a orientação documental e os interesses comerciais da Zermatt.                  |
| Prioridades do MVP    | §§7, 14 e 21       | Adiciona apenas uma leitura operacional pequena sobre contas e acessos, sem antecipar automações ou integrações.       |
| Segurança e confiança | §§12 e 19          | Minimiza dados, restringe o acesso por identidade administrativa explícita e proíbe conteúdo de condomínios no painel. |
| Validação e métricas  | §§16–18            | Torna visíveis os indicadores de aquisição e recorrência necessários para decisões da Zermatt.                         |

### Limites respeitados

- O painel não lê, agrega, lista ou exibe condomínios, documentos, perguntas, respostas, citações ou comentários de feedback.
- O painel não classifica usuários por conteúdo, não infere intenção comercial e não inicia contato externo.
- Nome e e-mail de contas ativas podem ser exibidos exclusivamente para administração de contas; nenhum outro dado individual entra no painel.
- Oportunidades comerciais permanecem ausentes até existir um fluxo separado de consentimento explícito e revogável.
- WhatsApp, CRM, automações, exportação e integrações externas continuam fora do escopo.

### Divergências da visão

Nenhuma. A instrução explícita do usuário autoriza a área administrativa, mantendo a separação e a minimização exigidas pelo briefing.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Oferecer à equipe autorizada da Zermatt uma visão simples e responsiva da aquisição e do uso recente do produto, sem abrir qualquer dado de condomínio ou conteúdo documental.

## 2. Promessa testada

> Consigo saber se o produto está atraindo e retendo usuários sem acessar informações da vida condominial deles.

## 3. Usuário primário

Pessoa da equipe da Zermatt explicitamente autorizada a acompanhar o desempenho inicial do produto.

## 4. Escopo

- A conta administrativa usa o mesmo login seguro das demais contas e é reconhecida por uma lista de identificadores internos definida somente no servidor.
- Após autenticar, a conta administrativa entra diretamente no painel da Zermatt.
- O painel mostra apenas:
  - contas ativas cadastradas;
  - novos cadastros nos últimos sete dias;
  - usuários distintos que iniciaram sessão nos últimos sete dias;
  - nome e e-mail informados no cadastro das 100 contas ativas mais recentes;
  - data e hora da atualização dos indicadores.
- O painel informa que oportunidades consentidas ainda não são coletadas nesta fatia.
- A interface é mobile-first, acessível e possui saída de conta visível.

## 5. Fora do escopo

- Nomes, quantidades, endereços ou qualquer outro dado de condomínios.
- Documentos, versões, páginas, trechos, perguntas, respostas, citações e feedback textual.
- Telefone, endereço, identificador interno, senha, credencial ou qualquer perfil detalhado.
- Ranking, segmentação, lead scoring, inferência comercial ou cruzamento com conteúdo.
- Cadastro de administradores pela interface, recuperação de senha, MFA e gestão de permissões.
- Exportação, CRM, mensagens, campanhas ou contato automático.

## 6. Pré-condições

- A autenticação real está ativa com PostgreSQL e sessão válida.
- `ADMIN_USER_IDS` contém a lista de identificadores internos autorizados, configurada somente no servidor.
- A função de agregação administrativa está disponível para a função de banco usada pela API.

## 7. Requisitos funcionais

### RQ-1201 — Autorização administrativa explícita

Somente uma sessão autenticada cujo `userId` esteja em `ADMIN_USER_IDS` recebe a marca administrativa e acessa o endpoint do painel. Ausência de configuração ou conta comum resulta em negação segura. E-mail não é usado para conceder privilégio enquanto não houver verificação de titularidade.

### RQ-1202 — Métricas mínimas da Zermatt

O painel retorna contagens agregadas de contas ativas, novos cadastros em sete dias e usuários distintos com sessão criada em sete dias, acompanhadas do instante de atualização. Também retorna uma lista limitada às 100 contas ativas mais recentes com somente `displayName` e `email`.

### RQ-1203 — Separação do domínio condominial

A consulta do painel não referencia tabelas, funções ou campos de condomínios, associações, documentos, perguntas, respostas, citações ou feedback.

### RQ-1204 — Experiência administrativa dedicada

Uma conta administrativa autenticada abre diretamente o painel, recebe indicadores legíveis em celular e computador e pode encerrar a sessão. A navegação de condomínios não é apresentada nesse modo.

### RQ-1205 — Oportunidades somente com consentimento

Enquanto não existir contrato específico de consentimento, o painel apenas declara que nenhuma coleta comercial consentida está ativa. Não inventa, infere ou deriva oportunidades dos dados existentes.

### RQ-1206 — Diretório mínimo de contas

O nome e o e-mail são exibidos apenas como diretório operacional de contas cadastradas. A lista não inclui telefone, condomínio, conteúdo de uso, identificador interno, pontuação ou ação de contato, e não pode ser usada para inferir interesse comercial.

## 8. Contratos

- `GET /v1/admin/dashboard` exige cookie de sessão válido e autorização administrativa.
- `401` indica sessão ausente ou inválida; `403` indica conta autenticada sem permissão; nenhum dos dois revela a lista administrativa.
- Resposta de sucesso:

```json
{
  "metrics": {
    "activeAccounts": 0,
    "newAccountsLast7Days": 0,
    "activeUsersLast7Days": 0
  },
  "generatedAt": "2026-09-22T12:00:00.000Z",
  "commercialOpportunities": {
    "collectionActive": false
  },
  "accounts": [
    {
      "displayName": "Pessoa de teste",
      "email": "pessoa@example.test"
    }
  ]
}
```

- As respostas públicas de autenticação incluem `isAdmin`, calculado no servidor, sem expor critérios ou identificadores da lista.

## 9. Requisitos não funcionais

- A lista `ADMIN_USER_IDS` não é enviada ao cliente, registrada em logs nem persistida no repositório.
- A consulta administrativa deve ser parametrizada e executar uma única leitura agregada.
- A rota não aceita `condominium_id`, não retorna conteúdo de uso e limita a identidade individual a nome e e-mail da conta.
- A resposta administrativa usa `Cache-Control: no-store` e limita o diretório a 100 contas ativas.
- O diretório retorna somente nome e e-mail; o identificador interno usado na autorização não é enviado nessa lista.
- Cards, ícones e ações mantêm foco visível, rótulos acessíveis e alvos de pelo menos 44 px.
- A interface evita gráficos decorativos e prioriza leitura simples das três métricas.

## 10. Critérios de sucesso

- Uma conta autorizada chega ao painel após o login sem visualizar a área de condomínios.
- Uma conta comum recebe `403` no endpoint e segue para a experiência normal do produto.
- Os três indicadores correspondem aos dados sintéticos controlados pelos testes.
- O diretório exibe nome e e-mail das contas ativas controladas pelos testes e omite os demais campos.
- Testes determinísticos confirmam que a consulta não contém referências ao domínio condominial ou documental.
- A interface permanece utilizável em larguras de celular e computador.

## 11. Questões em aberto

- Qual fluxo separado registrará interesse comercial consentido e sua revogação?
- Quais papéis administrativos adicionais, se houver, serão necessários antes de produção?
- Qual política de retenção operacional será aprovada para sessões antes do piloto real?

## Gate para mudar o status

A implementação local pode avançar porque o escopo foi explicitamente aprovado e não diverge do briefing. Uso com dados reais permanece bloqueado pelos gates da Spec 011, pela definição de responsáveis e por revisão independente de segurança.
