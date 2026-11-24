# Resultado — custo, qualidade e tempo em 30 cenários

**Data:** 23/11/2026  
**Rodada:** `2026-11-23-cost30-r1`  
**Natureza:** comparação exploratória real pelo Codex/ChatGPT pessoal local; somente sintéticos.

## Resultado observado

O híbrido reduziu o equivalente de custo de API em **66,43%** nesta amostra e o tempo médio
da resposta completa em **9,38%**. A auditoria técnica por IA aprovou 36/36 turnos do Sol
fixo e 34/36 do híbrido. Não é aprovação especializada, medição de fatura ou seleção de produção.

| Medida | Sol 6.1 low fixo | Híbrido Luna high / Sol 6.1 low |
|---|---:|---:|
| Cenários concluídos | 30/30 | 30/30 |
| Turnos concluídos | 36/36 | 36/36 |
| Turnos aprovados tecnicamente | 36/36 | 34/36 |
| Cenários com todos os turnos aprovados | 30/30 | 28/30 |
| Tentativas com consumo observado | 37/37 | 36/36 |
| Falhas mecânicas / respostas indisponíveis finais | 0 / 0 | 0 / 0 |
| Equivalente de API Standard USD, total | 1,05342560 | 0,35362034 |
| Equivalente USD por turno | 0,02926182 | 0,00982279 |
| Equivalente USD por turno aprovado tecnicamente | 0,02926182 | 0,01040060 |
| Tempo médio da resposta completa | 11,365 s | 10,299 s |
| Mediana do tempo | 10,224 s | 10,504 s |
| p95 do tempo | 27,589 s | 18,274 s |
| Tentativas Luna / Sol | 0 / 37 | 26 / 10 |

O custo de uma tentativa rejeitada de Sol no caso `CONV-financial-09` está incluído no
numerador. A redução por turno aprovado é **64,46%**, considerando também os gastos dos dois
turnos reprovados do híbrido. A mediana não melhorou; a diferença na média não demonstra
superioridade universal de velocidade, e há grupos em que o híbrido foi mais lento.

## Recorte por grupo

| Grupo | Turnos por braço | Aprovação Sol / híbrido | Equivalente USD Sol / híbrido | Tempo médio Sol / híbrido |
|---|---:|---:|---:|---:|
| Conversa geral | 6 | 6 / 6 | 0,06796600 / 0,00612882 | 6,187 / 5,737 s |
| Consulta documental | 6 | 6 / 6 | 0,17370400 / 0,03821460 | 8,385 / 8,319 s |
| Financeiro | 6 | 6 / 6 | 0,26898080 / 0,04419710 | 20,583 / 11,847 s |
| Insuficiência/conflito | 6 | 6 / 5 | 0,18153200 / 0,09816150 | 10,218 / 12,133 s |
| Continuidade | 12 | 12 / 11 | 0,36124280 / 0,16691832 | 11,409 / 11,880 s |

## Falhas de qualidade preservadas

1. `hybrid-runtime / CONV-handover-03 / turno 1`, Luna: conteúdo documental e citação
   corretos, mas `specialist.required=true` para responsável técnico com justificativa
   afirmando que nenhum especialista era necessário. Encaminhamento contraditório.
2. `hybrid-runtime / CONV-conventions-15 / turno 1`, Sol: a resposta informa corretamente
   que a minuta propõe R$ 200,00, está sem assinatura e com vigência contestada, mas a
   resposta final `abstained` não contém nenhuma citação. O trecho estava recuperado;
   o defeito é a afirmação documental sem referência final, não fabricação do valor.

A segunda ocorrência veio de Sol dentro do híbrido: a diferença observada não pode ser
atribuída exclusivamente à Luna. Os dois braços preservaram números, conflitos e a chegada
de documentos nos demais turnos revisados. Variações menores de completude/estilo constam
das justificativas por turno, sem punir concisão que resolve a pergunta. Não houve alteração
de prompt ou validação para fazer as respostas passarem, nem reexecução para substituir falhas.
Esses achados exigem tratamento antes de uma decisão de liberação; não foram corrigidos
silenciosamente nesta tarefa de medição.

## Método e limites de custo

Trinta IDs fixados antes da execução, seis por grupo; seis cenários têm dois turnos.
Mesma memória ligada, corpus, aplicação e budgets nos dois braços; uma execução sequencial
com ordem dos braços alternada por cenário. A política de roteamento permaneceu `luna-sol-v1`.
O replay usa autorização, recuperação, caso de uso, persistência e endpoints reais em memória.
Gabaritos não entram no prompt; os 72 turnos finais foram auditados pelo autor como revisão
técnica por IA. Formulários especializados continuam pendentes e não foram preenchidos.

