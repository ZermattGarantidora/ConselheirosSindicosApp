# Spec 057 — Respostas diretas e apresentação conjunta dos anexos

**Status:** correções verificadas e ativas no preview local, incluindo contexto/vigência no prompt v28
**Responsável:** produto e engenharia
**Atualizado em:** 2026-11-03

Após bloqueio inicial da revisão automática, o usuário autorizou explicitamente o envio do texto
documental e dos resultados calculados ao Codex autenticado no ChatGPT, modelo `gpt-6.1-sol`.
Essa autorização restringe qualquer menção a gateway nesta spec: sem fallback ou novo destino.

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz o esforço para encontrar o que importa em vários documentos. |
| Público | §3 | Atende síndicos profissionais e moradores que recebem lotes documentais. |
| Proposta de valor | §§1, 5 e 6 | Mantém a conversa direta e o trabalho documental complexo acessível sob demanda. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Corrige apresentação e priorização já autorizadas, sem módulo novo. |
| Segurança e confiança | §§8–10 | Conserva fontes, versões, conflitos, abstenções e validação humana. |
| Validação e métricas | §§12–14 | Testa ausência de painéis, acesso às evidências, leitura conjunta e chamadas limitadas ao gateway autorizado. |

### Limites respeitados

Não cria ERP, auditoria, ação externa, provedor, dependência, schema, cache ou resumo persistente.
Os cálculos e os dez pontos continuam internos; seus achados relevantes entram na fala gerada.
O usuário revisou o texto apresentado e pediu explicitamente leitura de todos os arquivos,
comentário direto, solução para problemas encontrados e oferta contextual de ajuda. O prompt
v27 incorpora esse ajuste. A síntese usa o mesmo gateway já configurado para consultas documentais,
sem novo provedor ou destino; o ADR 0036 sucede o limite local do ADR 0033 nessa fala.
Somente material sintético é executado nos testes. Não certifica completude semântica universal.

### Divergências da visão

Nenhuma. O pedido de 29/10/2026 autoriza corrigir o excesso mostrado nas imagens. Esta spec
sucede a exibição integral inicial das Specs 020, 045 e 049, preservando sua conferência e fontes.

O relato de 03/11/2026 sobre o mesmo PDF aparecer repetido nas fontes detalha o acesso compacto
já autorizado: uma entrada por documento e versão mantém páginas e trechos verificáveis sem
repetir o título do arquivo. A indicação de fonte histórica informa indisponibilidade atual, sem
afirmar que o original foi excluído quando a tela não conseguiu verificá-lo. O diagnóstico de falha registra somente metadados operacionais
controlados para localizar a etapa defeituosa, sem conteúdo privado, destino ou chamada adicional.
O gate competitivo reduz atrito na conversa, mantém a memória documental como diferencial e não
antecipa outro bloco ou serviço.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve problema e testa hipótese descritos no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Comunicar na fala da Alvitra o que importa no material enviado, sem relatório paralelo,
caixas de conferência ou avisos metodológicos automáticos. Fontes permanecem acessíveis.

## 2. Promessa testada

> A Alvitra explica o que encontrou, o que precisa de cuidado e como seguir, com fontes verificáveis.

## 3. Usuário primário

Síndico que envia um documento ou vários arquivos juntos no condomínio autorizado.

## 4. Escopo

Apresentação compacta dos relatórios, fontes agrupadas, síntese do lote pelo Codex autorizado e
redação ajustada após apresentação ao usuário.

## 5. Fora do escopo

Alterar recuperação, fórmulas, elegibilidade, autorização, persistência, roteamento ou transmitir
conteúdo a novo destino. Aplicar prompt sem apresentação e autorização prévias. Inferir defeito
jurídico sem fonte ou fingir leitura integral quando algum arquivo não pôde ser lido.

## 6. Pré-condições

Specs 020, 045 e 049; relatórios validados e fontes autorizadas pelo fluxo existente.

## 7. Requisitos funcionais

### RQ-5701 — Análise na fala da Alvitra

Por ajuste explícito de 29/10/2026, resultados documentais aparecem exclusivamente na resposta
gerada para o contexto. Remover “Ver conferência documental e cálculos”, “Ver os dez pontos” e
“Ver análise por documento”, além dos relatórios, prioridades e ressalvas fixas que os acompanham.
Não mover a lista técnica inteira para a conversa. Cálculos e fontes continuam no servidor como
base da análise; a fala seleciona achados relevantes, sinais sustentados e limites que mudam a
conclusão, sem afirmar aprovação das contas. Essa apresentação sucede os relatórios visuais
das Specs 020, 045 e 049 e a primeira versão desta spec, mantendo sua análise e validação.

