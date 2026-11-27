# Spec 071 — Preparação do processamento documental hospedado

**Status:** preparação local autorizada; transferência real e ativação hospedada bloqueadas  
**Responsável:** frente Documentos e IA do piloto de 16/11/2026  
**Atualizado em:** 2026-11-11

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

<!-- prettier-ignore -->
| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| Problema e hipótese   | §§2 e 4              | Prepara leitura de digitalizados e fotos sem converter falha de leitura em resposta local. |
| Público               | §3                   | Atende síndicos moradores e profissionais que recebem material sem camada textual.         |
| Proposta de valor     | §§1, 5 e 6.6         | Conserva envio e resultado na conversa, com fontes conferíveis.                            |
| Prioridades do MVP    | §7, Blocos 6 e 7; §8 | Adapta capacidades autorizadas para API/worker, sem novo módulo.                           |
| Segurança e confiança | §§8–10               | Nega transferência sem autorização específica, preservando isolamento e revisão.           |
| Validação e métricas  | §§12–14              | Testa contratos, limites, isolamento, duplicação e falhas com documentos sintéticos.       |

### Limites respeitados

- Não autoriza dados reais, chamadas cobradas, cartões, contratação, publicação, provisionamento,
  migrations remotas ou alteração do prompt aprovado.
- Não estende a autorização Codex da Spec 057 à API: prepara um adaptador separado e desativado.
- OCR sintético do ADR 0009 mantém sua fábrica e suas guardas; não é promovido a produção.
- Digitalizados/fotos são requisito confirmado para o piloto; a preparação não os elimina.
  Limites de tamanho ou leitura permanecem explícitos e impedem prontidão enganosa.
- Não cria ERP, parecer profissional, operação externa, provedor, dependência ou storage novo.

### Divergências da visão

Nenhuma. A instrução de 09/11 autoriza preparação local simultânea das três frentes, mantendo
aprovação de política, fornecedor, prompt e ativação como decisões separadas.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve uma hipótese e um problema descritos no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Blocos autorizados e exclusões foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Os critérios medem leitura, evidência, isolamento e esforço de uso.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Demonstrar localmente um caminho reutilizável de OCR, fotos e síntese pela API já prevista,
sem permitir transferência real antes das decisões e provas necessárias.

## 2. Promessa testada

> A adaptação só processa o material e o destino explicitamente autorizados; uma falha ou
> página ilegível permanece revisão, com o original preservado.

## 3. Usuário primário

Síndico que envia PDFs textuais/digitalizados ou fotos no chat do condomínio autorizado.

## 4. Escopo

Contratos de autorização de transferência, execução limitada, reutilização por versão/hash,
OCR com orçamento explícito, fotos com campos distintos e síntese API sem fallback. A fatia
local usa transportes simulados e o pipeline existente. Startup real permanece negado por padrão.

## 5. Fora do escopo

Ativação, dados reais, política jurídica, contratação de IA, avaliação profissional, baseline
semântico da API, garantia de manuscritos ou equivalência com o Codex. A extensão solicitada
em 09/11 inclui OCR integral de fotos e recibos/orçamento duráveis, exclusivamente locais e
sintéticos; não autoriza ativar fornecedores ou aplicar migrations em banco real.

## 6. Pré-condições

Specs 013/014/020/034/057/058/060/061/067 e ADR 0043. Upload mantém autorização por condomínio,
original privado e confirmação de associação. Transferência exige decisão do servidor para
finalidade, destino, modelo, condomínio, versões e hash exatos; credenciais/flags não constituem
essa decisão. O autorizador padrão nega. Nenhum autorizador real é conectado nesta entrega.

## 7. Requisitos funcionais

### RQ-7101 — Fronteira de transferência explícita

