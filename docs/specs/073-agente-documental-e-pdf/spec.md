# Spec 073 — Agente documental, áudio e PDF confirmado

**Status:** implementação local validada; homologação técnica real local e homologação humana do caso financeiro de 300 páginas; demais homologações/liberação operacional pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-18

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Transforma pedidos e fontes em rascunhos revisáveis, reduzindo o trabalho documental. |
| Público | §3 | Atende síndicos profissionais e moradores no condomínio autorizado. |
| Proposta de valor | §§5 e 6 | Mantém pedido, esclarecimento, revisão e entrega na conversa. |
| Prioridades do MVP | §7, Bloco 7, decisão de 12/11/2026 | Abrange criação, revisão solicitada e melhoria oferecida, Word e atas de áudio, com saída PDF. |
| Segurança e confiança | §§8–10 | Preserva originais, procedência, escopo, confirmação, conflito e revisão humana. |
| Validação e métricas | §§13–14 | Mede conteúdo preservado, confirmação exata, tempo para o rascunho e zero acesso cruzado. |

### Limites respeitados

- Sem tela de trabalho paralela, envio externo, assinatura, aprovação automática ou contabilidade completa.
- Saída somente PDF; não há exportação Word nem promessa de reconstrução idêntica de layout arbitrário.
- Entrada Word exige reconhecer conteúdo não extraído; áudio não autoriza reconhecimento biométrico de pessoas.
- Entradas continuam exclusivamente sintéticas. Autorização de 18/11 permite homologação técnica
  local pelo Codex já contratado e transcrição local gratuita, sem cobrança adicional de API.
  Não contratar serviço nem habilitar transporte em produção.
- A autorização funcional não aprova fornecedor, política de dados reais, novo prompt ou prazo de retenção.

### Divergências da visão

Nenhuma após a atualização conjunta do briefing. O usuário autorizou explicitamente ampliar o
briefing e seguir localmente em 12/11/2026. Esclareceu que o agente deve criar/revisar a maioria
dos documentos, oferecer melhorias, gerar atas de relato ou reunião e receber Word desde o início.
A saída foi escolhida explicitamente como PDF. Esta spec amplia o fluxo além da cópia de PDF
da Spec 062, preservando seus contratos de evidência e confirmação.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Criar e revisar documentos pelo chat, apresentar o texto e a proposta para revisão e gerar uma
cópia PDF privada somente após a confirmação da versão exata.

## 2. Promessa testada

> Posso pedir uma criação ou melhoria, revisar o texto e baixar exatamente o rascunho que confirmei.

## 3. Usuário primário

Síndico autorizado no condomínio e chat ativos, com permissão para criar derivados privados.

## 4. Escopo

- Operações de criação, alteração solicitada e melhoria oferecida, sem restringir tipos a ata/comunicado.
- Origens PDF, JPEG/PNG, Word DOCX e áudio; cada extrator/transcritor declara completude e limites.
- Dois modos de áudio: relato do síndico e reunião, com duração/orçamento independentes.
- Propostas versionadas, texto revisável, confirmação por hash e PDF marcado como rascunho.
- Procedência de informações: documento autorizado, relato do usuário e transcrição com tempo/falante.
- Fontes e conteúdo conservados sob usuário/condomínio/chat; sem promoção automática à base probatória.

## 5. Fora do escopo

Assinatura, envio, publicação, validação profissional automática, mudança do original, anonimização
por reconhecimento de voz, suporte irrestrito a todos os recursos de Word/PDF, treinamento e dados reais.

## 6. Pré-condições

Specs 013/034/058/062/068/071/072 e ADR 0045. Permissão atual, conversa própria, fornecedores/
payloads e custos aprovados antes de transporte externo. Áudio real exige política apropriada.

## 7. Requisitos funcionais

### RQ-7327 — Suporte parcial automático

A conferência calcula em centavos o total de comprovantes inequívocos vinculados à mesma rubrica
e competência e o saldo sem comprovação. Suporte parcial não é apresentado como ausência de todos
os comprovantes: total lançado, valor com suporte e parcela pendente ficam explícitos, com fontes.
No caso homologado: R$ 9.688,75, R$ 9.382,80 e R$ 305,95. Pendência/próximo passo pedem essa parcela.
Identificador repetido, valor ambíguo, lançamento duplicado ou período incompatível não certificam
a soma. Excesso não vira diferença negativa ou aprovação. Memorial cancelado não completa suporte;
vínculo não certifica pagamento ou execução.

### RQ-7328 — Relatório financeiro no chat

Reutilizar o editor sobre o chat para selecionar versões completas autorizadas e o balancete de
referência pelo título original. Abrir/selecionar/consultar contexto somente lê; redação/conferência
começam por pedido explícito. Entrega no rascunho comum, com edição, confirmação exata e PDF privado.
Reabrir recupera resultado salvo sem modelo; repetição conserva identidade e edição humana. Modelo
indisponível permite recuperar o concluído, sem contingência fictícia. Outro usuário/chat/tenant é
negado. Estado operacional é interface, sem fala fabricada da assistente ou tela financeira paralela.

### RQ-7329 — Persistência específica do fluxo financeiro