### RQ-5702 — Fontes agrupadas e verificáveis

AC-5718, correção de 04/11/2026: retirar somente um marcador decorativo de fonte isolado
no fim da fala, após pontuação, quando existem citações canônicas já validadas. Preservar
texto, metadados e controles das citações. Não remover cláusula, ressalva, marcador literal
no meio da frase ou trecho da fonte. Sem chamada adicional ou fabricação de referência.

Fontes ficam recolhidas em uma entrada por documento e versão; páginas e trechos aparecem dentro
dessa entrada. Escopo e disponibilidade atual da fonte continuam separados, e trechos diferentes continuam
selecionáveis individualmente. Duplicatas literais não viram cartões iguais. A seleção preserva
offsets, versão e callback do visualizador, sem misturar origens.

Por pedido de 29/10/2026, remover o título visível “Fontes da resposta” e o contador de
referências. O acesso permanece recolhido em um controle compacto com ícone e nome acessível;
documentos, páginas e trechos continuam abríveis. Atende briefing §§1, 6 e 9 ao reduzir rótulos
na conversa sem remover evidências. O sequenciamento e o gate competitivo permanecem os mesmos:
ajuste visual nos blocos autorizados, sem alterar dados, IA, cálculos ou autorização.

### RQ-5703 — Apresentação conjunta do lote

Múltiplos arquivos recebem uma fala conjunta depois de terminar as leituras. Reutilizar o endpoint
de síntese, que já calcula os relatórios internamente, sem pedir relatórios individuais apenas
para renderizá-los. Um arquivo recém-autorizado e pronto também recebe a fala contextual, em vez
do relatório. Falhas e confirmações pendentes impedem consulta conjunta como se tudo estivesse
pronto. Mudança de contexto descarta resultados tardios. Não fabricar pergunta do usuário,
aprovação ou fala fixa atribuída à Alvitra.

Correção solicitada em 03/11/2026: preservar a identidade do lote também quando parte dos
arquivos exige confirmação de condomínio. Não gerar uma análise individual ao confirmar cada
arquivo; aguardar os demais arquivos do mesmo envio e emitir uma única análise com todas as
versões prontas e autorizadas. O envio de um único arquivo também não precisa de uma fala de
recebimento seguida de outra análise: progresso permanece operacional, e o resultado é conjunto.
As confirmações necessárias para autorizar cada arquivo permanecem; não são análise documental.
Leitura incompleta, erro ou cancelamento impedem analisar silenciosamente um subconjunto.

Quando a confirmação retomar processamento ainda não concluído, acompanhar a leitura antes
de liberar o arquivo para a síntese. Apenas a última liberação do lote sem texto pode disparar
o comentário conjunto; chamadas repetidas/concorrentes não geram comentários duplicados.
Uma pergunta enviada com o lote segue a regra existente, sem análise automática adicional;
se vários arquivos pedirem confirmação, o texto é preservado para reenvio após resolver pendências.
Resultados tardios não atravessam chat/condomínio, e falha da síntese não dispara tentativas
automáticas ou respostas individuais como fallback.

Correção de 03/11/2026: aviso inequívoco de envio/reenvio não é pergunta documental.
Sem anexo, recebe fala breve gerada, sem busca, citações ou conclusão local. Com anexos,
é legenda: aguardar o lote e gerar seu comentário conjunto pelo fluxo existente, conservando
o texto original no journal. Não adicionar consulta ao Luna nem segunda fala de recebimento.
Perguntas, pedidos de análise e ressalvas factuais mantêm o fluxo de consulta. Não derivar
autorização, vigência ou dados de perfil desse reconhecimento. A regra é limitada a avisos
inequívocos; texto ambíguo continua no fluxo existente.

Detalha briefing §§1, 6, 7 (Blocos 2 e 6–7), 8–10 e 13 e RQ-5703/5705. O gate competitivo
mantém conversa e memória documental, reduz chamadas e recusas indevidas e conserva isolamento
e destino Sol autorizado. Sem novo prompt, provedor, orçamento, schema de resposta ou dependência.
Regressões verificam legenda, pedido explícito, pendência, recuperação literal e idempotência.

Atende briefing §§1, 6.6, 7 (Blocos 2, 6 e 7), 8–10 e 13. O gate competitivo mantém a conversa,
reduz falas repetidas, preserva autorização e completude e usa regressões de lote com confirmações,
falhas e troca de contexto. Sem mudança do prompt, provedor, banco, cálculos ou orçamento.