O contrato inclui finalidade (`pdf_ocr`, `photo_ocr`, `photo_analysis`, `document_embedding` ou `batch_synthesis`), destino fixo
OpenAI Responses ou Embeddings conforme a finalidade, modelo, condomínio, versões/hashes e orçamento. Síntese inclui usuário,
chat e revisão de membership. O autorizador recebe metadados/hashes, nunca texto ou arquivo.
Permissão positiva precisa corresponder ao fingerprint integral e ter revisão de política.
Cada hash identifica se cobre bytes do `original` ou um `evidence_bundle`; o fingerprint dos
trechos enviados à síntese não é apresentado como hash do PDF inteiro.
Ausência, divergência, exceção ou revogação impedem chamada e publicação. A autorização é
revalidada após espera, antes de cache e depois da execução; cache não concede permissão.

### RQ-7102 — OCR/fotos sem ampliação silenciosa

PDF textual continua local. PDF sem texto utilizável pode usar o adaptador preparado, limitado
a 10 páginas e 25 MiB por arquivo nesta fatia; acima disso fica em revisão, sem subdivisão ou
upload externo automático. Envia somente o PDF validado daquele job, inline, com nome genérico,
`store:false`, sem Files API, URLs ou ferramentas. A saída exige `completed`, todas as páginas
originais, índices únicos e contíguos, qualidade válida e até 120.000 caracteres. Teto de saída
16.000 tokens e timeout de 60 segundos; uma tentativa, sem aumento automático.

Fotos conservam JPEG/PNG de até 10 MiB, página lógica 1, descrição visual, texto percebido e
limitações separados, com no máximo 500 tokens e timeout de 45 segundos no transporte existente.
Não se passa descrição por transcrição garantida ou diagnóstico. Vetorização externa requer
contrato escopado próprio antes da ativação; o ensaio local usa vetor sintético, sem rede.
O modo visual conserva seu limite de 250 caracteres percebidos. O modo documental explícito
da extensão RQ-7106 usa OCR integral, sem converter observação visual em transcrição literal.

### RQ-7103 — Reutilização e fila delimitadas

O executor local compartilha no máximo uma execução ativa, com até quatro operações adicionais
aguardando; duplicatas do mesmo fingerprint/revisão compartilham a execução. Até 64 resultados
concluídos são reutilizados por dez minutos, isolados por condomínio, versão/hash e, na síntese,
usuário/chat/membership. Falha, timeout, negativa e resultado incompleto não são cacheados.
Conteúdo alterado invalida reutilização. Cache é privado, volátil e por instância; não substitui
persistência dos derivados existentes nem comprova deduplicação após reinício ou entre réplicas.

### RQ-7104 — Síntese hospedada preparada, sem fallback

O endpoint aceita uma fábrica de gateway vinculada ao contexto e chat já autorizados. A nova
fábrica envolve o `AnswerGateway` OpenAI existente de modelo único Sol e preserva o prompt
aprovado, máximo de 50 versões/500 páginas/120.000 caracteres e 1.200 tokens de saída. Cálculos
continuam locais e citações passam pelo validador existente. Não encaminhar ao Codex, Gemini ou
outro modelo em falha. Revalidar catálogo/membership antes de responder. Nenhuma configuração
com dois destinos de síntese é aceita: recusar sem escolher ou tentar um deles. Nenhuma configuração
de ambiente habilita esse caminho nesta entrega; a autorização integral do ADR 0036 continua
exclusiva do Codex local sintético até decisão específica sobre payload/destino da API.

### RQ-7105 — Leitura e histórico sem sucesso enganoso

Ausência de OCR autorizado, qualidade baixa, conjunto de páginas incompleto e falha de imagem
produzem revisão; fontes prontas não são publicadas. Valores financeiros OCR mantêm a conferência
independente da Spec 034, mesmo com score alto. Original, versão e página permanecem rastreáveis.
Síntese usa o journal da Spec 058 antes do ACK; histórico antigo não vira evidência atual.
Concorrência local não prova exatamente uma cobrança em recuperação de falha entre geração e
gravação durável; esse caso e deduplicação entre processos bloqueiam ativação hospedada.

### RQ-7106 — OCR integral de fotos de documentos

