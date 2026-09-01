# Estratégia de testes determinísticos

Esta pasta receberá os testes depois da escolha de stack. O objetivo deste arquivo é impedir que qualidade de software seja confundida com evals de modelo.

## Camadas previstas

### Unitários

- regras de membership e revogação;
- transições de estado de documento;
- versão e vigência;
- normalização de página e offsets;
- política de suficiência determinística;
- validação de schema e citação;
- cálculo de budget e custo.

### Integração

- políticas de isolamento no banco;
- storage privado e links temporários;
- fila e worker com tenant correto;
- indexação e busca filtrada;
- invalidação/segmentação de cache;
- contratos de OCR, busca e gateway de IA;
- migrations e ciclo de vida dos dados.

### End-to-end

- upload até abertura da citação;
- abstenção sem evidência;
- conflito entre versões/fontes;
- feedback;
- revogação de acesso;
- falha segura de dependência.

## Suites P0 obrigatórias

- `authz/condominium-access`;
- `retrieval/tenant-isolation`;
- `cache/tenant-isolation`;
- `storage/tenant-isolation`;
- `jobs/tenant-isolation`;
- `citations/source-location`;
- `answers/abstention`;
- `security/document-prompt-injection`;
- `answers/dependency-failure`.

## Dados

Use o corpus de `evals/fixtures/synthetic-corpus.yaml` ou factories equivalentes. Nunca copie documentos, identificadores ou dados reais de clientes para os testes.

## Convenções futuras

Quando a stack for escolhida, registrar aqui:

- framework e layout de testes;
- comandos canônicos;
- estratégia de banco temporário;
- política de mocks versus serviços reais;
- cobertura mínima por risco;
- paralelização e tempo alvo de CI.