Com o caderno sintético de 300 páginas e PostgreSQL local dedicado, provar que originais, páginas,
recibos, rascunho, edição e confirmação sobrevivem a processo novo e backup/restore. Recuperação não
compartilha RAM nem precisa de modelo para ler o concluído. Fonte alterada/removida ou autorização
revogada bloqueia entrega sem chamada nova. Despacho incerto não é repetido. Ensaios usam loopback,
papéis restritos/RLS e bancos descartáveis marcados. Cotas/retenção propostas permanecem inativas;
sem serviço remoto, API paga ou dados reais. Resultados antigos concluídos continuam recuperáveis;
versão incompatível incompleta exige reconciliação, sem reconstrução/geração silenciosa.

Esta fatia aplica briefing §§4–7/Bloco 7, 8–10 e 12–14 e o gate competitivo: conclui no chat o trabalho
autorizado, reduz omissão de evidência e recuperação frágil, reutiliza leitor/journal/editor/SQL. Sem
módulo, operação bancária ou serviço antecipado. Cálculos/gabarito, navegador e reinício/restore locais
medem sucesso; homologações anteriores conservam seus hashes e decisões.

### RQ-7324 — Prova financeira integral de 300 páginas

Continuação autorizada em 18/11 após crítica à representatividade das frases: caderno financeiro
sintético denso, com documentos integrantes identificados explicitamente, competências comparáveis,
movimentações, extratos, orçamento e suportes. As 300 páginas passam pelo upload/leitor da aplicação;
inventário de páginas, hashes, lançamentos e verificações fica separado do relatório narrativo.
O gabarito é definido antes da execução, a partir da contabilidade sintética independente do parser,
e nunca entra no modelo. Casos do início, meio e fim exigem cruzamento de páginas, valores e versões.

Documentos integrantes são agrupados somente por identificação explícita no original; cabeçalhos
ausentes/conflitantes, duplicidade ou trecho ilegível impedem alegar análise integral. Locadores e
citações publicados sempre apontam ao documento/versão/página originais, sem paginação inventada.
Conferência usa os dez pontos e cálculos em centavos das Specs 022/049; não certifica contas ou fraude.

### RQ-7325 — Relatório financeiro com origem integral e redação limitada

Uma composição explícita resolve o caderno autorizado completo (até os 500 páginas/dois milhões de
caracteres já permitidos na análise), calcula a conferência e fornece ao redator os resultados e
evidências verificáveis. O modelo não precisa receber texto repetido de todos os comprovantes para
reescrever cálculos locais. Todo o inventário continua vinculado por hash ao resultado, inclusive
páginas não citadas na síntese. Não promover amostra de páginas a leitura integral.

Redação e conferência separadas têm claims prévias no journal, entrada/resultado identificados e
nenhum retry automático de envio incerto. O relatório inclui síntese contextual, todos os dez pontos,
cálculos, limitações, próximos passos e fontes legíveis. Sem modelo ou conferência válida, não existe
falsa síntese de contingência. Fontes ou permissão alteradas impedem entrega, inclusive após reinício
ou edição. Reutilizar rascunho, confirmação exata e PDF privados existentes; referências de saída
passam a até quinhentas, ainda sob 175 mil bytes e cem páginas. O teto de vinte origens da autoria geral
permanece; o relatório especializado resolve sua análise integral no servidor, sem contorná-lo pelo cliente.

### RQ-7326 — Revisão especializada proporcional

Feedback humano dos casos 1/2: copiar uma regra para comunicado ou registrar relato sem diagnóstico
não exige aprovação especializada do texto. Reprodução literal simples não recebe esse rótulo por
tipo de fonte ou por uma classificação substantiva indevida. Orientação de investigar a causa com
responsável técnico permanece em pendência separada. Mudanças normativas/substantivas e conclusões
de maior risco continuam exigindo validação apropriada; não dispensar confirmação humana do PDF.

A classificação é regra do servidor: somente criação de Comunicado, Relato ou Relatório de
ocorrência, sem convenção/contrato, com parágrafos integralmente copiados das fontes e todas as
mudanças editoriais, recebe `requiresSpecialist=false`, mesmo se o modelo sugerir excesso. O texto
e as pendências não são reescritos; a conferência separada avalia o plano já classificado pela
política. Recibos reais do ensaio preservam a saída bruta. A exceção não abrange revise/improve,
outro tipo documental ou mudanças substantivas; nessas hipóteses a proteção anterior permanece.

A rodada usa Codex já contratado e ferramentas locais, sem API paga, nova contratação, dados reais
ou adoção da proposta operacional. Benchmark de extração não aprova a qualidade do relatório; a
homologação humana avaliará o caso completo após a prova técnica e conservará os ajustes anteriores.

### RQ-7322 — Homologação técnica sem cobrança adicional

Esta continuação amplia as provas anteriores com mocks, sem habilitar serviços de produção.
As restrições de transporte descritas nas fatias históricas continuam valendo fora deste opt-in.

Por decisão explícita de 18/11, adicionar composição opt-in para Codex CLI autenticado com
ChatGPT e whisper.cpp offline. Processos sem shell, ferramentas de modelo desabilitadas,
temporários isolados e entradas exclusivamente sintéticas. Nenhuma chave de API é encaminhada,
nenhum fallback pago e nenhuma ativação pelo startup. Binário/modelo gratuitos têm origem,
versão, licença e hashes registrados. O transcritor conserva tempos e não identifica pessoas.
Saída inválida, parcial, incerta ou processo interrompido bloqueia, sem repetir automaticamente.

