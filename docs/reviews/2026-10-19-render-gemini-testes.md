# Publicação e cadastro Gemini — observações de 2026-10-19

## Autorização e limite

O usuário pediu deixar a demonstração pronta para testes, autorizou a transferência da chave
Gemini local somente ao segredo do serviço Render e aceitou o aviso de URL pública,
consumo de cota/saldo e ausência de teto monetário rígido. Autorizou também revisão independente,
merge e publicação da correção caso os testes passem e não haja falhas graves. ADR 0025,
Specs 025–027 e briefing §§1, 6, 10 e 12 delimitam esta rodada. Não se autorizaram dados reais,
contratação, mudança de plano, OpenAI, OCR externo, fotos ou banco persistente.

## Diagnóstico e ajustes operacionais

- A `main` estava no merge `725d911824e5f96841214f554242cf01976bb252` do PR 14.
- O Render ainda publicava `codex/defer-mfa-until-email`, commit `1600235`; o cliente
  `index-DytyPCPu.js` não tinha a tela atual de usuário nem a chamada `setup-turn`.
- Serviço e origem do Blueprint foram ajustados para `main`, preservando o plano Free.
- A publicação passou a servir `index-RcE-rAYV.js`, com entrada “Nome de usuário”.
- A chave foi salva somente no segredo do serviço autorizado; `GEMINI_ENABLED=true` e
  `GEMINI_MAX_ATTEMPTS=1`. Nenhum valor de credencial aparece neste registro ou no GitHub.
- `/v1/runtime` passou a informar `authMode: development`, `aiProvider: gemini` e saúde `ok`.
  Essa seleção não foi tomada isoladamente como prova de conversa funcionando.

## Falha concreta encontrada no teste real

A entrada inicialmente retornou indisponibilidade; uma segunda tentativa recebeu a pergunta
gerada sobre o nome. Ao enviar um nome fictício, a configuração voltou a falhar. O diagnóstico
local reproduziu HTTP 200 da Gemini com `intent`, `field`, `value`, `reply` e um campo extra
`risk_class`. O validador local corretamente rejeitou o contrato. Não há evidência suficiente
para atribuir a primeira indisponibilidade à mesma causa.

A correção faz `setup_turn` solicitar JSON Schema próprio no transporte, com os quatro campos
obrigatórios e sem propriedades adicionais. O prompt aprovado, modelo e validação local
estrita foram preservados. Conversas gerais continuam textuais, e o schema documental
continua separado. Não se descartam campos extras silenciosamente.

Os seis testes novos exercitam nome, quantidades, nome do condomínio, atualização nula,
campos obrigatórios, enum/tipo inválido e recusa de `risk_class`. Cinco cenários falharam
antes da correção; todos passaram depois. O controle de rejeição local permaneceu aprovado.
Um ensaio real local da correção retornou HTTP 200, reconheceu o nome fictício e perguntou
a quantidade de condomínios. O teste usa dados fictícios, não dados do usuário.

## Verificação e fechamento

Os gates e a rodada final no ambiente publicado devem ser registrados no PR que contém este
documento, identificando o commit efetivamente publicado. Esta observação inicial não aprova
uma jornada completa ainda não executada, nem substitui review independente ou CI.
O ensaio local é uma verificação funcional curta com modelo real, não aprovação dos 50 casos
semânticos nem medição de taxa de acerto. Não se declarou custo zero; o valor faturado não
foi consultado. Reinícios apagam o estado em memória do servidor; a lembrança de perfil
mínimo no navegador não persiste conversas ou arquivos e não é autenticação real.
