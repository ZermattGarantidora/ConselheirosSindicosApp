# Resumo de custos e assinaturas para o MVP

**Data:** 08/10/2026
**Status:** estimativa para decisão; nenhuma nova contratação foi aprovada

Para colocar o aplicativo em um teste real, não é necessário assinar muitos serviços. A estrutura mínima é: **API de IA paga, um banco PostgreSQL, uma hospedagem, um provedor de e-mail e um domínio**. Não é preciso pagar dois bancos, dois provedores de hospedagem ou uma assinatura comum do ChatGPT para o aplicativo funcionar.

Os valores abaixo são preços públicos ou reservas de orçamento em dólares, antes de impostos e câmbio. Consumo de IA, banco e hospedagem varia conforme uso.

## O que precisa ser contratado

| Item                        | Necessidade                  | Opções resumidas                                                      | Recomendação inicial                                                                                  |                     Reserva mensal |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------: |
| IA do aplicativo            | Obrigatório                  | Gemini API, OpenAI API ou outro provedor aprovado                     | Gemini API paga, já integrada ao projeto                                                              |           US$ 10 a 50 conforme uso |
| Banco e arquivos            | Obrigatório                  | Neon **ou** Supabase                                                  | Neon pago pelo menor risco de integração; Supabase Pro se a empresa preferir custo mais previsível    |              US$ 10 a 25 no início |
| Hospedagem da aplicação     | Obrigatório                  | Railway, Render ou infraestrutura própria                             | Railway Pro para API e worker; site pode ficar na mesma plataforma ou em hospedagem estática gratuita |                        US$ 20 a 40 |
| E-mail de segurança         | Obrigatório                  | Resend, Postmark ou Amazon SES                                        | Resend; gratuito no teste pequeno e Pro quando o limite diário não bastar                             |                         US$ 0 a 20 |
| Domínio e DNS               | Obrigatório                  | Domínio existente ou novo `.com.br`; DNS do Registro.br ou Cloudflare | Usar domínio corporativo existente; criar subdomínios para app e e-mail                               | cerca de R$ 40 por ano se for novo |
| Monitoramento               | Obrigatório para piloto real | Logs da hospedagem, Better Stack ou Sentry                            | Começar com logs da hospedagem e Better Stack gratuito                                                |                 US$ 0 inicialmente |
| Código e testes automáticos | Obrigatório                  | GitHub Free ou Team                                                   | Free enquanto os limites e controles forem suficientes                                                |                 US$ 0 inicialmente |

## 1. Inteligência artificial

O aplicativo não usa uma assinatura comum de ChatGPT Plus, Gemini Advanced ou Claude Pro. Ele usa uma **API**, cobrada pelo volume processado. Uma assinatura pessoal não fornece os créditos da API de produção.

O projeto já está preparado para usar `gemini-3.5-flash-lite` nas respostas e na interpretação de imagens. Na modalidade paga, o preço publicado é de **US$ 0,30 por milhão de tokens de entrada e US$ 2,50 por milhão de tokens de saída**. O embedding multimodal `gemini-embedding-2` custa **US$ 0,20 por milhão de tokens de texto** e aproximadamente **US$ 0,00012 por imagem**.

Proposta para o piloto:

- ativar cobrança na Gemini API e proibir o uso da cota gratuita com dados reais;
- começar com teto de **US$ 25 por mês** e alertas de 50%, 75% e 90%;
- medir custo por resposta, foto, documento e condomínio;
- aumentar o teto somente depois de observar consumo e qualidade;
- não habilitar busca web ou ferramentas pagas que não façam parte do fluxo aprovado.

### OCR de PDFs escaneados

O desenvolvimento atual possui uma opção de OCR pela OpenAI para dados sintéticos. O modelo configurado, `gpt-5.6-luna`, publica **US$ 0,20 por milhão de tokens de entrada e US$ 1,20 por milhão de tokens de saída**, além do consumo gerado pelas imagens das páginas.

Antes de produção, deve-se escolher entre:

- aprovar também a OpenAI e manter duas contas de IA;
- consolidar OCR e respostas na Gemini, se os testes comprovarem qualidade suficiente;
- adotar OCR local ou especializado posteriormente.

A recomendação financeira é tentar consolidar no provedor já aprovado, mas somente se os testes mostrarem que a qualidade do OCR não caiu.

## 2. Banco de dados e armazenamento dos documentos

É preciso escolher **Neon ou Supabase**, nunca pagar os dois para a mesma produção.

### Neon

- Já foi usado nos testes de integração do projeto, reduzindo risco técnico.
- Plano gratuito serve para desenvolvimento, não deve ser a base de uma produção com documentos reais.
- O plano Launch é por consumo, sem mensalidade mínima publicada.
- Preços de referência atuais: aproximadamente **US$ 0,106 por unidade de computação por hora** e **US$ 0,35 por GB ao mês**.
- Uma referência oficial de carga pequena estima cerca de **US$ 7,66 por mês**, mas o valor real depende de atividade, backups e tamanho dos documentos.