Após ler todos os arquivos elegíveis, uma chamada ao gateway documental produz um comentário
contextual fundamentado no conjunto. A convenção é comentada quando houver problema sustentado,
com impacto e solução proporcionais; balancetes são relacionados, sem recalcular números por IA.
A fala oferece ajuda ligada ao achado, quando houver um aprofundamento concreto a oferecer.
Não exige três tópicos. Falha da síntese conserva os arquivos e mostra somente uma indicação
operacional curta de que a análise não terminou, sem relatório de fallback nem conclusão pronta.

Correção autorizada em 03/11/2026: o comentário de um envio apenas de convenção não introduz
balancetes, comparações financeiras nem a ausência desses arquivos. A orientação de relacionar
balancetes é incluída somente quando a análise local identifica material financeiro no envio;
cláusulas de orçamento/rateio da convenção não bastam para introduzir essa tarefa. Pedidos
financeiros explícitos e lotes com balancetes conservam a análise e os cálculos existentes.

Na convenção, distinguir aprovação/subscrição de registro. Falta de registro, isoladamente, não
comprova falta de vigência, invalidade ou ausência de efeitos internos. Uma etapa não comprovada
no arquivo não deve ser apresentada como fato que não ocorreu. Pendência explícita de aprovação
ou subscrição continua relevante e deve ser citada; não confirmar vigência sem evidência. Regras
legais e efeitos perante terceiros exigem fonte oficial autorizada ou limitação explícita.
Detalha briefing §§1, 6 e 9–10 nos blocos autorizados, preservando a conversa, evidências e revisão
humana; sem novo serviço, provedor ou ampliação do envio documental. O usuário autorizou os dois
ajustes após a explicação, e o delta foi apresentado antes da aplicação como prompt v28.

A síntese aplica a mesma política de risco das perguntas: se a classificação exigir especialista
e o modelo devolver metadados válidos indicando que ele não é necessário, o servidor acrescenta
a recomendação de revisão humana já prevista. Não descarta uma fala fundamentada só por essa
omissão. Texto, citações, claims e metadados inválidos ou contraditórios continuam recusados.
Essa medida detalha briefing §§9–10 e Spec 047; não gera nova chamada nem modifica o prompt.

A síntese tem teto de 120.000 caracteres de texto e contexto calculado, até 50 versões e 1.200
tokens de saída, além dos limites existentes do reader. Não selecionar silenciosamente um
subconjunto para alegar leitura de todos. Leitura incompleta, fonte não elegível, instrução hostil
ou limite excedido impedem síntese integral. Claims, fontes e permissões continuam validados;
associação e catálogo são revalidados antes de publicar. Quando há pergunta ou pedido junto aos arquivos,
o texto segue o fluxo de consulta existente, sem adicionar outro comentário automático; os relatórios
locais continuam internos e o prompt não pode alegar leitura de todo o lote se a seleção não o cobre.

Na demonstração, a extração transmite seu resumo de qualidade ao catálogo existente: páginas
esperadas, processadas, pesquisáveis e ilegíveis, completude e método. Não deduz completude a
partir dos trechos recuperados nem aceita metadado desconhecido como leitura integral. Reutiliza
os campos existentes, sem novo mapa, cache ou schema; não altera o processamento persistido.

Preservar o histórico da Spec 049: a conferência usa o catálogo elegível do condomínio, incluindo
meses e apoios anteriores ao envio atual. A síntese recebe os cálculos locais e os trechos literais
que os sustentam, além do texto completo dos arquivos recém-enviados. Não pede novamente um mês
já disponível e comparável. Esses apoios entram no orçamento agregado e na revalidação do catálogo.

### RQ-5704 — Redação geral revisada pelo usuário

Conclusão primeiro, seleção de pontos materiais, agrupamento de lacunas e aprofundamento quando
pedido ou indispensável. Resolver a instrução conflitante de percorrer dez tópicos na fala.
Após o ajuste do usuário, três achados deixam de ser regra da fala: analisar todos os arquivos
e comentar diretamente o que merecer decisão, com pergunta contextual de continuidade.

### RQ-5705 — Avisos somente quando necessários para continuar

Recusa definitiva de uma consulta documental registra somente código de validação de lista
fechada e quantidade de tentativas. Código desconhecido vira `unknown`; mensagem nativa,
pergunta, resposta, trechos e credenciais não entram no diagnóstico. Falha do observador não
altera o resultado nem cria geração. Isso evita depender de acesso amplo à memória para
identificar uma nova recusa. Não acrescentar esses dados técnicos à fala da Alvitra.

