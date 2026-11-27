# ADR 0050 — Admissão persistente por manifesto revisado

**Status:** aceito para implementação da Spec 078; ativação depende da política aprovada  
**Data:** 2026-11-25

O pedido de concluir a integração permite ligar os componentes das Specs 071/072, mas não
escolher orçamento ou aprovar dados reais. Reutilizar o manifesto operacional estrito entregue
pelo operador e vincular seu hash canônico à revisão da política de orçamento no PostgreSQL.
Uma função de leitura SECURITY DEFINER retorna somente concordância de revisão/moeda e estado
enabled; runtime/worker não recebem SELECT/UPDATE nas tabelas privadas de orçamento.

O manifesto delimita conta, expiração, referência de aprovação, revisão de dados, provedor/modelo
e máximos de setup/pergunta/upload. A admissão revalida configuração, política corrente e
contexto da rota a cada execução/replay. A função de mutação já existente permanece autoritativa
para escopo, consumo e claim. Nenhuma flag sozinha concede autorização; ausência nega.

Não alterar o perfil vetorial, os prompts nem os contratos de OCR/fotos da Spec 071 nesta fatia.
Dados reais e chamadas externas exigem manifesto concretamente aprovado. Conexões remotas
verificam TLS; CA opcional não pode enfraquecer verificação. Preflight não migra nem conserta o
destino. Deploy e ensaios no destino são evidências próprias, sem testes destrutivos de integração.

Esta composição mantém PostgreSQL/Render e OpenAI ou Gemini temporária já autorizados, sem
dependência nova, e é reversível
por desativação da política. Revogar orçamento bloqueia novas operações e replay, sem apagar
recibos, histórico ou compromissos incertos. Alinhamento: briefing §§6–10 e 12–14.
