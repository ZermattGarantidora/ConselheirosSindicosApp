# Investigação dos fallbacks e regressões

## Baseline preservada

Os três arquivos de 27/10/2026 permanecem imutáveis. O bruto registra exatamente 80 turnos
com evidência na primeira invocação e nenhuma evidência na última: 57 tarefas grounded_answer,
21 specialist_review e duas document_conflict. Dois turnos tinham somente fontes legais;
78 tinham fonte local. Nenhum dos 80 preservou a saída intermediária ou o motivo de validação.
Portanto, não é possível atribuir retrospectivamente cada fallback a uma causa específica.

## Causas minimizadas reproduzidas

| Condição | Código e tratamento | Regressão |
|---|---|---|
| Fato local sustentado só por lei | claim_local_source_required; continua proibido. Correção pode gerar interpretação citada com a mesma fonte. | answer-evidence-recovery.test.ts, legislation-01/04 |
| Schema permitia texto livre no tipo de especialista, rejeitado pelo validador | Diagnóstico real separado reproduziu specialistTypeAllowed=false; schema passa a exigir a lista existente e a auditoria distingue specialist_type_invalid. | answer-evidence-recovery.test.ts e diagnóstico r3 |
| Orientação geral classificada como interpretação sem citação | claim_evidence_required/claim_citation_missing; contrato explica recommendation sem fato documental. | citation-validator.test.ts e prompt aprovado |
| Saída abstained para tarefa de conflito | mode_incompatible; uma correção e, se necessário, indicação local com fontes verificadas. | conventions-09/coexistence-13 |
| IDs, metadados, trechos ou offsets não correspondem à recuperação | Códigos fechados distintos; não descartar IDs desconhecidos para aceitar o restante. | citation-validator.test.ts, answer-evidence-recovery.test.ts |
| Versão disputed era eliminada antes da geração | Recuperar somente pendência privada relevante e legível; exige interpretação citada e não confirma regra vigente. | conventions-10/15, contracts-05/15, crosscutting-16 |
| Intervalo e entidade curta perdiam informação | Expansão inclusiva de meses e entidade com hífen; diversidade limitada a oito trechos. | financial-08, collections-06, crosscutting-29 |
| Triagem escolhia frase pelo comprimento | Escolha por relevância, fatia literal e offsets; comando/canário continuam bloqueados. | crosscutting-07 |
| candidateCount positivo era tratado como OCR incerto | Diagnóstico explícito de qualidade; ausência de relevância ou vigência não basta. | evidence-recovery-regressions.test.ts |
| Busca/gateway só recebiam pergunta atual | Janela recente autorizada, relatos separados, sem replay documental e com nova busca. | crosscutting-30, testes de memória |

Cada invocação concluída conserva telemetria; chamadas que falham sem telemetria recebem registro
de política com código seguro e consumo desconhecido, sem inventar tokens ou copiar erros livres.
Tentativas invalidadas deixam o código na auditoria e no replay novo; a baseline não foi reescrita.

## Defeitos encontrados na própria integração

O teste real Neon demonstrou que lock por sessão não funciona sobre pool transacional: duas
conexões receberam aquisição reentrante. A correção exige pool dedicado de sessão, preserva o
mesmo banco e encerra a transação curta de identidade antes do lock. Os 12 testes de integração
passaram depois da correção, incluindo a permanência do bloqueio de condomínio não confirmado.

A tentativa r2 executou três chamadas, mas devolveu 409 em 253 turnos: a guarda RAM era global
entre armazenamentos isolados do harness. Ela foi vinculada ao adaptador de persistência, com
regressão concorrente entre dois armazenamentos com os mesmos IDs. A tentativa fica preservada
como falha de engenharia, sem comparação semântica nem reuso de respostas na rodada r3.

Enquanto a suíte principal recebe 40 cenários longos em outro chat, r3 usa a cópia congelada
dos mesmos 240 casos originais, com aplicação explícita dos três arquivos da correção da guarda.
O manifesto enumera hashes, origem e patches. Nenhum resultado r1/r2 é reutilizado como resposta.

A rodada r3 foi interrompida após 115 cenários concluídos para corrigir a inconsistência do tipo
de especialista demonstrada por uma repetição diagnóstica independente. Seus checkpoints
permanecem preservados, sem representar rodada completa nem substituir a baseline. A rodada
r4 executou somente uma amostra diagnóstica; ela encontrou ausência do art. 1.351 na busca
lexical por “alterar”. A expansão limitada de alteração/mudança/aprovação corrigiu essa
recuperação, sem mudar a biblioteca legal ou o gabarito.

A rodada completa r5 executou novamente 240 cenários/260 turnos, sem falhas mecânicas. Sua
inspeção revelou seleção de cláusula introdutória em vez do assunto perguntado, ausência de
“anexei” na heurística de continuação e falta do campo comparável da versão contratual
confirmada. A amostra r6 reproduziu esses limites; as regressões finais forçam duas saídas
inválidas para conferir também a degradação literal segura.

A rodada r7 usa novo manifesto e executa os 240 cenários originais desde o início. Sua amostra
separada de cinco cenários/sete turnos não é reutilizada na execução completa. O fallback local
conserva cláusulas literais relevantes, preço e vigência quando recuperados; a busca pode incluir
um campo complementar da mesma versão contratual confirmada dentro dos oito trechos, repetindo
filtros de tenant, qualidade, processamento e vigência. Todas as tentativas intermediárias
permanecem separadas. Resultados e limites da comparação final são registrados em
`observed-results-2026-10-27.md`.
