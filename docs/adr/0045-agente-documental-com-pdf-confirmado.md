# ADR 0045 — Agente documental e geração PDF confirmada

**Status:** aceito para implementação local; transporte de produção não autorizado  
**Data:** 2026-11-12

## Contexto

O usuário autorizou ampliar o briefing para criação/revisão documental geral, saída somente PDF,
Word desde o início e atas de relato ou reunião. O código existente lê PDF/fotos e conserva
histórico, mas não implementa geração genérica confirmada, leitura Word ou transcrição de áudio.

## Decisão

- Orquestração modular de criação, revisão e melhoria oferecida, com proposta versionada e
  confirmação da versão exata antes de renderizar. Originais privados e imutáveis.
- Reutilizar autorização por usuário/condomínio/chat, histórico durável e validação das fontes.
- Entradas têm adaptadores limitados e explícitos; DOCX não executa XML/vínculos e áudio tem
  transcritor injetável negado por padrão, com modos relato/reunião e referências temporais.
- PDF é derivado determinístico do texto confirmado. A estratégia de renderização e as
  capacidades efetivamente entregues serão documentadas antes de introduzir dependência.
- Não mudar personalidade/prompt aprovado, criar provedor, fazer chamada cobrada ou ativar
  envio real nesta preparação. Novos contratos de transcrição dependem de dados/custo aprovados.
- Rascunho não é fonte atual, documento assinado ou ação externa. Completude, fidelidade e
  isolamento são gates independentes da qualidade semântica da IA.

## Validação e limites

### Homologação técnica real local — 18/11/2026

O ADR 0046 registra a autorização específica de Codex/ChatGPT já contratado e ASR gratuito
local para sintéticos. Essa exceção não ativa startup, API paga, dados reais ou política
operacional. Os parágrafos históricos de simulação descrevem as provas anteriores.
Purga de autoria e purga direta de áudio agora conservam mensagens públicas já salvas;
recibos internos continuam ocultos. Corrige compatibilidade técnica com histórico permanente,
sem adotar os prazos propostos que o usuário manteve inativos.

### Pacote de homologação e proposta operacional — 17/11/2026

Instrumentos em `evals/authoring-homologation/` não são importados pelo runtime. Corpus versionado
separa entradas/gabaritos, referencia fontes literais e conserva rubrica pendente. Ensaios validam
contratos e cercas operacionais locais, sem aprovar qualidade real. WAVs fictícios opcionais usam
somente voz pt-BR instalada no Windows via System.Speech, sem reprodução, serviço ou dependência
adicionada. CLI recusa entrada divergente antes de sintetizar. PCM preserva bytes; só normaliza
WAVEFORMATEX vazio no harness, mantendo o validador de produção intacto.

Proposta operacional permanece disabled, gasto externo zero e aprovações nulas. Prazos/metas são
hipóteses revisáveis, não política aplicada. Reter artefatos por prazo não pode apagar silenciosamente
histórico permanente: compatibilidade é gate explícito antes de qualquer ativação. Cofres, tombstones,
custódia e recuperação reais continuam sujeitos à liberação própria; nenhum cron ou provedor novo.

### Proatividade sobre originais — 17/11/2026

Composição `syntheticOriginalImprovements: true` liga exclusivamente o harness à síntese de
um original. Não existe variável de ambiente, rota de avaliação automática independente ou
ativação no startup. A leitura integral é comparada ao material efetivamente analisado antes
da avaliação; fontes são revalidadas depois. A síntese não é fonte da proposta.

Reutilizar o plano/redator/conferente, recibos, decisões, editor e controles operacionais gerais.
Packet persiste `trigger: original_analysis`; identidade é estável por contexto, versão e conteúdo.
Oferta automática preserva todos os blocos, palavras, pontuação, números e ordem; somente espaços
e quebras podem mudar, sem unir/separar palavras. Referência integral por bloco respeita o teto de
mil caracteres por citação: excesso bloqueia explicitamente, sem recorte. Sem diferença, o estado
`unchanged` impede decisão/rascunho. Recusa é persistente e não reinicia o agente.
Recibos automáticos têm marca interna no metadata; a projeção do histórico omite suas mensagens
operacionais, preservando o registro integral para auditoria/exportação. Oferta contextual e
decisões humanas continuam na conversa, sem instruções internas atribuídas ao síndico.

Erro da avaliação retorna estado operacional separado sem apagar análise válida. Falha de
revalidação final impede entregar a análise inteira. A UI consulta propostas sem gerar, mostra
antes/depois preservando espaços e abre o editor após aceite; confirmação para PDF é independente.
Não muda personalidade, prompt aprovado, modelo de dados, dependência ou transporte. Demonstração
em memória valida o percurso; recuperação PostgreSQL/restore vem dos gates locais separados.

