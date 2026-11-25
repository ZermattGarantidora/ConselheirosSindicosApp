# Spec 077 — Estresse documental e conflitos inéditos

**Status:** instrumentação/cache e repetição r4 validados localmente em 24/11/2026; r3 reprovada preservada, candidato opt-in e revisão humana/independente pendentes  
**Responsável:** engenharia e qualidade da Alvitra  
**Atualizado em:** 2026-11-24

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede leitura e cruzamento de documentos difíceis antes de ampliar afirmações de qualidade. |
| Público | §3 | Simula decisões documentais de síndicos com números, estados e prazos semelhantes. |
| Proposta de valor | §§5 e 6 | Exige conclusão útil ou limitação específica, com fonte verificável no chat. |
| Prioridades do MVP | §7, Blocos 6/7; §12 | Reutiliza ingestão, vetorização, recuperação e consulta atuais em PDFs mais densos. |
| Segurança e confiança | §§8–10 | Testa isolamento, instruções hostis, abstenção, conflitos e validação humana. |
| Validação e métricas | §13 | Compara custo por resposta aprovada, qualidade e tempo incluindo falhas/reparos. |

### Limites respeitados

Somente sintéticos locais, sem dados pessoais, treinamento de pesos, novas telas, serviços,
dependências, parecer profissional, operações externas, banco remoto ou deploy. Modelos e
roteamento existentes permanecem. Esta fatia mede a implementação atual; não corrige os
conflitos novos durante a rodada para melhorar seu resultado. A continuação explicitamente
solicitada depois da baseline corrige a validação antes de congelar uma nova rodada separada.

### Divergências da visão

Nenhuma. Solicitação explícita de 24/11/2026. Gate competitivo: mantém chat e Blocos 6/7,
mede memória documental autorizada além da simples anexação, preserva citações e abstenção,
usa leitores e CLI existentes e acrescenta somente fixtures/harness de avaliação reversíveis.
Não antecipa módulos posteriores nem seleciona modelo de produção automaticamente.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa a hipótese de memória documental verificável.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e exclusões foram respeitadas.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Os critérios contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Medir onde a Alvitra atual funciona ou falha em documentos mais densos e contradições novas,
comparando Sol fixo e híbrido sem alterar a implementação entre os braços.

## 2. Promessa testada

> Distingue valor, unidade, período, estado e vigência, mostra conflitos e reconhece o que falta.

## 3. Usuário primário

Síndico conferindo pagamentos, decisões, regras, contratos e registros técnicos extensos.

## 4. Escopo

Sete PDFs de 50 páginas, 72 registros por página: 350 páginas e 25.200 registros distratores,
além de notas e anexos próprios. Quarenta perguntas novas: conflitos reais, diferenças que
não são contradições, precisão e ausência de prova. Mesmos casos e corpus nos dois braços.
Gabarito e rubrica fixados antes da inferência. Revisão factual por resposta/hash e formulário
humano separado. Comparação inclui também falhas, abstenção incompleta, reparos e consumo incerto.

## 5. Fora do escopo

OCR novo, documentos reais, produção, alteração de personalidade/prompt/roteamento ou recuperação,
correção de defeitos descobertos no meio da medição, síntese do corpus inteiro pelo modelo,
certificação especializada ou conclusão estatística universal.

A correção autorizada após a baseline limita-se à validação/contrato interno de conflitos,
sem mudar o oracle, corpus, personalidade, roteamento, budgets ou limite de reparos.

## 6. Pré-condições

Specs 074–076 e ADRs 0003/0031/0038/0048; CLI local autorizado com ferramentas/web desativados,
sem fallback pago; bibliotecas locais de PDF existentes; preservação das rodadas anteriores.

## 7. Requisitos funcionais

### RQ-7701 — Densidade e diversidade comprovadas

Gerar originais e ledger independentes do parser/modelo. Mais registros por página e mais
páginas que a Spec 076, com IDs vizinhos, valores, unidades, períodos, estados e referências.
Inspecionar renderização e conferir todas as páginas extraídas contra o texto de origem.
Ressalvas ficam em páginas distantes e em documentos diferentes, sem entregá-las pelo oracle.

### RQ-7702 — Conflitos e controles novos

Cobrir divergência monetária em linguagem diferente da regra 076, três versões/valores,
retificação não comprovada, competência/emissão, bruto/líquido, moeda/unidade, pagamento
parcial/estorno, proposta/deliberação, execução/aceite, data de vigência e exceção de escopo.
Controles sem conflito e perguntas sem prova impedem aprovação por repetir “há conflito”.
Incluir instrução hostil e canário estrangeiro; nunca seguir instrução documental.

### RQ-7703 — Comparação e durabilidade

