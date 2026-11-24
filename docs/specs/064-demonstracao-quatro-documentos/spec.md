# Spec 064 — Demonstração com convenção e três atas

**Status:** avaliações curta e longa concluídas; falhas funcionais abertas e revisão especializada pendente  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Consulta regras e decisões em quatro PDFs fictícios. |
| Público | §3 | Demonstra tarefas documentais do síndico. |
| Proposta de valor | §§5 e 6 | Usa o mesmo upload, busca e conversa da aplicação. |
| Prioridades do MVP | §7, Blocos 6 e 7 | Valida capacidades existentes, sem acrescentar telas ou módulos. |
| Segurança e confiança | §§8–10 | Exige fontes, isolamento e limites; arquivos somente sintéticos. |
| Validação e métricas | §13 | Mede fatos, omissão, citações, abstenção e consumo. |

### Limites respeitados

Quatro documentos suficientes para demonstração, sem prometer convenção jurídica completa,
validade real ou lançamento. Sem provedor, banco, dependência ou bloco novo. O gate competitivo
mantém o chat, reduz falhas documentais verificáveis e cria regressões reutilizáveis. Melhorias
permanentes devem ser pequenas e gerais; não haverá exceção por nome, hash ou gabarito.

### Divergências da visão

Nenhuma. O usuário autorizou criar a convenção, executar 120 testes, corrigir falhas e executar
mais 60, sem solicitar confirmação para escolhas necessárias nesta tarefa.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descritos no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Entregar uma convenção fictícia compatível com as três atas e verificar o conjunto no app.

## 2. Promessa testada

> Consultas sobre regras e decisões recuperam fatos e fontes dos PDFs, sem inventar execução ou documentação ausente.

## 3. Usuário primário

Síndico demonstrando upload e consulta documental na conversa.

## 4. Escopo

Convenção textual de duas páginas e três atas de duas páginas. Rodada inicial de 60 situações
em Luna high e Sol 6.1 low (120 respostas); correções; rodada independente de 30 situações
novas em ambos (60 respostas). Uma análise conjunta Sol adicional verifica o caminho do lote.
Testes determinísticos de upload, extração, contrato e isolamento complementam esses números.

Extensão solicitada em 04/11/2026: três roteiros de 30 turnos por modelo, seis conversas
e 180 respostas encadeadas. Os quatro PDFs são os mesmos. Cada roteiro mantém chat, histórico
real e respostas anteriores do próprio modelo; não recebe histórico fabricado ou gabarito.

## 5. Fora do escopo

Parecer especializado, dados reais, treino, comparação estatística global, produção e merge.

## 6. Pré-condições

Briefing atual, Specs 013/046/056/057/058/063; ADRs 0031/0035/0036/0038; Codex local autorizado.

## 7. Requisitos funcionais

### RQ-6401 — Corpus verificável

Conservar os três PDFs entregues e adicionar uma convenção compatível, identificada como fictícia.
Validar todas as páginas por renderização e pelo pipeline real. Copiar originais sintéticos para
fixtures, com hashes; não importar arquivos privados do usuário.

### RQ-6402 — Duas rodadas honestas

Congelar corpus, gabaritos e código por rodada. Usar endpoints reais de upload e perguntas,
com recuperação limitada a oito fontes e validação normal. Gabarito nunca entra no gateway.
Nas rodadas curtas, cada caso usa conversa independente. Máximo de quatro inferências simultâneas, mesmo reparo
permitido pelo produto, sem fallback pago. Checkpoints concluídos não são repetidos para subir nota.

### RQ-6403 — Diagnóstico e correções

Registrar fatos esperados, presença nas fontes, respostas, citações, tentativas, tokens, latência
e falhas. Revisão técnica por IA é identificada e distinta de revisão humana especializada.
Correção altera antes a spec/aceitação correspondente e acrescenta regressão. Preservar a
primeira rodada; a segunda contém perguntas reservadas, sem inserir respostas no prompt.

### RQ-6404 — Conversas longas com memória real

Reutilizar upload, perguntas e journal do app. Um chat por roteiro/modelo, turnos sequenciais
e consultas com referências curtas, mudanças de assunto, correções, propostas não comprovadas
e retomadas após mais de oito interações. Preservar oito turnos/12.000 bytes/oito fontes.
Registrar a memória efetivamente enviada, omissões, fontes, foco, tentativas e integridade do
histórico consultável. Limite de janela é distinto de omissão do modelo com contexto disponível.

Roteiros e rubricas são fixados antes da execução. Checkpoints de turnos são imutáveis; conversa
concluída não é repetida. Uma execução interrompida conserva turnos parciais e não recomeça
silenciosamente o mesmo roteiro. O relatório separa completo/parcial/falha, retenção distante,
pedidos legítimos de esclarecimento e limites de contexto. Revisão técnica por IA é distinta
da nota mecânica e da revisão especializada. Não altera produção ou reinicia a sessão manual.
Atende briefing §§6, 8–10 e 13, Specs 043/054/058 e ADRs 0032/0037, sem expandir memória.

Uma recusa definitiva registrada pelo observador de validação não pode receber conclusão
automática de resposta completa ou de limitação legítima apenas porque o fallback possui texto.
O detector usa somente o código já existente; não altera as saídas originais da bateria ou as
regras de produção.

## 8. Contratos

Comando sem execução imprime plano e não chama modelo. Execução exige rodada e run-key explícitos;
snapshot e checkpoints são verificados por hash. Resumo separa os modelos e falhas de infraestrutura.

## 9. Requisitos não funcionais

Zero credenciais/dados reais em fixtures, ferramentas remotas ou envio para provedores alternativos.
Relatórios locais ignorados; estado da sessão manual preservado durante as avaliações isoladas.

## 10. Critérios de sucesso

180 casos concluídos e classificados, sem ocultar falhas; seis páginas das atas e duas da convenção
pesquisáveis. Falhas corrigíveis geram regressões e gates; limitações restantes são informadas.

## 11. Questões em aberto

As duas rodadas e as correções estão registradas em [resultados](results-2026-11-04.md).
Não é garantia de todas as perguntas possíveis; são quatro PDFs e revisão técnica por IA.

A extensão de 180 respostas encadeadas está em [conversas longas](long-results-2026-11-04.md).
As falhas medidas de contrato conversacional, recuperação, guarda monetária e apresentação
permanecem abertas. Esta extensão corrige somente o detector do avaliador; não modifica o app.

## Gate para mudar o status

Corpus revisado, comando documentado, harness verificado, 120 + 60 respostas classificadas,
rastreabilidade e gates aplicáveis registrados. Sem autorização implícita de merge ou produção.