### Controles operacionais locais — 16/11/2026

Compor Spec 072 nas seis finalidades de autoria. Cofre sintético de consumo fica fora do dump,
com identidade estável por contexto/origem/etapa; resultado validado/persistido precede conclusão.
Reutilizar o journal imutável de metadados com instância/diretório próprios para cercas de
retenção/purga: prazo na criação, sem renovação por edição, tombstone anterior à remoção,
reaplicação após restore e lote explícito de manutenção. Exportar somente a família autorizada.
Reutilizar conversation_entries/RLS; adapter de purga conserva chaves/hashes e remove payloads.
Não apagar consumo. A composição é exclusiva de harnesses sintéticos, sem startup positivo,
serviço, dependência, preço/prazo real, cron, provedor ou nova personalidade.

### Continuação: agente documental geral com fontes

Reutilizar journal, catálogo/leitor autorizado e editor/PDF. O pedido seleciona versões; o
servidor monta o pacote completo de páginas/blocos e relato declarado. Plano estruturado de
parágrafos e alterações antes/depois tem referências literais/offsets e cobertura integral.
Conferência separada e verificações determinísticas são obrigatórias; insuficiência pede
contexto e não fabrica documento. Testes têm somente modelos simulados, sem transporte padrão.

Aceite por hash cria rascunho novo com procedência ligada à proposta imutável; confirmação de
PDF continua separada. Recibos por etapa impedem repetição após falha incerta. Rascunho/PDF
revalidam fontes e decisão; relato mantém seu rótulo. Não introduz serviço, dependência,
prompt de personalidade ou provedor. Qualidade real, política e orçamento externos seguem
pendentes. A fatia não substitui a conferência especializada nem amplia formatos ilimitadamente.
Recuperação inicial partiu de snapshot com os recibos. A composição de controles de 16/11 também
validou restore anterior ao envio com decisões/ledger fora do dump e quarentena, somente no
PostgreSQL local sintético. Custódia, destino e transporte reais continuam sem liberação.

### Continuação local de 16/11/2026

Ofertas editoriais usam agente injetável sem transporte padrão, revisão-base identificada por
hash e recibos imutáveis no journal. O subconjunto inicial preserva tokens de palavras/números
e a ordem; aceite cria revisão, sem confirmar PDF. Personalidade/prompt existentes não mudam.

Áudio durável terá armazenamento PostgreSQL próprio, com RLS por usuário/condomínio/chat,
expiração explícita e tombstone sem conteúdo para purga/restore. Journal conserva recibos de
consumo e resultados; a composição positiva é restrita ao harness sintético, custo zero e
transcritor simulado, sem novas dependências ou ativação de produção. Dados reais, política
de retenção real, novos provedores e chamadas pagas permanecem fora desta autorização.

Implementação: migration 042 e fábrica sintética restrita a loopback/bancos dedicados;
`syntheticDurableAudio` não é selecionado por variável de ambiente ou pelo startup. Hashes de
referências de áudio normalizam a ordem dos campos ao ler JSONB. O resultado da transcrição
é persistido antes do recibo de conclusão do journal, permitindo retomada sem outro ASR.
Expiração impede leitura; purga explícita elimina conteúdo e preserva estado de execução.
O journal de decisões fora do dump tem índice e checksums, escrita exclusiva e flush; ausência,
perda de arquivo ou divergência nega acesso. Restore reaplica purgas e insere unknown quando
uma tentativa posterior ao snapshot estiver ausente. Não há retomada automática de envio incerto.
Limites de tentativas por usuário/condomínio e retenção são apenas sintéticos; não substituem
política, custódia, agendamento, orçamento monetário/global ou integração de fornecedor real.

### Continuação: redação semântica solicitada

Substituir o montador extrativo por plano estruturado redigido e conferido em duas etapas.
Afirmações citam segmentos e trechos, têm cobertura verificável, limites e validação de números.
Decisões são relatadas, sem inferir validade jurídica. Redator/conferente ausentes, inválidos ou
discordantes bloqueiam a proposta; não se usa transcrição como falsa ata de contingência.

Recibos de dispatch/resultado por etapa antecedem o transporte, impedindo chamadas repetidas em
retry/concorrência ou após falha incerta. Resultado validado é reutilizado para persistir proposta.
Fluxo semântico tem versão própria; pedidos extrativos legados não são promovidos silenciosamente.

