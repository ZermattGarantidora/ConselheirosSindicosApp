# Pauta para decisão do provedor de e-mail transacional

**Data de preparação:** 08/10/2026
**Status:** material para decisão; nenhum fornecedor foi aprovado
**Participantes recomendados:** direção, produto, engenharia, responsável financeiro e responsável por privacidade ou jurídico

A verificação de e-mail, a recuperação de senha, a troca de senha, o MFA por aplicativo autenticador e o gerenciamento de sessões já estão implementados para o ambiente local controlado. Para produção, ainda falta contratar e configurar um provedor que entregue os e-mails de verificação e recuperação. O objetivo da reunião é aprovar o fornecedor, o orçamento, as condições de privacidade e os responsáveis pela operação.

Essa contratação não é uma integração da caixa de e-mail do síndico nem autoriza campanhas de marketing. Seu escopo inicial é somente a segurança da conta. Nenhum documento, pergunta, resposta ou dado de condomínio deve ser incluído nessas mensagens.

## Decisão principal solicitada

Escolher uma das seguintes direções:

1. **Resend para o MVP**, priorizando simplicidade e velocidade de implantação.
2. **Postmark para o MVP**, priorizando operação e diagnóstico de e-mails transacionais.
3. **Amazon SES**, priorizando custo em volume e aceitando maior trabalho de configuração e operação.
4. Usar **Brevo ou Mailgun** se já houver contrato, conhecimento interno ou uma necessidade corporativa que justifique a escolha.
5. Manter a produção bloqueada até que privacidade, contrato, domínio ou orçamento possam ser aprovados.

## Opções avaliadas

Preços públicos consultados em 08/10/2026, antes de impostos e conversão cambial.

| Provedor   |                                                                                  Entrada publicada | Principal vantagem                                                     | Principal desvantagem                                                       | Indicação                                                     |
| ---------- | -------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Resend     |         Gratuito: 3.000 e-mails por mês, com limite de 100 por dia. Pro: US$ 20 por 50.000 por mês | Integração simples e rápida para TypeScript, API e webhooks            | O limite diário gratuito pode interromper uma abertura de piloto maior      | Recomendado para o MVP                                        |
| Postmark   |                                            Gratuito: 100 por mês. Basic: US$ 15 por 10.000 por mês | Foco específico em e-mail transacional, diagnóstico e webhooks         | O plano gratuito atende apenas a testes pequenos                            | Alternativa quando entregabilidade e suporte pesarem mais     |
| Amazon SES | Essentials: US$ 0,16 por mil. À la carte: US$ 0,10 por mil, além de eventuais dados e complementos | Menor custo unitário e boa escala                                      | Mais configuração, permissões, monitoramento e responsabilidade operacional | Melhor quando houver escala ou infraestrutura AWS consolidada |
| Brevo      |                 Gratuito: 300 por dia. Starter anunciado a partir de aproximadamente US$ 9 por mês | Reúne e-mail transacional e ferramentas de marketing                   | Traz mais plataforma e tratamento de contatos do que o necessário agora     | Considerar se a empresa já utilizar Brevo                     |
| Mailgun    |                                            Gratuito: 100 por dia. Basic: US$ 15 por 10.000 por mês | API madura, SMTP, webhooks e opção de região nos EUA ou União Europeia | Mais recursos e complexidade do que o fluxo atual exige                     | Alternativa se houver experiência ou contrato existente       |

