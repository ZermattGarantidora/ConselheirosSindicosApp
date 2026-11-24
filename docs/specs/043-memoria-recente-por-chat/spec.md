# Spec 043 — Memória recente por chat

**Status:** implementada e validada tecnicamente; qualidade especializada e escala pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-27

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Evita repetir contexto em continuações de uma tarefa do síndico. |
| Público | §3 | Atende síndicos moradores e profissionais em conversas privadas. |
| Proposta de valor | §§5 e 6 | Usa o contexto progressivo para responder e pedir somente o que falta. |
| Prioridades do MVP | §7, Blocos 2, 3 e 5 | Detalha continuidade nos chats já autorizados, sem novos módulos. |
| Segurança e confiança | §§8–10 | Separa memória de evidência, mantém autorização vigente e isolamento. |
| Validação e métricas | §§12–14 | Mede tokens, latência, continuidade e custo por resposta aprovada antes de compactar. |

### Limites respeitados

- Implementação explicitamente solicitada após aprovação do plano revisado nesta conversa.
- Sem resumos, embeddings de mensagens, busca entre chats, novo serviço, provedor ou pacote.
- Novo chat continua vazio; reabrir um chat retoma somente seu próprio histórico.
- PostgreSQL preserva as interações; a demonstração em RAM continua volátil entre reinícios.
- Não amplia o perfil, a autenticação, o uso de dados reais ou ações externas.
- Respostas documentais anteriores são deliberadamente omitidas da memória desta fatia: fontes devem ser recuperadas novamente. Não promete reproduzir opções de uma resposta documental omitida.

### Divergências da visão

Nenhuma. Detalha os Blocos 2, 3 e 5 autorizados e preserva os contratos das Specs 026, 038 e 042.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa a hipótese da conversa útil.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Continuar uma conversa atual ou reaberta usando histórico recente autorizado, inclusive para resolver referências de busca e manter a avaliação de risco.

## 2. Promessa testada

> Posso continuar o assunto sem repeti-lo; a Alvitra distingue o que conversamos daquilo que os documentos comprovam.

## 3. Usuário primário

Síndico com contexto confirmado, no mesmo chat e condomínio autorizado.

## 4. Escopo

- Janela limitada de interações já persistidas, carregada exclusivamente no servidor.
- Contexto compartilhado pelos gateways existentes e pelas rotas de orientação e consulta documental.
- Autorização, exclusão lógica do chat, concorrência, idempotência e falhas operacionais explícitas.
- Marcador de procedência sem conteúdo sensível na auditoria existente; sem migração de schema.

## 5. Fora do escopo

Resumos, memória global, recuperação de mensagens distantes, mudança da jornada de reentrada, armazenamento permanente da demonstração, replay de respostas documentais e certificação de qualidade probabilística sem revisão.

## 6. Pré-condições

ADRs 0002, 0003, 0022, 0028 e 0031; associação ativa; chat pertencente ao usuário e condomínio. O ajuste de prompt foi apresentado no plano e sua revisão/implementação foi aprovada pelo usuário nesta conversa.

## 7. Requisitos funcionais

### RQ-4301 — Escopo obrigatório e autorização vigente

Memória só lê histórico com chat explícito, válido, visível e pertencente ao usuário e condomínio. Revalidar associação/revisão e chat antes da leitura, da geração e da persistência. Chamadas legadas sem chat continuam sem memória, nunca usam histórico agregado. Escopo divergente retornado pelo repositório é erro, não filtro silencioso.

### RQ-4302 — Janela íntegra e limitada

Usar no máximo oito interações recentes e 12.000 bytes UTF-8 do JSON de turnos, sem cortar mensagens. São limites iniciais operacionais, não tokens exatos ou parâmetros ótimos. Preservar os originais; sinalizar no contexto omissões por tamanho, segurança ou procedência. Não procurar turnos mais antigos para preencher lacunas. Falha de leitura não equivale a histórico vazio.

A correção RQ-2104 da Spec 021 acrescenta uma projeção mínima do perfil já registrado e autorizado,
separada dos turnos e identificada como cadastro, sem comprovação documental. Nome e unidades
também entram no orçamento de 12.000 bytes, inclusive após acrescentar foco e contrato de reparo;
podem deslocar turnos antigos inteiros, nunca ampliar a janela. Desligar o replay de histórico não
apaga o perfil do condomínio atual nem impede sua leitura pelo caminho cadastral existente.

### RQ-4303 — Procedência e memória não privilegiada

Repassar perguntas anteriores como relatos não confiáveis. Repassar respostas somente quando produzidas por esta política, validadas, sem evidências documentais enviadas ao modelo e marcadas explicitamente como seguras para replay. Omitir respostas documentais, conflitos, falhas, fontes removidas e registros legados de procedência desconhecida. Não repassar citações, trechos, títulos ou attentionPoints antigos. Bloquear turnos com padrões hostis já conhecidos; isso é defesa adicional, não prova de ausência de injeção. Serializar dados após a fronteira da pergunta, nunca em mensagem developer/system. Memória não autoriza alterações cadastrais nem ações externas.

