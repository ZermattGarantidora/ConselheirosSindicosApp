# Evals do conselheiro documental

Esta pasta contém a especificação inicial das avaliações probabilísticas e de comportamento da aplicação. Os casos ainda não são executáveis porque a stack e o endpoint do produto não foram definidos.

## Objetivo inicial

Avaliar uma promessa visível ao usuário:

> A aplicação responde somente com evidências autorizadas do condomínio selecionado, cita corretamente ou se abstém.

## Arquivos

- `fixtures/synthetic-corpus.yaml`: documentos e trechos fictícios, sem dados de clientes.
- `datasets/consulta-documental.yaml`: 20 casos iniciais de comportamento e regressão.

## Regras

- Nunca adicionar documentos reais, segredos ou dados pessoais.
- Executar os casos contra o caminho usado pela aplicação, não apenas contra o prompt bruto.
- Registrar uma baseline antes de mudar prompt, modelo, chunking, embeddings, reranking ou thresholds.
- Bloquear toda falha P0.
- Separar asserções determinísticas de julgamentos probabilísticos.
- Validar citações deterministicamente sempre que possível.
- Todo bug relevante deve virar um caso sanitizado.

## Tipos de asserção

### Determinísticas

- status HTTP/operação;
- schema da resposta;
- `answerMode`;
- IDs permitidos de evidência;
- existência do trecho na página;
- ausência de tenant ou frase-canário proibidos;
- escalonamento obrigatório;
- persistência de feedback e trilha.

### Probabilísticas

- correção semântica;
- fidelidade/grounding;
- suficiência e clareza;
- qualidade da explicação de conflito;
- utilidade do próximo passo.

Asserções probabilísticas devem combinar rubricas claras com revisão humana periódica. Um avaliador por modelo nunca substitui os bloqueios determinísticos.

## Adapter futuro

Depois da escolha de stack, criar um adapter que:

1. restaure o corpus sintético em ambiente isolado;
2. configure usuários e memberships do caso;
3. chame o mesmo caso de uso ou endpoint da interface;
4. capture resposta, evidências, traces normalizados, custo e latência;
5. aplique asserções determinísticas;
6. aplique rubricas probabilísticas;
7. produza relatório comparável com a baseline.

O comando canônico futuro deve ser simples, por exemplo `npm run evals` ou equivalente da stack escolhida, e entrar no `README.md` e no CI/checklist de release.

## Crescimento do dataset

O corpus inicial possui 20 casos sintéticos. Antes do piloto:

- coletar pelo menos 100 perguntas reais anonimizadas;
- obter expectativa revisada por síndicos e especialistas;
- cobrir documentos longos, escaneados e conflitantes;
- incluir erros reais encontrados durante testes;
- estratificar resultados por tarefa, risco, tipo de documento e qualidade do OCR.