Exercitar redação e conferência reais nos contratos de autoria/ata, e áudio sintético falado
no transcritor local. Conservar entradas, saídas, hashes, modelo, latência e resultados por caso;
gabaritos nunca entram na redação. Separar aprovação de contratos, revisão por modelo e revisão
humana especializada. A execução técnica não fabrica assinatura humana, CI ou liberação real.

### RQ-7323 — Histórico permanente independente dos derivados

A purga dos payloads de autoria/áudio não substitui mensagens públicas já salvas nem inventa
fala humana de exclusão. Preserva IDs, ordem, texto e papéis dessas mensagens. Recibos internos
continuam ocultos após purga, com sua marca interna preservada; seus payloads/textos operacionais
podem ser removidos. Tombstones, consumo e cercas continuam impedindo recuperação do artefato,
inclusive após restore. Exclusão explícita da conversa segue seu contrato próprio.

O usuário recusou adotar os limites em 18/11: proposta operacional permanece inativa, aprovações
nulas, sem cron, TTL real, dados reais ou liberação de destino. Corrigir compatibilidade técnica
de histórico não representa aprovação da política.

### RQ-7301 — Pedido e proposta contextual

O mesmo fluxo aceita criar, revisar ou oferecer melhorias para tipos documentais informados.
A proposta contém texto, origem, pendências e alterações. A oferta não gera arquivo nem atribui
uma fala pronta à Alvitra. Recusa encerra a proposta sem alterar a origem.

### RQ-7302 — Versão e confirmação

Toda edição cria revisão com hash próprio e invalida confirmação anterior. A confirmação inclui
o ID/revisão/hash apresentados; divergência, recusa ou ausência impede PDF. Retentativa idêntica
é idempotente; versão antiga nunca gera o texto novo sem nova confirmação.

### RQ-7318 — Oferta após análise do original

Continuação autorizada em 17/11: após síntese bem-sucedida de um único original, composição
explicitamente sintética avalia melhoria editorial com o mesmo agente/conferente documental.
Upload, seleção, abertura de histórico e download não iniciam essa avaliação. O servidor resolve
o original completo e confirmado; a síntese não é fonte nem instrução de alteração. Lotes com
mais de uma versão pedem seleção explícita, sem escolher origem silenciosamente.

Esta fatia conserva palavras, números, pontuação e ordem de todas as páginas/blocos; permite
somente organizar espaços e quebras. Cada bloco tem antes/depois integral e referência literal,
dentro dos limites existentes. Não corrige fatos, ortografia ou sentido normativo por iniciativa
própria. Redação mais ampla continua dependendo de pedido explícito e evidência adequada.
Texto idêntico não vira oferta. Falta de contexto, limite, conflito ou falha é explícito; nenhuma
oferta genérica, rascunho ou PDF é fabricado. A mensagem contextual vem do modelo simulado.

Identidade estável por usuário/condomínio/chat, versão e conteúdo impede repetição de etapas e
insistência após recusa, inclusive em nova API. Aceite usa o hash exato e abre rascunho não
confirmado no editor existente. Leitura/decisão/PDF revalidam as fontes e os controles operacionais.
Oferta aparece na conversa sem abrir formulário ou tela paralela. Startup real permanece negado.
Recibos de trabalho automático conservam o registro interno, mas não aparecem no histórico público
como se fossem mensagens do síndico ou falas da Alvitra. Oferta contextual e decisões humanas
permanecem recuperáveis; a projeção da conversa não expõe instruções internas do agente.

### RQ-7319 — Demonstração e matriz única

Percurso sintético executável: análise do original → oferta com fontes/antes/depois → aceite ou
recusa → edição → confirmação exata → PDF → recuperação. Exercitar também ausência de melhoria,
origem incompleta/revogada, falha incerta, troca de contexto e original imutável. Modelos são
simulados, servidores em loopback, configuração sem `.env`, zero chamadas externas e custo zero.
Matriz de todos os ACs distingue prova local, qualidade real e liberação operacional. Consolidar
o estado atual sem apresentar limitações históricas já superadas como pendências de implementação.

### RQ-7320 — Pacote de homologação sintética

Preparar corpus próprio com casos documentais e roteiros de relato/reunião, gabaritos de fatos,
negações, fontes, pendências, abstenção, conflito e revisão especializada. Entradas do modelo
ficam separadas dos gabaritos/formulários humanos. IDs, escopo, hashes e versão do corpus
vinculam cada avaliação; revisão fica pendente por padrão. Saída simulada nunca aprova IA real.
O comando offline valida integridade e simula defeitos no protocolo de avaliação, sem provedor,
`.env`, download, instalação ou contratação. Mantém relatórios legíveis por CI e rastreabilidade.

Áudios de teste podem ser sintetizados exclusivamente por voz pt-BR já instalada no Windows,
mediante comando local explícito. Sem voz compatível, falha sem instalar ou usar fallback remoto.
Preservar texto, hash, voz e tempos medidos; não usar silêncio como suposta fala ou atribuir nomes
a falantes. Uma voz sintética não comprova robustez acústica, diarização ou transcrição reais.
O material define rubrica humana e limiares provisórios; a amostra não substitui o corpus geral
de cem casos revisados nem a homologação específica antes da liberação.

