# Spec 056 — Validação e completude das sínteses

**Status:** implementada localmente; ensaios concluídos com pendências qualitativas
**Responsável:** engenharia da Alvitra
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Corrige recusas indevidas e perda de itens na conclusão de tarefas documentais. |
| Público | §3 | Atende síndicos que retomam contratos, atas, balancetes e pendências na conversa. |
| Proposta de valor | §§5 e 6 | Preserva o pedido e organiza uma resposta verificável e um próximo passo específico. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Melhora o caminho de conversa e análise já autorizado, sem módulo ou interface adicional. |
| Segurança e confiança | §§8–10 | Mantém citações, fontes atuais, isolamento, conflitos e validação humana; fecha a afirmação qualitativa sem citação. |
| Validação e métricas | §§12–14 | Mede bloqueios e completude com regressões, controles e custo por configuração. |

### Limites respeitados

Oito interações recentes, 12.000 bytes UTF-8 de contexto, oito fontes e até duas gerações no mesmo modelo/esforço. Preserva o prompt de cada origem, sem editá-lo: v26 na R2 e v27 da Spec 057 na R3 e na continuação. Mantém o roteamento do aplicativo, os 280 cenários e os resultados históricos. Não cria memória global, resumo persistente, juiz remoto, dependência, serviço, provedor, schema de banco ou ação externa. A explicação do fluxo visual não autoriza redesenhar a interface nesta fatia.

### Divergências da visão

Nenhuma. O usuário pediu ajuda para corrigir os bloqueios e a completude das sínteses. A preferência posterior à R4 por Luna high e Sol low orienta a validação dirigida desta fatia; não altera silenciosamente a configuração do aplicativo. O gate competitivo mantém o chat como interface, melhora evidência/utilidade/segurança nos blocos autorizados e exige benefício observado para a complexidade adicionada.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve problema e testa hipótese descritos no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Entregar sínteses que respondam aos itens materiais da tarefa e distinguir uma frase não confirmada de uma afirmação local, reduzindo recusas indevidas sem liberar conteúdo sem base.

## 2. Promessa testada

> A Alvitra reúne o que foi pedido e sustentado, informa as lacunas e não exige uma palavra específica para reconhecer uma conclusão corretamente citada.

## 3. Usuário primário

Síndico que pede uma conclusão após comparar documentos, corrigir uma referência ou organizar verificações humanas.

## 4. Escopo

- Reproduzir os quatro bloqueios da matriz da Spec 054 e a afirmação qualitativa sem citação da R4.
- Preservar cláusulas e partes pertinentes da janela recente quando a síntese final menciona um tema; respeitar recorte explícito e mudança de assunto.
- Acrescentar uma lista de conferência efêmera, com aspectos e IDs das evidências atuais, para sínteses financeiras, decisões de atas, condições de contrato e aceite/conferência.
- Apontar quais aspectos faltaram na tentativa de correção usando códigos internos, sem reenviar resposta rejeitada.
- Validar regressões e controles e executar um ensaio dirigido com Luna high e Sol low, memória ligada e consumo separado.

## 5. Fora do escopo

Alterar system prompt, janela, política de roteamento, cadastro, interface, fornecedores, pagamentos, treinamento ou corpus. Não executar automaticamente outra bateria completa de 280 cenários. O ensaio dirigido não substitui essa bateria nem aprovação de adoção.

## 6. Pré-condições

Specs 043 e 050–054; ADRs 0031, 0032 e 0035. R4 e M1 da Spec 054 são imutáveis. Fonte de partida esperada: `03bee28deb25b9c679c790ee2ec483306462def228aa3d3568d8d7161088589b`; qualquer diferença deve ser registrada antes da alteração.

A fonte encontrada foi `b0b77d529bc1d48f368ca18320f5fa70fede95c11de134ae6befe6b537a0875a`: diferenças de outra fatia em `protocol.ts`, `run.ts`, `snapshot.ts` e `package.json`, ligadas à Spec 055. Foram preservadas no baseline privado. O código de respostas de partida coincide com a R4. Esta spec usa o identificador 056 para não colidir com a comparação Sol já em curso.

## 7. Requisitos funcionais

### RQ-5601 — Cobertura por conteúdo e fonte

Uma conclusão pode cobrir assembleia por linguagem de deliberação e referência autorizada a ata, sem repetir AGE/ata/assembleia no corpo. Citar uma ata sem tratar decisão, colocar o conteúdo somente em atenção ou apresentar uma lista de claims não exibida não satisfaz o pedido. Os controles de IDs, versões, trechos, fonte pendente e autorização continuam obrigatórios.

### RQ-5602 — Fidelidade e qualificação

