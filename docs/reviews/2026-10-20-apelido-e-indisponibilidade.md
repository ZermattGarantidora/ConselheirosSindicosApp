# Diagnóstico de indisponibilidade e correção do apelido

**Data:** 2026-10-20
**Estado:** correção local do apelido; indisponibilidade por memória não corrigida nesta fatia.

## Evidência de produção

No painel do serviço `alvitra-demo-sintetica`, o evento de 20/10/2026 às 14h33 registra
`Instance failed` para a instância `5475m`:

> Ran out of memory (used over 512MB) while running your code.

Fonte: https://dashboard.render.com/web/srv-db8gj3avcj2c73ab57t0/events .
O painel também registra uma falha por memória em 19/10/2026 às 16h56. A aba de logs da última hora
mostra inicializações às 14h26/14h27 e 14h30; após a falha, informa que os logs ao vivo estão
indisponíveis. Esses eventos comprovam a queda por memória, mas não identificam sozinhos qual
operação a causou ou se foi a mesma requisição que exibiu o aviso ao usuário.

A consulta anterior a `/health` e `/v1/runtime` respondeu `ok`, com `aiProvider: gemini` e
`authMode: development`. Isso não prova geração bem-sucedida nem saúde contínua da instância.
A publicação identificada no painel continua no commit `55e9f471917f9703848e3e2affb9eec88f4ee274`.
Não houve alteração no Render, no plano, nas credenciais nem no deploy.

## Defeito reproduzido localmente

Ao interpretar `manager_name: teste4`, `normalizedPersonName` rejeitava dígitos e lançava
`O nome interpretado é inválido.`. A rota `POST /v1/chat/setup-turn` capturava qualquer erro como
503 e devolvia `A Alvitra está indisponível no momento.`. O validador do perfil no navegador também
rejeitava o apelido, portanto era necessário corrigir ambos os lados.

A reprodução controlada não é um log da resposta real da Gemini à tentativa do usuário. O
diagnóstico inicial baseado apenas no nome era incompleto; o evento de memória foi confirmado
depois pelo painel autenticado.

## Correção e limites

- Apelidos confirmados com letras e números, incluindo `teste4`, são aceitos no servidor e no
  perfil local; a grafia do apelido é preservada. O identificador de acesso não muda.
- Números isolados, HTML e controles continuam rejeitados; limites de tamanho e contrato
  estruturado não foram relaxados.
- Falha de interpretação recebe 502 e `setup_interpretation_invalid`; indisponibilidade do
  provedor recebe 503 e `ai_provider_unavailable`. A saída pública não revela texto interpretado.
- O compositor conserva a mensagem após erro na configuração.
- Foram revistos os diffs incrementais de `setup-turn.ts`, `development-identity.ts`,
  `create-api.ts`, `App.tsx`, os três testes, a Spec 027 e sua rastreabilidade, preservando a
  correção documental anterior. Não houve mudança de prompt, provedor ou dependência.

Sete falhas foram reproduzidas nos testes novos antes da correção; os 28 testes focados passaram
depois. A falha inicial de formatação em `create-api.ts` foi corrigida sem alterar asserções.
Build web aprovado. O gate completo aprovou 755 testes em 112 arquivos, formatação, lint,
tipagem, 36 specs e scanner de segredos; cobertura de statements 89,77%, branches 83,55%,
functions 96,01% e lines 92,04%. `git diff --check` também passou.

A correção está local e não altera o site publicado. O consumo que excedeu 512 MB ainda exige
medição e tratamento próprios; não foi atribuída causa específica a upload, apelido ou modelo sem
evidência. Não foi realizada mudança de plano nem chamada paga de IA nesta investigação.
