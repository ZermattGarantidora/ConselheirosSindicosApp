# ADR 0014 — Painel administrativo minimizado da Zermatt

**Status:** aceito  
**Data:** 2026-09-22

## Contexto

A Zermatt precisa acompanhar aquisição e recorrência do produto. O mesmo sistema, porém, guarda dados condominiais e conteúdo documental privado que não podem se tornar uma fonte silenciosa de prospecção. Também não existe ainda um fluxo explícito de consentimento comercial.

## Decisão

- A conta administrativa será uma conta autenticada comum cujo identificador interno pertença à lista `ADMIN_USER_IDS`, definida somente no ambiente do servidor.
- O e-mail não concederá privilégio enquanto o produto não possuir verificação de titularidade, evitando que um terceiro cadastre antecipadamente um endereço administrativo.
- A autorização será recalculada no servidor em cada resposta de autenticação e em cada acesso ao painel; o cliente não concede privilégios.
- O endpoint administrativo retornará somente três contagens agregadas: contas ativas, novos cadastros em sete dias e usuários distintos que criaram sessão em sete dias.
- O mesmo endpoint poderá retornar um diretório operacional limitado às 100 contas ativas mais recentes, contendo somente nome e e-mail informados no cadastro.
- A leitura será fornecida por uma função `SECURITY DEFINER` específica, com permissão de execução para `app_runtime`, sem conceder leitura direta adicional nas tabelas.
- A função e o adaptador administrativo não consultarão tabelas condominiais, documentais, de perguntas, respostas, citações ou feedback.
- Oportunidades comerciais não serão inferidas. Elas só poderão ser adicionadas por decisão futura acompanhada de consentimento explícito, revogação e minimização próprios.
- A resposta com dados pessoais usará `Cache-Control: no-store`; não incluirá identificador interno, telefone, condomínio, conteúdo ou ação de contato.

## Consequências

- Um administrador usa o mesmo mecanismo de senha/sessão, sem credencial fixa no código ou papel global persistido nesta primeira fatia.
- Alterar administradores exige mudar a configuração segura do servidor e reiniciar a aplicação.
- O painel não oferece análise de comportamento individual nem métricas documentais, mesmo que esses dados existam no banco.
- Nome e e-mail ficam restritos à finalidade operacional de identificar contas cadastradas e não constituem consentimento para prospecção.
- `ADMIN_USER_IDS` vazio desabilita todo acesso administrativo por padrão.
- Antes de produção serão necessários MFA, governança de papéis, auditoria administrativa e revisão independente, conforme os gates do piloto real.

## Alternativas rejeitadas

- **Primeira conta cadastrada vira administradora:** suscetível a tomada de privilégio e comportamento implícito.
- **Papel enviado pelo cliente:** não constitui autorização e pode ser adulterado.
- **Dashboard baseado em condomínios, documentos ou perguntas:** contraria a separação de finalidade e expõe sinais privados irrelevantes para a Zermatt.
- **Lead scoring automático:** não possui consentimento nem necessidade nesta fase.