### RQ-7321 — Proposta operacional revisável e inativa

Entregar proposta concreta para limites/retentores de originais e derivados, orçamento externo
zero nesta rodada, responsabilidades, custódia fora do dump, manutenção, exclusão/revogação,
exportação, incidentes e recuperação. Separar capacidades atuais, valores propostos, decisões
pendentes e evidências exigidas no destino. Nenhuma configuração é importada por API/worker,
nenhum cron é iniciado e nenhum destino/provedor é escolhido ou ativado pelo pacote.
Relatório conserva bloqueios de qualidade real, dados, política, custódia, revisão e CI.
Ensaios operacionais locais reutilizam contratos existentes com sintéticos e relógio controlado;
valores propostos não mudam TTL, orçamento ou comportamento em execução.

### RQ-7311 — Melhoria proativa de rascunho na conversa

A continuação local autorizada em 16/11 integra a oferta ao rascunho salvo no chat. Um agente
injetável recebe a revisão integral e pode sugerir organização, pontuação e apresentação,
com fala contextual e alterações explícitas. Nesta primeira fatia conservadora, todos os
tokens de palavras/números são preservados, na mesma ordem; fatos e fontes não podem ser
incluídos, omitidos ou trocados. A origem, as pendências e a necessidade de revisão humana
acompanham a proposta. Não há oferta fabricada quando o agente estiver indisponível.

Oferta, recusa e aceite usam recibos no mesmo usuário/condomínio/chat e hash da revisão-base.
O agente é exercitado somente com simulações, sem alterar prompt ou ativar transporte real.
Retentativa não repete a geração; resultado incerto exige reconciliação. Aceitar cria uma
nova revisão para conferir; não confirma PDF. Editar ou confirmar a base torna a oferta
antiga inaplicável. Recusar encerra a oferta, sem insistência ou alteração do original.

### RQ-7312 — Validação persistente local de Word e rascunhos

Validar migration 041 e percurso Word/rascunho no PostgreSQL local sintético dedicado:
bytes e blocos recuperáveis, confirmação por hash, nova instância de API/store, restore,
fonte alterada/revogada e outro usuário/condomínio/chat negados. Não usar .env ou destinos remotos.

### RQ-7313 — Áudio durável sintético

Armazenamento próprio de áudio conserva bytes sob usuário/condomínio/chat, hash e retenção
explícita. Expiração ou exclusão impede transcrição, rascunho e PDF; purga remove original,
transcrição e derivados sem liberar novamente a identidade de consumo. Recibos duráveis
registram tentativa antes da transcrição, resultado e estado incerto, sem repetição automática.
Exportação e backup/restore incluem todos esses dados; restaurar exige reaplicar exclusões
e revogações posteriores antes de reabrir o destino.
Substituição do índice do journal mantém lock e rename atômico. Somente erros transitórios
de arquivo admitem até cinco tentativas locais; falha persistente conserva quarentena e não
confirma gravação ou repete transcrição/modelo.

A composição positiva desta rodada existe apenas no harness sintético local, com custo zero,
limites explícitos e transcritor simulado. Startup de produção permanece sem transcritor,
redator ou política positiva; storage documental genérico não habilita áudio.

### RQ-7303 — Fontes e limites factuais

Texto de documento é dado não confiável. Fatos locais e mudanças substantivas precisam de fontes
autorizadas atuais ou ficam como pendência explícita. Relato/transcrição não vira evidência
documental confirmada. Não inventar votos, participantes, decisões, valores, quórum ou vigência.
Alteração jurídica/financeira/técnica relevante explicita revisão especializada.

### RQ-7314 — Agente documental geral e proposta fundamentada

Continuação autorizada em 16/11: pedido explícito para criar, revisar ou melhorar um tipo
documental informado, com originais PDF/foto/Word autorizados e relato declarado opcional.
O servidor resolve as versões/páginas ou blocos completos pelo catálogo atual; o cliente não
fornece texto como se fosse documento recuperado. Material incompleto, vigência não confirmada,
excesso de entrada ou fonte alterada impede revisão integral. Esta fatia não altera o original.

O redator injetável devolve parágrafos, procedência e referências literais com offsets, além
de alterações com antes/depois, justificativa e apoio. Cada parágrafo proposto está representado
na lista de alterações. Todas as páginas/blocos e o relato são classificados na cobertura;
omissões materiais, conflitos e insuficiência viram pendências, sem preenchimento inventado.
Relato não recebe rótulo de fato documental confirmado. Proposta sem base pode pedir contexto;
nesse estado não há rascunho aplicável ou PDF. Alterações substantivas exigem revisão especializada.

Validação determinística verifica limites, IDs, offsets, citações, números literais, cobertura
e correspondência entre alterações e texto. Conferência separada recebe o plano e todo o
material e verifica sustentação, procedência, negações e omissões. Todas as unidades do plano
precisam de resultado explícito; recusa, divergência ou indisponibilidade bloqueia a proposta.
Testes simulados validam contratos e bloqueios, não qualidade semântica de IA real.
Se o pedido selecionar versões distintas do mesmo documento, o conflito é exibido e a seleção
deve ser esclarecida antes da geração; não se presume qual versão prevalece.