Em modo documental explicitamente configurado pelo servidor, cada JPEG/PNG representa página
lógica 1. Uma conversão local determinística cria PDF transitório de uma página, sem alterar
o original privado nem o prompt OCR já existente. O hash do original e o hash do payload
convertido permanecem distintos. O texto integral retornado, até 120.000 caracteres/16.000
tokens/60 segundos, é processado sem o corte visual de 250 caracteres, com fontes por versão,
página e offsets. Imagem sem texto utilizável, resposta incompleta, qualidade baixa ou falha
de conversão mantém revisão, sem fallback visual apresentado como texto documental.

Limites próprios da conversão: JPEG/PNG de até 10 MiB, 12 milhões de pixels, 16.384 por dimensão e 64 MiB de dados
descomprimidos; PNG de 8 bits não entrelaçado, cinza/RGB/indexado/com alfa. Outros PNGs exigem
revisão explícita. Não há redução de resolução, corte, OCR por fragmentos ou alteração de
conteúdo silenciosa. CRC/estrutura PNG, dimensões e tamanho descomprimido são conferidos.
Alfa é conservado por máscara, não interpretado como texto. Orientação e acurácia exigem
baseline próprio. Valores financeiros passam pela mesma conferência independente do PDF OCR.

### RQ-7107 — Reserva durável antes da chamada

Um controlador injetável reserva atomicamente compromisso máximo por chamada, condomínio e
dia UTC, junto do teto diário global, antes de qualquer transporte. Valores são inteiros em
microunidades de moeda declarada e tarifa versionada fornecida pelo servidor. Testes usam
tarifa fictícia; compromissos não são fatura nem preço real do provedor. A conta e a validade
do limite superior de custo de entrada/saída continuam pendentes de decisão antes da ativação.
Os adaptadores preparados recusam transporte sem controlador durável, mesmo com autorizador
positivo. A exceção `syntheticContractOnly` é uma opção interna explícita de teste, exige fetch
injetado e recusa ambiente de produção; não é variável de ativação nem classifica uploads.

A identidade da operação inclui finalidade, destino/modelo, condomínio, versões/hashes e
payload; síntese inclui usuário/chat/membership. Repetição após reinício devolve somente o
resultado confirmado do mesmo fingerprint, após autorização atual; alteração de conteúdo ou
escopo não reaproveita outro resultado. O modo durável não usa cache RAM para ignorar estado
ou indisponibilidade do ledger. Não há liberação automática por virada do dia para repetir
uma operação cujo envio anterior ficou desconhecido.

O recibo conserva a revisão de política que autorizou a reserva. A chave lógica de pedido
permanece estável entre revisões: política diferente ou ausente em recibo antigo impede reuso,
claim e reenvio, inclusive quando concluído ou incerto. Não basta acrescentar a política ao
hash e emitir nova chamada. Migração/reconciliação exigem decisão explícita futura; não
convertem resultado da política anterior em resultado da política atual.

### RQ-7108 — Envio desconhecido não gera nova chamada

Estados duráveis: `reserved`, `dispatched`, `completed`, `uncertain`, `cancelled` e `invalidated`. Somente quem
detém a reserva pode marcá-la enviada, uma vez. Resultado validado é gravado antes de confirmar
sucesso; falha posterior no journal permite recuperar o resultado sem outra geração. Queda,
timeout, rejeição após envio ou falha de gravação conserva compromisso e impede retry automático.
Expiração de uma reserva enviada produz estado desconhecido, não autorização de reenviar.
Cancelar antes do envio libera o compromisso; uma reserva não enviada expirada pode ser retomada.
Não prometer exatamente uma cobrança: não há transação distribuída com o provedor. Estado
desconhecido requer reconciliação humana futura, sem apagar recibo ou fabricar resultado.
Cada recibo conserva IDs opacos das versões que deram origem ao resultado. Uma invalidação
autorizada de versão remove o conteúdo derivado do ledger, mantém compromisso/recibo mínimo e
impede replay ou reenvio daquela operação. Não altera mensagens históricas do journal. A ligação
ao expurgo/restore/tombstones real aguarda política e integração aprovadas, sem escolher retenção.

