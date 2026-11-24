# ADR 0043 — Preparação documental hospedada com transferência negada

**Status:** aceito somente para preparação local sintética; ativação real pendente  
**Data:** 2026-11-09

## Contexto

O piloto desejado para 16/11 precisa de digitalizados e fotos. OCR atual é harness sintético
que recusa produção (ADR 0009/Spec 034). Síntese integral só tem autorização de payload/destino
no Codex pessoal local (ADRs 0031/0036/0038). Nenhum desses resultados aprova a API hospedada.
Cartões, cobrança, provisionamento e dados reais estão expressamente proibidos nesta preparação.

## Decisão

Preparar adaptadores ao redor dos contratos existentes e da OpenAI Responses já prevista
(ADRs 0022/0023), com autorizador interno negando por padrão. A autorização específica inclui
finalidade, destino/modelo, condomínio, versão/hash e budget; síntese inclui usuário/chat e
membership. Permissão é conferida antes e depois de espera, cache e chamada. Não deriva de
chave, billing flag, nome de arquivo ou declaração do navegador.

PDF.js continua local. OCR só recebe o original daquele job se dentro de 10 páginas/25 MiB,
inline e com nome genérico. Usa orçamento 16.000 tokens/60 s, resposta concluída e todas as
páginas, sem ferramentas/Files API/URLs. Não ampliar automaticamente. Fotos reutilizam análise
existente de 500 tokens/45 s; vetores externos exigem contexto escopado antes de ativação.
Valores OCR conservam conferência independente. Cálculos financeiros continuam determinísticos.

O executor por instância limita uma operação ativa, quatro em espera e 64 resultados/10 min.
Só resultados concluídos entram no cache; autorização atual precede reutilização. Hash de
conteúdo e escopo integral evitam cruzamento de condomínios/versões/chats. Isso demonstra
deduplicação local, não uma garantia distribuída ou de cobrança após perda de ACK.

A fábrica de síntese hospedada é injetável e usa somente o gateway API configurado de modelo
único, sem fallback, com o prompt aprovado intacto. Reutiliza o reader, relatórios, validação,
revalidação de catálogo/membership e journal existentes. O startup não conecta autorizador real;
não há variável de ambiente que autorize essa transferência nesta entrega. A autorização Codex
permanece restrita ao destino anterior, sem modificação das suas guardas.

## Alinhamento com a visão do projeto

### Extensão local autorizada em 09/11/2026

O usuário pediu seguir com OCR integral de fotos e controle durável de chamadas/gastos, somente
sintéticos e sem serviços/cobrança. Reutilizar o prompt OCR por conversão local da imagem em PDF
transitório de uma página. JPEG e PNG comuns de 8 bits são suportados dentro de limites explícitos;
formato não suportado exige revisão. O modo documental é distinto do visual e passa pela mesma
conferência financeira de OCR, com original e fontes conservados.

Adicionar ledger injetável com reserva atômica por condomínio/global, tarifa fictícia versionada,
registro de envio antes do transporte e resultado antes do ACK. Falha após envio conserva custo
comprometido e bloqueia repetição automática. Resultado durável pode ser retomado após reinício
e falha do journal, com nova autorização. Não existe garantia de exatamente uma cobrança remota.
O recibo compara a revisão de política sob a mesma chave lógica antes de reuso ou claim.
Divergência ou recibo legado sem revisão falham fechados; mudar política não cria outro pedido
para escapar de envio incerto. Reconciliação/reprocessamento explícito ficam fora desta correção.
O backend de arquivo é exclusivo de ensaio sintético local, com exclusão mútua entre processos,
flush e rename; não é banco de produção nem promessa de sobreviver à perda do disco. PostgreSQL
permanece o destino previsto e seu adaptador/migration, se preparados, não serão executados em
serviço real. Não há nova dependência ou mudança de personalidade/system prompt.

Briefing §§1–6 conserva a conversa; §7, Blocos 6/7, autoriza leitura e análise; §§8–10 exigem
original, evidência, isolamento e confiança; §§12–14 permitem adaptadores substituíveis e
validação por fatias. A Spec 071 aplica o gate competitivo e não antecipa módulos posteriores.

### Composição e integração local

Spec 072 é autoritativa para custo, quantidade e concorrência. O valor do ledger documental
é espelhado para recuperação e não é outra despesa. Compor os controles pelo par
`createBudgetedHostedDocumentControls`, com escopo privado revalidado também no replay,
claim antes do envio e resultado antes da conclusão operacional. A composição usa USD fictício
nos testes e contabiliza conservadoramente o máximo, sem se apresentar como fatura observada.