Sol 6.1 low fixo versus híbrido Luna high/Sol low, mesma recuperação e budgets, memória
desligada, dois workers e ordem alternada. Snapshot/corpus/oracle/rubrica por hash, marcadores
antes do envio e recibos após a chamada. Reutilizar utilitários duráveis existentes; resultado
concluído não é substituído e envio incerto não é reenviado nem precificado como zero.

### RQ-7704 — Qualidade separada por etapa

Separar extração, recuperação, geração bruta, validação e resposta HTTP. Palavras presentes
não bastam: revisão deve verificar associação, fatos, completude, suporte, limites e risco.
Conflito reconhecido de modo genérico sem os fatos relevantes não vale como resposta completa.
Abstenção correta sobre prova ausente não equivale a falha; abstenção excessiva é incompletude.
Registrar resultado automático original, revisão técnica por IA e aprovação humana pendente.

### RQ-7705 — Custo, latência e conclusão honesta

Conservar usage/modelo de toda tentativa e conferir eventos brutos. Comparar os mesmos pares
com recibos completos, mantendo falhas no denominador e custo por aprovação. Publicar totais,
média/mediana/P95 de tempo, reparos e destinos efetivos. Usar tarifa histórica de 30/10/2026
como equivalência, sem chamá-la de fatura/franquia ou preço atual. OCR não é medido nesta fatia.
Registrar falhas novas e próximos passos sem reescrever gabaritos ou rodadas anteriores.

### RQ-7706 — Conflito fundamentado independente da classificação inicial

Continuação alinhada ao briefing §§4, 7 (Bloco 7), 8–10 e 12–13: uma tarefa documental ou
de revisão especializada pode entregar `conflict` sem mudar o modelo selecionado, quando
os trechos autorizados já sustentam essa interpretação. O gate competitivo mantém chat,
escopo, isolamento e abstenção e mede a melhoria nos mesmos 40 casos congelados.

Exigir o mesmo ID completo da pergunta em dois trechos elegíveis distintos do mesmo tenant,
valores literais diferentes do mesmo campo comparável e indicação documental de divergência
ou falta de conciliação/precedência, incluindo ressalva referida com contagens incompatíveis.
Campos suportados: moeda, capacidade, duração, horário, competência, votos, pressão e estado
do pagamento. Referência tangencial a outro registro não estabelece o vínculo.
Mesma evidência duplicada, fonte ausente/estrangeira/pendente/hostil, valores iguais, campos
complementares ou exceção/vigência resolvida não autorizam o modo por si só.

O contrato inicial e de reparo anuncia a possibilidade condicional, sem declarar que todo
par é conflitante. Na resposta, exigir fonte/trecho válido para cada lado, valores no corpo,
vínculo ao ID e pendência, sem eleger vencedor nem afirmar conciliação inexistente. O ID
pode estar implícito na fala de resposta a um único registro inequívoco; continua obrigatório
na origem. A citação pode selecionar só a frase de valor, desde que sua posição esteja no
trecho do registro, sem emprestar número de vizinho. Citações, claims,
vigência, fidelidade monetária, cobertura e revisão humana continuam validadas. Conflitos
determinísticos já reconhecidos mantêm suas regras obrigatórias; não reescrever o modo nem
o texto do modelo, ampliar fontes ou acrescentar chamadas para classificar.

Reaplicar as saídas antigas como diagnóstico sem inferência e executar novamente os 40 casos
nos dois braços, conservando todos os resultados e a baseline 34/40 versus 36/40. Não codificar
IDs, valores ou respostas do benchmark na implementação. Novas falhas permanecem visíveis.

### RQ-7707 — Instrumentação sem conteúdo e sem interferência

Continuação explicitamente autorizada após a baseline corrigida, alinhada ao briefing §§2,
7 (Blocos 6/7), 8–10 e 12–13. Separar recuperação, geração, validação, persistência e duração
do caso de uso; no gateway Codex, preparação, processo, parsing e limpeza. No subprocesso,
medir spawn, primeiro byte, início de turno e primeiro evento de resposta quando observáveis.
Evento de resposta completo não é tempo até o primeiro token. Etapa não observada é `null`,
nunca zero presumido. A latência HTTP do harness continua disponível e inclui suas verificações.

Usar relógio monotônico e callbacks internos protegidos; observador com erro não altera saída,
retry, validação, timeout ou limpeza. Somente durações, contadores, hashes de layout genérico
e enums controlados; não registrar pergunta, documento, resposta, IDs privados ou stderr nos
diagnósticos. Eventos do domínio têm escopo de condomínio autorizado. Sem schema HTTP/SQL novo.

### RQ-7708 — Layout documental estável para cache automático do Codex

O schema com IDs privados variáveis dificulta prefixos idênticos. Oferecer layout reversível
com referências curtas por posição da evidência, criadas e descartadas em cada chamada.
Aplicar a tradução somente a referências estruturadas confiáveis, sem editar pergunta, texto
de documento, histórico livre, personalidade, metadados de origem ou valores. Reverter as
referências antes da reconstrução/validação de citações e claims; fonte desconhecida continua
recusada. Preservar o conjunto exato de restrições, inclusive ausência de claims factuais
quando há versão pendente. Nenhum mapa, resposta ou conteúdo documental é compartilhado.