O ensaio usa arquivo privado sintético com lock entre processos, gravação com flush e troca
atômica; arquivo corrompido, lock indisponível, relógio regressivo ou gravação falha negam execução.
Esse backend é proibido em produção e não substitui PostgreSQL/RLS no destino. O contrato e o
adaptador PostgreSQL podem ser preparados, mas execução SQL/restore/roles no destino ficam
bloqueados enquanto não houver ambiente explicitamente autorizado. Nenhum backend positivo é
conectado ao startup real.

### RQ-7109 — Vetorização de derivados escopada e controlada

Preparar fábrica de embedding textual ligada a condomínio/versão e ao hash exato do trecho.
Reutilizar o perfil OpenAI de 768 dimensões existente, sem misturar espaços vetoriais. Destino
`/v1/embeddings` exige autorização específica e a mesma reserva/recibo duráveis quando o
controlador for injetado. Enviar somente o trecho, até 8.192 caracteres, sem título/identidade
em parâmetros remotos. Vetor inválido ou timeout não é fonte pronta; envio desconhecido não
gera outra chamada automática. Nenhum worker/query remoto é ativado por esta fábrica: conexão
por job e consulta no mesmo perfil exigem validação no destino. O índice sintético local continua
disponível sem custo, com fontes por página/offset preservadas.

### RQ-7110 — Composição do consumo operacional

O executor aceita controle operacional da Spec 072 dentro da reserva documental e antes do
envio. Escopo é resolvido no servidor e revalidado com política/permissões atuais; o mesmo
pedido tem UUID estável, sem conteúdo no recibo operacional. A Spec 072 é o total autoritativo
compartilhado; compromissos do ledger documental são controles espelhados de recuperação e
não se somam como segunda despesa. Nesta composição, a conclusão contabiliza conservadoramente
o máximo reservado; não afirma medição/fatura real do fornecedor. Moeda USD, revisão aprovada
e limites são configurados pelo servidor. Falhas entre stores conservam a pendência, sem
rollback financeiro otimista ou nova geração. Replay autorizado de resultado confirmado
precede nova reserva operacional e não consome outra tentativa.

## 8. Contratos

### RQ-7111 — Integração central sintética de consumo

No worker, a fábrica de embedding recebe condomínio/versão/sinal do job persistido validado,
antes da gravação de páginas/chunks. Falha da transação não autoriza repetir OCR ou vetores
externos já confirmados no ledger. A configuração de consulta deve usar o mesmo perfil vetorial
antes de qualquer ativação; a injeção de teste não altera o perfil do startup existente.

Setup, perguntas, upload e mensagens de estado documental aceitam um controlador operacional
privado da Spec 072. O servidor deriva conta/condomínio/membership da sessão e revalida antes
e depois do trabalho. O cliente fornece somente a chave de repetição; finalidade, UUID lógico,
fingerprint integral, revisão e máximo de custo vêm do servidor. A chave lógica não inclui a
política ou o payload para contornar uma tentativa anterior. Upload reserva quantidade com
custo zero; perguntas/setup reservam um máximo conservador que engloba todas as tentativas
internas. Não somar essa reserva ao mesmo transporte documental: OCR/foto/síntese/embedding
usam sua composição específica de ledger e orçamento.

O journal confirmado é consultado antes de nova execução. Se o recibo operacional concluiu
e o journal falhou, devolver pendência segura sem gerar novamente; esse recibo não contém a
resposta. O ledger documental continua permitindo recuperar seu resultado confirmado. O
startup persistente conecta controle negativo até aprovação específica, sem flags de escape.
Testes de API e worker usam somente controladores, documentos e provedores sintéticos.

`HostedDocumentTransferRequest` e `HostedDocumentTransferAuthorizer` são contratos internos,
nunca campos aceitos do navegador. `HostedDocumentExecutor` limita fila/cache e devolve somente
resultado autorizado ou erro de código fechado, sem causa privada. Adaptadores continuam
`OcrAdapter`, `ImageAnalysisAdapter` e `AnswerGateway`. Sinal de cancelamento acompanha job até
o transporte OCR/OpenAI. Não há variável habilitadora nova. Migration 039 prepara ledger e papel
dedicado sem login/membership; foi exercitada somente em PostgreSQL local descartável sintético,
incluindo RLS, concorrência, invalidação e restore. Não foi aplicada a serviço remoto.
A identidade persistente inclui versão de
processamento/prompt/conversão para não reaproveitar resultado de um contrato alterado.

