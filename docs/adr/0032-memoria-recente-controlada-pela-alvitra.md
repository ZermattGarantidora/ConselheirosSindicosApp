# ADR 0032 — Memória recente controlada pela Alvitra

**Status:** aceito para implementação sintética autorizada  
**Data:** 2026-10-26

## Decisão

Implementar a Spec 043 com histórico existente, guarda por chat e dados serializados em contexto não privilegiado. Não usar sessão persistente de fornecedor, resumo ou embeddings de mensagens. Limites iniciais: oito interações e 12.000 bytes UTF-8, sujeitos a medição. Desligamento por ALVITRA_CHAT_MEMORY_ENABLED=false.

Correção de 29/10/2026 (Spec 021, RQ-2104): consultar o cadastro já autorizado para fornecer
somente nome e unidades do condomínio atual, separadamente dos turnos e sem comprovação
documental. A configuração inicial não faz parte do histórico de perguntas; omitir o perfil
fazia a primeira resposta negar dados recém-confirmados. A projeção mínima não depende do replay
de histórico, respeita o mesmo orçamento junto ao foco e ao reparo e não cria memória entre chats,
resumos, tabela, serviço ou nova chamada. Falha ou escopo divergente interrompem a geração.

O teste externo foi inicialmente rejeitado por revisão automática por ausência de autorização
específica para o payload cadastral. Depois da pergunta explícita sobre nome, unidades e
identificador do condomínio ativo nas mensagens ao Codex/OpenAI da conta ChatGPT, o usuário
selecionou “Autorizar o cadastro no contexto”, em 29/10/2026. Essa decisão autoriza a projeção
no gateway Codex já configurado e o teste inicial com cadastro fictício; não autoriza outro
destino ou novos campos pessoais. O estado de documentos e a comprovação documental não são
inferidos do perfil cadastral.

Nesta fatia, não reenviar texto de respostas produzidas com evidência documental. A procedência segura é marcada na auditoria transacional existente, somente para resposta concluída sem evidência no contexto da geração. Legado desconhecido é omitido. Assim, nenhuma resposta documental introduz dependências transitivas escondidas nas respostas futuras; perguntas do usuário permanecem relatos não comprovados. Fontes devem ser recuperadas novamente.

RAM usa guarda local; PostgreSQL usa pg_try_advisory_lock com chave derivada do escopo, liberado em finally. O lock reserva uma conexão, sem transação longa; não resolve capacidade ilimitada e deve ser medido. Colisão de hash pode recusar trabalho independente, sem conceder acesso. Repositórios/RLS e revalidação de associação continuam obrigatórios.

Correção de integração de 27/10/2026 (Spec 046): o pool transacional Neon reatribui sessões e tornou o lock reentrante entre clientes no teste real. A guarda passa a exigir um pool separado explicitamente de sessão, com conexão limitada e sem transação durante inferência. Neon usa o endpoint direto do mesmo banco (retira apenas `-pooler`); Supabase usa o pool de sessão do mesmo destino (5432 em vez de 6543). O construtor sem pool de sessão recusa a guarda, sem simular exclusão mútua. A resolução do usuário acontece em transação curta, concluída antes do lock. Não há novo banco, provedor, credencial copiada ou schema.

Referências: [Neon — conexões diretas para estado de sessão](https://neon.com/docs/connect/connection-pooling) e [Supabase — modos de conexão](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Consequências

Sem pacote, serviço, provedor, schema ou armazenamento duplicado. Reutiliza as políticas existentes de retenção. Memória melhora continuidade dentro do chat, sem lembrar automaticamente outro chat ou garantir detalhes fora da janela. Evita reenviar dados de documento removido por respostas antigas, ao custo de não reproduzir literalmente essas respostas. A integração Neon sintética passou em 27/10/2026, incluindo lock entre clientes; Supabase, capacidade e qualidade especializada ainda precisam de validação própria. Resultados da rodada curta real na Spec 046.

## Alternativas

Histórico completo tem custo crescente; resumo adiciona perda e inferência antes das medições; replay documental com dependências transitivas exigiria revalidação mais ampla. Ficam adiados conforme aprovação do usuário.
