# Spec 046 — Correções de evidências, recuperação e continuidade

**Status:** implementada e validada tecnicamente; revisão especializada pendente, sem autorização de rollout  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz procura repetida e perda de contexto na consulta documental. |
| Público | §3 | Atende síndicos moradores e profissionais nos chats autorizados. |
| Proposta de valor | §§5 e 6 | Usa documentos disponíveis e pede somente contexto que falta. |
| Prioridades do MVP | §7, Blocos 2, 3, 6 e 7 | Corrige o núcleo já autorizado, sem nova interface ou módulo. |
| Segurança e confiança | §§8–10 | Preserva fonte literal, tenant, abstenção, conflito e revisão humana. |
| Validação e métricas | §§12–14 | Compara utilidade, citações, abstenção e consumo com baseline congelada. |

### Limites respeitados

- Sem expansão da visão, provedor, pacote, ferramenta externa ou dados reais.
- Sem resumos ou memória entre chats; implementa os limites aprovados da Spec 043/ADR 0032.
- Não confirma vigência de minuta, aprovação, assinatura ou regra legal por inferência.
- Sem commit, push, merge ou publicação. Revisão especializada permanece separada da IA.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Responder com a base relevante disponível, conservar divergências e continuar a tarefa no mesmo chat, sem transformar saída inválida em afirmação confirmada.

## 2. Promessa testada

> A Alvitra encontra a informação autorizada, distingue pendência de ausência e explica precisamente quando não consegue validar a resposta.

## 3. Usuário primário

Síndico no chat de um condomínio autorizado.

## 4. Escopo

Correções minimizadas da rodada 240/260 da Spec 041, integração da memória da Spec 043 e nova rodada real autorizada com gabaritos imutáveis.

## 5. Fora do escopo

Calibração de risco e processo Codex pertencem à Spec 047. Sem acesso indiscriminado a documentos, memória global, resumo, novo fornecedor, ação externa ou certificação especializada.

## 6. Pré-condições

Specs 001, 026, 035, 039, 041–043; ADRs 0002, 0003, 0028, 0029, 0031 e 0032. Baseline `reports/conversations-2026-10-27-codex-r1.json` preservada. Identificador 046 verificado livre em 27/10/2026. Prompt novo somente após apresentação/aprovação; texto de memória já aprovado mantém seu escopo.

## 7. Requisitos funcionais

### RQ-4601 — Contrato e diagnóstico

Explicitar os tipos existentes: fato local exige fonte local; interpretação documental ou regra legal exige citação; recomendação geral pode dispensá-la. Não reclassificar automaticamente uma saída inválida. Recusar IDs desconhecidos, metadados/offsets divergentes, claims sem suporte, modo incompatível e conteúdo protegido. Persistir códigos fechados de reprovação e telemetria de cada invocação, sem texto bruto ou segredos. Uma tentativa documental reprovada pode receber uma única correção com as mesmas fontes e código minimizado; não repetir conteúdo protegido.

### RQ-4602 — Disponibilidade e conflito preservados

Correção de 04/11/2026 para `mode_citation_mismatch`: o reparo explica a relação entre
modo, citações e claims. Grounded exige fonte; conflict exige as fontes divergentes;
abstained não carrega citações nem claims documentais. Orientação geral útil pode usar o
modo interno abstained sem uma recusa na fala. O contrato de reparo existe mesmo sem
histórico: o contexto vazio não inventa turnos e permanece no orçamento de 12.000 bytes.
Não normalizar silenciosamente a saída inválida nem acrescentar uma terceira geração.

Se as duas tentativas falharem, explicar de forma breve que não foi possível concluir a
resposta com os documentos disponíveis. Códigos e etapas de validação ficam na auditoria;
não expor jargão interno, três avisos repetidos ou um pedido de reenvio. Conflitos continuam
visíveis com as fontes. A mudança atende briefing §§1, 6, 9, 10 e 13 e o gate competitivo:
melhora a conversa e o reparo do núcleo autorizado, sem nova interface, fonte, provedor ou
permissão e sem enfraquecer os validadores. Regressões do reparo e da falha terminal
comprovam o limite de duas gerações e a preservação do diagnóstico.

Falha de validação significa resposta não validada, nunca documento inexistente. Se a correção falhar, abster-se com limite preciso. Conflito detectado pelo servidor exige modo conflict e citações das fontes detectadas, inclusive na degradação local literal. Versão privada pending/disputed legível e relevante pode ser mostrada como evidência de pendência, separada da base confirmada, nunca promovida a regra vigente. Fonte legal vencida continua inelegível. Minuta não substitui versão aprovada.

Correção local de 29/10/2026: recusar negação genérica de recebimento/acesso a documentos
quando há fontes locais recuperadas e negação de acesso aos balancetes quando a quantidade
mencionada está efetivamente representada por documentos distintos nas evidências. Contar
documentos, sem confundir páginas ou versões com novos arquivos. Não bloquear lacuna de
período, extrato, informação, legibilidade ou quantidade ainda não recuperada. A guarda é
limitada às contradições explícitas; não certifica suficiência semântica nem promove abstenção
a resposta fundamentada. Usar o reparo único existente com as mesmas fontes e, se falhar,
preservar a explicação de resposta não validada, sem pedir o mesmo arquivo novamente.