### RQ-7112 — Exportação e purga documental sintéticas

Uma operação interna injetável exporta somente documento/versões/bytes/derivados autorizados e
histórico do próprio usuário/chat, com checksum e limites explícitos. Não exporta tokens,
segredos, prompts privados ou histórico de outro usuário. Não cria tela ou entrega externa.
Purga conserva o contrato vigente: documento arquivado há trinta dias, remoção transacional
de originais/páginas/chunks/vetores/jobs e referências de busca; histórico e trechos já exibidos
permanecem históricos. Não decide retenção real de histórico/backups/recibos.

### RQ-7113 — Decisões fora do snapshot e quarentena

Retenção sem observador conserva o contrato existente: configura o condomínio imediatamente
antes de cada efeito, sem preparação externa ou duplicação de contexto. Com observador,
confere/prepara todos os documentos no respectivo escopo antes do primeiro trigger de purga.
Falha de qualquer preparação impede todas as purgas desse lote e provoca rollback.

Preparar journal privado exclusivamente sintético em volume separado do dump `app`, com lock,
flush, limites e corrupção falhando fechada. Antes de confirmar purga, gravar IDs/versões e
elegibilidade já conferida pelo banco; invalidar resultado do ledger. Reaplicar essa decisão
após restore em quarentena antes de permitir leitura/worker/geração. Jobs antigos não podem
ressuscitar a versão; outro condomínio permanece intacto. Uma falha entre journal e banco
mantém bloqueio explícito e retomada idempotente, sem falso ACK.

O mesmo journal registra intenção de dispatch antes do transporte e checksum de conclusão,
sem conteúdo. Autorização preparada consulta um verificador privado de recuperação/consumo,
negado por padrão. Recibo do ledger/orçamento ausente ou divergente após restore bloqueia
novas transferências globalmente até reconciliação competente; não reseta tetos nem duplica
compromissos espelhados. Esse bloqueio é uma proteção, não uma restauração automática de
fatura/contadores perdidos. Dados reais/custódia/retenção do journal exigem política posterior.

### RQ-7114 — Reconciliação explícita sem reenvio

Resultado incerto permanece incerto sem prova. Uma função interna, negada por padrão, pode
confirmar resultado já conhecido somente com decisão confiável vinculada ao mesmo pedido,
política, owner e checksum, mais validação do contrato do resultado. Não aceita afirmação do
cliente ou fabrica resposta de hash. Não chama provedor, não libera custo nem resolve recibo
operacional desconhecido automaticamente. A entrega posterior ainda exige autorização atual.

Os contratos 7112–7114 usam somente política sintética explícita ou comportamento negado;
nenhuma variável de ambiente conecta esses controles a serviços reais. A prova local une
sessão, API, worker, fotos/OCR, busca/fontes, histórico, purga e restore PostgreSQL guardado
com transportes simulados. Acurácia de OCR/IA efetivos continua fora da evidência de mocks.

### RQ-7115 — Autorização atual também no replay HTTP

O journal conserva procedência privada e revisão da operação que gerou a resposta. Antes de
entregar novamente uma análise corrente, revalida política, escopo e dependências atuais,
sem nova geração/reserva. Política alterada/revogada, dependência/hash diferente ou procedência
ausente negam o replay. Histórico literal autorizado continua consultável como histórico.
Para respostas citadas, a procedência inclui o hash do conteúdo integral de cada página usada,
além do catálogo/estado e trecho. Alteração fora do trecho citado também nega replay corrente;
prova legada sem esses hashes não confirma dependências atuais.

