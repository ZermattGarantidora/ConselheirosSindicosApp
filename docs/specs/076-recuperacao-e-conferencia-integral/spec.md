# Spec 076 — Recuperação exata, conferência integral e comparação densa

**Status:** implementado e validado em sintéticos locais em 24/11/2026; revisão independente e especializada pendentes  
**Responsável:** engenharia e qualidade da Alvitra  
**Atualizado em:** 2026-11-24

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Corrige perda de registros recuperáveis e mede análise integral sem omissão. |
| Público | §3 | Atende consultas de síndicos sobre documentos densos e pagamentos. |
| Proposta de valor | §§5 e 6 | Resolve a pergunta no chat sem pedir novamente arquivo disponível. |
| Prioridades do MVP | §7, Blocos 6/7; §§8 e 12 | Reutiliza documentos autorizados, leitura completa e cálculo determinístico. |
| Segurança e confiança | §§8–10 | Exige versão, página, trecho, autorização, cobertura e abstenção segura. |
| Validação e métricas | §13 | Compara custo por resposta aprovada, tempo, cobertura e casos inéditos. |

### Limites respeitados

Sem tela nova, contabilidade completa, movimentação, parecer profissional, dados reais,
treinamento de pesos, provedor/dependência nova ou alteração da personalidade/system prompt.
Mantém limites documentais e até oito trechos enviados ao modelo; o cálculo integral acontece
localmente. Resultado calculado não atesta pagamento bancário, regularidade ou aprovação.
Avaliação de OCR é sintética e separa transcrição real de mocks de integração.

### Divergências da visão

Nenhuma. O usuário autorizou executar os cinco próximos passos propostos em 23/11/2026.
Gate competitivo: mantém o chat, melhora tarefas já autorizadas nos Blocos 6/7, conserva
isolamento e abstenção, prova cobertura verificável além de anexos genéricos e reutiliza
os leitores/cálculos/CLI existentes. Não altera roteamento de produção pela média de um teste.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve a hipótese de memória documental útil e verificável.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades, sequenciamento e exclusões foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Resolver as lacunas DENSE-005/032, conservar a baseline 075 e medir a melhoria em casos
inéditos e formatos variados, comparando Sol e híbrido com a mesma implementação.
Na continuação de 24/11/2026, corrigir a classificação/cobertura que recusou DENSE-017/027/031,
conservando a rodada anterior e repetindo a comparação completa.

## 2. Promessa testada

> Localiza o registro correto e só apresenta um total integral quando conferiu toda a base necessária.

## 3. Usuário primário

Síndico consultando documentos extensos e cheios de referências, exceções e números semelhantes.

## 4. Escopo

Recuperação por identificador exato, conferência integral de tabela financeira explicitamente
identificada, recibo verificável e geração natural contextual. Novos casos sintéticos variam
IDs, valores, posições, exceções, atas narrativas, anexos, tabelas continuadas e digitalização.
Comparação pareada Sol 6.1 low / híbrido Luna high–Sol low com ordem alternada, snapshot,
checkpoints, gabaritos anteriores à execução e auditoria técnica por resposta.

## 5. Fora do escopo

OCR universal, manuscritos/assinaturas autenticados, cálculo sobre formato desconhecido,
interpretação jurídica definitiva, promoção de minuta, envio do corpus inteiro ao modelo,
seleção de produção automática, validação especializada presumida ou fine-tuning.

## 6. Pré-condições

Specs 013, 067, 073, 074/075 e ADRs 0003, 0031, 0038, 0040/0047. Somente ambiente local
sintético e Codex autorizado; sem API paga alternativa. Alterações no parser/consulta preservam
RLS, permissões e filtros de qualidade/vigência. Baseline 075 r2 permanece imutável.

## 7. Requisitos funcionais

### RQ-7601 — Identificador exato

ID completo com fronteiras deve preceder correspondências parciais, mantendo o documento e
versão solicitados. Referência em outro documento não substitui a linha original. Preservar
exceções e notas relacionadas, conflitos e orçamento de fontes. Testar vizinhos, prefixos,
outro tenant, minuta e ausência real. Não codificar IDs do benchmark na implementação.
Seguir referência explícita da cláusula a anexo/ressalva mesmo sem repetição na pergunta;
reservar essa evidência antes de diversificar entre documentos tangenciais. Se faltar linha
própria nos candidatos, fazer busca complementar limitada pelo mesmo índice autorizado.

### RQ-7602 — Soma integral comprovada

Pedido explícito de soma de todos os lançamentos pagos em mês/ano usa o catálogo autorizado
e o leitor integral existente. Exigir uma origem inequívoca, confirmada, pronta e com todas
as páginas esperadas, qualidade suficiente e limites existentes. Interpretar cabeçalhos de
tabela suportados, validar cada linha e data, recusar linha ilegível/duplicada e conflito
relevante; excluir pendentes/cancelados e outros períodos. Calcular em centavos inteiros.

Guardar recibo privado de páginas/hashes/linhas/filtro/total no audit existente. O contexto
do modelo recebe só resumo calculado e até oito fontes originais, sem transformar resumo
em citação fictícia. A validação aceita exclusivamente o total do recibo produzido localmente,
com as fontes correspondentes, e rejeita total alterado, escopo diferente e prova fabricada.
Revalidar autorização/origens antes da persistência e recusar mudança concorrente.
Recibo HTTP de total integral também revalida todas as páginas do cálculo, inclusive as
que não aparecem entre as amostras citadas; não reutilizar total por conferir só oito trechos.

### RQ-7603 — Continuidade útil