As rotas de setup, pergunta (incluindo o endpoint legado), upload e mensagem documental
aceitam admissão operacional derivada de sessão/membership. O journal salvo é consultado antes;
recibo concluído sem journal mantém pendência sem regeneração automática. O startup persistente
injeta admissão negativa. Worker aceita fábrica de vetores por condomínio/versão do job validado;
retentar após rollback recupera OCR/vetores já confirmados. O perfil de consulta compatível e
política positiva continuam necessários para ativação futura.

Migration 039 e sua composição com 040 foram exercitadas somente em PostgreSQL 17 local
descartável, com papéis mínimos separados, corridas, RLS, invalidação, troca de política,
reinício de processo e restauração integral. Containers próprios foram encerrados. O ensaio
não configura fornecedor, serviço remoto ou cobrança.

### Ciclo sintético após snapshot

Na extensão de 11/11, RQ-7115–7117 exigem revalidação também no replay HTTP, procedência
privada no journal e confirmação do corpo/contrato antes de descartar a chave no navegador.
O histórico literal permanece separado de uma análise corrente. A migration 039 preparada
remove a FK restritiva do recibo operacional e usa dois guards privados de search_path fixo:
consulta de escopo ativo e triggers de invalidação antes de excluir versão/condomínio.
Nenhum resultado sobrevive à exclusão; compromisso/recibo permanecem e escopo órfão é negado.
As funções não concedem papel de ledger ao runtime/worker nem criam login de serviço.

Perguntas citadas conservam também o hash integral das páginas e a revisão do catálogo das
dependências. Mudança fora do trecho citado invalida replay corrente; prova legada incompleta
não confirma essa dependência. A interface confirma corpo e contrato com os validadores do
consumidor antes de descartar a chave lógica. Os ensaios Vite desabilitam descoberta de `.env*`
explicitamente; ambiente filho mínimo não substitui `envDir:false`.

O plano HMAC e o fence autoritativo são da Spec 072. O callback documental usa o PoolClient
do plano, sem COMMIT próprio; allowlists sintéticas, expurgo e reaplicação são transacionais.
O journal de chamadas/purgas abaixo é uma guarda sintética complementar de volume separado,
não substitui a autenticação do plano nem determina retenção ou orçamento de produção.
O hook privado de quarentena da API e o wrapper do worker devem compor os mesmos controles;
nenhum desses controles recebe autorização positiva do ambiente ou de uma chave de IA.

RQ-7112–7114 acrescentam serviços internos injetáveis, sem rota ou ativação por ambiente.
Um journal local separado do dump conserva decisões de purga e intenções de envio sem
conteúdo documental. Exige inicialização sintética explícita, exclusão mútua, flush,
checksum e limites; arquivo ausente/corrompido não equivale a estado vazio.
O verificador privado de recuperação é negado por padrão e confere também os recibos
operacionais autoritativos. Restaurar um dump antigo exige quarentena e reaplicação;
o journal não inventa custos perdidos nem libera um resultado incerto.

A purga usa a elegibilidade de trinta dias já conferida pelo banco, invalida resultados
duráveis e preserva histórico literal/citações históricos. A exportação privada limita
campos, tamanho e escopo; não exporta credenciais ou metadados internos da conversa.
Reconciliação explícita exige prova privada do resultado conhecido, mesma chave, política,
owner e checksum, mais validação do contrato; não executa transporte nem altera Spec 072.
Esses mecanismos são provas sintéticas locais; custódia e retenção reais seguem pendentes.
No lote, todas as invalidações externas antecedem o primeiro trigger/lock da transação de
purga, evitando espera circular entre pools sem remover a serialização do consumo. Expurgo
de todo o conteúdo inclui originais órfãos de upload interrompido; expurgo de versão não
amplia esse escopo. Restore usa somente destino novo/vazio guardado, sem reset de cópia ocupada.

## Consequências e pendências

Nenhuma dependência, serviço externo, migration remota, contratação ou chamada real nova. Localmente, mocks
provam transporte e integração, não OCR/modelo ou readiness do piloto. Dados reais continuam
bloqueados por política/fornecedor/retenção, autorização específica de payload/destino, budgets
de gasto, revisão profissional, baseline da API, persistência de execução e backup/restauração.
O startup preparado não habilita fotos/OCR externos apenas pelas flags legadas.

## Fontes oficiais consultadas em 09/11/2026

- [Entrada de arquivos na Responses API](https://developers.openai.com/api/docs/guides/file-inputs): entrada inline base64 e limites do transporte. O teto local é mais restritivo.
- [Estado de conversa](https://developers.openai.com/api/docs/guides/conversation-state): `store:false` controla armazenamento do objeto de resposta; não é aprovação de retenção/privacidade.