### Supabase

- O plano Pro começa em **US$ 25 por mês**.
- Inclui um projeto Micro, 8 GB de banco, backups diários retidos por sete dias e 250 GB de saída de dados.
- O plano gratuito pausa por inatividade, não tem backup automático e oferece somente 500 MB de banco.
- Autenticação e storage do Supabase não são necessários no início, porque o projeto já possui autenticação própria e hoje guarda os originais no PostgreSQL.

### Recomendação

Usar **Neon pago** se a prioridade for aproveitar o que já foi integrado e pagar conforme o uso. Usar **Supabase Pro** se a direção preferir uma mensalidade mais previsível e um pacote com backup diário. Em qualquer opção, região, retenção, restauração, exclusão e contrato LGPD precisam ser aprovados.

Não é necessário contratar Pinecone ou outro banco vetorial: o projeto já usa `pgvector` no PostgreSQL. Também não é necessário contratar S3 ou R2 agora, pois PDFs e fotos estão armazenados no próprio banco. Se o volume crescer, Cloudflare R2 ou Amazon S3 podem substituir esse armazenamento mediante nova decisão.

## 3. Hospedagem do site, API e worker

O sistema possui site React, API Node e processamento de documentos em worker. A hospedagem precisa executar a API e o worker de forma contínua.

### Railway

- Hobby: mínimo de **US$ 5 por mês**, apropriado para desenvolvimento individual.
- Pro: mínimo de **US$ 20 por mês**, com os primeiros US$ 20 aplicados ao consumo.
- Cobra CPU, memória, armazenamento e tráfego conforme uso.
- É a opção inicial recomendada por permitir colocar API e worker no mesmo projeto com configuração simples.

### Render

- Workspace Pro: **US$ 25 por mês**, além da computação.
- Uma API pequena e um worker de 512 MB custam cerca de **US$ 7 por serviço**, levando a um início aproximado de US$ 39 por mês.
- Site estático e TLS podem ser gratuitos.

### Outras opções

- Vercel ou Cloudflare Pages podem hospedar apenas o site gratuitamente, mas ainda seria necessária outra hospedagem para API e worker.
- AWS, Google Cloud e Azure oferecem mais controle, porém aumentam a configuração e a operação; não são a primeira escolha para o MVP.

## 4. E-mail de verificação e recuperação

Resumo da pauta específica de e-mail:

- **Resend:** gratuito até 3.000 e-mails por mês, limitado a 100 por dia; Pro por US$ 20 com 50.000 por mês.
- **Postmark:** gratuito até 100 por mês; Basic por US$ 15 com 10.000 por mês.
- **Amazon SES:** aproximadamente US$ 0,16 por mil no Essentials ou US$ 0,10 por mil na modalidade à la carte, com mais trabalho operacional.

Recomendação: **Resend para o MVP**. A análise completa está em [Pauta para decisão do provedor de e-mail](2026-10-08-pauta-provedor-email.md).

## 5. Domínio, DNS e caixa corporativa

- Um domínio `.com.br` custa normalmente **R$ 40 por ano** no Registro.br.
- Se a empresa já tiver um domínio, basta criar subdomínios como `app.empresa.com.br` e `conta.empresa.com.br`.
- DNS, certificado TLS e proteção básica podem começar no plano gratuito da Cloudflare ou ser fornecidos pela própria hospedagem.
- Se já houver Google Workspace ou Microsoft 365, usar a caixa corporativa existente para suporte não gera nova assinatura.
- Se não houver e-mail corporativo, reservar aproximadamente **R$ 25 a R$ 50 por usuário por mês** para Google Workspace ou Microsoft 365 Business Basic.

## 6. Monitoramento, logs e alertas

Para o piloto, os logs da hospedagem podem ser combinados com o plano gratuito do Better Stack, que publica dez monitores, uma página de status e até 3 GB de logs com retenção curta. Planos pagos devem ser avaliados quando houver equipe de plantão, maior retenção ou exigência de auditoria.

É necessário definir alertas para:

- aplicativo fora do ar;
- falha no worker;
- aumento anormal de chamadas de IA;
- falha de banco;
- e-mails rejeitados;
- aproximação dos tetos mensais.

## 7. Código, equipe e agente de desenvolvimento

O GitHub Free inclui repositórios privados e 2.000 minutos mensais de GitHub Actions. O GitHub Team custa **US$ 4 por usuário por mês** e pode ser adotado se a empresa precisar de controles adicionais de equipe.

Um agente de desenvolvimento é útil, mas não é uma dependência do aplicativo:

- **ChatGPT Business:** US$ 25 por usuário no pagamento mensal ou US$ 20 por usuário no anual, com mínimo de duas licenças; inclui ChatGPT, Work e Codex.
- **GitHub Copilot Business:** US$ 19 por desenvolvedor por mês.
- É possível usar apenas a ferramenta atual; não há motivo para assinar as duas sem necessidade da equipe.