Construtores diretos conservam o layout anterior por compatibilidade; a fábrica local pode
usar `CODEX_ANSWER_REFERENCE_FORMAT=compact-v1`, com reversão `original`. Até o gate de
qualidade passar, tratar o layout compacto como candidato opt-in. Não mudar personalidade,
modelo/esforço, busca, budgets, fontes ou quantidade de tentativas. Não introduzir controles
de cache da API no CLI, prewarming pago, sessão persistente ou cache de respostas/retrieval.
O cache automático pode reaproveitar prefixos; ganho só existe quando confirmado por usage.

No candidato compacto, usar um diretório de contexto genérico, estável, vazio e verificado,
sem arquivo de condomínio ou estado de conversa. Isso evita introduzir caminho aleatório no
contexto do CLI, hipótese adicional de perda de prefixo. O schema continua em temporário
privado diferente por geração, apagado após encerramento; sessões continuam efêmeras.
Diretório simbólico ou com conteúdo inesperado é recusado antes do envio. Não carregar repo,
instruções locais, histórico ou ferramentas. O caminho original mantém cwd privado por geração.

A primeira medição compacta (`stress-cache-r3`) reprovou: 38/40 Sol, 40/40 híbrido e
referências internas visíveis. Preservar essa rodada. Na continuação corretiva, o decoder
recusa alias interno no corpo quando ele não é um literal da pergunta/fontes; não apaga
trechos para aumentar a nota e usa somente o reparo existente. A entrega/journal deve
reconhecer a negativa explícita “não comprova aprovação” em uma interpretação já validada,
mantendo todas as verificações de usuário, tenant, documento, pendência, claims e hash.
Uma abstenção segura porém incompleta permanece reprovada quando omite a fonte exigida.
Congelar outra rodada separada, sem alterar oracle, refazer conclusão ou ocultar a reprovação.

### RQ-7709 — Repetição sem regressão e decisão explícita do candidato

Congelar a implementação e repetir os mesmos 40 casos nos dois braços contra a baseline
`2026-11-24-stress-conflicts-r2`, com mesmos PDFs/oracle/rubrica e recibos duráveis. Não refazer
uma resposta concluída para obter aprovação. Exigir 40/40 completos por braço, citações e
associações verificáveis, abstenções, isolamento, ressalvas e escalonamento preservados,
sem nova falha de segurança. Revisão técnica por hash permanece separada de aprovação humana.
O automático original é conservado; divergência lexical recebe justificativa por resposta.

Informar custo, média/mediana/P95, cache de tokens e etapas novas, separando hipótese causal
de observação local. Consumo desconhecido e falhas permanecem explícitos. Se houver regressão
de qualidade, o candidato não vira padrão; preservar instrumentação, reportar a reprovação
e manter o layout anterior. O comando existente `evals:dense-stress` é reutilizado; env/config
do layout precisa constar do manifest para impedir retomada incompatível.

## 8. Contratos

O harness passa pergunta e documentos preparados ao caminho real HTTP existente. Oracle,
rubrica, páginas esperadas e resposta ideal nunca entram no gateway. Fixtures usam somente
identidades sintéticas autorizadas. Recibos e respostas ficam privados no workspace.
Reutilizar extração/validação existentes. A continuação acrescenta somente metadado de
permissão condicional ao contrato interno, sem mudar schema HTTP ou persistência.

## 9. Requisitos não funcionais

Zero dado real, vazamento de tenant ou execução de instrução hostil. Nenhuma chamada de modelo
no plano/preparação/testes determinísticos. PDFs legíveis, sem corte/sobreposição, dentro dos
limites atuais. Gates de código, cobertura global >=80% nos quatro indicadores, alinhamento,
scanner e revisão do delta. Sem banco guardado ou ativação implícita.

## 10. Critérios de sucesso

Executar e auditar os 80 resultados, provar que a bateria é mais densa e inédita e produzir
comparação reproduzível e honesta. Uma nota de IA baixa é resultado válido do experimento,
não motivo para enfraquecer o gate ou ajustar a aplicação durante a rodada. Defeitos P0
impedem recomendação de liberação e ficam destacados; este ensaio não autoriza produção.

## 11. Questões em aberto

Validação especializada humana e variabilidade entre rodadas permanecem pendentes. Limites
do retriever e validação podem dominar o resultado; relatá-los separadamente do modelo.

## Gate para mudar o status

Aceitação e rastreabilidade completas; densidade/extração/QA comprovadas; comandos registrados;
gates aplicáveis executados; comparação real e auditoria concluídas, com falhas visíveis.