No startup sintético de demonstração, o leitor autorizado deve incluir páginas integrais dos
uploads processados na mesma memória usada pela busca. Compor com os leitores seed/legislação,
sem fallback a outro condomínio ou substituir fonte ausente por texto reconstruído parcialmente.
Uma pergunta sobre PDF enviado e confirmado mantém sua primeira resposta/citação e replay;
fonte inexistente, outro escopo ou falta de permissão continuam negados. Essa composição não
ativa serviço hospedado nem muda o leitor PostgreSQL.
O leitor privado de uploads é criado com o catálogo autoritativo e revalida documento ativo
em cada leitura; mapa/chunks presentes não concedem acesso. Arquivamento nega página inteira,
preserva trecho histórico e bloqueia replay corrente; recuperação autorizada pode restabelecer
a página. Versão anterior de documento ainda ativo conserva sua leitura histórica autorizada.

### RQ-7116 — Exclusão sem zerar consumo

Excluir condomínio expurga resultado privado do ledger na mesma transação e conserva recibo
mínimo, custo e bloqueio de envio anterior. O vínculo operacional não impede a exclusão do
domínio nem usa cascade para apagar consumo. Escopo excluído não permite leitura ou reserva.
Callbacks sintéticos de purga de versão/condomínio executam no PoolClient transacional do plano
autenticado da Segurança; reaplicação após restore é idempotente e não reabre o ambiente.

### RQ-7117 — Confirmação da entrega pelo cliente

A chave lógica da interface permanece até leitura completa e validação do contrato de sucesso.
Cabeçalhos 200, corpo interrompido, JSON inválido ou contrato ausente não confirmam a entrega.
Retentativa explícita usa a mesma chave; não há reenvio automático. Preservar também o caminho
de progresso e o escopo por usuário/condomínio/chat.

### RQ-7118 — Ambiente dos ensaios sintéticos

As configurações Vite/Vitest desta frente desabilitam a leitura automática de `.env*` com
`envDir:false`. Uma lista permitida de variáveis no processo filho, sozinha, não impede essa
leitura. A regressão usa somente um arquivo-canário sintético em temporário próprio, sem
inspecionar arquivos de ambiente existentes. Reexecutar gates Vite afetados após essa proteção.

## 9. Requisitos não funcionais

Zero chamada real e zero conteúdo/segredo em logs na validação local. Sem dependência nova.
Cobertura global dos quatro indicadores continua >=80% como gate posterior coordenado;
testes focados usam saídas exclusivas desta frente. Não rodar gates que sobrescrevam relatórios
das outras frentes durante edição simultânea.

## 10. Critérios de sucesso

AC-7101–AC-7128 demonstrados com mocks e arquivos integralmente sintéticos, sem reduzir
assertivas de segurança/valores. Resultado distingue contrato local, qualidade de modelo e
prontidão operacional. Nota de integração registra requisitos, alterações, comandos e lacunas.

## 11. Questões em aberto

Política/destino/retenção, custo autorizado, modelos disponíveis na conta, baseline OCR/fotos/API,
revisão especializada, ligação do ledger/embeddings ao destino e validação SQL/RLS, recuperação e
backups, capacidade no ambiente hospedado e testes de integração real guardados. Nenhum item
é presumido concluído pelo prazo de 16/11 ou pela bateria Codex da Spec 060.

## Gate competitivo

Mantém chat e Blocos 6/7 autorizados; melhora leitura/evidência e reduz trabalho duplicado;
preserva isolamento, abstenção e confirmação humana; mantém a memória por página/versão como
diferencial; testa contratos e falhas; reutiliza a stack e os adaptadores previstos. Sem capacidade
posterior nem aprovação de produção inferida da preparação local.

## Gate para mudar o status

A Spec 078 prepara admissão operacional de setup/pergunta/upload no startup persistente,
condicionada ao manifesto revisado e orçamento corrente. Não habilita OCR/fotos/síntese externa
desta spec nem transforma as provas locais abaixo em aprovação do destino.

Exige aceitação, rastreabilidade, revisão do diff e gates aplicáveis. A preparação local não
remove bloqueios de dados reais; ativação requer decisão humana específica e provas faltantes.