AC-5621/5622, 04/11/2026: resposta binária sobre início de mandato/posse antes ou depois
de assembleia não pode contradizer as duas datas explícitas citadas na própria resposta.
Quando a associação e as datas são inequívocas, uma contradição usa o reparo existente,
sem alterar silenciosamente o veredito. A comparação não infere datas ausentes.
Uma negativa isolada de autorização de multa/taxa pode repetir o valor proposto pelo
usuário sem convertê-lo em valor documental. A exceção fica restrita à cláusula negada;
afirmação adicional, duas quantias ou valor apresentado como vigente continuam validados.

Correção de 04/11/2026, AC-5620: autorização ou cronograma de piloto/obra não comprovam
execução. Afirmação direta de ocorrência ou conclusão exige trecho citado que a sustente;
fonte somente prospectiva não basta. Negação, hipótese e recomendação permanecem permitidas.
Uma guarda lexical limitada usa o reparo existente, sem fabricar status ou substituir revisão
semântica. Sem exceção por nome, condomínio ou data da demonstração; briefing §§8–10 e 13.

Relato não confirmado, recusa de adulterar, condição de aprovação e diferença aritmética suportada não são confirmação do valor. A qualificação é limitada à cláusula pertinente; não pode esconder outro valor afirmado, nem o mesmo valor afirmado em frase distinta. Afirmação qualitativa de regra local em abstenção é recusada mesmo sem número ou citação explícita do nome do documento; definição geral, descrição do acervo e ausência de prova continuam permitidas. Modo e tipo de claim não são convertidos para fazer uma saída passar.

### RQ-5603 — Lista de conferência da síntese

Os itens derivam do pedido atual, das perguntas pertinentes da janela autorizada e de aspectos identificáveis nas fontes recuperadas. Contêm rótulos e IDs, não valores calculados ou respostas prontas. Recortes como somente contrato e exclusões prevalecem. Declarações de fonte não se tornam instruções; rótulos são de uma lista interna controlada.

A lista cobre, quando pertinente e sustentado pelo contexto: resultado versus saldo e recursos vinculados; decisões das atas por instrumento; aviso, multa, vigência e proposta não aceita; contrato de trabalho versus rubricas agregadas; inventário, conciliação, execução e aceite formal. Falta de fonte é uma lacuna da consulta, não prova de inexistência no acervo. Não exigir tópicos alheios apenas porque uma fonte os menciona.

A lista cabe no orçamento junto às perguntas e ao contrato de validação, com truncamento explícito. Não incorpora resposta documental antiga, conteúdo fora da janela ou gabarito de eval. A validação detecta omissões materiais selecionadas; não certifica automaticamente verdade ou completude semântica universal.

### RQ-5604 — Reparo específico e limitado

A correção pode receber as chaves dos itens omitidos, além do código existente. Somente chaves internas conhecidas; sem texto rejeitado, fatos inferidos, nova fonte ou chamada classificadora. Mantém duas tentativas e o mesmo modelo/esforço. Lacuna ou esclarecimento específico são respostas válidas quando necessários.

### RQ-5605 — Validação rastreável

Adicionar `evals:answer-quality` como plano sem inferência por padrão. O estágio dirigido usa 30 pontos pré-fixados: 17 posições P/F da R4, o alvo ambíguo 54 apenas como controle de fidelidade, três posições adicionais dos bloqueios da M1 e nove controles únicos. Luna high e Sol low, 60 pontos, uma rodada, concorrência dois, origem R4 e snapshot da fonte nova. O alvo 54 segue excluído uniformemente da taxa semântica: 29 posições comparáveis por configuração.

O replay usa as perguntas da janela e as fontes pré-selecionadas, sem reexecutar retrieval/HTTP/persistência. Oráculo fica fora do input. Fonte, input, saída, modelo/esforço e usage são vinculados por hashes. Custos incluem rejeições e usage desconhecido não vale zero. Respostas anteriores e ensaios falhos não são substituídos. Asserções determinísticas usam também exemplos novos e controles negativos, sem enfraquecer os existentes.

Se o ensaio revelar uma causa determinística adicional, a contraprova posterior usa um snapshot novo e mantém as notas da rodada completa. Para as causas verificadas da R2, limitar o complemento a seis pontos Luna high: 17, 20, 25 e 57, mais controles 40 e 56. Registrar separadamente resultados, fonte e custo, sem promover a taxa da R2 nem extrapolar para os 280 cenários.

A R2 foi congelada com prompt v26. A R3 encontrou o v27 já alterado pela Spec 057 no diretório compartilhado, preservou essa alteração alheia e registrou seu hash. Nenhum prompt foi editado pela Spec 056; o complemento não isola causalmente as correções de código. Ver resultados e limites em `observed-results-2026-10-29.md`.

## 8. Contratos