### RQ-7315 — Decisão, procedência e retomada da proposta

Pedido, envio/resultado por etapa, proposta e decisão têm identidades imutáveis no journal,
sob usuário/condomínio/chat. Concorrência/retentativa não repete redação ou conferência;
envio incerto exige reconciliação, sem fallback. Resultado salvo permite retomar falha posterior.
Aceite usa hash exato da proposta e cria rascunho novo ainda não confirmado. Recusa encerra a
proposta. Replay de aceite recupera a revisão atual sem desfazer edição ou confirmação humanas.

Rascunho conserva referência verificável à proposta, às versões/fontes e ao relato utilizado.
Leituras, edições, confirmações e PDF revalidam essa origem; fonte alterada ou revogada nega
entrega. Proposta não substitui o original nem entra automaticamente na memória vetorial.
Os controles ficam sobre o chat e reutilizam o editor existente. Selecionar fontes ou abrir
histórico não chama o redator. Somente o pedido explícito inicia geração.

Limites iniciais desta fatia: 20 origens (páginas/blocos e eventual relato), 80 mil caracteres
de fontes, relato de quatro mil caracteres, pedido de dois mil, até 40 parágrafos/alterações e 20 referências documentais
distintas. Limites são checados integralmente; nada é cortado silenciosamente. Startup continua
sem redator geral, conferente ou transporte habilitado; todos os ensaios usam modelos simulados,
sem serviço, nova dependência, chave, chamada paga ou mudança de personalidade/prompt aprovado.

### RQ-7316 — Controles operacionais sintéticos

Continuação autorizada em 16/11: composição explícita de custo/quantidade/concorrência da
Spec 072 nas seis finalidades de transcrição, redação/conferência de ata, redação/conferência
documental e melhoria editorial. Política e máximos fictícios vêm do servidor, nunca do pedido.
O resultado é validado e persistido antes da conclusão do orçamento; custo contabilizado é o
máximo conservador, não uma fatura. Replay salvo não reserva outra vez. Falha, limite, revisão
divergente ou kill switch impede envio; resultado incerto não ganha claim nem refund por tempo.

No harness local, o cofre de consumo e o journal de ciclo de vida ficam fora do dump SQL, em
diretórios privados explícitos. Restore anterior ao envio conserva as cercas e o consumo: sem
resultado no snapshot, não há reenvio. Falta/corrupção do journal mantém quarentena. Não se
transporta resultado/conteúdo para o cofre de consumo. Backend de arquivo é exclusivamente
sintético e não é selecionado por startup ou variável de ambiente.

### RQ-7317 — Retenção, exportação e purga de derivados

Política sintética fixa expiração na primeira criação de cada origem; editar, confirmar,
repetir, reiniciar ou restaurar não renova o prazo. Origem sem recibo de retenção não recebe
prazo novo silenciosamente. Expiração, tombstone, relógio regressivo e recuperação pendente
impedem leitura, geração, aplicação, edição, confirmação, exportação e PDF conforme o estado.

Exportação privada reúne os recibos/conteúdo da origem e derivados no mesmo usuário/condomínio/
chat, revalidando autorização/fontes; não expõe token ou recibo financeiro. Purga registra primeiro
a decisão fora do dump e remove conteúdo dos eventos relacionados, conservando identidade,
hashes, consumo e tombstones sem texto. Derivação percorre somente pai → filhos: excluir um
rascunho não exclui original/relato ou rascunho independente. Falha parcial continua bloqueada.
Reaplicação após restore elimina novamente os derivados sem alterar outro contexto.

Manutenção é operação explícita e limitada por lote/escopo no harness; pode reexecutar purgas
pendentes e expurgar expirados. Não inicia cron/daemon, não reabre aplicação, não chama IA e não
escolhe prazo/moeda reais. Composição PostgreSQL, RLS, backup/restore anterior às decisões e
cofre externo são exercitados só em bancos locais novos, com modelos simulados e custo zero.

### RQ-7304 — Word e leitura verificável

DOCX é tratado como pacote não confiável, com limites de bytes, expansão, entradas e XML.
Scripts, vínculos externos, macros, criptografia e recursos não lidos não são executados.
Blocos/trechos mantêm locadores próprios; números de página Word não são presumidos. Extração
incompleta fica explícita e impede prometer revisão integral.

### RQ-7305 — Áudio e ata

Modo relato e modo reunião são explícitos. Transcrição conserva segmentos temporais e rótulos
de falantes; nomes só entram quando fornecidos e confirmados. Trechos incertos/inaudíveis não
recebem preenchimento inventado. Proposta de ata distingue relato, discussão e decisão relatada,
sujeita à conferência humana e sem presumir validade jurídica.
O transporte tem contrato substituível e negado por padrão; limites/custo são conferidos antes
do envio. Não truncar áudio ou dividir em novas chamadas silenciosamente.

O síndico grava externamente e anexa o arquivo no chat, escolhe relato/reunião e envia um pedido
explícito de ata. Selecionar arquivo, visualizar, mudar modo ou recuperar histórico não inicia
transcrição nem geração. A interface identifica transcrição/preparação como estados operacionais,
mostra a transcrição e abre o rascunho no editor existente. Não existe captura de reunião em
segundo plano nem gravação de microfone sem ação do usuário.