Essas assinaturas ajudam a desenvolver e manter o software, mas não pagam as chamadas de IA feitas pelos usuários do aplicativo.

## 8. Cobrança dos clientes e custos futuros

O meio de pagamento só será necessário quando a assinatura do aplicativo for cobrada. Não é uma contratação obrigatória para o teste atual.

Opções:

- **Stripe:** sem mensalidade padrão; cartões nacionais publicados a 3,99% mais R$ 0,39 por transação, boleto a R$ 3,45 e Pix a 1,19% quando disponível.
- **Mercado Pago:** sem custo de acesso à API; as tarifas variam conforme forma de pagamento e prazo de recebimento.

Também devem ser orçados separadamente antes de usuários reais:

- revisão jurídica e LGPD dos fornecedores e da política de privacidade;
- teste de segurança ou pentest independente;
- suporte ao usuário e resposta a incidentes;
- contabilidade, impostos e conciliação das assinaturas;
- eventual seguro cibernético.

Esses itens dependem de cotação e podem custar mais do que as assinaturas técnicas.

## O que não precisa ser assinado agora

- ChatGPT Plus, Gemini Advanced ou Claude Pro para alimentar o aplicativo.
- Neon e Supabase ao mesmo tempo.
- Resend e Postmark ao mesmo tempo.
- Pinecone ou outro banco vetorial.
- Auth0, Clerk ou Supabase Auth, porque a autenticação própria já está implementada.
- Redis ou fila externa, porque o worker usa a fila do PostgreSQL.
- S3, R2 ou outro armazenamento de arquivos enquanto o volume couber na política aprovada do banco.
- SMS ou WhatsApp para MFA, porque o projeto usa aplicativo autenticador TOTP.
- Vercel Pro se Railway ou Render já hospedar toda a aplicação adequadamente.
- Plataforma de pagamentos antes de começar a cobrar assinaturas.

## Pacote recomendado para o primeiro piloto

| Serviço       | Escolha proposta                                |   Orçamento inicial |
| ------------- | ----------------------------------------------- | ------------------: |
| IA            | Gemini API paga com teto                        |      US$ 25 por mês |
| Banco         | Neon Launch ou Supabase Pro                     | US$ 10 a 25 por mês |
| Hospedagem    | Railway Pro                                     | US$ 20 a 40 por mês |
| E-mail        | Resend Free no teste; Pro quando necessário     |  US$ 0 a 20 por mês |
| Monitoramento | Logs da hospedagem e Better Stack Free          |       US$ 0 por mês |
| GitHub        | Free                                            |       US$ 0 por mês |
| Domínio       | Domínio corporativo existente ou `.com.br` novo |       R$ 40 por ano |

**Reserva sugerida para o piloto:** aproximadamente **US$ 60 a US$ 110 por mês**, mais domínio, impostos, câmbio e trabalho humano. Para simplificar a aprovação, a empresa pode reservar **US$ 100 mensais** e exigir alertas e limites rígidos. Se o banco escolhido for Supabase Pro, o Resend estiver no Pro e a hospedagem ultrapassar o crédito básico, a reserva deve subir.

Essa faixa é uma estimativa de planejamento, não uma cotação. O custo real precisa ser recalculado após medir quantidade de usuários, perguntas, páginas, fotos, armazenamento e e-mails.

## Decisões para levar aos chefes

1. Aprovar Gemini API paga e definir o teto mensal.
2. Escolher Neon pago **ou** Supabase Pro.
3. Escolher Railway Pro ou Render para hospedar API e worker.
4. Aprovar Resend ou outro provedor de e-mail.
5. Confirmar domínio, DNS e caixa de suporte.
6. Definir cartão, centro de custo e responsável por cada conta.
7. Aprovar região, retenção, backups, contratos e LGPD de cada fornecedor.
8. Definir alertas e quem pode aumentar os limites de gasto.
9. Decidir se a equipe precisa de ChatGPT Business, Codex ou GitHub Copilot.
10. Reservar verba para revisão jurídica, segurança e suporte, além das assinaturas.
11. Definir a quantidade de usuários e a duração do primeiro piloto.
12. Reavaliar os custos após o primeiro mês de uso medido.

## Fontes de preços

- [Gemini API](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAI API](https://developers.openai.com/api/docs/pricing)
- [Neon](https://neon.com/pricing)
- [Supabase](https://supabase.com/pricing)
- [Railway](https://railway.com/pricing)
- [Render](https://render.com/pricing)
- [Resend](https://resend.com/pricing?product=transactional)
- [Postmark](https://postmarkapp.com/pricing/)
- [Amazon SES](https://aws.amazon.com/pt/ses/pricing/)
- [Cloudflare](https://www.cloudflare.com/plans/)
- [Better Stack](https://betterstack.com/pricing)
- [GitHub](https://github.com/pricing)
- [ChatGPT Business](https://help.openai.com/en/articles/8801848)
- [GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans)
- [Stripe Brasil](https://stripe.com/br/pricing)
