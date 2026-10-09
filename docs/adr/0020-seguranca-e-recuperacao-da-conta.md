# ADR 0020 — Segurança, recuperação e sessões da conta

**Status:** aceito para implementação local controlada
**Data:** 2026-10-08

## Contexto

A autenticação própria da ADR 0011 entrega cadastro, login e sessão, mas não comprova posse do e-mail, não recupera senha, não oferece MFA e não permite ao usuário inspecionar outros acessos. A Spec 006 classificava esses controles como pré-requisitos para piloto público. O usuário autorizou explicitamente sua implementação em 2026-10-08.

Enviar e-mail por um fornecedor específico alteraria custo, subprocessadores e tratamento de dados. Nenhum fornecedor foi aprovado. Segredos TOTP também não podem ser guardados em texto puro.

## Decisão

- Novas contas locais exigem verificação por token aleatório de uso único antes de login.
- Verificação vale 24 horas; recuperação de senha vale 30 minutos; desafio MFA vale cinco minutos.
- Tokens e códigos de recuperação são persistidos somente por hash SHA-256.
- Redefinir senha revoga todas as sessões; trocar senha autenticada mantém somente a sessão atual.
- MFA usa TOTP de seis dígitos, SHA-1, período de 30 segundos e janela de um período.
- Segredos TOTP são cifrados com AES-256-GCM usando chave de 32 bytes fornecida pelo servidor.
- A ativação entrega códigos de recuperação uma única vez e armazena somente seus hashes.
- Sessões guardam rótulo genérico de dispositivo, criação, último uso, expiração e revogação. IP e user-agent completo não são persistidos.
- A entrega de e-mail é um adaptador. No desenvolvimento explícito, a API pode devolver uma URL local de ação para testes; isso é proibido em produção.
- Nenhum fornecedor de e-mail é adotado por esta decisão. Produção permanece bloqueada até ADR de fornecedor, região, retenção e contrato.
- Por decisão de produto em 2026-10-08, a prévia local não libera novas configurações ou ativações de MFA. Essa capacidade só volta a ser oferecida quando houver um adaptador de entrega real de e-mail aprovado e a experiência de recuperação tiver sido revista.
- Contas que já ativaram MFA continuam exigindo o segundo fator e podem desativá-lo; o adiamento não reduz silenciosamente a proteção existente nem bloqueia o acesso dessas contas.
- Contas locais existentes são marcadas como verificadas na migration para evitar bloqueio retroativo; novas contas obedecem ao novo fluxo. Contas Google continuam dependendo do e-mail verificado pelo provedor.

## Consequências

### Positivas

- Recuperação e segundo fator deixam de depender de suporte manual.
- Tokens vazados do banco não são diretamente utilizáveis.
- O usuário consegue encerrar acessos que não reconhece.
- A arquitetura permanece substituível e sem fornecedor externo silencioso.

### Negativas e riscos aceitos

- A equipe passa a custodiar uma chave criptográfica adicional.
- Perder a chave torna segredos TOTP existentes inutilizáveis e exige recuperação por senha/e-mail.
- A prévia local valida o fluxo, mas não valida entrega, reputação, bounce ou disponibilidade de um provedor real.
- O código TOTP permanece disponível para proteger contas já ativadas, mas sua configuração fica dormente até a decisão do provedor e da experiência de recuperação.
- TOTP não oferece a resistência a phishing de passkeys; passkeys ficam para decisão posterior.

## Alternativas consideradas

### SMS ou WhatsApp

Rejeitados nesta fatia por custo, dependência, tratamento de telefone e risco de troca de SIM.

### Segredo TOTP em texto puro

Rejeitado porque uma leitura indevida do banco permitiria gerar códigos válidos.

### Token de recuperação reutilizável

Rejeitado por ampliar o impacto de vazamento e não permitir revogação confiável.

### Escolher agora um SaaS de e-mail

Adiado até avaliação de custo, privacidade, região, retenção, contrato e operação.

## Critérios para revisitar

- escolha do fornecedor de e-mail para produção;
- exigência de MFA por papel ou risco;
- adoção de passkeys/WebAuthn;
- recuperação assistida e suporte a usuários sem acesso ao segundo fator.
