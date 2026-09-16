# Spec 003 — Experiência local de teste

**Status:** aprovada para implementação local
**Responsável:** produto e engenharia
**Atualizado em:** 2026-09-15

## 0. Alinhamento com a visão do projeto

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese   | §§1, 2, 9 e 11     | Permite percorrer a entrada, cadastrar o contexto, enviar documentos essenciais e chegar à primeira pergunta com menos fricção em um ambiente sintético.   |
| Público               | §3                 | Representa a entrada de um síndico profissional sem afirmar que já existe autenticação de produção.                                                        |
| Proposta de valor     | §§5 e 10           | Mantém a conversa natural, o contexto por condomínio e a verificação de fontes como centro da experiência.                                                 |
| Prioridades do MVP    | §§7, 11 e 14       | Detalha a interface local de autenticação demonstrativa, criação do contexto e envio inicial de PDFs sintéticos.                                           |
| Segurança e confiança | §§9 e 12           | Preserva autorização no servidor, exige confirmação humana de aplicabilidade e limita cadastro, arquivos e memória ao adaptador local de dados sintéticos. |
| Validação             | §§16 e 17          | Reduz o tempo até o primeiro valor e permite testar a compreensão do fluxo inicial.                                                                        |

### Limites respeitados

- Não implementa autenticação real, cadastro de usuário, recuperação de senha ou coleta de credenciais.
- Não cria condomínio, membership ou documento em banco persistente ou ambiente de produção.
- Não habilita envio de mensagens, ofertas comerciais, integrações ou ações externas.
- Dados reais, pilotos e provedores externos permanecem fora do escopo conforme os ADRs vigentes.

### Divergências da visão

Nenhuma. O acesso apresentado é explicitamente demonstrativo e não substitui a autenticação prevista no MVP.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que uma pessoa percorra, no navegador local, a tela de acesso demonstrativo, escolha ou cadastre um condomínio sintético com seus PDFs iniciais e faça uma primeira pergunta com contexto autorizado.

## 2. Promessa testada

> Em poucos passos, o síndico entende onde começa, como escolhe seu condomínio e quando o conselheiro pode responder com segurança.

## 3. Usuário primário

Síndico profissional que experimenta o protótipo local antes de qualquer piloto com dados reais.

## 4. Escopo

- Tela inicial de acesso demonstrativo antes da conversa.
- Onboarding local para escolher os condomínios sintéticos existentes ou abrir um cadastro completo de teste.
- Cadastro sintético com nome, CNPJ, endereço, contato, administradora e quantidade de unidades.
- Envio obrigatório da ata de assembleia geral de constituição do condomínio e envio opcional de outros PDFs.
- Extração local imediata de PDFs textuais enviados pelo cadastro para disponibilizá-los na memória documental do chat durante a execução da API.
- Lista móvel pesquisável para trocar de condomínio sem misturar conversas entre contextos.
- Endpoint de criação restrito ao processo que usa o repositório de identidade de desenvolvimento.
- Associação de gestor exclusivamente à identidade de desenvolvimento, em memória e durante a execução local.
- Estilo visual azul e branco alinhado à presença pública da Zermatt Garantidora.

## 5. Fora do escopo

- Login, senha, sessão, SSO, convite, recuperação de conta ou gestão de usuários reais.
- Persistência de condomínio criado em banco, storage, cache distribuído ou ambiente Neon.
- Upload de dados ou documentos reais e qualquer ação externa.
- Persistência da memória criada depois que o processo local da API for encerrado.

## 6. Pré-condições

- A API foi iniciada sem `DATABASE_URL`, usando exclusivamente dados sintéticos.
- O usuário entende que o acesso e os condomínios criados são demonstrativos.

## 7. Requisitos funcionais

### RQ-301 — Entrada demonstrativa

A primeira tela deve informar que o acesso é apenas de demonstração, não deve solicitar nem transmitir credenciais reais e deve levar ao onboarding local.

### RQ-302 — Criação local de condomínio

No ambiente de desenvolvimento, a pessoa pode criar um identificador de condomínio de teste. A API concede uma membership de gestor em memória somente para a identidade de desenvolvimento e autoriza o contexto criado.

### RQ-303 — Isolamento e ausência de evidência

