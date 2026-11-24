# Spec 067 — Leitura e identificação de PDFs de 300 páginas

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-05

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz releitura manual de documentos extensos sem perder páginas ou fontes. |
| Público | §3 | Atende síndicos profissionais e moradores com arquivos extensos do condomínio. |
| Proposta de valor | §§5 e 6.6 | Mantém envio pelo chat e consulta posterior do arquivo autorizado inteiro. |
| Prioridades do MVP | §7, Blocos 6 e 7; §8 | Fortalece processamento, identificação e memória documental já autorizados. |
| Segurança e confiança | §§9 e 10 | Impede publicação parcial, identificação arbitrária e acesso entre condomínios. |
| Validação e métricas | §§12 e 13 | Mede completude, citações, latência e memória; reutiliza embeddings calculados. |

### Limites respeitados

- Mantém os tetos da Spec 013: 500 páginas e 25 MB; análise estruturada continua limitada a
  500 páginas e dois milhões de caracteres conforme ADR 0024.
- Não altera prompt, provedor, OCR externo, política de dados ou autenticação.
- Não promete interpretar integralmente 300 páginas em uma resposta nem garantir leitura de
  manuscritos ou PDFs digitalizados; ausência de texto/OCR suficiente exige revisão.
- Não introduz tela, serviço, dependência, contabilidade completa ou ação externa.

Gate competitivo (§4 da estratégia): mantém o chat e os Blocos 6/7 autorizados; melhora
evidência e tempo de consulta; preserva isolamento e abstenção; oferece fontes por página
e versão; mede o resultado com corpus sintético de 300 páginas; usa agrupamentos e cache
vinculado aos próprios trechos, sem novo serviço ou persistência derivada.

### Divergências da visão

Nenhuma. Solicitação explícita do usuário em 05/11/2026 para melhorar leitura e identificação
e suportar PDFs de 300 páginas com tranquilidade.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Processar e consultar PDFs textuais de 300 páginas preenchidas com todas as páginas e fontes
verificáveis, sem repetir vetorização dos mesmos trechos a cada pergunta.

## 2. Promessa testada

> A página 300 permanece tão verificável quanto a primeira; leitura incompleta nunca parece completa.

## 3. Usuário primário

Síndico que envia cadernos de gestão, convenções ou compilações extensas pelo chat.

## 4. Escopo

- Corpus sintético denso de 300 páginas, com gabarito independente do extrator.
- Identificação em todas as páginas, com resultado conservador para tipos conflitantes.
- Reutilização de embeddings de trechos em memória e reconstrução de páginas por agrupamento.
- Persistência PostgreSQL em lotes limitados, mantendo transação, RLS e job ativo.
- Testes HTTP, extração, consultas, falha segura e benchmark local reproduzível.

## 5. Fora do escopo

OCR novo, novo modelo de IA, aumento dos limites documentais, promessa de capacidade no Render,
avaliação semântica de modelo, migração de banco e publicação.

## 6. Pré-condições

Contexto autorizado, original validado e privado, stack atual instalada e dados inteiramente sintéticos.

## 7. Requisitos funcionais

### RQ-6701 — Documento extenso completo

Upload HTTP de PDF com 300 páginas A4 preenchidas preserva o original byte a byte e produz
300 páginas pesquisáveis na ordem, com texto integral, hashes e offsets verificáveis. Consultas
amostram início, meio e fim do arquivo, inclusive o final da página 300.

### RQ-6702 — Identificação sem preferência arbitrária

A identificação examina todas as páginas sem concatenar o arquivo inteiro. Um sinal direto
somente no fim também identifica o tipo. Sinais de tipos diferentes resultam em `other`, com
`identified=false`; não se escolhe o primeiro tipo da lista. O contrato estruturado conserva
seu estado `needs_review` para conflito. Identificação não confirma vigência nem autorização.

### RQ-6703 — Reutilização escopada

O índice em memória reutiliza embeddings calculados para o mesmo objeto de trecho e conteúdo.
A autorização precede acesso ao cache; o cache não concede elegibilidade. Troca de conteúdo ou
hash invalida o vetor, falha não é memorizada e a remoção do trecho permite coleta de memória.
Reconstrução agrupa trechos por versão e página em uma passagem, preservando validação de lacunas
e conflitos e os limites existentes.

### RQ-6704 — Escrita em lotes limitada e atômica

PostgreSQL agrupa até 25 páginas para preparar linhas e insere no máximo 100 linhas por comando
parametrizado de páginas, trechos ou vetores. Índices dos trechos são únicos na versão inteira.
Tenant, job ativo, hashes, perfil vetorial e estado final continuam validados. Falha em qualquer
lote reverte tudo; `ready` só é publicado depois de todos os lotes, na mesma transação.

### RQ-6705 — Falha e medição explícitas

Página ilegível, inclusive a última, mantém `needs_review` e sua numeração; exceder 500 páginas
falha sem publicar fontes prontas. Benchmark independente registra tamanho, caracteres, tempos
de indexação e consultas, pico de RSS do processo e contagens. Metas locais sintéticas:
indexação de 300 páginas em até 60 segundos, consultas aquecidas em até cinco segundos cada e
pico de RSS abaixo de 512 MiB em processo isolado. Falha de meta é reportada, nunca omitida.
O resultado local não é SLA de hospedagem ou validação de OCR/modelo.

## 8. Contratos

Reutiliza `DocumentProcessingOutcome`, resumo da Spec 013, chunks e fontes existentes.
Não muda contrato HTTP nem schema. O benchmark gera JSON sem conteúdo documental ou identidade.

## 9. Requisitos não funcionais

Zero acesso cruzado; sem conteúdo em logs; sem chamadas externas na validação local; cobertura
mínima de 80% em statements, branches, functions e lines. Cache só vive com a instância do índice
e seus trechos; não há cache global ou de documentos removidos.

## 10. Critérios de sucesso

Aceitações passam com gabarito de 300 páginas; metas locais medidas; consultas citam páginas
corretas; nenhum parcial fica pronto; gates aplicáveis e rastreabilidade registrados.

## 11. Questões em aberto

Capacidade no ambiente publicado, PDFs reais e OCR de 300 páginas exigem medição própria,
preservando as autorizações de dados existentes.

## Gate para mudar o status

Exige alinhamento, aceitação, rastreabilidade, testes, benchmark, revisão do diff e resultados
explícitos dos gates. Nenhuma aprovação de produção é inferida do benchmark local.
