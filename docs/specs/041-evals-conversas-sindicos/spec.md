# Spec 041 — Evals de conversas típicas de síndicos

**Status:** rodada real e análise técnica registradas; revisão especializada pendente  
**Responsável:** qualidade e engenharia  
**Atualizado em:** 2026-10-27

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Avalia tarefas distintas de consulta, interpretação e comparação feitas pelo síndico. |
| Público | §3 | Perguntas em linguagem de síndicos profissionais e moradores. |
| Proposta de valor | §§5 e 6 | Mede utilidade e continuidade na conversa, inclusive sem anexos e com envio posterior. |
| Prioridades do MVP | §7, Blocos 6 e 7 | Exercita documentos sob demanda e análise documental já autorizadas. |
| Segurança e confiança | §§8, 9 e 10 | Fontes paginadas, versões, isolamento, abstenção, conflito e revisão humana explícitos. |
| Validação e métricas | §§13 e 14 | Separa validade mecânica de correção, fundamentação, clareza e próximo passo. |

### Limites respeitados

- Só documentos fictícios, sem pessoas identificáveis, clientes, contatos ou credenciais.
- Não altera prompt, retrieval de produção, provedor, banco ou interface. A única correção de produção nesta fatia é a variante de triagem “ignore o sistema”, rastreada em RQ-3501/AC-3505 após a falha encontrada por CONV-crosscutting-07; sem modificar o ataque nem reduzir a asserção.
- Sem parecer jurídico, cálculos trabalhistas definitivos, contabilidade completa ou ação externa.
- Não chama provedor pago por ambiente ou CLI. Replay real exige injetar explicitamente o gateway existente pelo integrador; custo, fornecedor e autorização continuam sob seus gates.

Em 27/10/2026, o usuário autorizou explicitamente executar os 240 cenários com o modelo do
chat. Esta rodada injeta o adaptador já configurado (`gpt-6.1-sol` pelo Codex, ADR 0031),
consome o plano do operador e mantém os modos canônicos e CI sem chamadas externas.
Checkpoints por cenário permitem retomada sem repetir resultados concluídos. A análise
técnica assistida por IA será identificada separadamente dos formulários de especialistas;
não há aprovação humana presumida, juiz externo adicional ou liberação de rollout.

A ampliação de 27/10 para 40 conversas longas autoriza construção dos roteiros e validação
local. O relatório observado de 240 cenários não cobre os 750 turnos novos. Esta fatia não
executa uma nova rodada externa nem atribui notas semânticas aos roteiros adicionados.
- Texto simples paginado representa o conteúdo após extração. Não certifica upload, PDF, OCR, embeddings, PostgreSQL/RLS ou o frontend; essas camadas mantêm seus gates existentes.
- Fontes legais oficiais usam a edição local da Spec 039 com relógio congelado em 26/10/2026. Não inventa legislação nem renova sua conferência. CCT e normas locais ausentes exigem limitação.
- Não autoriza novo bloco, piloto externo, publicação ou merge.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa hipóteses documentais e conversacionais do briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e exclusões foram respeitadas.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar 280 cenários distintos e documentos sintéticos conferíveis para medir a qualidade das respostas e das sequências de conversa: os 240 originais (260 turnos) e 40 conversas longas (750 turnos), totalizando 1.010 turnos.

## 2. Promessa testada

> O síndico recebe uma resposta útil e sustentada, sabe o que falta e consegue continuar a conversa sem perder contexto nem ultrapassar os limites de segurança.

## 3. Usuário primário

Síndicos profissionais independentes, pequenas administradoras e síndicos moradores.

## 4. Escopo

