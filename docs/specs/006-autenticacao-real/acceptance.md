# Critérios de aceitação — Spec 006

**Status:** aprovado para implementação local
**Atualizado em:** 2026-09-18

## AC-601 — Criar conta persistente

**Dado** um banco persistente e um e-mail sintético ainda não cadastrado
**Quando** a pessoa envia nome, e-mail e senha válidos
**Então** a API cria um usuário ativo
**E** responde `201` sem retornar o hash da senha
**E** emite um cookie de sessão HttpOnly.

## AC-602 — Rejeitar entrada inválida

**Dado** um cadastro com nome vazio, e-mail inválido ou senha menor que o mínimo
**Quando** a pessoa envia o formulário
**Então** a API responde `400`
**E** não cria usuário nem sessão.

## AC-603 — Evitar duplicidade

**Dado** um e-mail já cadastrado, inclusive com capitalização diferente
**Quando** a pessoa tenta criar outra conta
**Então** a API responde `409`
**E** não cria uma segunda identidade.

## AC-604 — Autenticar e restaurar sessão

**Dado** uma conta ativa
**Quando** a pessoa informa credenciais corretas no login
**Então** a API responde `200` e emite uma sessão
**E** `GET /v1/auth/session` retorna somente o usuário autenticado.

## AC-605 — Negar credencial incorreta

**Dado** um e-mail existente ou inexistente
**Quando** a senha informada estiver errada
**Então** a API responde `401` com mensagem genérica
**E** não emite sessão.

## AC-606 — Encerrar sessão

**Dado** uma sessão ativa
**Quando** a pessoa faz logout
**Então** o servidor revoga o token e limpa o cookie
**E** a mesma sessão não acessa mais rotas protegidas.

## AC-607 — Impedir cabeçalho de desenvolvimento no modo real

**Dado** a API configurada com persistência e autenticação real
**Quando** uma chamada envia somente `x-development-user-id`
**Então** a API responde `401`
**E** não usa a identidade sintética para autorizar a operação.

## AC-608 — Preservar isolamento

**Dado** duas contas com memberships em condomínios distintos
**Quando** cada conta consulta histórico, documentos ou respostas
**Então** cada uma recebe somente o contexto autorizado pela própria membership.

## AC-609 — Manter demonstração local explícita

**Dado** a API iniciada sem `DATABASE_URL`
**Quando** a pessoa abre o cliente
**Então** o acesso continua identificado como demonstração
**E** nenhum cadastro é anunciado como persistente.

## AC-610 — Apresentar propósito e caminhos de acesso

**Dado** uma pessoa que abre o link sem uma sessão autenticada
**Quando** a aplicação termina de identificar o ambiente
**Então** ela apresenta primeiro o propósito do Conselheiro Documental
**E** oferece ações separadas para entrar e criar uma conta quando o ambiente é persistente
**E** organiza conteúdo e ações em uma coluna confortável para telas estreitas
**E** mantém visível que os documentos são separados por condomínio e dependem de autorização.

## AC-611 — Recuperar de uma verificação pendente

**Dado** que a rota de verificação inicial não responde
**Quando** o limite de espera é atingido
**Então** a interface sai do estado “Preparando seu acesso”
**E** oferece um caminho para voltar à apresentação
**E** não mantém os botões de acesso bloqueados indefinidamente.