### Correção de 04/11/2026 — contexto monetário e contas verificáveis entre páginas

A bateria de vinte consultas com três balancetes inteiramente fictícios revelou recusas de
valores corretos. RQ-5602 passa a preservar a declaração de moeda da mesma versão quando ela
está nas evidências autorizadas da consulta, mas foi omitida nas citações geradas. O servidor
pode acrescentar essa evidência como citação complementar literal, com seus metadados e offsets
validados. Não acrescenta fonte não recuperada, de outro documento/versão, legislação, versão
pendente, baixa qualidade ou em conflito de moeda. Não modifica a fala, os valores ou os claims.
Ausência da declaração continua exigindo abstenção para células sem símbolo de moeda.
Fragmentos recuperados contíguos da mesma página também podem completar o contexto da tabela:
o validador confere a sobreposição literal e conserva as citações originais separadas. Lacuna
entre offsets, sobreposição conflitante e página diferente não autorizam herdar cabeçalho.

O reconhecimento de tabelas conserva colunas monetárias quando a linha identifica unidades
recebedoras/pagadoras ou tem histórico quebrado em duas linhas. Quantidades de unidades, dias,
percentuais e áreas continuam fora dos valores. Resumos com cinco colunas inequívocas e
competência explícita podem sustentar receitas, despesas e resultado por período. Soma,
diferença e igualdade aritmética explícitas são conferidas em centavos, com operandos citados,
resultado correto e escopo preservado; uma igualdade errada não pode herdar suporte de outra.
Uma tabela de diferenças deve conservar seus cabeçalhos, sem dispensar conferência dos valores.
Equações ficam limitadas a oito parcelas por lado, sem igualdades encadeadas ou execução de
expressões livres. Equação autorreferente e operandos ausentes não comprovam um resultado novo.

Detalha briefing §§2, 4, 6.6, 7 (Blocos 6–7), 8–10 e 12–13. O gate competitivo conserva o chat,
a memória verificável e a fatia autorizada, reduz recusas e pedidos desnecessários e exige
regressões positivas e negativas. Não acrescenta dependência, provedor, prompt, orçamento,
ação externa ou schema. Os resultados originais permanecem imutáveis; revalidação local de
candidatos não conta como nova resposta pública nem melhoria medida do modelo.

### Correção de 03/11/2026 — moeda indicada no documento, sem símbolo em cada célula

O validador reconhece valores literais de tabelas financeiras mesmo sem “R$” repetido em cada
célula, quando os trechos citados da mesma versão declaram explicitamente valores em reais e
o trecho identifica uma tabela ou seção financeira. Não inferir moeda apenas pelo nome do
arquivo nem usar declaração de outra versão. Valores em moeda estrangeira, percentuais, áreas,
prazos e quantidades não comprovam uma afirmação em reais. Cabeçalho não se propaga entre
trechos independentes ou após o encerramento da tabela. As citações e seus offsets permanecem
literais; não inserir “R$” no texto original nem liberar números que não estejam nos trechos
citados. A origem da citação usada na validação vem da evidência autorizada do servidor, mesmo
que a geração omita ou altere `sourceScope`. Cálculos, rubricas, períodos, fonte pendente e
autorização conservam as regras atuais.

Esta fatia detalha RQ-5602 e briefing §§4, 6, 7 (Blocos 6–7), 8–10 e 12–13: reduz uma recusa
indevida na conversa sem enfraquecer evidência ou criar serviço, provedor, prompt, schema ou
chamada adicional. O gate competitivo reutiliza o validador existente e exige regressões
sintéticas positivas e controles de unidade, moeda e versão. Não altera taxas históricas dos
modelos nem autoriza envio adicional dos PDFs privados para diagnóstico remoto.

### Continuação autorizada em 29/10/2026 — correções compartilhadas Luna/Sol 6.1

O pedido para começar as correções autoriza uma primeira fatia das pendências verificadas:

- Reconhecer resultado trimestral zero em tabela pela coluna de resultado e pelo período da
  linha, incluindo fechamento entre meses. Exigir três competências consecutivas citadas,
  cálculo correto e correspondência dos meses/anos nomeados. Zero em saldo, taxa ou outra coluna
  não herda esse suporte; tabelas anteriores não fornecem cabeçalho a uma tabela diferente.
  O reconhecimento da cobertura usa essa mesma coluna, sem obrigar repetição em prosa. Resultado
  mensal zero conserva suporte quando receitas e despesas da competência nomeada são iguais;
  subtrair um operando de si mesmo entre valores sem relação não comprova resultado de outro período.
- Recusar envelope JSON do protocolo dentro da fala e motivo de especialista que negue
  explicitamente a própria necessidade. Reparo recebe somente orientação interna controlada;
  não extrair uma resposta do envelope nem reescrever o indicador para aprová-lo.
