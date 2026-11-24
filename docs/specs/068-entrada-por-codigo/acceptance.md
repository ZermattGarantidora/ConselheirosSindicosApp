# Aceitação — Spec 068

- **AC-6801 / RQ-6801:** campo único de código, botão Entrar, sem emissão pública; código
  provisionado entra e código desconhecido/malformado não cria conta nem sessão.
- **AC-6802 / RQ-6802:** recarga e nova aba restauram a sessão automaticamente, inclusive sem
  localStorage; cookies HttpOnly/SameSite e Secure em produção, renovados por até 400 dias.
- **AC-6803 / RQ-6803:** Perfil recupera somente o código da sessão atual, com botão Copiar e
  explicação de acesso; aparelho B recebe sessão diferente e mesma identidade de A.
- **AC-6804 / RQ-6804:** IP compartilhado não autentica; troca de IP preserva cookie; cabeçalho
  de outra identidade não troca usuário nem autoriza outro condomínio.
- **AC-6805 / RQ-6804:** logout só encerra A; B continua; cookie revogado não restaura.
  Rotação operacional invalida código anterior e sessões, inclusive após recriar o serviço.
- **AC-6806 / RQ-6801/6804:** limite retorna 429, erro genérico e sem eco do código; acesso
  ao código sem sessão retorna 401 e todas as respostas de acesso usam no-store.
- **AC-6807 / RQ-6802:** indisponibilidade da API conserva cookie e oferece nova tentativa;
  nenhum segredo entra em localStorage; cadastro conversacional e dados anteriores continuam
  vinculados à identidade autorizada, sem usar código como nome pessoal.
- **AC-6808 / RQ-6801/6804:** persistência local sobrevive à recriação; falha de gravação não
  confirma sessão; banco real conserva RLS, contas bloqueadas e privilégios mínimos.

## Reforço local de abuso — 09/11/2026

- **AC-6813 / RQ-6805:** duas APIs sobre o mesmo cofre permitem juntas somente dez tentativas
  por origem/15 min, inclusive com consumo concorrente. Recriar os serviços conserva o bloqueio;
  vencer a janela permite nova tentativa. Outro IP não compartilha conta nem evita a cota global.
- **AC-6814 / RQ-6805:** mil tentativas de origens distintas esgotam a cota global; a próxima
  retorna 429/Retry-After antes de validar o código. Corpo malformado/excessivo também conta.
  Header `x-forwarded-for` arbitrário não cria nova origem quando o proxy não é confiável.
- **AC-6815 / RQ-6805:** falha ou corrupção do armazenamento e resultado inválido do adaptador
  devolvem 503 genérico, sem cookie ou detalhes privados, e sem chamar login. O cofre persiste só
  HMAC, contagem e vencimento, sem IP, código ou token em texto; cofre anterior sem contadores
  continua legível. Sessões existentes continuam válidas quando o limite de login se esgota.
- **AC-6816 / RQ-6805:** contrato PostgreSQL parametrizado usa função com relógio do banco,
  contador global serializado, tabelas privadas/RLS e privilégio somente de execução. Testes
  locais de contrato e leitura do SQL não substituem execução da migration e concorrência em banco sintético
  autorizado; essa evidência e validação em réplicas ficam bloqueantes da liberação.

## Continuidade de acesso e histórico — decisão reafirmada em 09/11/2026

- **AC-6817 / RQ-6802:** com cookie preservado, avançar o relógio do servidor por dois anos e
  recriar API/serviço com o mesmo cofre não exige novo código. Restauração renova o cookie sem
  autenticar por IP; falha temporária retorna 503 sem apagar o cookie e permite retomada.
  Isso prova ausência de expiração no servidor; não simula a retenção efetiva do navegador.
- **AC-6818 / RQ-6803 e RQ-5801/5802:** aparelho B entra na mesma conta com sessão independente
  e lê literalmente abertura da Alvitra e as mensagens de ambos os lados registradas por A.
  Sair de A preserva B/histórico; outra conta, mesmo autorizada ao condomínio, não lê o chat.
- **AC-6819 / RQ-6803 e RQ-5803:** falha ao registrar mensagem não confirma salvamento; B não
  vê fala inventada. Retentativa conserva texto de usuário e resposta uma vez, sem duplicação.
- **AC-6820 / RQ-6801:** o piloto fechado entra com código fornecido pela equipe, sem telefone,
  solicitação/envio de WhatsApp ou dependência desse serviço. WhatsApp é fatia futura da abertura
  pública; não substitui gates de sessão/histórico da preparação atual.

## Identidade canônica da sessão — integração de 11/11/2026

- **AC-6821 / RQ-6806:** login por código de conta cujo UUID difere do auth_subject recupera
  cookie e membership legítima no PostgreSQL/RLS, sem exigir auth_subject=UUID. Outra conta cujo
  auth_subject seja esse UUID não recebe sua sessão nem transfere suas permissões; UUID bloqueado
  ou ausente não cai nessa conta. Identidade legada não UUID continua funcionando. Header falso
  não troca o usuário; outro condomínio permanece negado. Prova SQL/HTTP sintética, sem provedor.
  Carteira retorna somente memberships da conta canônica; criar, autorizar perfil, sair e excluir
  respeitam o mesmo UUID, inclusive com alias colidente, sem novas permissões ou dados de outro tenant.

## Evolução por telefone — exemplos aprovados, ainda não implementados

Estes exemplos registram a decisão de produto de 05/11/2026 para a futura integração com WhatsApp.
Não são evidência de entrega nem alteram a aceitação implementada do código fornecido pela equipe.

- **FUT-6809:** dado aparelho A conectado, quando B informa o mesmo telefone e confirma o código
  novo de sua tentativa, então B acessa a mesma conta com sessão independente e A continua conectado.
- **FUT-6810:** enviar, reenviar, expirar ou consumir um código temporário não encerra a sessão
  de A. Código já consumido não cria outra sessão e uma confirmação não autentica outra tentativa.
- **FUT-6811:** sair de B revoga somente B e preserva A; confirmar telefone não altera permissões
  dos condomínios nem permite escolher outra identidade pelo cliente.
- **FUT-6812:** compartilhar IP não autentica B sem confirmação; mudar de Wi-Fi para rede móvel
  não invalida por si só o código correto de B nem encerra a sessão de A.
