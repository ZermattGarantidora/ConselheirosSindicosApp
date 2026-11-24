# ADR 0037 — Histórico canônico e replay verificável

**Status:** aceito para implementação e validação sintética do requisito solicitado
**Data:** 2026-10-30

## Decisão

Concluir a Spec 058 antes da comparação de modelos, conforme escolha explícita do usuário.
Reutilizar PostgreSQL, `app_runtime`, autorização e chats do ADR 0028. Acrescentar um journal
canônico de entradas/recibos: mensagens originais, procedência, resultado da operação, chave
de idempotência e sequência estável. Persistir antes de enviar sucesso HTTP. Texto da Alvitra
é extraído somente de resultados gerados/validados pelo servidor; não existe endpoint para
o cliente inserir uma fala da assistente. Falhas de gravação impedem a confirmação.

Configuração anterior ao condomínio tem escopo privado de conta e sessão de configuração.
Associação posterior a um chat exige pedido explícito, titularidade da sessão e autorização
atual do condomínio/chat. Move o vínculo; não copia entre condomínios e não reassocia um
registro já vinculado. Histórico paginado usa sequência/data e cursor vinculado ao escopo.

O adaptador em memória conserva o contrato da demonstração e permanece identificado como
volátil. Produção usa o adaptador PostgreSQL. Sem dependência, serviço, credencial ou provedor
novo. Backfill preserva interações anteriores; exclusão/ocultação seguem as políticas atuais.

O ADR 0032 é refinado para considerar falas gerais de procedência do servidor e respostas
documentais com ledger completo de dependências. Reutilizar texto documental exige que TODOS
os IDs, versões, páginas e hashes registrados continuem nas evidências atuais autorizadas.
Ausência, revogação, troca de versão, conflito ou ledger desconhecido omitem a fala do contexto
da IA, conservando o histórico consultável. Respostas reaproveitadas não substituem citações
atuais. A dependência transitiva deve estar coberta pelo conjunto atual; não ampliar oito
turnos/12.000 bytes/oito fontes, nem criar resumo, embeddings de mensagens ou memória global.

Detalhamento de 03/11/2026 (Spec 058, AC-5815): aceitar a ajuda documental com uma mensagem
breve permite usar citações do comentário recente somente como referência local de busca.
Não é replay da resposta: o corpo antigo não entra no contexto do gateway, e somente trechos
recuperados novamente podem sustentar fatos. A pergunta final de ajuda, até 400 caracteres,
pode identificar a intenção aceita no foco da tarefa quando há fonte atual da mesma versão
e página. Continua identificada como pergunta da assistente, sem comprovar premissas antigas.
A janela retida, o orçamento agregado de 12.000
bytes e o limite de 4.000 bytes para a referência impedem expansão silenciosa. Mudança explícita
de assunto interrompe essa referência. Não altera prompt, schema, provedor ou chamadas.

## Durabilidade e recuperação

Validar com banco sintético dedicado e guardado: gravar ambos os lados e falas auxiliares,
fechar/reabrir processos/conexões, atualizar a aplicação e comparar identidades, conteúdo,
ordem e vínculos. Backup lógico do journal tem versão e checksum; restauração acontece em
destino sintético isolado, com validação de schema, integridade e isolamento antes de uso.
Não contratar serviço nem executar essas operações sobre dados reais. O procedimento e seus
limites precisam de evidência executada; apenas mock ou recarga da página não aprovam o gate.

## Consequências

Há armazenamento adicional e uma gravação curta antes das confirmações auxiliares. A
idempotência conserva a primeira resposta confirmada; conteúdo diferente com a mesma chave
é conflito. Texto de documento/mensagem continua não confiável. Falas documentais antigas
sem procedência completa podem ser consultadas, mas não entram automaticamente na IA.
Revisão independente, políticas operacionais e validação profissional continuam gates de
lançamento; a demonstração não é promovida a produção pela aprovação dos testes sintéticos.