### RQ-4304 — Continuação, busca e risco

Enviar histórico recente também na orientação geral e nos fallbacks. Referências explícitas de continuação podem acrescentar perguntas recentes à busca; manter a pergunta original na persistência e no gateway. Heurística conservadora, sem nova chamada de IA; não garante resolver toda ambiguidade. Não reduzir risco identificado na pergunta atual; em continuação considerar também o contexto de perguntas anteriores. Não apresentar histórico como evidência nem substituir validação de citações. Referência insuficiente ou resposta documental omitida exige esclarecimento ou nova recuperação.

### RQ-4305 — Concorrência, falhas e repetição

Uma geração por usuário/condomínio/chat de cada vez: concorrência retorna 409 e retry-after, sem fila ilimitada. PostgreSQL usa lock consultivo compartilhado entre instâncias; RAM usa guarda local. Liberar guarda em sucesso e erro. Repetição sequencial idempotente não gera outra resposta. Revalidar após geração antes de salvar/retornar; falhas de memória retornam 503 sem texto interno, sem geração sem contexto e sem fallback pago. Não manter transação SQL aberta durante inferência.

Integração da Spec 046: resolver o identificador canônico do usuário em transação curta antes de adquirir o lock, evitando guardas distintas por alias; nenhuma transação fica aberta durante a geração. A leitura SQL valida o autor canônico e devolve a identidade autorizada do chamador. Turnos sequenciais têm data de pergunta monotônica, mesmo com relógio congelado ou empate no mesmo milissegundo; a data documental continua derivada do relógio de referência, sem criar vigência nova.

O lock exige pool dedicado de sessão do mesmo banco, conforme correção real registrada no ADR 0032. Pool transacional não garante exclusão mútua; ausência da configuração de sessão falha em 503. O runtime usa endpoint direto Neon ou modo de sessão Supabase sem mudar o destino lógico, com limite de conexões e tempo para conexão.

### RQ-4306 — Observação e reversibilidade

Registrar somente contagem de turnos, bytes e omissões na auditoria; tokens/cache/latência continuam na telemetria existente. Não registrar mensagens ou prompts em logs. Nenhuma chamada adicional de modelo para memória. Permitir desligar memória no runtime com ALVITRA_CHAT_MEMORY_ENABLED=false. Medições e revisão semântica ficam pendentes até replay autorizado; testes sintéticos não certificam qualidade de modelo.

## 8. Contratos

Mantém HTTP e formatos públicos existentes. Histórico usado pelo modelo é contrato interno, gerado pelo servidor; cliente não envia mensagens passadas. 403 para associação revogada, 404 para chat inacessível, 409 para turno concorrente e 503 para indisponibilidade da memória. Metadados de procedência usam auditoria existente, sem conteúdo documental.

## 9. Requisitos não funcionais

Zero acesso cruzado ou reintrodução de resposta documental; quatro indicadores de cobertura >=80%; sem dependências, migrations ou chamadas externas novas. Guarda PostgreSQL reserva uma conexão durante a inferência, sem transação; capacidade deve ser medida antes de escala. Ordenação histórica existente por data/ID continua; guarda impede sobreposição de gerações no mesmo chat.

## 10. Critérios de sucesso

Continuações recebem somente contexto autorizado e limitado; correções recentes permanecem literais; nova conversa não herda conteúdo; fonte removida não reaparece por resposta antiga; falha não simula amnésia bem-sucedida. Testes exercitam permissões, procedência, concorrência, falhas e transporte. Evals existentes preservam invariantes P0; revisão semântica e medição decidirão se compactação compensa.

## 11. Questões em aberto

Calibração de tamanho/latência/custo; qualidade probabilística de referência; eventual revalidação completa e transitiva de respostas documentais para ampliar replay; resumos somente após medições e nova autorização.

## Gate competitivo

Mantém o chat; detalha capacidades autorizadas; reduz repetição; preserva evidência/isolamento; diferencia pela continuidade ligada à recuperação autorizada; comprova por testes/evals; reutiliza banco e gateway sem serviço adicional.

## Gate para mudar o status

Exigir aceitação, rastreabilidade, gate de visão, testes/evals e revisão do diff. Integração Neon
sintética executada em 27/10/2026: 12/12 testes, incluindo histórico e lock entre clientes com
pool dedicado de sessão. A rodada real original de 240 cenários/260 turnos usou memória em 18
turnos de geração, com máximo observado de 412 bytes; a janela máxima é validada pelos testes,
não por essa amostra curta. Resultados na Spec 046. Revisão independente, escala, integração
Supabase e certificação especializada continuam fora dessa comprovação; nenhum merge autorizado.