Esta correção atende briefing §§4–6, 7 (Blocos 6 e 7), 8–10 e 13: documentos autorizados
devem apoiar consultas posteriores e só o material realmente faltante deve ser solicitado.
O gate competitivo mantém o chat e o sequenciamento autorizado, testa o acesso documental
verificável com cinco arquivos sintéticos e controles negativos, e reutiliza a validação
existente sem prompt, dependência, serviço, janela ou número de tentativas novos.

### RQ-4603 — Recuperação relevante e limitada

Aplicar autorização antes do score. Expandir intervalos inclusivos de meses, preservar entidades curtas com hífen e usar sinônimos documentais limitados. Diversificar versões/documentos relevantes dentro do orçamento existente de oito trechos; não encaminhar todo o corpus. Consultas compostas conservam cobertura dos documentos e períodos pedidos.

Correção de 04/11/2026: mencionar total e unidades em uma pergunta sobre rateio, emissão,
reserva, inadimplência ou recebimentos não transforma a pergunta em consulta ao cadastro.
Somente nome e quantidade cadastrados sem assunto documental podem dispensar busca.
Títulos com sublinhados preservam a identificação do tipo documental. Nos balancetes,
priorizar as notas/rubricas pedidas e a declaração de moeda da mesma versão dentro dos oito
trechos, antes de preencher o orçamento com páginas tangenciais. Não tratar falta de trecho
selecionado como inexistência do documento; manter tenant, qualidade, vigência e estados.

Detalha briefing §§4–6, 7 (Blocos 5–7), 8–10 e 13 e o gate competitivo: consulta útil no chat,
sem pedir de novo informação já disponível. Reutiliza classificação e busca locais, sem
novo prompt, serviço, provedor ou aumento de limites; regressões HTTP e controles de isolamento
demonstram o comportamento. Não antecipa outro bloco nem certifica aprovação contábil.

### RQ-4604 — Triagem literal e causas distintas

Em chunk hostil misto, selecionar uma fatia declarativa segura por relevância à pergunta, mantendo texto e offsets em code points. Nunca transmitir comando ou canário. Registrar separadamente ausência de candidato, ausência de trecho relevante, pendência de vigência e qualidade de extração. Só afirmar OCR ruim quando houver evidência de qualidade abaixo do piso ou processamento needs_review. Filtro de frases preserva números, separadores decimais/milhares e Markdown literal.

### RQ-4605 — Continuidade autorizada

Implementar RQ-4301–4306 sem ampliar seus limites. Histórico explícito do mesmo usuário/condomínio/chat, até oito interações e 12.000 bytes; perguntas como relatos e respostas somente com procedência segura. Nova recuperação para fatos, sem replay documental. Revalidar permissões e chat; concorrência, idempotência e falha explícitas. Nenhuma chamada adicional para resumir.

### RQ-4606 — Regressão e comparação

Cada causa tem regressão determinística. Rodada nova usa arquivos/ID próprios, versão e fingerprints congelados e mesmo modelo/provedor autorizado. Preservar baseline, dataset e gabaritos. Comparar observações por cenário e contadores, separando revisão técnica por IA de revisão especializada pendente.

## 8. Contratos

Contrato público de resposta preservado. Contexto interno acrescenta memória não privilegiada, motivo de correção fechado e estado documental. Recuperação distingue evidência confirmada de pendências e diagnóstico minimizado. Citações continuam literais e verificáveis. Não adicionar schema SQL ou serviço.

## 9. Requisitos não funcionais

Zero acesso cruzado; nenhum literal protegido; máximo de uma correção documental; sem chamadas externas em CI. Cobertura >=80% em statements, branches, functions e lines. Logs sem conteúdo documental. Limitações reais de integração devem ser registradas.

## 10. Critérios de sucesso

Regressões financial-08, collections-06, handover-10, crosscutting-07/29/30, legislation-01/04, conventions-09/10/15, contracts-05/15, coexistence-13 e crosscutting-16 exercitam o caminho real. Oito falsos alertas de OCR desaparecem sem ocultar baixa qualidade real. Nenhuma abstenção inválida se torna resposta fundamentada por simples relaxamento do validador.

## 11. Questões em aberto

Os 80 motivos históricos individuais não foram preservados e não podem ser reconstruídos com certeza; diagnósticos novos não reescrevem essa limitação. A rodada r7 terminou com 229 cenários satisfatórios, dez parciais e um com falha de atendimento na revisão técnica por IA. Nenhum resultado é certificação especializada; as lacunas e regressões observadas estão em observed-results-2026-10-27.md. A comparação usa o snapshot v24, sem certificar alterações simultâneas posteriores ou as conversas longas.

## Gate competitivo

Mantém chat e blocos autorizados; melhora evidência, segurança e utilidade; diferencia pela recuperação verificável e continuidade isolada; comprova por regressões e comparação; reutiliza infraestrutura, sem complexidade de resumos ou serviços.

## Gate para mudar o status

Gate de visão, rastreabilidade, testes/evals, cobertura, revisão integral do diff e resultados documentados. Nenhuma implantação autorizada por esta spec.
