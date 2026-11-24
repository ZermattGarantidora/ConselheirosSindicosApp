# Aceitação — Spec 043

- **AC-4301 / RQ-4301:** dois usuários, dois condomínios e chats distintos nunca compartilham contexto; sem chat não lê agregado; chat oculto/revogado/inexistente falha antes do gateway; revalidar revogação durante geração.
- **AC-4302 / RQ-4302:** janela conserva até oito turnos, ordem e mensagens integrais dentro de 12.000 bytes; excesso/ataque/falha tem tratamento explícito; nenhuma chamada de resumo.
- **AC-4302b / RQ-4302 e RQ-2104:** perfil mínimo, turnos, foco e contrato de reparo cabem juntos em 12.000 bytes; o perfil não vira um turno fictício, evidência documental ou histórico de outro chat. O desligamento do replay conserva somente o cadastro atual, sem recuperar mensagens.
- **AC-4303 / RQ-4303:** resposta documental e legado sem procedência não chegam ao prompt, mesmo se a fonte original tiver sido removida; resposta geral marcada é reutilizada; dados com marcadores não entram na mensagem developer; tentativa de citação antiga é recusada pelo validador.
- **AC-4304 / RQ-4304:** “e o prazo?”, “explique melhor” e correção recebem contexto literal; busca contextual conserva pergunta original; continuação sensível mantém escalonamento; orientação geral e fallback também recebem histórico.
- **AC-4305 / RQ-4305:** simultaneidade no mesmo chat retorna 409, em chats distintos continua; repetição idempotente não invoca novamente; erro libera guarda; leitura quebrada retorna 503 sem dados internos; associação/chat alterados durante inferência impedem retorno/persistência.
- **AC-4306 / RQ-4306:** auditoria só registra medidas e procedência; provedores não recebem histórico em instruções privilegiadas; desligamento mantém caminho legado; PostgreSQL libera lock em sucesso/falha e recusa concorrência entre clientes.

Testes determinísticos verificam contratos; evals existentes verificam regressões mecânicas. Qualidade semântica, consumo do plano e economia não são aprovados automaticamente.