- Explicitar no reparo de fonte pendente a distinção entre interpretação citada e regra
  confirmada, sem converter automaticamente claims ou reenviar texto rejeitado.
- Na renovação, uma menção genérica a vigência não cobre a data final legível do contrato.
  Na síntese de atas, condições da reserva e mandato/votação solicitados na janela pertinente
  são aspectos separados quando presentes nas páginas recuperadas. Ausência de página exige
  complemento específico; não inferir fato nem afirmar inexistência no acervo.

Mantém os limites, fontes e alinhamento aos §§4–6, 7 (Blocos 2, 6 e 7), 8–10 e 12–14 do
briefing. O gate competitivo continua atendido: melhora tarefas documentais no chat por
evidência verificável, com regressões sintéticas e sem complexidade de novo serviço. Não
altera prompt, roteamento, memória persistente ou histórico durável da Spec 058. Não autoriza
outra bateria completa nem promoção de resultados históricos. O primeiro gate é a reprodução
offline das saídas sintéticas já preservadas, com controles novos; nenhuma melhoria de taxa
dos modelos pode ser inferida apenas dessa revalidação.

Após as regressões, a contraprova R4 fica limitada a sete entradas por configuração: `quality-17`,
`quality-20`, `quality-21`, `quality-23`, `quality-46`, `quality-75` e `quality-control-55`.
Luna high e Sol 6.1 low recebem as mesmas perguntas/fontes por entrada, memória ligada e no
máximo duas tentativas. As duas primeiras entradas vêm da R3 e as demais da R2; validar hashes
dos checkpoints sintéticos e congelar fonte antes da execução. Preservar perguntas, fontes,
limites, prompt e custo de toda tentativa, inclusive rejeições. O controle verifica documento
removido. Essa seleção verifica reprodução e reparo; não possui representatividade para taxa
global, nem reexecuta retrieval/HTTP/persistência ou certifica revisão profissional.

A R4 revelou novas variantes das mesmas causas: menção monetária explicitamente não confirmada,
cabeçalhos “Resultado do mês”/“Resultado de caixa” e perda do fechamento trimestral pedido com
“adicione”. Acrescentar regressões para essas classes, incluindo afirmação falsa posterior,
coluna projetada e fechamento sem suporte. O reparo de minuta explicita os campos do contrato
de claim, sem conversão pelo servidor. Após preservar a R4, limitar a R5 a `quality-17`,
`quality-20`, `quality-23` e `quality-control-55`, pelos mesmos dois modelos/esforços. Registrar
fonte, falhas e consumo separadamente; não substituir resultados R4 por resultados favoráveis R5.

O diagnóstico posterior à R5 inclui totais trimestrais por rubrica (receitas/despesas/resultado)
derivados de três competências consecutivas citadas. Coluna, período, soma e sinal devem
corresponder; saldo, taxa e projeção não herdam esses totais. Negrito e nota de rodapé não mudam
a rubrica. Intervalo entre meses e enumeração dos três meses equivalentes identificam o mesmo
período. Ausência de comprovação de alteração monetária fica restrita à cláusula negada, inclusive
após ponto e vírgula ou “mas”; outro fato afirmado continua validado. Completar essa etapa com
revalidação offline dos candidatos sintéticos preservados, sem outra geração ou promoção das
notas R4/R5. Falha de processo continua falha mesmo se houver texto bruto analisável.

Campos opcionais de planejamento e diagnóstico em contexto não privilegiado; HTTP e persistência preservados. Nenhum log textual adicional no produto. Conteúdo rejeitado fica apenas em artefatos privados de fixtures verificadas pelo runner. Reutiliza o adaptador e a tabela de preços do protocolo, identificando sua data e a diferença entre créditos equivalentes e fatura.

## 9. Requisitos não funcionais

Cobertura mínima de 80% em statements, branches, funções e linhas. Mesmos limites de fontes, contexto e gerações; nenhuma chamada de planejamento ou julgamento por turno. Sem dados reais, ação externa ou alteração de configuração global.

## 10. Critérios de sucesso

Reproduções demonstradas passam após a correção e controles perigosos continuam recusados. Os testes aplicáveis e gates passam. O ensaio dirigido, suas falhas e seu consumo são apresentados sem extrapolar para os 280 cenários. Resultado parcial mantém pendências explícitas e não aprova produção.

## 11. Questões em aberto

Quanto a lista melhora cada configuração e quanto adiciona a tokens/latência; quais omissões dependem de páginas ausentes e quais persistem com fonte disponível. Efeito global exige outra bateria completa, em decisão posterior.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, testes, revisão do diff e resultados coerentes. Nenhuma autorização de merge, deploy ou piloto.