A continuação autorizada exige redação semântica: resumir e agrupar assuntos, separar discussão,
proposta, decisão relatada e encaminhamento. A transcrição completa é insumo; não pode ser
reempacotada como ata nem usada como fallback quando o redator estiver indisponível. Nenhuma
data, nome, quantidade, voto, quórum, valor ou prazo pode ser completado por suposição.

### RQ-7309 — Redação estruturada e conferência

O redator recebe a transcrição inteira, modo e pedido, como dados não confiáveis. Devolve plano
estruturado com identificação quando sustentada, tópicos, resumos, propostas, decisões relatadas,
responsáveis/prazos sustentados e pendências. Cada afirmação factual aponta para segmento e citação
literal verificável; falante anônimo não identifica pessoa. Trecho incerto só apoia pendência.
Todos os segmentos são classificados como representados, não materiais ou incertos; não truncar.

Validação determinística verifica schema, referências, citações, cobertura, duplicação, limites
e números literais. Outra etapa de modelo recebe plano e transcrição completos, verifica suporte,
negações, tipo/resultado das decisões e omissões materiais. Divergência, recusa, resposta parcial,
saída inválida ou verificador indisponível impedem a proposta; não há fallback extrativo.
Aprovado nos controles não significa aprovação jurídica ou dos participantes. PDF exige revisão humana.

### RQ-7310 — Tentativas e limites do redator

Redação e conferência têm recibos separados, reivindicados antes de cada chamada. Duas requisições
concorrentes e retentativas não repetem a etapa. Resultado salvo permite continuar após falha de
persistência. Chamada incerta fica bloqueada para reconciliação, sem retry automático ou novo consumo.
Versão do fluxo/prompt participa da identidade; ata extrativa anterior nunca é devolvida como
redação semântica. A UI permite pedir nova redação do áudio já transcrito, sem novo envio.

Transportes e modelo são explícitos e negados por padrão. Só mocks são usados nesta rodada.
Não ler chaves, habilitar provedor ou fazer chamadas cobradas. Entrada, saída e tokens são
limitados antes do transporte, sem corte silencioso e sem ferramentas externas. A personalidade
aprovada do chat permanece intacta. Instruções específicas de redação/conferência ficam apresentadas
em `redacao-ata-prompt-proposto.md`; aplicação real continua sujeita à homologação/autorização.

Rascunhos suportam até 160 mil caracteres e 175 mil bytes no conteúdo serializado, dentro do
limite de 200 mil bytes do journal. O histórico registra a ação e conserva a revisão integral
no recibo recuperável; não duplica o texto longo em mensagem de 20 mil caracteres. Excesso
falha explicitamente. O renderizador mantém o teto de 100 páginas, sem corte.

Referência de áudio contém ID, hash do original/transcrição, modo e duração. Todas as leituras,
edições, confirmações e downloads de rascunho revalidam essa origem no mesmo usuário/chat/condomínio.
Retentativa do mesmo pedido recupera a proposta, inclusive se ela já foi revisada, sem repetir
transcrição, criar outra revisão ou desfazer confirmação. Novo pedido usa nova identidade.

### RQ-7306 — PDF fiel ao rascunho

PDF conserva todo o conteúdo confirmado, tem título, indicação de rascunho, paginação e
referências pertinentes. Paginação da nova cópia é própria. Texto não suportado, excesso de
páginas, falha de renderização ou conteúdo cortado impede entrega; não substituir caracteres
ou omitir trechos silenciosamente. Original nunca é alterado.

### RQ-7307 — Persistência, isolamento e recuperação

Proposta, revisões e confirmação são duráveis antes do sucesso no modo persistente. Leitura,
edição, confirmação e download revalidam usuário/condomínio/chat/permissão e fontes atuais.
Revogação e fonte indisponível negam entrega corrente sem nova geração. Falha não retorna
histórico vazio nem sucesso; repetição não duplica arquivo ou consumo.

### RQ-7308 — Conversa e retenção

Rascunho, pedidos e confirmações ficam recuperáveis no contexto autorizado. Arquivo não entra
automaticamente na busca vetorial nem na biblioteca como fonte. Originais e derivados seguem
a política aprovada; exclusão/revogação e restore não podem restaurar acesso indevido.

## 8. Contratos

Estados: `draft`, `awaiting_confirmation`, `confirmed`, `declined`, `blocked`, `failed`.
Proposta inclui ID, revisão, hash, operação, tipo, texto, origem e pendências. Confirmação nunca
aceita só um booleano sem identidade da versão. Provedor de redação/transcrição é injetável;
adaptador indisponível não é substituído por fala falsa. Nenhuma nova chave habilita envio real.

## 9. Requisitos não funcionais

Zero acesso cruzado ou alteração do original; zero geração pré-confirmação; nenhum conteúdo
privado em logs. Quatro pisos de cobertura >=80%, testes determinísticos e artefatos reproduzíveis.
Layout e extração são verificados com PDFs sintéticos, inclusive multipágina/acentos/limites.

## 10. Critérios de sucesso