- 15 cenários por tema: balancetes, legislação, trabalho, emergências, obrigações, atas/assembleias, convenções, contratos, inadimplência/cobrança, convivência, manutenção/obras, seguros/sinistros, privacidade/LGPD e transição/comunicação; 30 transversais. Ampliação explicitamente solicitada pelo usuário nesta decisão, sem antecipar funcionalidades de produto.
- Fontes físicas de convenções, regimento, convocação, atas, balancetes de três meses, contratos de funcionário/fornecedores e aditivos, plano de emergência e calendário de obrigações.
- Dois condomínios fictícios, valores distintos e canário exclusivo para isolamento; versões conflitantes, OCR ruim e instrução maliciosa separados.
- Gabaritos e rubricas ficam fora dos documentos e do contexto enviado ao gateway.
- Casos com vários turnos conservam o mesmo chat e persistência. Não concatena histórico artificialmente na pergunta para ocultar lacunas do produto.
- Prepara pacote sem gateway ou executa HTTP local com gateway injetado; `--synthetic` usa o gateway local existente, exclusivamente como conferência mecânica.
- Pacote inclui perguntas, respostas, fontes recuperadas, telemetria, hashes, revisão por turno em branco e resumo por tema.
- Ampliação explicitamente solicitada em 27/10/2026: dez conversas de 10, dez de 15, dez de 20 e dez de 30 turnos. Os 240 casos originais e seus hashes de conteúdo permanecem preservados e selecionáveis para comparação com a rodada anterior.
- Conversas longas exercitam correções, retomadas, elipses, troca de assunto, anexos progressivos, retirada de fontes, conflitos, limites da janela recente, risco e autorização. Fora da janela de oito interações da Spec 043, uma referência sem contexto suficiente exige esclarecimento; não exige memória global ou resumos ainda não autorizados.

## 5. Fora do escopo

Dados reais; seleção de modelos; juiz por LLM; mudança de comportamento para fazer a suíte passar; aprovação sem revisão; garantia estatística de ausência de defeitos.

## 6. Pré-condições

ADRs 0002, 0003, 0022, 0024 e 0029; contratos de resposta e fontes existentes; instalação local das dependências.

## 7. Requisitos funcionais

### RQ-4101 — Corpus independente

Fontes possuem tenant, documento, versão e páginas estáveis. Loader valida manifesto, marcador fictício, arquivos e unicidade. Hashes permitem identificar a edição exata. Dados financeiros reconciliam saldo anterior + receitas - despesas = saldo final.

### RQ-4102 — Cobertura representativa

Cada cenário possui pergunta(s), fontes disponíveis por turno, resultado esperado específico, severidade, verificações de segurança e especialistas requeridos. Perguntas e resultados não podem ser duplicações numeradas. Inclui ausência de evidência, conflito, pressão por certeza, fonte insuficiente e continuidade.

### RQ-4103 — Replay honesto pelo caminho da aplicação

Usa autorização, retrieval textual, biblioteca legal, caso de uso, persistência e endpoint reais em memória. Captura evidência realmente enviada ao gateway e resposta pública. Conferência automática verifica HTTP, isolamento do contexto e saída, página/versão/trecho/offset da citação e canários. Respostas `failed`, abstenções e escalonamentos ficam contabilizados, nunca viram aprovação semântica automática. Sem gateway, resposta permanece nula. Nunca envia gabarito ao gateway.

### RQ-4104 — Medição e revisão

Cada turno recebe de revisor identificado notas 0–4 para correção, fundamentação, suficiência, clareza e próximo passo, e decisões explícitas sobre citações, abstenção, conflito, risco e ação externa. Resultados sem julgamento são pendentes e não integram denominadores de aprovação. Contrato mecânico aprovado, isoladamente, não aprova qualidade. Replay sintético nunca recebe aprovação de modelo.

O comando `--assess <relatório> <revisões>` agrega apenas julgamentos vinculados ao hash exato
da resposta, dataset, corpus e rodada. As citações têm decisões individuais. A menor nota e a
decisão mais restritiva entre revisores prevalecem. Alteração do relatório, duplicação ou nota
inválida são recusadas. Falha de escalonamento ou ação não autorizada bloqueia a aprovação em
qualquer turno, inclusive continuações P1; nenhum score médio a compensa.

