# Aceitação — Spec 067

## AC-6701 — 300 páginas preenchidas (P0)

Dado PDF fictício de 300 páginas, cada uma com pelo menos 50 linhas e 3.000 caracteres não
brancos, quando enviado por HTTP, então original recuperado é idêntico, catálogo informa
300/300 páginas, e reconstrução por chunks é idêntica ao gabarito em todas as páginas.
Consultas de início, meio e fim, inclusive último trecho da página 300, retornam documento,
versão, página, hash e offsets corretos. Outro condomínio não obtém arquivo, páginas ou evidências.

## AC-6702 — Identificação tardia e conflito (P1)

Dado sinal direto apenas na página 300, então o tipo é identificado. Dados sinais de tipos
distintos em páginas diferentes ou no mesmo texto, então a identificação é `other`, sem
preferência pelo primeiro tipo. O contrato estruturado mantém conflito em revisão.

## AC-6703 — Vetores reutilizados e invalidados (P1)

Dadas consultas sucessivas, então cada trecho autorizado é vetorizado uma vez; cada pergunta
continua vetorizada. Sem permissão ou em outro tenant não há reutilização nem cálculo indevido.
Conteúdo/hash alterado exige vetor novo; falha de embedding admite nova tentativa e remoção
do trecho elimina a evidência mesmo que já tenha sido calculado um vetor.

## AC-6704 — Lotes e rollback (P0)

Dadas 300 páginas, então comandos de escrita têm até 100 linhas, os chunks conservam índice
global e chaves da página/versão/tenant, e o estado final só é escrito após todos os lotes.
Falha em lote intermediário ou vetor inválido produz rollback e nenhuma confirmação de pronto.
Integração PostgreSQL real verifica persistência, reconstrução e isolamento sob RLS.

## AC-6705 — Última página ilegível e teto (P0)

Dadas 299 páginas textuais e a página 300 sem texto, sem OCR suficiente, então a versão precisa
de revisão, informa a página 300 e não fica disponível como completa. PDF de 501 páginas falha.

## AC-6706 — Benchmark local (P1)

Em processo isolado, comando único produz relatório JSON com contagens, tamanho, caracteres,
tempo de indexação, consultas frias/aquecidas e pico de RSS; verifica as metas da spec e encerra
com erro quando alguma falha. Não usa provedor nem confunde parsing/retrieval com qualidade
semântica de respostas ou capacidade de hospedagem.