Aceitação executada e rastreada, rascunho confirmado recuperável, PDF legível sem perda, ausência
de nova chamada na retentativa e limites de entrada/áudio claros. Mock não aprova qualidade real.

## 11. Questões em aberto

- Provedor e política reais de transcrição, limites finais de duração/custo e retenção de áudio.
- Recursos DOCX que a primeira implementação consegue extrair integralmente.
- Composição de produção, custódia e política permanecem pendentes; a homologação técnica local
  Codex/whisper.cpp foi autorizada no RQ-7322, sem API paga ou adoção dos limites propostos.

### Estado consolidado local — 18/11/2026

Detalhamento por critério e pendências: [matriz de aceitação](matriz-aceitacao.md).

O usuário homologou pelo chat o relatório do caderno financeiro sintético estruturado de 300
páginas, com o ajuste explícito de informar suporte parcial de Manutenção e R$ 305,95 pendentes
de comprovação. A revisão 2 aplica esse ajuste, conserva as demais seções e acrescenta as fontes
das 24 notas não canceladas (R$ 9.382,80) e do memorial cancelado. A confirmação humana é ligada
ao hash da revisão corrigida, com decisão e verificação registradas; nenhum modelo foi chamado.
É homologação desse caso, não aprovação de contas, qualificação especializada, OCR arbitrário,
outros casos ou liberação operacional. A edição manual autorizada não altera o analisador automático.
Fonte e gabarito anteriores são preservados. Essa decisão aplica o Bloco 7 e os §§8–10/14 do
briefing, sem introduzir módulo, serviço ou item posterior. A proposta operacional permanece inativa.

Implementados revisão manual/contextual de texto do chat, confirmação versionada, rascunho PDF,
leitura Word restrita no upload e contratos/recibos de áudio negados por padrão. A continuação
inclui interface de envio/prévia, pedido explícito e recuperação de transcrição/proposta,
inclusive após recarregar. A montagem extrativa inicial é substituída por redação semântica
estruturada, conferência em etapa separada e bloqueio na falta de suporte. A transcrição integral
permanece separada do resumo. Texto do rascunho suporta até 160 mil caracteres
e 175 mil bytes serializados; metadados/pendências entram na confirmação e no PDF. Word:
10 MiB/256 entradas/32 MiB descompactados/8 MiB por entrada/500 blocos/120 mil caracteres.
WAV PCM: 25 MiB e 10 minutos no relato ou 60 na reunião, valendo o primeiro limite atingido.

Word/rascunhos, áudio durável e migrations 041–043 foram validados em PostgreSQL local dedicado,
incluindo restore, RLS, consumo externo ao dump, TTL e purga. Propostas gerais fundamentadas,
melhoria de rascunhos e proatividade sobre originais têm composição sintética e percurso de
revisão/confirmação/PDF. Não equivalem a validação semântica de IA real ou prontidão operacional.
Startup mantém redator/conferente/transcritor e controles positivos desativados. Adaptadores
Codex/ChatGPT e whisper.cpp offline existem somente na composição explícita de homologação
sintética do ADR 0046. A prova semântica usa os roteiros exatos; ASR e o percurso ASR→ata são
medidos separadamente, conservando incertezas e recusas. Conferência por modelo não é aprovação
humana ou qualidade acústica geral. Purga de autoria e áudio conserva mensagens públicas já
salvas e a marca dos recibos internos ocultos, sem adotar retenção real.
O usuário grava externamente; não há captação de microfone. Recursos DOCX desconhecidos são
recusados, sem reconstrução fiel de layout arbitrário. Homologação humana/especializada, qualidade
acústica representativa, política/custódia/agendamento do destino, revisão independente e CI de
integração continuam pendentes. Não declarar conclusão integral ou liberação de produção a partir
da entrega técnica local.

## Gate competitivo

### Homologação técnica autorizada e histórico permanente — 18/11/2026

RQ-7322/7323 permanecem no Bloco 7 e no briefing §§7–10/12–14. Exercitam as capacidades já
implementadas com o plano existente e ASR gratuito local, sem módulo, contratação ou API paga.
Mantêm evidência, recusa, confirmação e histórico permanente como diferença sobre redação genérica.
Downloads explícitos são ferramentas locais opcionais, com origem/licença/hash, sem runtime
automático ou dependência npm. A proposta operacional permanece inativa por decisão do usuário.
Casos, gates e limites são registrados no relatório de 18/11; não substituem aprovação humana,
revisão independente/CI de merge ou liberação de destino.

### Homologação e proposta operacional — 17/11/2026

RQ-7320/7321 detalham validação/segurança do mesmo Bloco 7, autorizados pelo briefing §§4,
8–10 e 13–14. Mantêm o chat como experiência e não acrescentam provedor, módulo ou serviço.
Corpus com gabaritos separados reduz falsa confiança e testa o diferencial de evidência por
condomínio. Voz local opcional cria somente material fictício para futura avaliação, sem IA
externa ou instalação. Relatórios, formulários pendentes e ensaios de controles demonstram
preparação; não autorizam preço, dados reais, mudança de histórico ou liberação. A complexidade
fica nos instrumentos de teste, reutilizando limites e controles implementados.

