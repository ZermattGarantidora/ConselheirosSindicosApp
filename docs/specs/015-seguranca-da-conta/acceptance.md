# Critérios de aceitação — Spec 015

**Status:** implementado e validado localmente; novas ativações de MFA adiadas até a entrega real de e-mail
**Atualizado em:** 2026-10-08

## AC-1501 — Nova conta exige verificação (P0)

**Dado** um e-mail sintético ainda não cadastrado
**Quando** a pessoa conclui o cadastro local
**Então** a conta é criada sem sessão autenticada
**E** um token de verificação de uso único e validade limitada é emitido
**E** nenhuma rota de condomínio fica acessível antes da confirmação.

## AC-1502 — Confirmar e-mail uma única vez (P0)

**Dado** um token de verificação válido
**Quando** ele é confirmado
**Então** o e-mail é marcado como verificado
**E** o mesmo token não pode ser reutilizado.

## AC-1503 — Reenvio sem enumeração (P0)

**Dado** um e-mail existente, ausente, já verificado ou vinculado somente ao Google
**Quando** alguém solicita novo link
**Então** a resposta pública é idêntica
**E** somente uma conta local não verificada pode originar entrega.

## AC-1504 — Login não verificado (P0)

**Dado** senha correta de conta local não verificada
**Quando** a pessoa tenta entrar
**Então** nenhuma sessão é criada
**E** a interface orienta a confirmar o e-mail sem expor detalhes adicionais.

## AC-1505 — Solicitar recuperação sem enumeração (P0)

**Dado** um e-mail existente ou inexistente
**Quando** alguém seleciona “Esqueci minha senha”
**Então** a API retorna a mesma confirmação genérica
**E** somente conta local ativa e verificada recebe token de recuperação.

## AC-1506 — Redefinir senha e revogar sessões (P0)

**Dado** um token de recuperação válido
**Quando** uma nova senha válida é confirmada
**Então** o hash é substituído
**E** todas as sessões anteriores são revogadas
**E** o token e outros tokens de reset deixam de funcionar.

## AC-1507 — Rejeitar token inválido ou expirado (P0)

**Dado** token ausente, inválido, consumido ou expirado
**Quando** a confirmação é solicitada
**Então** nenhuma conta, senha ou sessão é alterada
**E** a resposta não revela a conta associada.

## AC-1508 — Trocar senha autenticada (P0)

**Dado** uma sessão válida e a senha atual correta
**Quando** a pessoa escolhe uma nova senha válida
**Então** a sessão atual permanece ativa
**E** todas as outras sessões são revogadas
**E** a senha anterior deixa de autenticar.

## AC-1509 — Adiar nova ativação de MFA sem e-mail real (P0)

**Dado** uma sessão válida e somente a prévia local de e-mail configurada
**Quando** a pessoa abre a segurança da conta ou tenta preparar ou ativar MFA
**Então** a interface explica que a capacidade será liberada com o envio real de e-mails
**E** não exibe chave, URI ou códigos de recuperação
**E** os endpoints de preparação e ativação retornam indisponibilidade sem persistir um novo segredo.

## AC-1510 — Ativar MFA e emitir recuperação (P0)

**Dado** entrega real de e-mail aprovada, um segredo pendente e código TOTP válido
**Quando** a ativação é confirmada
**Então** o MFA fica ativo
**E** códigos de recuperação são exibidos uma única vez
**E** somente hashes desses códigos permanecem armazenados.

## AC-1511 — Exigir segundo fator no login (P0)

**Dado** uma conta com MFA ativo e senha correta
**Quando** o login é solicitado
**Então** nenhuma sessão é criada
**E** a API retorna apenas um desafio curto e limitado.

## AC-1512 — Concluir desafio MFA (P0)

**Dado** um desafio válido
**Quando** a pessoa informa TOTP válido ou código de recuperação ainda não usado
**Então** uma sessão é criada
**E** o desafio é consumido
**E** código de recuperação usado não funciona novamente.

## AC-1513 — Limitar tentativas MFA (P0)

**Dado** um desafio MFA
**Quando** cinco códigos inválidos são enviados ou o prazo expira
**Então** o desafio é bloqueado
**E** nenhuma sessão é criada.

## AC-1514 — Desativar MFA com confirmação (P0)

**Dado** MFA ativo, inclusive quando novas ativações estão temporariamente indisponíveis
**Quando** a pessoa confirma senha e TOTP ou recuperação válidos
**Então** segredo e códigos deixam de autenticar
**E** outras sessões são revogadas.

## AC-1515 — Listar somente as próprias sessões (P0)

**Dado** uma sessão autenticada
**Quando** a pessoa abre o perfil
**Então** vê somente suas sessões, com dispositivo reduzido, criação, último uso, expiração e indicação da atual
**E** não recebe IP, token ou sessão de outra conta.

## AC-1516 — Revogar dispositivo (P0)

**Dado** duas sessões da mesma conta
**Quando** uma delas revoga a outra
**Então** a sessão alvo perde acesso imediatamente
**E** a sessão atual permanece ativa.

## AC-1517 — Revogar a sessão atual (P0)

**Dado** uma sessão autenticada
**Quando** ela própria é revogada
**Então** o cookie é limpo
**E** a interface volta à entrada.

## AC-1518 — Proteger segredos e produção (P0)

**Dado** banco, logs e respostas da API
**Quando** os fluxos de conta são executados
**Então** não aparecem senha, token persistido, segredo TOTP, código de recuperação ou URL com token em logs
**E** a prévia local de e-mail não pode ser ativada em produção.

## AC-1519 — Falha criptográfica segura (P0)

**Dado** chave de criptografia ausente ou inválida
**Quando** o servidor persistente inicia ou alguém tenta configurar MFA
**Então** a capacidade falha fechada com mensagem operacional
**E** nenhum segredo é persistido sem criptografia.

## AC-1520 — Isolamento de conta e condomínio (P0)

**Dado** duas contas com condomínios distintos
**Quando** usam verificação, recuperação, MFA ou sessões
**Então** cada ação alcança somente a própria identidade
**E** nenhum controle de conta concede membership ou acesso documental adicional.
