# Plano técnico — Spec 001

**Status:** em execução local  
**Atualizado em:** 2026-09-01

## 1. Estratégia

Entregar uma fatia vertical em um monólito modular, com processamento assíncrono de documentos. A aplicação web, API e módulos de domínio permanecem em uma unidade implantável; OCR e indexação podem executar em worker separado usando os mesmos contratos.

ADRs relacionados:

- `docs/adr/0001-arquitetura-inicial.md`;
- `docs/adr/0002-isolamento-por-condominio.md`;
- `docs/adr/0003-estrategia-de-ia.md`;
- `docs/adr/0005-postgresql-pgvector.md`.
- `docs/adr/0006-stack-local-e-servicos-adiados.md`.

## 2. Módulos

### Identity e Membership

Autentica usuários, resolve associações e produz um contexto autorizado de condomínio. Nenhum outro módulo aceita apenas o identificador vindo do cliente.

### Condominiums

Mantém o cadastro mínimo e a associação dos membros.

### Documents

Recebe o original, calcula hash, registra metadados, versão, vigência e estado de processamento.

### Processing

Extrai texto, aplica OCR quando necessário, mede qualidade, divide em chunks e preserva página e offsets.

### Retrieval

Combina filtros determinísticos com busca textual/semântica e reranking. O isolamento é aplicado antes do ranking.

### Answers

Orquestra classificação de risco, recuperação, suficiência de evidência, geração estruturada, validação de citações e resposta final.

### Feedback e Audit

Registra avaliação do usuário, proveniência da resposta, versões técnicas, latência e custo.

## 3. Modelo conceitual

Entidades iniciais:

- `User`;
- `Condominium`;
- `Membership`;
- `Document`;
- `DocumentVersion`;
- `DocumentPage`;
- `DocumentChunk`;
- `ProcessingJob`;
- `Question`;
- `Answer`;
- `Citation`;
- `Feedback`;
- `ModelInvocation`;
- `AuditEvent`.

Todas as entidades de domínio persistidas carregam `condominium_id`, inclusive as derivadas. Tabelas globais de configuração são exceções explícitas e não armazenam conteúdo do cliente.

O desenho físico, as entidades auxiliares necessárias para proveniência e as constraints compostas estão detalhados em `docs/architecture/database-schema.md`. Esse desenho separa a versão imutável de seu estado operacional, limita chunks a uma página no MVP e torna claims e evidências relações verificáveis.

## 4. Fluxo de ingestão

1. Validar associação e permissão.
2. Validar tipo, tamanho e assinatura real do arquivo.
3. Calcular hash e armazenar original em caminho escopado.
4. Criar `DocumentVersion` imutável como `uploaded`.
5. Enfileirar processamento com identificadores escopados.
6. Extrair texto por página; usar OCR somente quando necessário.
7. Calcular sinais de qualidade e marcar `needs_review` quando aplicável.
8. Criar chunks com origem completa.
9. Gerar representações de busca sem remover filtros de tenant.
10. Publicar `ready` somente após validação de consistência.

O worker revalida o condomínio da mensagem contra a versão carregada. Mensagens não podem fornecer caminho arbitrário de storage.

## 5. Fluxo de pergunta

1. Resolver `AuthorizedCondominiumContext` no servidor.
2. Persistir a pergunta minimizada.
3. Classificar intenção e risco com regra ou modelo econômico.
4. Recuperar candidatos filtrados por condomínio, permissão, estado, versão e vigência.
5. Reranquear somente o conjunto autorizado.
6. Avaliar suficiência, qualidade do OCR e conflitos.
7. Abster-se antes da geração quando a insuficiência for determinística.
8. Gerar saída estruturada usando apenas evidências identificadas.
9. Validar schema, citações e vinculação de cada afirmação.
10. Persistir trilha, telemetria e resposta.
11. Exibir o resultado e permitir abertura das fontes.

## 6. Contratos importantes

### Contexto autorizado

Um objeto interno imutável deve conter usuário, condomínio, papel e permissões resolvidos. Repositórios e serviços recebem esse objeto, não um `condominium_id` livre.

### Evidência

Cada evidência contém identificadores, página humana, offsets, texto, score, qualidade de extração e metadados de vigência.

### Gateway de IA

O gateway recebe tipo de tarefa, classe de risco, budget, schema de saída, evidências autorizadas e versão do prompt. Retorna saída estruturada e telemetria normalizada.

## 7. Controles de segurança

- autorização no entrypoint e na camada de dados;
- defesa em profundidade no banco e storage;
- filtros de tenant em busca e cache;
- arquivos privados e URLs temporárias;
- validação de tipo, tamanho e parser;
- processamento isolado de arquivos;
- nenhum segredo em prompt, log ou resposta;
- validação pós-geração de fontes;
- limites por usuário e condomínio;
- exclusão e retenção projetadas desde o schema inicial.

O modelo de ameaças detalhado está em `docs/security/threat-model.md`.

## 8. Testes

### Determinísticos

- unitários para regras de vigência, estado e permissão;
- integração com banco, storage, fila e índice;
- testes de propriedade para garantir escopo de tenant;
- contratos dos adaptadores de OCR, busca e IA;
- e2e da ingestão até a abertura da citação;
- casos de falha e revogação concorrente.

### Evals

- grounding e correção;
- citação;
- abstenção;
- conflito;
- prompt injection;
- escalonamento;
- mudança de prompt, retrieval ou modelo;
- custo e latência.

O primeiro adapter de eval deve exercitar o mesmo endpoint/caso de uso utilizado pela interface, não somente um prompt isolado.

## 9. Observabilidade

- correlação por requisição e etapa;
- contagem e duração de jobs;
- taxa de falha por parser/OCR/provedor;
- quantidade de candidatos e scores normalizados;
- modo da resposta;
- versão de prompt, modelo e pipeline;
- tokens, cache e custo estimado;
- feedback agregado;
- alertas para consumo anormal e tentativa de acesso cruzado.

## 10. Marcos

### M0 — Escolhas e scaffold

Escolher stack, registrar comandos, inicializar Git/CI e criar aplicação mínima.

### M1 — Isolamento

Implementar identidade, condomínios, memberships e testes negativos de autorização.

### M2 — Documentos

Implementar upload privado, versão, processamento de PDF e navegação por página.

### M3 — Retrieval

Implementar indexação, busca filtrada e testes com frases-canário.

### M4 — Resposta

Implementar gateway de IA, saída estruturada, abstenção, conflito e validação de citações.

### M5 — Qualidade

Conectar dataset de eval ao caminho real, registrar baseline, adicionar feedback, telemetria e gates de CI.

## 11. Rollout

Usar somente corpus sintético até os P0 passarem. Depois, executar piloto fechado com documentos anonimizados, feature flag por condomínio e revisão humana das primeiras respostas. Nenhuma resposta do piloto deve executar ações externas.