Adaptador de saída estruturada compatível com Responses recebe transporte e modelo explicitamente,
sem fetch/chaves/ativação implícitos. Nenhum startup injeta modelo nesta rodada. Reutiliza o formato
do provedor já existente, sem dependência nova. `store:false`, sem ferramentas e respostas completas
obrigatórias. JSON conforme schema não garante correção factual; verificações de domínio e
conferência semântica continuam necessárias.
Referência: [documentação oficial de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
Os prompts específicos foram apresentados em `redacao-ata-prompt-proposto.md`; somente mocks
serão exercitados, sem validação de qualidade de um modelo real ou autorização para cobranças.

### Continuação: pedido de ata com áudio

O pedido explícito dispara upload/transcrição e geração; selecionar arquivo não executa trabalho.
Interface compacta no chat com prévia do áudio, relato/reunião, pedido, progresso e retorno ao
editor de rascunho. Nesta fatia o usuário grava externamente; não há microfone em segundo plano.

A montagem inicial da ata foi determinística e extrativa, com todo o texto transcrito e referências
temporais. Esse estágio histórico foi substituído pela continuação semântica acima: plano
redigido, referências e conferência separada, exercitados somente com transportes simulados.
Dados e deliberações não comprovados ficam pendentes. Não há nova dependência ou cobrança.
Referências de áudio são revalidadas inclusive depois de editar a ata e antes de entregar PDF.

Para atas maiores, o conteúdo do rascunho passa a até 160 mil caracteres/175 mil bytes JSON.
Registra-se ação curta no journal e o texto completo na revisão, evitando duplicação acima de
200 mil bytes ou da mensagem de 20 mil caracteres. O teto de 100 páginas continua negando excesso.
Esta alteração local não remove as travas de transcrição real e áudio persistente.

### Composição local implementada

Revisões usam eventos imutáveis em `conversation_entries`, com chave única de próximo evento:
edição e confirmação concorrentes competem pela mesma chave. Reutiliza RLS, exclusão de chat e
recuperação do histórico, sem criar tabela ou habilitar serviço. Download recompõe bytes
determinísticos somente da revisão confirmada, com fontes atuais revalidadas.

O renderizador Node usa PDF 1.4/Courier com WinAnsi explícito, quebra de palavras longas e
paginação própria. A fatia inicial usava 18 mil caracteres; a continuação acima amplia o conteúdo
para atas, mantendo 100 páginas. Caracteres fora do repertório
geram erro antes de confirmar, sem substituição silenciosa. Não executa HTML nem carrega fontes
ou links; nenhuma dependência foi adicionada. Layout original, tabelas e assinaturas não são
reconstruídos. Fonte e corpo são conferidos por extração e renderização sintéticas.

Leitura DOCX usa subconjunto restrito de OPC/ZIP e XML, zlib nativo com tamanho de saída máximo,
CRC, diretório e intervalos conferidos. Não extrai caminhos para disco, resolve rede ou executa
conteúdo. Recursos desconhecidos impedem alegar leitura integral. Migration 041 registra formatos
e método `docx_text`; página numérica interna significa bloco Alvitra, não página do Word.

Áudio usa WAV PCM inspecionado por bytes e adaptador injetável. Recebimento reivindica recibo
único antes de qualquer chamada; tentativa incerta não dispara nova transcrição automaticamente.
Original fica privado, inclusive na quarentena de falha; conclusão só após persistir resultado.
Modos têm limites separados. Nenhum startup injeta adaptador, nenhum provedor foi escolhido e
o caminho real de orçamento/transcrição continua bloqueado. A interface de envio, recuperação e
montagem extrativa da ata foram acrescentadas inicialmente. A continuação semântica acima prepara
o adaptador explícito de redação/conferência e substitui a montagem no fluxo local; qualidade
de modelo real e transporte efetivo permanecem pendentes. Spec 073 permanece em andamento.

QA de navegador usa Playwright já disponível no runtime da estação, sem acrescentar pacote ao
projeto. Servidores são temporários, em loopback; o transcritor simulado exige o hash da fixture
WAV, sem aceitar dados arbitrários nem chamar provedor. O ensaio confere seleção sem envio,
revisão/PDF, recuperação após reload e viewport móvel, e encerra seus processos.

Spec 073 e briefing §§4–10/12–14 atualizados na decisão explícita. Provar estados, revisão,
confirmação, formatos hostis, fontes indisponíveis, áudio incerto, PDF multipágina, recuperação
e isolamento. PDFs de QA e toda entrada/eval são sintéticos. Geração bloqueada não vira sucesso.
