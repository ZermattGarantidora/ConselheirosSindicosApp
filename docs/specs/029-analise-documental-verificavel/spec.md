# Spec 029 — Análise documental verificável

**Status:** implementação sintética integrada; revisão especializada pendente
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-19

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§2 e 4 | Reduz a releitura e a comparação manual de documentos, começando por dois balancetes mensais. |
| Proposta de valor e conversa | §§5 e 6 | Produz explicação proporcional, com fontes e próximo passo, dentro da conversa. |
| Prioridade autorizada | §7, Bloco 7 | Detalha o raio-X e a comparação de balancetes expressamente autorizados. |
| Memória e evidência | §§8 e 9 | Mantém documento, versão, página, trecho e offsets junto de cada número e conclusão. |
| Segurança e validação | §§10, 12 e 13 | Isola por condomínio, recusa base insuficiente e mede correção, citações e abstenções. |

### Limites respeitados

- Esta primeira fatia compara apenas dois períodos financeiros explícitos e rubricas extraídas com fonte verificável.
- Não executa conciliação sem extrato, auditoria profissional, acusação de fraude, operação bancária, aprovação de contas ou ação externa.
- Atas, convenções e contratos recebem critérios de recuperação e avaliação nesta spec, mas sua análise especializada fica para fatiamento posterior após o contrato estruturado documental.
- Não cria painel, módulo paralelo ou contabilidade completa; a explicação é destinada ao chat.

### Divergências da visão

Nenhuma. O usuário autorizou a execução paralela do Bloco 7 e esta fatia preserva seu escopo.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que o síndico compare dois balancetes mensais autorizados e receba variações reproduzíveis por rubrica, sem separar nenhum valor de sua fonte verificável.

## 2. Promessa testada

> Quando dois balancetes equivalentes estiverem disponíveis, a Alvitra mostra o que variou, de onde veio cada número e o que ainda não pode concluir.

## 3. Usuário primário

Síndico profissional independente ou síndico morador que precisa conferir a evolução mensal sem receber uma conclusão contábil não sustentada.

## 4. Escopo

- Selecionar valores financeiros somente do `condominium_id` autorizado e dos dois meses pedidos.
- Comparar rubricas com normalização explícita, moeda igual, valores em centavos e fontes completas.
- Calcular diferença absoluta e percentual determinísticos; denominador zero resulta em percentual indisponível, nunca em infinito ou inferência.
- Exibir ausência, duplicidade ou incerteza de extração como limitação que exige complemento ou revisão humana.
- Preparar uma bateria sintética de pelo menos 100 casos, separando regra determinística de julgamento semântico.

## 5. Fora do escopo

- Extração de tabela/PDF, reconhecimento de rubrica e reconciliação automática: pertencem ao contrato documental em desenvolvimento paralelo.
- Declarações de fraude, irregularidade, adequação contábil, saldo bancário conciliado ou recomendação profissional definitiva.
- Uso de dados reais, provedor externo adicional, nova dependência ou modificação de schema.

## 6. Pré-condições

- O servidor resolveu o contexto autorizado e ele contém `document:read`.
- Cada valor estruturado preserva condomínio, documento, versão, página, trecho, offsets, método, incerteza, moeda, rubrica original e período financeiro.
- A adaptação do contrato público de extração será feita apenas na camada de análise, depois de publicado pelo time documental.

## 7. Requisitos funcionais

### RQ-2901 — Comparação financeira com prova

Cada valor usado em cálculo carrega fonte verificável. A comparação retorna as duas fontes, diferença absoluta em centavos e percentual apenas para denominador diferente de zero.

Diferenças monetárias permanecem em `bigint`. O percentual é calculado por divisão inteira,
truncado em duas casas decimais (em direção a zero), de forma explícita e reproduzível.
Se o inteiro escalado do percentual não couber em um inteiro seguro de JavaScript, o percentual
fica indisponível com motivo `precision_limit`; a diferença monetária exata é preservada.
Não se pede a um modelo para estimar, corrigir ou completar o cálculo.

### RQ-2902 — Comparabilidade prudente

Apenas mesma rubrica normalizada, mesma moeda, mesmo condomínio e os dois meses selecionados são comparáveis. Falta, duplicidade ou incerteza não é completada por inferência.

### RQ-2903 — Recuperação orientada à tarefa

A recuperação de valores financeiros recebe `condominium_id`, meses e rubricas quando conhecidas; filtra antes de devolver candidatos. Ela não substitui a busca textual geral nem torna uma rubrica inferida uma evidência.

### RQ-2904 — Sustentação de afirmações

Conclusão de análise deve apontar a todos os valores que a sustentam. Sem fonte, a resposta declara a limitação e solicita apenas o documento, página ou período faltante. Saldos e totais só são apresentados se forem rubricas extraídas ou cálculos cujas parcelas estejam citadas.

### RQ-2905 — Sequência documental posterior

Para atas: recuperar decisão, data, quórum quando declarado, página e versão; conflito de decisões deve permanecer visível. Para convenções: recuperar regra, versão, vigência conhecida e conflito com documentos internos sem concluir validade jurídica. Para contratos: recuperar parte, objeto, prazo, reajuste, rescisão e versão; nunca concluir execução, inadimplemento ou saldo sem evidência específica.

## 8. Contratos

`FinancialAmount` contém valor em centavos, moeda BRL, período `AAAA-MM`, rubrica original e normalizada e `FinancialSource`. `FinancialSource` contém documento, versão, página, trecho, offsets, método e incerteza. `compareFinancialPeriods` recebe contexto autorizado e dois períodos, devolvendo por rubrica o estado, os dois valores, fontes, diferença e percentual/limitação.

## 9. Requisitos não funcionais

- Cálculo usa inteiros em centavos; não há arredondamento monetário implícito.
- Seleção e comparação são determinísticas e não fazem chamadas de modelo ou rede.
- O código rejeita ausência de permissão, período inválido, fonte incompleta e valor duplicado para a mesma rubrica e período.
- Dados de testes e evals são inteiramente sintéticos.

## 10. Critérios de sucesso

- 100% dos casos P0 de isolamento, fonte ausente, denominador zero, duplicidade e incerteza passam.
- Toda variação calculada no conjunto determinístico possui duas fontes verificáveis.
- O conjunto de 100+ casos distintos cobre balancetes, atas, convenções e contratos, riscos e abstenções; revisão de especialistas permanece pendente e explícita.
- A fatia melhora as métricas do briefing §13: respostas fundamentadas, citações sustentadoras, abstenções corretas e nenhuma mistura de condomínio.

## 11. Questões em aberto

- A taxonomia aprovada de rubricas e o mapeamento de sinônimos dependem do contrato estruturado documental e de revisão contábil humana.
- O comando canônico `evals:documentary` está registrado em package.json, README, AGENTS e CI. A integração ao turno é detalhada pela Spec 032, sem alteração do prompt aprovado.

## Gate para mudar o status

Esta spec não pode sair de `rascunho para revisão` enquanto a integração com o contrato documental, revisão especializada dos casos e os gates globais pendentes não forem concluídos.