Fontes oficiais: [Resend](https://resend.com/pricing?product=transactional), [Postmark](https://postmarkapp.com/pricing/), [Amazon SES](https://aws.amazon.com/pt/ses/pricing/), [Brevo](https://www.brevo.com/products/transactional-email/) e [Mailgun](https://www.mailgun.com/pricing/).

## Recomendação para levar à reunião

A proposta inicial é aprovar o **Resend para o MVP**, mantendo o adaptador substituível. O plano gratuito pode atender ao desenvolvimento e a um teste controlado de baixo volume. Antes de ultrapassar 100 mensagens em um dia, deve existir aprovação para migrar ao plano Pro ou aplicar outra solução já homologada.

O Postmark é a segunda opção se a empresa aceitar o custo mínimo mensal em troca de uma operação mais centrada em e-mails transacionais. O Amazon SES deve ser reavaliado quando o volume tornar a diferença de custo relevante ou quando a empresa tiver capacidade operacional em AWS.

Essa recomendação não substitui a validação contratual, de privacidade e de segurança do fornecedor.

## Assuntos que precisam ser discutidos

### 1. Objetivo e escopo

- Confirmar que o provedor será usado inicialmente somente para verificação de conta e recuperação de senha.
- Confirmar que MFA continuará usando aplicativo autenticador, sem SMS ou WhatsApp nesta fase.
- Decidir se serão incluídos avisos de segurança no futuro, como senha alterada, MFA ativado ou nova sessão.
- Proibir o uso desses e-mails para marketing sem decisão, consentimento e fluxo separados.
- Confirmar que nenhuma mensagem conterá documentos, conteúdo de perguntas, respostas da IA ou informações do condomínio.

### 2. Volume e orçamento

- Quantas pessoas participarão do primeiro teste controlado.
- Quantas contas novas são esperadas por mês.
- Quantos reenvios de verificação e pedidos de recuperação devem ser previstos.
- Qual é o limite mensal aceitável em reais e em dólares.
- Quem será responsável pela forma de pagamento e pelas faturas.
- Qual aumento de custo exige nova aprovação.
- Se haverá alerta de consumo e teto de envio para evitar abuso ou cobrança inesperada.

Uma estimativa simples deve considerar: novas contas, reenvios de verificação, recuperações de senha, testes internos e uma margem para tentativas legítimas. O volume não deve incluir campanhas comerciais.

### 3. Privacidade, LGPD e contrato

- Quem atuará como controlador e quem será operador dos dados no contrato.
- Se o jurídico ou responsável por privacidade aprova o contrato de tratamento de dados do fornecedor.
- Em quais países ou regiões mensagens e logs serão processados e armazenados.
- Quais subprocessadores o fornecedor utiliza.
- Por quanto tempo o conteúdo das mensagens, destinatários e logs ficam retidos.
- Como solicitar exclusão, exportação e encerramento da conta.
- Como o fornecedor comunica incidentes de segurança.
- Se há transferência internacional de dados e qual mecanismo jurídico será utilizado.
- Se a política de privacidade do aplicativo precisa ser atualizada antes do piloto.

Os links de verificação e recuperação contêm tokens temporários de uso único. Por isso, o fornecedor terá contato com conteúdo sensível da mensagem, mesmo que os tokens sejam armazenados no banco apenas como hash. A retenção deve ser minimizada e o rastreamento de abertura e clique deve permanecer desativado para mensagens de autenticação, salvo justificativa aprovada.

### 4. Domínio, remetente e identidade visual

- Qual domínio ou subdomínio será usado, por exemplo `conta.empresa.com.br`.
- Qual será o remetente, por exemplo `conta@empresa.com.br`.
- Qual nome aparecerá para o usuário.
- Se haverá endereço de resposta e quem acompanhará essa caixa.
- Quem possui acesso administrativo ao DNS.
- Quem configurará e validará SPF, DKIM e DMARC.
- Quem acompanhará relatórios e falhas de autenticação do domínio.
- Se os e-mails de autenticação ficarão separados de futuros e-mails comerciais para proteger a reputação de entrega.
- Quais marca, linguagem e dados de suporte devem aparecer nas mensagens.

### 5. Segurança da conta do fornecedor

- Criar a conta em nome da empresa, usando endereço corporativo, e não uma conta pessoal.
- Definir ao menos dois administradores responsáveis.
- Exigir MFA para administradores do fornecedor.
- Guardar a chave da API em cofre de segredos, nunca no código ou em mensagens.
- Restringir permissões da chave ao mínimo necessário.
- Definir periodicidade e procedimento de rotação da chave.
- Registrar quem pode acessar conteúdo e logs de entrega.
- Definir o procedimento de remoção de acesso quando alguém sair da equipe.

### 6. Entrega, rejeições e reputação

- Qual taxa de entrega e tempo de chegada são aceitáveis para recuperação de senha.
- Como serão recebidos e autenticados os webhooks do fornecedor.
- Como tratar endereço inexistente, rejeição permanente, caixa cheia e denúncia de spam.
- Quando suspender novos envios para um endereço rejeitado.
- Como o suporte investigará uma mensagem que não chegou sem expor tokens ou dados indevidos.
- Quem acompanhará o painel, a reputação do domínio e os incidentes do provedor.
- Se é necessário SLA contratual no piloto ou somente após abertura ao público.

### 7. Políticas do produto

- Confirmar a verificação obrigatória de novas contas por e-mail.
- Confirmar a validade atual de 24 horas para verificação e 30 minutos para recuperação de senha.
- Definir limites e intervalos para reenvio de mensagens.
- Decidir se MFA será opcional ou obrigatório para determinados papéis.
- Definir o atendimento quando alguém perder simultaneamente o e-mail e os códigos de recuperação do MFA.
- Definir como será comprovada a identidade em uma recuperação assistida, se ela for oferecida.
- Confirmar que redefinir a senha encerra todas as sessões existentes.
- Definir canal e horário de suporte para problemas de acesso.

### 8. Operação e continuidade

- Quem será o responsável interno pelo serviço de e-mail.
- Quem poderá aprovar mudanças de plano ou aumento de volume.
- Como o time será avisado sobre indisponibilidade, rejeições anormais ou aumento de custo.
- Qual será o plano de contingência se o provedor ficar indisponível.
- Quanto tempo a empresa aceita ficar sem entrega de recuperação de senha.
- Como migrar para outro provedor sem alterar os fluxos de autenticação.
- Quais configurações, templates e registros precisam ser exportáveis.
- Quando a escolha será reavaliada, por exemplo por volume, incidentes, custo ou mudança contratual.

### 9. Condições para autorizar produção

- Fornecedor e plano aprovados formalmente.
- ADR técnico registrando fornecedor, região, retenção, custo e alternativa de saída.
- Contrato, termos, subprocessadores e tratamento de dados avaliados.
- Domínio corporativo autenticado com SPF, DKIM e DMARC.
- Conta corporativa protegida por MFA e acessos nomeados.
- Chave de produção armazenada com segurança e separada do desenvolvimento.
- Webhooks de entrega, rejeição e denúncia autenticados e testados.
- Templates revisados em português do Brasil, em desktop e celular.
- Teste completo com endereços sintéticos autorizados, incluindo expiração e uso único dos links.
- Limites contra abuso, enumeração de contas e excesso de reenvios validados.
- Monitoramento, alertas, suporte e procedimento de incidente definidos.
- Política de privacidade atualizada quando aplicável.
- Gate de segurança e testes do projeto aprovado antes da liberação.

## Perguntas objetivas para obter uma decisão

1. Podemos aprovar o Resend como fornecedor inicial do MVP?
2. Se não, qual das alternativas já possui contrato, preferência ou conhecimento dentro da empresa?
3. Qual é o orçamento mensal máximo e quem será o responsável financeiro?
4. Qual domínio, subdomínio, nome e endereço de remetente serão usados?
5. Quem possui acesso ao DNS e ficará responsável pelas configurações?
6. Quem fará a aprovação de LGPD, contrato, região e retenção?
7. Quem administrará a conta do fornecedor e responderá por incidentes?
8. Quantos usuários e envios são esperados no teste e nos primeiros três meses?
9. O teste será apenas interno, controlado por convite ou aberto ao público?
10. MFA será opcional para todos ou obrigatório para algum papel?
11. A empresa oferecerá recuperação assistida quando o usuário perder e-mail e segundo fator?
12. Qual é a data desejada para habilitar a entrega real de e-mails?

## Resultado esperado da reunião

Ao final, registrar por escrito:

- fornecedor e plano escolhidos;
- orçamento e responsável pelo pagamento;
- domínio e remetente;
- responsáveis por DNS, administração, segurança, privacidade e suporte;
- região e retenção aceitas;
- volume estimado e teto de gasto;
- política de MFA e recuperação assistida;
- público e data do primeiro teste;
- pendências que ainda impedem a produção.

Depois da aprovação, a engenharia deve registrar a decisão em um novo ADR e somente então implementar o adaptador de produção. Até lá, a prévia local continua permitida para testes, mas a entrega real de e-mails e a abertura pública permanecem bloqueadas.
