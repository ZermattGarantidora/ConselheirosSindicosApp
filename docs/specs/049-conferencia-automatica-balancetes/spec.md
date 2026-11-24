# Spec 049 — Conferência automática de balancetes

**Status:** implementada e verificada localmente; aguardando validação da experiência e revisão especializada  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-29

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Assume a conferência mensal e a comparação que consomem tempo do síndico. |
| Público | §3 | Serve síndicos profissionais e moradores que recebem prestações de contas. |
| Proposta de valor | §§1, 5 e 6 | O envio já entrega achados e próximos passos no chat, sem novo pedido. |
| Prioridades do MVP | §7, Bloco 7 | Detalha análise, comparação histórica, qualidade e solicitação do material faltante. |
| Segurança e confiança | §§8–10 e 12 | Usa versões autorizadas, cálculos locais em centavos, fontes verificadas e abstenção. |
| Validação e métricas | §13 | Mede conferência útil, sustentação dos achados, pedidos específicos e isolamento. |

### Limites respeitados

- Conferência completa significa percorrer os dez pontos do método, explicitando os não verificáveis; não certifica contabilidade, auditoria ou aprovação de contas.
- Sem operação bancária, contato externo, cobrança, painel, nova dependência, persistência ou envio de conteúdo documental ao provedor.
- Não altera o system prompt aprovado nem antecipa outro bloco. A seleção e os cálculos são locais, conforme ADRs 0024 e 0033.
- Identificação conservadora: rótulos, períodos e vínculos inequívocos. Material ambíguo exige complemento, sem equivalência contábil inferida.

### Divergências da visão

Nenhuma. O usuário solicitou explicitamente em 2026-10-27 a conferência completa no recebimento, comparação com histórico disponível e indicação de problemas, documentos faltantes e próximos passos. Esta spec sucede o limite de versão única da Spec 045 exclusivamente para balancetes.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Ao terminar o processamento de um balancete autorizado, conferir fechamento/liquidez, inadimplência, orçamento, despesas extraordinárias, banco, reserva, suportes, histórico, compromissos e transparência, sem nova pergunta.

## 2. Promessa testada

> Envio o balancete e recebo o que foi conferido, o que mudou, o que preocupa e exatamente o que falta para decidir, com fontes abríveis.

## 3. Usuário primário

Síndico que recebe balancetes mensais e documentos de apoio do condomínio ativo.

## 4. Escopo

- Até três pontos prioritários, dez conferências com estados `ok`, `atenção` ou `não foi possível verificar`, documentos faltantes e próximos passos por ponto.
- Histórico anterior disponível, sem exigir datas digitadas. Meses futuros não entram na comparação; lacunas, duplicidades, versões concorrentes e bases declaradamente diferentes são visíveis.
- Apoios do mesmo período: orçamento mensal, extrato bancário e comprovantes com vínculo explícito ao lançamento e ao valor. Presença de um arquivo não comprova suporte de qualquer gasto.
- Reuso da extração existente; competência explícita no cabeçalho prevalece sobre datas de vencimento, sem escolher entre cabeçalhos conflitantes.

## 5. Fora do escopo

Reconhecimento universal de documentos, inferência de rubricas equivalentes, comparação anual/mensal implícita, certificação de conformidade, fraude ou adequação contábil, e ações externas.

## 6. Pré-condições

Permissão vigente de leitura; original recebido pronto e autorizado; catálogo e reader escopados por condomínio. Versões removidas, pendentes, em revisão ou substituídas não participam dos cálculos.

## 7. Requisitos funcionais

### RQ-4901 — Recebimento e conferência

O fluxo `status`/`confirmed` reconhece o balancete pelo conteúdo seguro e entrega os dez pontos automaticamente, mantendo resumos dos demais tipos restritos ao arquivo recebido. Falha de fala não impede relatório local. Prioridades ordenam divergências verificáveis antes de lacunas; resultados saudáveis também aparecem quando sustentados.

### RQ-4902 — Fechamento e cruzamentos

Saldo inicial + receitas − despesas é confrontado com saldo final usando inteiros em centavos e todas as parcelas citadas. Liquidez depende de saldo disponível e compromissos explicitamente documentados; saldo agregado não presume caixa livre. Orçamento e banco exigem período e escopo correspondentes. Reserva não presume finalidade, segregação ou autorização. Suportes exigem rubrica, valor e período vinculados e não certificam pagamento ou aprovação.

### RQ-4903 — Histórico automático

Complemento de 18/11 para caderno integral (Spec 073): um total de despesa pode ter vários
suportes explicitamente vinculados ao mesmo lançamento e competência. Conferir a soma em
centavos e citar todos os componentes; valor ausente, vínculo ambíguo ou identificador de
comprovante repetido impede considerar o conjunto completo. Não inferir pagamento ou aprovação.