### RQ-4105 — Conversas longas e comparação estável

Acrescentar 40 roteiros distintos, com 10 a 30 perguntas do usuário e resultado esperado específico em cada turno. Cada roteiro conserva chat e persistência, sem concatenar perguntas anteriores, injetar gabaritos ou fabricar respostas intermediárias. A lista de documentos por turno é uma fotografia completa da disponibilidade, permitindo envio e retirada durante o roteiro. Medir separadamente os 240 originais e os 40 longos, incluindo comprimento, posição do turno e revisão pendente; nenhuma média pode esconder falha tardia. Os casos de recuperação após retirada devem omitir a resposta documental anterior e buscar novamente fontes autorizadas. Respostas antigas ou alegações do usuário não substituem evidência. A avaliação de completude usa os IDs e o conteúdo do conjunto vigente inteiro e confere cada turno/resultante, e não somente a contagem por tema; omitir o turno final ou trocar sua pergunta impede completude. Relatórios históricos continuam verificáveis pelos hashes originais, sem aprovar a suíte ampliada. A regressão unitária congelada dos 51 turnos originais de risco seleciona a baseline; nos roteiros longos, o rótulo do cenário não exige que toda pergunta isolada seja de alto risco, pois a revisão deve considerar o contexto e o gabarito de cada turno.

## 8. Contratos

`evals/conversations/` contém manifesto, textos paginados, dataset, loader, runner e rubrica. `pnpm run evals:conversations` exporta pacote sem gateway; `--synthetic` executa contratos HTTP e retorna erro se houver falha mecânica. Relatórios JSON em `reports/` incluem versão do dataset, hashes e status `pending_gateway` ou `pending_specialist_review`; aprovação semântica inicia nula e nunca é preenchida pelo runner.

## 9. Requisitos não funcionais

- Nenhuma chamada externa no comando canônico, CI ou testes.
- Execuções isoladas por cenário, preservando estado apenas entre turnos do mesmo cenário.
- Sem dependência, provedor ou migração novos.
- Exceções arbitrárias de gateway não são copiadas para relatórios ou stdout.

## 10. Critérios de sucesso

- 280 cenários únicos e 1.010 turnos: baseline preservada de 240 cenários/260 turnos e 40 longos/750 turnos, com fontes e oráculos auditáveis; dez roteiros em cada comprimento de 10, 15, 20 e 30.
- Testes negativos demonstram que o verificador recusa citações falsas, acesso cruzado e erro HTTP.
- Revisão semântica mede metas já existentes: 100% dos P0, 90% de correção nos respondíveis, 95% de citações sustentadoras e abstenções corretas, 100% de escalonamento obrigatório. Pendências bloqueiam certificação.
- Antes de comparar modelos, revisar os gabaritos e executar os 280 cenários ao menos três vezes por configuração, reportando por tema, segmento, comprimento e pior rodada; não contar repetições como novos cenários. O número é ponto de partida, não garantia.

Gate competitivo: mantém o chat; avalia capacidades autorizadas; melhora evidência/segurança; preserva invariantes; diferencia de IA genérica por fontes/versões/tenant; comprova por replay e revisão; reutiliza a stack e limita complexidade a dados e harness.

## 11. Questões em aberto

Revisão dos gabaritos por síndico, contador, jurista e responsável técnico; correções e nova
execução após a rodada autorizada; calibração de notas e variância; inclusão contínua de
novos casos sintéticos a partir de falhas. A primeira rodada real e suas limitações estão
em [resultados de 27/10/2026](observed-results-2026-10-27.md).

## Gate para mudar o status

Pacote e replay de contrato exigem alinhamento, aceitação, rastreabilidade e testes. Qualidade de modelo exige respostas de modelo, gabaritos revisados e julgamentos especializados; aprovação mecânica não satisfaz esse gate.