Um condomínio criado no teste não recebe documentos ou evidências automaticamente. Uma pergunta nele deve seguir a política de abstenção, sem reutilizar fontes de outro condomínio.

### RQ-304 — Limite do endpoint de teste

O endpoint de criação não deve ser registrado quando a aplicação usa o repositório persistente ou quando o registro de desenvolvimento não foi habilitado explicitamente.

### RQ-305 — Identidade visual

As superfícies de login, onboarding e conversa devem usar a paleta azul e branca da Zermatt, mantendo contraste legível nos controles principais.

### RQ-306 — Troca de condomínio no mobile

Em telas estreitas, a ação “Trocar condomínio” deve abrir uma lista pesquisável de contextos sintéticos, com seleção do condomínio atual e acesso à criação de teste. A lista não deve exibir mensagens ou dados de outro contexto.

### RQ-307 — Saída rápida da conversa no mobile

Na conversa móvel, uma seta circular destacada no canto superior esquerdo e um arraste horizontal devem levar à lista de condomínios. O arraste vertical deve continuar permitindo a rolagem normal das mensagens. A lista de condomínios não precisa exibir uma seta de retorno no cabeçalho.

### RQ-308 — Histórico por usuário e condomínio

Perguntas e respostas persistidas devem poder ser carregadas novamente para o usuário autenticado no condomínio selecionado, em ordem cronológica e com limite de quantidade. A consulta deve usar o escopo autorizado e nunca retornar mensagens de outro usuário ou condomínio.

### RQ-309 — Cadastro completo no fluxo móvel

O botão `+` da lista de condomínios deve abrir uma página própria de cadastro. O formulário deve solicitar nome, CNPJ, cidade e UF e oferecer campos complementares de endereço, contato, administradora e quantidade de unidades, deixando claro que o ambiente aceita apenas dados sintéticos.

### RQ-310 — Ata de constituição obrigatória

O cadastro deve exigir um PDF identificado como ata de assembleia geral de constituição do condomínio. Outros PDFs podem ser anexados no mesmo fluxo. Cada arquivo deve ser enviado somente depois da criação e autorização do contexto correspondente e armazenado sob o `condominium_id` resolvido no servidor.

### RQ-311 — Memória documental local

No adaptador de desenvolvimento, PDFs textuais aceitos e confirmados pelo usuário devem ser extraídos, divididos por página e adicionados ao índice em memória do condomínio. Documento ilegível ou sem texto deve permanecer salvo para revisão e não pode ser usado como evidência. Nenhum trecho pode ser recuperado por outro condomínio.

## 8. Contratos

Em modo de desenvolvimento, `POST /v1/development/test-condominiums` aceita o identificador e um perfil sintético com `name`, `cnpj`, `address`, `contact`, `administrationCompany` e `unitCount`. O endpoint normaliza o CNPJ, retorna identificador, perfil e permissões, responde `409` quando a mesma identidade já criou aquele identificador e não existe fora do modo de desenvolvimento.

`GET /v1/development/test-condominiums` lista somente os perfis criados pela identidade de desenvolvimento atual. `POST /v1/condominiums/:condominiumId/documents` continua aceitando PDF e, no modo local, informa também se o arquivo já está disponível na memória, aguarda confirmação ou precisa de revisão.

## 9. Requisitos não funcionais

- A tela deve funcionar por teclado nos controles principais.
- Nenhuma credencial ou dado real deve ser solicitado ou registrado pelo fluxo demonstrativo; a interface deve orientar o uso exclusivo de informações e PDFs sintéticos.
- A criação em memória termina junto com o processo local da API.

## 10. Critérios de sucesso

- Uma pessoa consegue chegar à conversa e enviar uma pergunta sem editar código ou URL.
- O contexto criado retorna abstenção sem evidência, preservando a segurança documental.
- A diferenciação entre demonstração local e autenticação de produção permanece clara.
- O usuário conclui o cadastro com a ata obrigatória e consegue consultar o conteúdo de um PDF textual sem reiniciar a API.

## 11. Questões em aberto

- Qual provedor de identidade atende à política de dados aprovada para o piloto?
- Quais campos e documentos serão obrigatórios no cadastro de produção após validação com síndicos?

## Gate para implementação local

Esta spec autoriza somente o fluxo local com dados sintéticos. Qualquer persistência ou autenticação real exige decisão e política específicas.
