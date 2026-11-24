# Responsabilidades e decisões antes do piloto

**Estado:** rascunho para nomeação e validação; todos os responsáveis abaixo estão por definir.

Felipe pode coordenar produto e reunir as decisões se aceitar esse papel. Isso não o torna
advogado, encarregado, operador de infraestrutura ou revisor independente. Uma pessoa pode
acumular funções compatíveis, com capacidade e disponibilidade documentadas. Quem escreveu uma
mudança não pode emitir sua própria revisão independente.

| Papel necessário | Em linguagem simples | Entrega verificável | Responsável / aceite |
|---|---|---|---|
| Responsável pela liberação | Decide se a sessão pode começar com todos os gates presentes | Decisão por commit/configuração, data, limites, coorte e evidências | A nomear |
| Jurídico/privacidade | Profissional com competência em proteção de dados, preferencialmente advogado para análise jurídica | Parecer/revisão dos papéis, bases legais, contratos, autorização, aviso, retenção, transferências e direitos | A nomear; não substituído por IA |
| Controlador por finalidade | Organização/pessoa que decide por que e os elementos essenciais de como os dados são tratados | Mapa por finalidade e representação válida; não atribuir automaticamente ao síndico ou à Alvitra | A definir após avaliação factual |
| Operador/suboperador | Executa o tratamento em nome e sob instruções do controlador | Contratos/instruções, inventário de serviços, países e acessos | A definir; Render/Supabase/IA ainda não aprovados para dados reais |
| Contato de privacidade/encarregado, quando aplicável | Recebe pedidos das pessoas e encaminha ao responsável | Canal, substituto, prazos e fluxo de verificação proporcional | A definir; avaliar designação/exceções aplicáveis |
| Revisor técnico independente | Engenheiro com experiência em autenticação, PostgreSQL/RLS e segurança; não autor da alteração revisada | Diff completo atual e evidências; zero P0/P1 pendentes; validação do ambiente | A nomear |
| Operação e segurança | Mantém ambiente, segredos, backups, limites e resposta a incidente | Ensaio de restore/revogação, acesso mínimo, plantão e procedimento de pausa | A nomear, com substituto |
| Qualidade das respostas | Síndico experiente com apoio especializado nos temas de risco | Revisão semântica de casos sintéticos representativos e critérios de correção | A nomear; jurídico/contábil/engenharia conforme o caso |
| Facilitador presencial | Orienta a sessão sem soprar as respostas | Roteiro, registro minimizado, intervenções e pausa | A nomear |
| Suporte | Resolve acesso/rede/processamento e encaminha interpretação de risco | Canal, horário, capacidade, substituto e orientação de contingência | A nomear |
| Responsável documental | Confirma poderes e delimita os documentos do condomínio | Autorização privada específica, finalidade, versões e restrições | A identificar por condomínio |

Os papéis legais dependem das decisões efetivas de cada operação, não apenas do nome dado no
contrato. Essa distinção é explicada no [guia de agentes da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).

## Quadro de decisões bloqueantes

| ID | Decisão que precisa ser preenchida e aprovada | Quem prepara / quem valida | Estado |
|---|---|---|---|
| D01 | Identidade/representação das partes; controlador e operador por finalidade | Produto + jurídico/privacidade + partes | Pendente |
| D02 | Finalidade, necessidade e base legal por categoria/operação; dados sensíveis/menores | Jurídico/privacidade + controlador | Pendente; não escolher consentimento por conveniência |
| D03 | Escopo documental autorizado e documentos/campos a excluir | Responsável documental + jurídico/privacidade | Pendente |
| D04 | Fornecedor IA/gateway/modelo, região, países, suboperadores, DPA, retenção, uso para treinamento e mecanismo de transferência | Operação + jurídico/privacidade + controlador | Pendente; sem contratação/provisionamento |
| D05 | Retenção de cada artefato, recuperação de removidos, snapshots históricos, backups/WAL e SLA de exclusão/exportação | Operação + jurídico/privacidade + controlador | Pendente; 30 dias do sintético não aprova prazo real |
| D06 | Compatibilidade de histórico durável com direitos/exclusão e obrigações de guarda | Produto + jurídico/privacidade + controlador | Pendente; durabilidade não é permissão de retenção ilimitada |
| D07 | Contato/canal privado, verificação de identidade, prazo, responsável e substituto para direitos/incidente | Operação + jurídico/privacidade | Pendente |
| D08 | Limites de custos, chamadas/tentativas/retries, bytes/páginas/pixels e concorrência compartilhados | Engenharia + operação + decisor de liberação | Pendente de fechamento conjunto |
| D09 | Ambiente, conta/plano, TLS, RLS, acesso operacional, backup integral, restore e gestão de exclusões | Operação + revisor técnico independente | Pendente de evidências do destino |
| D10 | Número de sessões, agendas, presença de especialistas, suporte e critérios de ampliação | Produto + facilitador + suporte | Proposta no roteiro, ainda não aprovada |
| D11 | Eventual gravação: necessidade, canal seguro, acesso, prazo e consentimento separado | Facilitador + jurídico/privacidade + participante | Padrão proposto: sem gravação |
| D12 | Revisão semântica, gates mecânicos e decisão final no commit/configuração | Qualidade + engenharia + revisor independente + decisor | Pendente |

Registrar cada decisão com identificador, versão do texto/configuração, papel, data e evidência
privada; não incluir segredos ou dados de participantes no registro público de engenharia.