Arquivo recebido mas parcialmente recuperado não é arquivo ausente. O contexto deve indicar
o que foi conferido e a limitação específica; não solicitar reenvio integral como substituto
da leitura disponível. O texto da resposta continua gerado conforme o contexto.
Comparação qualificada de minuta pendente/disputada, validada e persistida pelo caso de uso,
pode ser entregue e recuperada pelo recibo HTTP. Essa autorização é específica de pergunta:
exige identidade da resposta, claims de interpretação, procedência confirmada, estado pronto,
catálogo e páginas imutáveis. Não libera resumo/atualização de documento pendente nem promove
sua vigência. Alteração de estado/conteúdo ou revogação invalida o replay.
O rótulo “minuta” sozinho não qualifica uma afirmação: a claim deve explicitar proposta,
pendência/disputa ou a limitação de aprovação, autorização ou vigência.

### RQ-7604 — Avaliador e casos inéditos

Preservar resultados brutos antigos. Nova avaliação distingue equivalência lexical e declaração
repetida de ausência de fonte, exigindo valores, associação, citações e revisão técnica.
Casos novos são fixados antes da execução; incluir abstenção legítima e não apenas perguntas
respondíveis. Avaliação do total usa recibo integral verificado e não presença de 492 IDs no prompt.

### RQ-7605 — Comparação justa

Mesmos casos, documentos, implementação e budgets nos dois braços; ordem alternada e memória
igual. Uma geração e reparo existente, sem escalada por erro, sem substituir resultado concluído.
Incluir custo/tempo de falhas e reparos; custo equivalente CLI não é fatura/franquia. Auditar
cada resposta por hash, separar aprovação técnica de revisão especializada e não generalizar
um teste pequeno. Produzir formulário de revisão especializada sem preenchê-lo como humano.
Gravação do progresso é serializada e falha transitória desse snapshot não descarta resultados
imutáveis. Cada envio tem marcador durável e recibo de processo; resultado salvo pode ser
reutilizado com mesma entrada/modelo/manifest sem nova chamada. Envio incerto nunca vira zero
nem é reenviado automaticamente. Rodadas interrompidas ficam separadas da comparação final.

### RQ-7606 — Variação documental e digitalização

Adicionar material sintético narrativo e tabelas continuadas, notas/anexos e exceções afastadas.
Gerar digitalização sem camada textual e testar extração sem OCR como revisão necessária.
Se houver OCR real autorizado local, medir transcrição/campos e consultas separadamente;
transcrição programada em mock não conta como qualidade real. Conservar originais e renderizar
amostras para QA, sem inventar texto ilegível.

### RQ-7607 — Conflito explícito entre registro e nota

Continuação solicitada em 24/11/2026, alinhada ao briefing §§4, 7 (Bloco 7), 8–10 e 12–13:
corrigir as falhas DENSE-017/027/031 sem alterar a visão, a personalidade ou as fontes de
verdade. O gate competitivo mantém o chat e os blocos autorizados, melhora evidência e
utilidade com regras locais pequenas, e é validado por regressões e pela mesma comparação.

Um registro tabular e uma nota que declarem valor divergente não conciliado para o mesmo
ID, condomínio, documento e versão, em dois trechos elegíveis distintos, devem acionar a
tarefa de conflito. Exigir ID completo, valores monetários literais distintos e vínculo
explícito; palavra solta, nota de outro registro/tenant/versão, ausência de uma fonte,
valores iguais, instrução hostil ou conflito já conciliado não autorizam essa detecção.

O contrato interno da geração e do reparo identifica os trechos efetivamente conflitantes,
inclusive dentro da mesma versão. A resposta deve mostrar o registro, ambos os valores,
as duas fontes e a pendência, sem escolher valor correto, presumir aprovação/aceite ou
acusar fraude. Fonte ausente/contradição omitida continua recusada. O modo conflict não
é liberado genericamente para qualquer pergunta e revisão humana de alto risco permanece.

A cobertura do tópico financeiro aceita a associação verificável registro/valores/nota
citada em lugar de exigir uma palavra específica, sem dispensar tópicos diferentes ou
aprovar enumeração de números sem fontes. Repetir os três casos e a matriz original de
60 por braço, preservando corpus/oracle/rodadas anteriores, budgets e recibos completos.

## 8. Contratos

Callbacks internos de leitura autorizada nunca vêm do corpo HTTP. Prova calculada tem identidade
de conteúdo e filtro e é validada no processo; um JSON igual não concede autoridade. Persistência
usa metadados privados existentes, sem migration. Mudança de fontes invalida a prova. Nenhum
fato do cálculo pode ser reutilizado como memória sem nova conferência documental.

## 9. Requisitos não funcionais

Isolamento antes de busca/leitura/cálculo; zero dado real; nenhum novo pacote/serviço; limites
500 páginas/25 MB e dois milhões de caracteres. Testes de falhas/mutações e cobertura global
>=80% em statements, branches, functions e lines. Integrações guardadas não são executadas
implicitamente. Resultados locais não autorizam merge/deploy.

## 10. Critérios de sucesso

DENSE-005 recupera a linha correta e DENSE-032 confere todos os registros necessários com
total reproduzível. Nenhuma regressão P0; casos novos e comparação concluídos com falhas
visíveis e auditoria técnica. Evidência distingue parsing, recuperação, cálculo e geração.
Na continuação, os três conflitos devem ser entregues com valores, fontes, pendências e
limites corretos nos dois braços; abstenção genérica ou fallback incompleto não contam como aprovação.

## 11. Questões em aberto

Especialista humano, variabilidade estatística ampla e suporte a formatos não reconhecidos
continuam limitados pela evidência disponível, sem impedir os testes autorizados.

## Gate para mudar o status

Aceitação, rastreabilidade, testes/evals, cobertura, revisão do delta e relatório coerente,
com todos os bloqueios/falhas de qualidade explicitados e sem aprovação humana presumida.
