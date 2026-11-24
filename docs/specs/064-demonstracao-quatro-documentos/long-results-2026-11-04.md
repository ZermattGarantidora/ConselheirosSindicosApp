# Conversas longas — convenção e três atas

Em 04/11/2026, foram concluídas seis conversas de 30 turnos: 90 respostas com Luna high e
90 com Sol 6.1 low. Todos os seis fechamentos cobriram os fatos pedidos, mas houve falhas
intermediárias. O Sol entregou mais respostas satisfatórias neste conjunto. Parte importante
da diferença veio de bloqueios do contrato da aplicação, e não de esquecimento do modelo.

Classificação por revisão técnica do Codex, uma IA, sem revisão independente ou especializada.
Não representa taxa global de acerto, comparação estatística entre modelos ou autorização
de lançamento. Os resultados curtos anteriores permanecem no relatório separado.

## Protocolo

- Corpus: os mesmos quatro PDFs sintéticos, duas páginas cada: eleição/posse, obra da garagem,
  áreas comuns e convenção demonstrativa. Nenhum arquivo privado do usuário entrou na bateria.
- Modelos fixos: gpt-6-luna, esforço high; gpt-6.1-sol, esforço low. Codex local autorizado,
  sem fallback para API paga e sem ferramentas do modelo.
- Três roteiros iguais por modelo: obra e correções; salão e regras; eleição, convenção e
  comparação entre documentos. Cada roteiro usa um chat próprio, com 30 pedidos sequenciais.
- Perguntas incluem referências como “e a segunda?”, mudanças de assunto, correção de valores,
  propostas sem suporte, retomadas e fechamento com vários fatos. Cada roteiro tem 25 perguntas
  documentais, três anotações/correções e duas sondagens de lembrança pessoal.
- Upload, extração, busca, perguntas, validador e journal reais via Fastify injetado em instância
  isolada. A biblioteca legal verificada do app continua disponível. O gateway recebe apenas a
  pergunta, as fontes recuperadas e a memória permitida; nunca recebe o gabarito.
- O histórico anterior vem das respostas reais de cada modelo. A política do app pode omitir
  o texto de uma resposta anterior se ela não passar nos critérios de replay; não foi forçado
  um histórico integral artificial no prompt.
- Janela existente: até oito turnos recentes, 12.000 bytes e oito evidências por geração.
  Máximo observado: oito turnos, 3.402 bytes e oito evidências nos dois modelos. Nenhum excesso.
- Até quatro conversas simultâneas; sequência interna preservada. Reparo normal do produto,
  até duas tentativas. Não houve reinício da API nem alteração do código de produção.

Comando documentado no README, package.json e AGENTS.md:

    pnpm run evals:demo-long
    pnpm run evals:demo-long --execute --run-key=long-four-documents-20261104 --concurrency=4

O primeiro comando imprime o plano, sem chamar modelo. O segundo foi executado uma vez para
medir as conversas; uma retomada posterior reaproveitou os seis checkpoints sem inferência.

## Resultado revisado

“Satisfatória” atende ao pedido com suporte ou abstenção apropriada. “Parcial” entrega parte
do pedido ou apresenta defeito material de apresentação/associação. “Falha” entrega fallback
do validador em vez da resposta. “Limite de contexto” reconhece corretamente que a anotação
antiga não foi fornecida ao modelo: não é lembrança bem sucedida nem fabricação.

| Resultado, de 90 respostas por modelo | Luna high | Sol 6.1 low |
|---|---:|---:|
| Satisfatórias | 68 (75,6%) | 76 (84,4%) |
| Parciais | 7 | 7 |
| Falhas com bloqueio definitivo | 12 | 4 |
| Limites de contexto reconhecidos | 3 | 3 |
| Fechamentos completos no turno 30 | 3/3 | 3/3 |

O subconjunto de 75 perguntas documentais teve 66 satisfatórias, sete parciais e duas falhas
no Luna; 67 satisfatórias, sete parciais e uma falha no Sol. A correção de valor é um turno
conversacional, por isso um dos três bloqueios monetários do Luna fica fora desse subconjunto.
Os percentuais gerais incluem anotações pessoais; não devem ser chamados de “omissão documental”.

| Roteiro, 30 turnos | Luna: satisfatória/parcial/falha/limite | Sol: satisfatória/parcial/falha/limite |
|---|---|---|
| Obra e correções | 24 / 0 / 5 / 1 | 28 / 0 / 1 / 1 |
| Salão e regras | 22 / 3 / 4 / 1 | 24 / 3 / 2 / 1 |
| Eleição e convenção | 22 / 4 / 3 / 1 | 24 / 4 / 1 / 1 |

Todos os 180 pedidos tiveram HTTP 200; isso inclui fallbacks e não significa 180 sucessos.
Os 210 processos de geração terminaram sem falha de infraestrutura. Foram 30 segundas
tentativas: 14 reparos concluíram sem recusa definitiva e 16 terminaram bloqueados.

