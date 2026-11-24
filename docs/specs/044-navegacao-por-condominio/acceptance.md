# Critérios de aceitação — Spec 044

## AC-4401 — Carteira e conversas

Ao abrir a lateral esquerda com condomínio ativo, aparecem diretamente suas conversas. O botão
“Todos os condomínios” mostra os nomes dos condomínios autorizados. Sem contexto ativo, a lateral
abre a carteira. Selecionar outro condomínio revalida acesso e abre somente seus chats,
mantendo novo chat, renomear, excluir e retorno à carteira.
Outro condomínio carrega uma lista separada. Falha não troca o contexto nem apaga a lista anterior.

## AC-4402 — Troca sem resíduos

Depois da troca não aparecem resposta atual, fontes, rascunho, anexos, confirmações ou mensagens
iniciais do condomínio anterior. Histórico persistido continua recuperável no condomínio original.

## AC-4403 — Painel documental isolado

O painel direito contém documentos e Perfil, sem carteira de condomínios. Só solicita o catálogo
do contexto ativo. Resposta atrasada/cancelada é descartada. Erro oferece nova tentativa e não
anuncia base vazia/0%. Sem contexto explica o próximo passo. Reabrir, concluir envio/confirmação
ou esperar processamento atualiza a lista.

## AC-4404 — Organização e leitura

“Melhor visualização” abre biblioteca sobre o chat com nome do condomínio, categorias e contagens,
busca por título sem distinguir acentos/caixa, filtro de disponibilidade, versões, data e estado.
Lista vazia e busca sem resultado são distintas. Original mantém revalidação de autorização.
Versões conflitantes ou substituídas são identificadas, nunca resolvidas silenciosamente.

## AC-4405 — Indicador honesto

Com três versões prontas e uma pendente, destaca “3 de 4”; 75% e o método ficam somente nos
detalhes fechados por padrão, sem barra de progresso global. Uma única convenção pronta destaca
“1 de 1”, sem 100% fora dos detalhes nem anúncio de base completa. Versão com
confirmação pendente, vigência pendente/em conflito ou substituída não conta como disponível.
O cálculo considera as versões retornadas pelo catálogo atual, sem presumir acesso a versões
anteriores/arquivadas. Repetições da mesma versão e documentos de outro
condomínio não influenciam o resultado. Sem documentos mostra orientação sem percentual, sem impedir o chat.
Filtros não alteram o cálculo. 100% continua acompanhado da limitação sobre escopo, acerto e vigência.

## AC-4408 — Balancetes sem outros documentos

O painel oferece acesso direto a “Balancetes”; a biblioteca permite alternar essa área e todos
os documentos. Com balancete, convenção, ata, contrato, extrato e arquivo genérico no mesmo
condomínio, somente o balancete aparece nessa área e conta nos seus filtros/resultados.
O balancete aparece em categoria própria e nunca em “Outros documentos”. Um arquivo chamado
“balancete.pdf” com conteúdo de convenção/ata ou sem cabeçalho financeiro não entra na área.
Um balancete com nome genérico é reconhecido pelo cabeçalho do conteúdo. Menções a balancetes
em prosa ou cabeçalhos documentais conflitantes não bastam. A regra é a mesma em memória e no
catálogo PostgreSQL e funciona com documentos já processados, sem OCR/IA/reenvio.
Pendências e conflitos permanecem visíveis; documento de outro condomínio nunca aparece.
Sem classificação financeira há “Nenhum balancete identificado”, sem afirmar que um arquivo
pendente nunca foi enviado, e orientação para enviar pela conversa/consultar Todos os documentos.

## AC-4406 — Acessibilidade e responsividade

Lateral inicia recolhida. Modal mantém foco, fecha por Escape/botão, restaura foco e fecha ao trocar
condomínio. Os controles e documentos funcionam em 320 px e desktop, nos temas claro e escuro.

## AC-4407 — Abrir direto nas conversas do condomínio atual

**Dado** um condomínio autorizado e uma conversa ativa\
**Quando** a pessoa aciona “Abrir conversas”\
**Então** a lateral mostra “Conversas”, o nome do condomínio atual e sua lista de chats\
**E** não exige selecionar novamente esse condomínio na carteira\
**E** mantém a conversa ativa, sem nova troca de contexto ou recarga do histórico\
**Quando** aciona “Todos os condomínios”\
**Então** vê a carteira autorizada e pode selecionar outro condomínio\
**E** voltar à carteira por si só não troca o contexto\
**Quando** fecha e reabre a lateral, inclusive após visitar a carteira\
**Então** volta diretamente às conversas do condomínio que estiver ativo nesse momento\
**E** sem condomínio ativo, abre a carteira sem presumir ou selecionar um condomínio.