Material em [pacote-homologacao.md](pacote-homologacao.md), [instruções propostas](instrucoes-homologacao-propostas.md)
e [proposta-operacional.md](proposta-operacional.md). Todos os gates de qualidade real, custódia,
compatibilidade de retenção com histórico permanente, revisão independente e CI continuam explícitos.

### Proatividade sobre originais e demonstração — 17/11/2026

RQ-7318/7319 continuam no Bloco 7 autorizado, briefing §§4–10/12–14. A oferta contextual reduz
o passo manual entre análise e revisão e conserva originais/fontes/decisão, diferencial sobre
anexos sem memória verificável. Reutiliza serviços e editor; não cria módulo, dependência ou
provedor. Testes simulados, navegador e matriz medem percurso, abstenção, recuperação e isolamento.
O subconjunto automático é deliberadamente pequeno e reversível; revisão semântica ampla e
liberação real continuam gates separados. Nenhum bloco futuro foi antecipado.

### Continuação local de 16/11/2026

Autorização explícita: melhorias proativas, depois persistência Word/rascunhos e áudio durável,
sem contratar serviços ou fazer chamadas pagas. A implementação mantém o chat e Bloco 7;
reduz o trabalho de revisar e recuperar documentos, reutiliza o journal e PostgreSQL e testa
confirmação, procedência e isolamento. Não antecipa WhatsApp, módulo administrativo ou serviço.

Ofertas editoriais são ligadas ao rascunho salvo, com agente injetável, recusa persistente,
aceite como nova revisão e preservação conservadora de palavras/números. Nenhum agente real,
prompt de personalidade ou transporte foi ativado. Qualidade de revisão substantiva permanece
fora da prova com sugestões simuladas; RQ-7301/7303 não são declarados integrais por essa fatia.

O ensaio `test:authoring:postgres` usa bancos novos, marcados e locais, migrations 041/042,
papéis restritos, backup integral e destinos vazios. Áudio recebe armazenamento próprio,
recuperação de resultado salvo antes de falha do journal, exportação/purga e decisões fora do
dump. A composição positiva é exclusiva do harness com transcrição/redação simuladas e custo zero.
Leituras negam expiração; purga é explícita, sem cron ou política real. A continuação operacional
compôs também os limites globais/monetários fictícios da Spec 072, sem preço ou política reais.
Startup persistente genérico permanece negado, mesmo com um transcritor injetado isoladamente.

As provas e os limites atuais estão em `docs/reviews/2026-11-16-authoring-continuation-local.md`.
O estado consolidado acima incorpora as continuações; dados reais, IA efetiva e liberação continuam pendentes.

### Controles operacionais — continuação autorizada em 16/11/2026

RQ-7316/7317 protegem retenção/derivados e custo do Bloco 7, autorizados pelo briefing §§8–10,
12–14. Reutilizam PostgreSQL/RLS, journal de metadados e orçamento da Spec 072; não acrescentam
módulo, provedor, dependência ou serviço. A diferença verificável é recuperar decisões/rascunhos
sem renovar prazo, consumo ou geração após falha/restore. Casos simulados e SQL local aferem
isolamento, compromisso conservado e ausência de nova chamada, sem alegar qualidade real.

Manutenção é explícita por contexto autorizado e lote limitado. Custódia e política reais,
agendamento/integração ao plano operacional do destino, revisão independente e IA efetiva
permanecem requisitos de liberação; nenhum deles é ativado pela composição sintética.

### Agente documental geral — continuação autorizada em 16/11/2026

RQ-7314/7315 detalham a próxima fatia do mesmo Bloco 7 e das hipóteses §§13–14 do briefing:
reduzir trabalho de redação mantendo fontes, versões, limites e confirmação conferíveis no chat.
O ganho competitivo é propor mudanças com apoio verificável e conservar a decisão/rascunho,
reutilizando catálogo, leitores autorizados, journal e editor. Não acrescenta módulo, provedor,
serviço, nova dependência ou ação externa; não antecipa itens posteriores do briefing.

O contrato geral, as propostas, as duas etapas injetáveis e a interface são exercitados com
modelos simulados. Criação por relato é declarada; revisão aponta o original e distingue redação
proposta de base documental. Aceite não confirma o PDF. A prova local e os gates desta fatia
ficam em `docs/reviews/2026-11-16-general-document-authoring-local.md`.
Qualidade real de criação/revisão, liberação monetária/operacional, revisão independente do
branch e liberação de destino continuam pendentes. Não declarar a Spec 073 integralmente concluída.
A prova inicial usou snapshot com os recibos; a continuação operacional validou também restore
anterior ao envio, com ledger/decisões externas ao dump e quarentena no PostgreSQL local sintético.
Essas provas não habilitam redação real após recuperação.

Mantém o chat e Bloco 7 autorizado; reduz trabalho de redação e revisão; diferencia por fontes,
versões e confirmação verificáveis. Valida por cópia fiel, procedência, abstenção e isolamento.
Reutiliza armazenamento/autorizações e não cria ERP, módulo ou serviço externo antecipado.

## Gate para mudar o status

Briefing atualizado pela mesma decisão, aceitação, ADR, implementação, testes, rastreabilidade,
QA visual e revisão concluídos. A spec não será marcada implementada enquanto faltar entrada
ou percurso obrigatório, nem confunde preparação local com autorização real de transporte.