Suporte parcial inequívoco informa valor já documentado e parcela pendente em centavos, com
citações dos comprovantes existentes e pedido específico do saldo. Duplicidade/ambiguidade não
autoriza essa soma; excesso não gera saldo negativo ou confirmação. Exemplo da Spec 073:
Manutenção de R$ 9.688,75, suporte parcial de R$ 9.382,80 e R$ 305,95 pendentes.

Comparar o recebido com cada mês anterior elegível, por rubrica equivalente explícita, preservando valores, diferença e percentual válido. Não escolhe entre dois balancetes do mesmo mês ou rubricas duplicadas. Não mistura caixa/competência nem planos declaradamente diferentes. Ausência de rubrica não é zero; base zero não gera percentual. Pedir meses específicos somente quando faltam; nunca pedir novamente mês já presente e utilizável. Não limitar silenciosamente a amostra.

Compromissos com data futura válida, sob cabeçalho que identifica explicitamente o mês dos compromissos, permanecem no relatório de origem e não participam da comparação de valores realizados. A data deve corresponder ao mês daquele cabeçalho, posterior à competência do balancete. Uma data isolada, cabeçalho ambíguo ou outro bloco de receitas/despesas não autoriza essa exclusão. O envio em lote mantém a mesma regra e não exige reenviar arquivos separadamente.

Declarações literais em frases completas, como `Regime de caixa.` e `Plano de contas JH-2026.`, são campos explícitos citáveis; não dependem exclusivamente de dois-pontos. Declarações concorrentes continuam impedindo a comparação. Totais com rótulos explícitos como `Saldo inicial consolidado`, `Receitas totais do mês`, `Despesas totais do mês` e `Saldo final consolidado informado` permitem conferir o fechamento sem inferir colunas ou caixa disponível. `Principal em aberto no fim` identifica somente o principal de inadimplência declarado, sem incorporar juros ou tratá-lo como dinheiro recebido.

### RQ-4904 — Evidências e abstenção

Todo achado factual e cálculo aponta para documento, versão, página e trecho literal; também cita o período que autoriza o cruzamento. Lacunas são descritas como limites do material consultado. Não infere fraude ou causa de variações. Valores incertos, sinais não suportados e tabelas ambíguas são recusados e geram pedido específico. Recomenda revisão humana para decisões financeiras relevantes.

### RQ-4905 — Segurança e concorrência

Filtrar catálogo por tenant e elegibilidade antes de ler páginas; validar identidade e fontes devolvidas. Conteúdo hostil não é executado nem ecoado. Revalidar associação e catálogo de todas as versões consideradas antes de publicar, incluindo remoção ou mudança dos apoios durante geração. Sem cache, logs documentais, schema ou nova chamada de modelo. Limites de 500 páginas/dois milhões de caracteres e falhas produzem limitação explícita, sem parcial apresentado como completo.

## 8. Contratos

`DocumentAnalysisReport` conserva linhas calculadas e fontes e acrescenta `financialReview` opcional com dez pontos e identificadores dos prioritários. Cada ponto tem estado, explicação, citações, documentos solicitados e próximos passos. O relatório acompanha a fala no chat; permanece transitório conforme ADR 0024.

A Spec 057 sucede a exibição integral inicial: três prioridades com síntese local, limites
agrupados e detalhe recolhido com os dez pontos, todas as rubricas, comparações e fontes.
O campo opcional `summary` resume pontos extensos sem alterar cálculos nem descartar evidências.

## 9. Requisitos não funcionais

Zero mistura de tenant, zero envio documental adicional, cálculos determinísticos e orçamento de leitura existente. Nenhuma aprovação automática de contas. Cobertura mínima de 80% nos quatro indicadores do projeto.

## 10. Critérios de sucesso

Envio sem pergunta produz dez verificações e prioridades; histórico disponível é usado sem nova digitação; divergências numéricas têm todas as fontes; apoios ausentes ou ambíguos geram pedidos concretos; isolamento e revogação falham sem expor dados. Validar com testes unitários, HTTP, apresentação e evals documentais existentes.

## 11. Questões em aberto

- Revisão contábil especializada e validação com usuários permanecem necessárias antes de prometer cobertura universal ou liberar piloto real.

## Gate competitivo

Permanece no chat e no Bloco 7 autorizado; reduz trabalho mensal com memória histórica verificável, além de uma leitura genérica de PDF. Reutiliza reader, extrator e comparação em centavos. Testes medem fechamento, cruzamentos, lacunas e segurança; não introduz custo permanente de serviço.

## Gate para mudar o status

Exige aceitação e rastreabilidade atualizadas, gates locais executados e revisão do diff. Não autoriza merge, publicação ou piloto real.