O ambiente não tinha chave OpenAI de API configurada. As 73 gerações consumiram o plano
Codex/ChatGPT local. `billedCost=null`: nenhum valor faturado atribuível foi obtido. O
equivalente USD aplica preços Standard verificados em 23/11/2026 aos tokens observados no CLI.
O CLI não informa escrita de cache; essa parcela **não está incluída**. O overhead do CLI
está incluído nos tokens e no tempo. Esses valores não são orçamento por mensagem do
transporte API em produção, nem consumo exato da franquia, nem rateio da assinatura.

Sol: 718.757 tokens de entrada, incluindo 257.536 lidos de cache, e 10.523 de saída.
Híbrido: 493.983 de entrada, incluindo 44.544 lidos de cache, e 11.724 de saída. Cache
integra entrada, e raciocínio faturável integra saída; nenhum deles foi somado novamente.
Não há conversão BRL, imposto, infraestrutura, OCR, embeddings, áudio ou pesquisa nesta conta.

Fontes oficiais: [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) e
[contabilização de cache](https://developers.openai.com/api/docs/guides/prompt-caching).

## Correção entregue

`usage-accounting.ts` calcula estimativa USD versionada com entrada comum, cache lido,
escrita 30m/12h e saída, incluindo o adicional de contexto extenso quando aplicável.
Contadores ausentes, inválidos/incompatíveis, custo fora da representação segura ou modelo
sem tarifa deixam a estimativa desconhecida. O campo BRL legado continua sem representar
fatura; o valor USD e sua indisponibilidade têm campos próprios.

O gateway captura consumo antes de rejeitar resposta incompleta, texto/JSON/citação inválidos
ou HTTP com usage. Preserva a classe do erro, sem registrar mensagens arbitrárias. O caso de
uso mantém os recibos das tentativas nos metadados privados do evento de resposta, usando a
persistência e o isolamento existentes; sem migration. Testes conferem reparo, recibos e o JSON
entregue à persistência SQL com escopo, sem conectar a banco real.

## Rastreabilidade da execução

- Snapshot de código: `91f3c9ea22ce017159ec1356c9e56f516dcd1671595e40d1aeac636ad50020ea`.
- Dataset: `bca3ad22038e8aff0bb5c9347630a0c7dc66cd4606a831aa37708b30eef308ac`.
- Corpus: `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`.
- Código/corpus congelados, checkpoints e recibos: `.local/conversation-comparisons/2026-11-23-cost30-r1/`.
- Auditoria por turno e comparação final: `.local/cost-074/technical-audit.json` e `comparison.json`.
- Relatórios integrais e formulários: `reports/conversations-2026-11-23-cost30-r1-*.json`.

Os artefatos locais são privados e ignorados pelo Git. As correções defensivas do parser
API e o agregador final acrescentados depois do snapshot não alteram o percurso Codex usado
na comparação; os hashes dos módulos desse percurso são conferidos separadamente.

## Gates

| Gate | Resultado final |
|---|---|
| Formatação global, lint global e tipos | Aprovados; fixture E2E posterior também conferida. |
| Unitários | 2.818/2.818 em 218 arquivos. |
| Cobertura statements / branches / functions / lines | 85,47% / 81,92% / 90,99% / 87,33%. |
| Módulo `usage-accounting.ts` | 100% nos quatro indicadores, sem exclusões. |
| E2E completo final | 272/272 em 44 arquivos, com acesso a loopback local. |
| Alinhamento | 74 specs aprovadas estruturalmente; alinhamento semântico da fatia revisado pelo autor. |
| Scanner de segredos | Aprovado no workspace completo. |
| Evals determinísticos | `evals` 20/20, zero P0; `evals:documentary` 50/50. |
| Revisão do código do delta | Revisão do autor concluída; revisão independente/CI remoto pendentes. |

Corepack tentou obter pnpm sem rede; as etapas canônicas foram executadas com os binários
locais, sem instalação. Na primeira execução E2E, 37 testes falharam por `connect EACCES`
ao acessar `127.0.0.1` no sandbox; passaram com loopback permitido. Uma fixture Codex antiga
respondia à emergência elétrica com frase genérica e provocava reparo extra. Ela foi corrigida
para responder ao risco, mantendo a asserção de quatro chamadas e acrescentando asserções de
segurança e especialista. A suíte E2E inteira foi repetida e passou. Registros vermelhos não
foram apagados. A cobertura unitária usa o mesmo código de produção dessa execução final;
a mudança posterior foi somente na fixture E2E e na documentação.

Não foi executada integração PostgreSQL remota ou guardada, pois não há alteração de schema
ou SQL de produção. Não houve instalação/troca de dependências, dado real, mudança de
configuração do chat, reinício do servidor do usuário, commit, merge ou deploy.

Revisão e causas dos gates iniciais em `docs/reviews/2026-11-23-cost-measurement-30.md`.