## Diagnóstico das falhas abertas

| Causa | Luna | Sol | Evidência e efeito |
|---|---:|---:|---|
| Contrato de anotações pessoais | 9 falhas | 3 falhas | O modo grounded com zero citações gera mode_citation_mismatch e bloqueia uma fala que deveria apenas reconhecer ou lembrar o contexto do usuário. |
| Guarda monetária: falso positivo | 3 falhas | 1 falha | Negativas corretas a propostas sem suporte repetem a quantia proposta e são recusadas por unsupported_monetary_assertion. |
| Recuperação/completude | 5 parciais | 5 parciais | Intervalo do salão, período do piloto, empresa da obra ou votação eleitoral não aparecem nas fontes selecionadas. |
| Apresentação de citações | 2 parciais | 0 | Luna deixa um marcador [1] e, em outra fala, um token nativo de citação com identificador interno. |
| Associação de prazo | 0 | 1 parcial | Sol associa entrega à posse em 01/02 e coordenação a 05/02; o quadro de providências usa 05/02 para organizar a entrega. |
| Pedido desnecessário de reenvio | 0 | 1 parcial | Sol se abstém corretamente sobre CNPJ, mas pede páginas dos arquivos já disponíveis, em vez de uma nova fonte de identificação. |

Casos reproduzíveis no roteiro e nos checkpoints:

- Anotações pessoais: Luna, turnos 1, 4 e 29 dos três roteiros; Sol, turno 4 dos três.
  Na sondagem próxima, a nota estava no input e no texto bruto correto em ambos os modelos.
  O usuário recebeu o fallback porque as duas tentativas usaram modo incompatível com zero fontes.
- Monetário: Luna/obra 9–10 (descartar proposta de R$ 30.000 e manter teto documental de
  R$ 24.000), Luna/salão 15 e Sol/salão 15 (recusar multa automática de R$ 500).
  O texto bruto negava autorização; a guarda bloqueou variantes ainda não cobertas pelas
  correções anteriores. Não houve entrega de autorização falsa nesses pontos.
- Recuperação: ambos/salão 10 e 12 perderam o trecho 08h–22h, apesar de tê-lo respondido
  no turno 9. Ambos/salão 22 perderam o período do piloto. Ambos/eleição 18 não recuperaram
  a empresa da obra; ambos/eleição 24 não recuperaram os 18 votos da eleição. No último
  caso, o Luna também deixou de comparar os 17 e 14 votos presentes; o Sol comparou essa parte.
- Apresentação: Luna/eleição 10 e 12. As citações estruturadas continuaram verificáveis,
  mas os marcadores internos apareceram no texto de fala.
- Prazo: Sol/eleição 10. A ata contém posse com entrega organizada em 01/02 no texto e
  organização da entrega até 05/02 no quadro de providências. A resposta deveria explicitar
  a distinção; a revisão marcou associação ambígua, não data inventada.
- CNPJ: Sol/eleição 25. O dado não consta nos PDFs e não foi inventado; o problema foi pedir
  novamente o material já recebido. No equivalente do Luna há também pedido de páginas,
  mas ele oferece uma fonte nova com CNPJ; mantido satisfatório com observação menor.

Outras observações menores, sem alterar a classificação: respostas sobre parcelas reabriram
assuntos antigos de salão/piloto; um fechamento do Luna acrescentou uma ressalva dispensável;
o Luna assumiu para si a anotação equivocada de 23h que havia partido do usuário.

As quatro guardas/fatias que merecem correção posterior são: tratamento de notas conversacionais,
recuperação de todas as partes da pergunta após mudança de tema, negativas monetárias e limpeza
de marcadores de fonte. Não foram modificadas nesta tarefa de avaliação. Os casos originais
agora servem como regressões preservadas, sem repetir perguntas para melhorar esta nota.

## Memória e histórico são verificações diferentes

As três sondagens próximas de cada modelo falharam na entrega, apesar de os apelidos Cedro,
Ipê Roxo e Farol Verde estarem visíveis e serem recuperados corretamente na geração bruta.
Logo, nesses seis casos, diagnosticar “o modelo esqueceu” seria incorreto.

No turno 28, os apelidos iniciais estavam fora da janela em todos os seis chats. Cada resposta
reconheceu a falta de contexto sem inventar o apelido. É um limite real da memória atual:
guardar 30 turnos no histórico não equivale a fornecer os 30 ao modelo. O lembrete do turno 29
foi explícito, e as perguntas finais também repetem os apelidos; os fechamentos completos não
demonstram retenção espontânea desses nomes desde o início.

