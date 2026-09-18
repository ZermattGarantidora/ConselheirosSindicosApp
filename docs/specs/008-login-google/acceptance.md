# Critérios de aceitação — Spec 008

Os critérios AC-801–AC-806 descrevem o comportamento esperado quando o recurso for reativado.
Enquanto a pausa temporária estiver vigente, aplica-se também o AC-807.

## AC-801 — Botão de entrada

**Dado** o modo real com a API configurada  
**Quando** a pessoa abre a entrada  
**Então** vê “Continuar com Google” junto do formulário de e-mail e senha.

## AC-802 — State anti-CSRF

**Dado** o início do OAuth  
**Quando** o callback recebe state ausente ou diferente do cookie HttpOnly  
**Então** nenhuma sessão é criada e a aplicação recebe erro genérico.

## AC-803 — Conta Google nova

**Dado** um perfil Google com `email_verified=true` ainda não cadastrado  
**Quando** o código é trocado com sucesso  
**Então** a conta é criada, a sessão é emitida e nenhum condomínio é associado.

## AC-804 — Conta existente

**Dado** um e-mail já cadastrado  
**Quando** o mesmo e-mail verificado entra pelo Google  
**Então** a conta existente é vinculada ao subject Google sem perder memberships ou histórico.

## AC-805 — Perfil não verificado

**Dado** um UserInfo sem e-mail verificado  
**Quando** o callback é processado  
**Então** o acesso é recusado e nenhum usuário ou sessão é criado.

## AC-806 — Configuração ausente

**Dado** que as credenciais OAuth não foram configuradas  
**Quando** a pessoa seleciona o botão  
**Então** a interface explica que o recurso ainda não está configurado e a API não inicia redirecionamento externo.

## AC-807 — Opção temporariamente ocultada

**Dado** que o login com Google está pausado por decisão do produto  
**Quando** a pessoa abre a entrada real  
**Então** não vê o botão, o divisor ou a instrução de login com Google e pode usar o formulário de e-mail e senha.
