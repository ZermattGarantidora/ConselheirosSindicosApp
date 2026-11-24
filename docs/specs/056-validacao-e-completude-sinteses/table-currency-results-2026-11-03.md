# Resultado — moeda declarada e células financeiras sem símbolo

**Data:** 2026-11-03  
**Requisito:** RQ-5602 / AC-5617  
**Estado:** correção implementada, gates aprovados e ativada no preview com autorização

## Diagnóstico e limite de causalidade

O documento do incidente está pronto, com três páginas legíveis e vigência confirmada no
catálogo. As duas primeiras páginas não repetem “R$” nas células. A primeira declara “Valores
em reais”. O validador procurava majoritariamente valores com símbolo e recusava afirmações
corretas de entradas, saídas e resultado com `unsupported_monetary_assertion`.

Quatro regressões fictícias reproduziram essa recusa antes da correção. Depois do ajuste,
o reconhecedor leu localmente 55 células monetárias no original do incidente, sem geração ou
transmissão externa. Nenhum PDF, valor ou conteúdo privado foi incorporado a fixtures/evals.
Os candidatos e códigos internos das recusas históricas não estão disponíveis pela interface
do preview; portanto, não se afirma que esse defeito explica todas as falhas anteriores.

Um smoke sintético novo passou pelo upload, extração, recuperação, gateway Sol 6.1 low e
validação do produto. A mesma resposta retornou `unsupported_monetary_assertion` no replay
offline do validador anterior e passou no corrigido, sem outra geração. Isso demonstra a
causa para essa classe de documento, sem reenviar o original privado para reproduzir a falha.

## Mudança entregue

- Reconhecer valores literais sem símbolo em tabelas/seções financeiras, somente com moeda
  declarada nos trechos citados da mesma versão. Moeda não é deduzida do título.
- Não transportar cabeçalho de tabela entre trechos ou após nova seção; moeda estrangeira,
  percentual, área, prazo, quantidade e valor acima da precisão suportada permanecem recusados.
- Conservar os trechos e offsets originais. Rubricas não segregadas não viram resultado
  ordinário; cálculos e limites anteriores continuam validados.
- Usar a origem canônica das evidências na guarda, impedindo que `sourceScope` omitido ou
  falsificado transforme legislação em tabela do condomínio.
- Acrescentar opção de várias linhas ao renderer sintético de PDFs: cada linha tem posição
  própria. O comportamento anterior do helper permanece por padrão. A primeira tentativa do
  teste novo expôs que o renderer antigo colocava a página inteira numa linha e cortava texto;
  a asserção de leitura foi conservada e o fixture passou a representar uma tabela legível.

Sem alteração de prompt, modelo de runtime, provedor, schema, dependência, orçamento ou
quantidade de gerações permitida. Não remover a validação nem entregar saídas recusadas.

## Evidência executada

| Verificação | Resultado |
|---|---|
| Regressão inicial | 4 falhas de recusa indevida; 8 controles aprovados |
| Testes focados finais | 192 / 7 arquivos aprovados |
| Testes novos de unidades e fluxo | 30 / 2 arquivos aprovados no gate completo |
| Testes completos | 1.950 / 178 arquivos aprovados |
| Cobertura global | statements 91,58%; branches 88,08%; functions 96,41%; lines 93,19% |
| Novo reconhecedor | 100% nos quatro indicadores |
| Formatação, lint e tipagem | aprovados; escape redundante detectado no primeiro lint foi corrigido |
| Build API e visão | aprovados; gate estrutural de 63 specs |
| Gate canônico e segurança | `pnpm run check` aprovado; scanner sem padrões conhecidos de segredo |
| Evals básicos / documentais | 20/20 e 50/50 determinísticos, sem provedor; 50 casos semânticos documentais fora da execução |
| Sol 6.1 low, PDF fictício | 200, `grounded`, duas citações, uma geração, sem código de falha |
| Consumo do smoke | 41.192 tokens de entrada, 758 de saída; 21.616 ms, sem extrapolação para custo do app |
| Replay da mesma resposta | antigo: `unsupported_monetary_assertion`; corrigido: nenhum erro; zero chamadas adicionais |

O smoke descreveu corretamente entradas/saídas, resultado, saldo final e despesas fictícias e
conservou os limites de conciliação e aprovação. Revisão técnica pelo autor/IA, sem aprovação
profissional. Uma resposta não mede acurácia global, frequência do bug nem desempenho de Luna.

Código e testes congelados no manifesto
`a4ecd24405463a78e3956f5d0f630b5c6fa704623d192418a22d3db80c409e45`.
Baseline, logs e smoke sintético em `.local/document-validation-fix/`, ignorados pelo Git.

## Ativação autorizada

O usuário escolheu “Reiniciar e ativar a correção” após ser informado do descarte das conversas
e catálogo temporários em RAM. O build validado foi ativado (API PID 22860 → 33540), com saúde
`ok` na API e pelo proxy do preview, provedor `codex` e persistência `volatile`.

O cadastro e quatro PDFs da sessão atual foram preservados e restaurados por operações locais:
quatro prontos, zero conferências de condomínio pendentes e quatro checksums de originais
verificados. Nenhuma geração de IA nessa restauração. Cópias temporárias, metadados e script
de restauração removidos; originais privados preservados. O histórico RAM foi descartado
conforme autorizado, sem recriar falas. A aba do usuário não foi recarregada automaticamente.

O manifesto permaneceu idêntico aos gates. Sem merge, liberação de produção ou revisão
independente do branch.