O journal preservou literalmente os dois lados da conversa nos turnos 10, 20 e 30: 20, 40 e
60 mensagens, respectivamente, em cada chat. As 18 conferências de texto e ordem passaram.
Seis controles de novo chat vieram vazios e os seis acessos de outro usuário retornaram 403.
O teste determinístico também confirma ausência de memória anterior ao perguntar em outro chat.
Esses controles não substituem a suíte completa de RLS nem validam restauração após reinício.
A persistência durável de lançamento da Spec 058 continua fora da evidência desta bateria RAM.

## Avaliação automática, revisão e correção do detector

O snapshot original marcou 75 respostas como automatic_complete no Luna e 78 no Sol. Esses
números não são o resultado revisado: o detector aceitava alguns fallbacks conversacionais
não vazios; também havia alertas lexicais que a leitura semântica descartou. Todas as 180
falas públicas foram lidas, com consulta às fontes e às capturas para diagnosticar os pontos.

Depois da medição, somente o avaliador foi corrigido para receber os códigos de recusa
definitiva já observados pela fixture. Um fallback com diagnóstico terminal não pode parecer
completo ou limitação legítima. O teste cobre texto não vazio, recusa na sondagem de memória
e resposta bem sucedida sem diagnóstico. Nenhuma regra de produção foi afrouxada.

A correção não foi aplicada retroativamente aos checkpoints. Resumo automático original,
respostas brutas e falhas permanecem intactos; a classificação revisada fica em artefato
separado e está ligada ao hash de cada checkpoint. A retomada preservou conteúdo e mtime dos
190 arquivos de checkpoint/manifesto, reutilizando seis conversas e 180 turnos sem novas chamadas.

## Consumo observado

| Medida | Luna high | Sol 6.1 low |
|---|---:|---:|
| Tentativas para 90 respostas | 104 | 106 |
| Tokens de entrada | 1.635.681 | 1.737.140 |
| Tokens de saída | 44.512 | 27.759 |
| Entrada em cache, já incluída na entrada | 7.424 | 0 |
| Latência mediana por tentativa | 46,3 s | 8,6 s |
| Latência p95 por tentativa | 62,4 s | 15,6 s |

Total: 3.372.821 tokens de entrada e 72.271 de saída, 210 processos. Os esforços são diferentes
e houve concorrência; essas latências descrevem esta execução, não um benchmark controlado de
velocidade. Os tokens não representam fatura, preço futuro do app ou franquia restante do plano.

## Gates e rastreabilidade

- Gate obrigatório pnpm run check aprovado: formatação, lint, TypeScript, 2.053 testes em
  183 arquivos, alinhamento das 64 specs e scanner de segredos. Coberturas: statements 91,85%,
  branches 88,33%, funções 96,36% e linhas 93,43%; todas acima de 80%.
- 180 respostas reais concluídas, checkpoints conferidos por SHA-256, revisão técnica por ponto.
- Retomada real sem inferência, 18 verificações de histórico e 12 controles de isolamento do journal.
- Hashes dos quatro PDFs preservados. Os 151 arquivos apps/ do manifesto de referência anterior
  foram comparados e permaneceram idênticos. Nenhuma alteração de produção foi feita nesta tarefa.
- Não se aplicam migrações, build/reinício de serviço ou novos testes de banco: o delta é de
  roteiro, avaliador e documentação, com integração Fastify coberta pelo teste determinístico.
- Saúde final: API e página local responderam 200, com os mesmos PIDs 34496 e 32972.
- Revisão do autor no arquivo de revisão correspondente; nenhuma aprovação de merge ou rollout.

Fonte congelada da execução:
2a78e683f9782c5c1604f4463422612d2f4560695a47f0cdd9b252a391a3e1a6.
Extensão/corpus congelados:
cad378f117d3832cec69929b38bcb82339482050dfb402cec712bfa51ed4adeb.
Roteiros: 04b5abdf0cbf55360503e13bc170f754d6fc90fdd09d51c34c1ffbd2d4456877.
Referência de produção anterior:
0f32dfe2e939a8dcf21dbf84537ade9c0f6602ee06c2a5c1bec7d37c026684f9.
O fingerprint da execução inclui package/harness e difere da referência; não implica mudança
do código da API. O detector final do workspace difere intencionalmente do snapshot medido.

Artefatos locais ignorados:

- .local/demo-document-evals/long-four-documents-20261104/: snapshot, manifesto, 180 turnos,
  seis conversas completas, resumo automático original e capturas de input/output.
- .local/long-demo-evals/results-summary.json e reviewed-points.json: classificação técnica
  e motivos ligados aos hashes originais; reviewed-files.json registra as 180 leituras.
- .local/long-demo-evals/manual-findings.json: exceções e observações menores da revisão.
- .local/long-demo-evals/preservation-final.json, resume.log e check-release.log: verificações
  finais, retomada sem novas inferências e gates.

Falhas funcionais abertas impedem tratar o fluxo longo como estável. A avaliação está concluída;
o app e a sessão de demonstração não foram reiniciados ou modificados para maquiar o resultado.