Não apresentar cartões de erro, contagem de relatórios ou selos de sucesso no chat. Limites,
conflitos e validação humana que afetem a decisão pertencem à fala da Alvitra. Enquanto a IA
estiver indisponível, manter uma linha operacional acessível para falhas que impeçam continuar,
envio inválido, arquivo sem leitura ou confirmação de condomínio pendente. Não escondê-las nem
inventar uma fala da IA. Arquivos prontos conservam seu nome e acesso ao original, sem aviso
repetido de disponibilidade. Progresso ativo pode ser discreto; não existe tela de diagnóstico.

Uma falha da síntese recebe uma categoria operacional segura, sem texto do documento ou resposta
do modelo. O diagnóstico interno registra somente código controlado, etapa, latência e marcadores
de protocolo; não registra conteúdo do documento, prompt, resposta, mensagem nativa de erro ou
segredos. O chat informa indisponibilidade, recusa de validação, limite de material ou falha geral
conforme a categoria. Recomenda reduzir o envio somente quando o limite de tamanho foi confirmado;
uma falha com um arquivo não deve parecer erro de volume.

O navegador aguarda o teto suportado de uma geração (300 segundos), mais 30 segundos para leitura,
validação e transporte. Não encerra a análise após 60 segundos enquanto o servidor ainda trabalha.
Timeout ou falha de conexão recebem texto operacional em português, preservam o arquivo e não
disparam novo upload ou geração. Resposta HTTP bem-sucedida com corpo vazio, JSON inválido ou
contrato incompleto é recusada como falha operacional, sem fala em branco ou fontes órfãs.

Atende §§1, 6, 7 (Blocos 2, 6 e 7) e 9–10 do briefing. O gate competitivo preserva a conversa,
reduz atrito e mantém evidências e autorização nos blocos já autorizados. Não altera o prompt,
o provedor ou os destinos existentes nem antecipa capacidade futura.

## 8. Contratos

Campo opcional `summary` em `FinancialReviewCheck`, com fontes do mesmo ponto; contratos de
autorização e persistência preservados. O chat mantém a fala e as fontes; relatórios continuam
internos. A persistência completa das falas auxiliares permanece pendente na Spec 058.

## 9. Requisitos não funcionais

HTML escapado, acesso às fontes por teclado e nenhum limite por substring em fato
documental. Uma geração de comentário substitui as falas de status individuais do lote; não
repete OCR nem adiciona provedor. Cobertura mínima de 80% nos quatro indicadores do projeto.

A autorização de um arquivo pronto consulta o estado pelo endpoint existente e, quando ele
traz análise, solicita a síntese contextual. Nesse caso há uma geração adicional à fala de estado
anterior, que não é exibida como análise. O lote normal conserva uma única geração conjunta;
o envio acompanhado de pergunta segue somente o fluxo de resposta, sem síntese automática extra.

Para arquivos de um envio ainda acompanhado no chat, a correção de 03/11 sucede a análise
individual após confirmação: o controle do lote aguarda todas as liberações e faz uma única
síntese. A confirmação avulsa pela biblioteca, fora de um lote acompanhado, conserva o fluxo
individual já existente. Recarregar ou trocar de conversa descarta coordenação transitória;
histórico já confirmado permanece consultável, sem reemitir análises automaticamente.

## 10. Critérios de sucesso

O comentário é direto e reúne os achados materiais, sem caixas ou relatórios no chat. Fontes
agrupadas continuam abríveis; cálculos, validações e permissões permanecem internos. Indicações
operacionais aparecem somente quando necessárias para continuar. Regressões sintéticas e gates passam.

## 11. Questões em aberto

Validação humana da experiência e revisão especializada permanecem necessárias. A autorização
de texto e destino está registrada; não certifica compreensão semântica universal de documentos.

## Gate competitivo

Mantém o chat nos blocos autorizados; reduz ruído com memória e fontes verificáveis além de uma
leitura genérica. Reutiliza relatórios e controles existentes; agrupar páginas evita repetir o
mesmo documento sem remover evidências. Diagnóstico registra apenas metadados seguros e reutiliza
o gateway existente, sem serviço permanente novo.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, revisão do diff, gates e resultados coerentes. Aplicação
do prompt depende de aprovação explícita. Não autoriza merge, deploy ou piloto real.
