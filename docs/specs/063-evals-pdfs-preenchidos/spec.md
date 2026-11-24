# Spec 063 — Evals Luna/Sol com PDFs preenchidos

**Status:** execução e revisão técnica concluídas; pendências de qualidade abertas  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§2 e 4 | Mede respostas sobre fatos dispersos em páginas preenchidas, depois da leitura do PDF. |
| Público | §3 | Usa assuntos fictícios da rotina dos síndicos. |
| Proposta de valor | §§5, 6.6 e 8 | Verifica o uso da memória documental e das fontes do arquivo enviado. |
| Prioridades do MVP | §7, Bloco 6; §12 | Avalia capacidades existentes com os 35 PDFs da Spec 013, sem antecipar outro bloco. |
| Segurança e confiança | §§8–10 | Conserva autorização, isolamento, gabaritos separados e validação das citações. |
| Validação e métricas | §13 | Registra completude factual, fontes, falhas e consumo por modelo. |

### Limites respeitados

- Somente os 35 PDFs fictícios já criados: 20 de uma página, dez de duas e cinco de oito.
- Não adiciona provedor, dependência, funcionalidade, prompt ou configuração de produção.
- Perguntas passam pela recuperação e validação do produto; não usa o envio integral de lote restrito a Sol.
- Usa a sessão ChatGPT/Codex local já autorizada, sem fallback para API paga ou dados reais.
- O gate competitivo mantém o chat e o Bloco 6, mede evidência e completude com custo observável e reutiliza a stack. Não antecipa ERP, contabilidade, ação externa ou piloto.

### Divergências da visão

Nenhuma. O usuário pediu explicitamente evals com os dois modelos em 03/11/2026.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Executar e comparar respostas reais de Luna high e Sol 6.1 low sobre todas as 80 páginas dos
35 PDFs preenchidos, mantendo os erros e distinguindo falha de extração, recuperação, geração
e validação.

## 2. Promessa testada

> A Alvitra responde sobre informações do início, meio e fim da página, com fontes verificáveis e sem transformar recebimento em aprovação.

## 3. Usuário primário

Síndico que envia documentos textuais completos e consulta dados e pendências do condomínio.

## 4. Escopo

- Uma rodada, 35 PDFs / 80 perguntas por modelo; 160 respostas no total.
- Uma consulta independente por página, pedindo três fatos, pendências do quadro e limite da confirmação de recebimento.
- Extração real dos PDFs, recuperação de até oito fontes e endpoint de perguntas existente.
- Mesmo snapshot de código, corpus, perguntas e gabaritos para ambos os modelos.
- Checkpoints por pergunta, respostas, evidências, hashes, validações, tokens e latência.
- Verificações automáticas de fatos fechados e citações; revisão técnica por IA identificada separadamente.

## 5. Fora do escopo

Treinamento, mudança de prompt ou runtime, escolha definitiva de modelo, inferência no CI,
OCR, navegador, PostgreSQL, memória entre perguntas, significância estatística e aprovação
especializada. Um resultado automático não aprova sustentação semântica irrestrita.

## 6. Pré-condições

Specs 013, 041, 059 e 061; ADRs 0008, 0031, 0035 e 0038; corpus da Spec 013 validado;
CLI autenticado pelo próprio usuário e opt-in local. Gates determinísticos antes da execução.

## 7. Requisitos funcionais

### RQ-6301 — Entradas independentes e congeladas

Gerar os PDFs pelos mesmos fixtures da Spec 013, verificar original e texto integral e guardar
hashes de código, corpus, perguntas e gabaritos. O modelo recebe somente a pergunta e o contexto
normal da aplicação, nunca o gabarito ou a nota esperada. Cada pergunta usa apenas o documento
do cenário e um contexto autorizado, sem memória de outra pergunta.

### RQ-6302 — Dois modelos reais

Fixar `gpt-6-luna` high e `gpt-6.1-sol` low, sem roteamento entre eles. O modo padrão apenas
prepara o plano; `--execute --run-key=<novo>` executa a autorização atual via Codex. Limitar
concorrência a quatro. Conservar o reparo já permitido pelo produto e registrar todas as
tentativas, inclusive saídas recusadas; não repetir perguntas concluídas para melhorar notas.

### RQ-6303 — Medição honesta

Conferir horário, quantidade/unidade, prazo e os dois itens pendentes. Validar documento,
versão, página, trecho, offsets e claims com as regras existentes. Registrar se cada resposta
esperada estava nas evidências efetivamente enviadas, para separar omissão de recuperação e de
geração. Aprovação dos checks automáticos não equivale a revisão semântica humana.

### RQ-6304 — Artefatos e retomada

Cada checkpoint carrega hash e identidade da rodada; adulteração ou snapshot divergente recusa
retomada. Preservar falhas e casos não executados. Relatório separa os modelos, os tamanhos de
documento, respostas completas/parciais/falhas, geração não realizada, citações e consumo
conhecido/desconhecido. Não atribuir fatura ou franquia aos tokens.

## 8. Contratos

Plano: modelos, esforços, 35 documentos e 80 perguntas por condição, zero chamadas por padrão.
Checkpoint: pergunta, gabarito local, resposta pública, evidências/capturas, validações, tokens,
latência, hash e revisão técnica inicialmente pendente. `semanticApproved` permanece nulo.

## 9. Requisitos não funcionais

Zero dados reais ou credenciais nos artefatos; nenhuma ferramenta disponível no subprocesso;
nenhuma API alternativa; nenhuma aprovação automática por falha de infraestrutura. Snapshot
exclui ambiente, credenciais e dependências. Relatórios locais permanecem privados/ignorados.

## 10. Critérios de sucesso

AC-6301–6305 atendidos, comando documentado, gates aplicáveis executados e relatório da rodada
com os 160 pontos concluídos ou impedimentos classificados. Uma resposta ruim é resultado da
avaliação e não autoriza trocar gabarito, código ou pergunta na mesma rodada.

## 11. Questões em aberto

O [resultado de 03/11/2026](results-2026-11-03.md) registra 160/160 respostas reais e revisão
técnica por IA: Luna high com 72 satisfatórias, cinco parciais e três falhas; Sol 6.1 low com
75 satisfatórias, duas parciais e três falhas. Permanecem abertos os três casos compartilhados
de abstenção após `task_coverage_missing`, duas lacunas de recuperação de prazo por modelo e
três respostas Luna com identificadores internos no texto. Revisão especializada permanece
pendente. Uma rodada e uma família de layout sintético não representam todos os PDFs.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, testes do harness, execução real e resultados precisam
estar registrados; não há autorização de merge, publicação ou piloto.
