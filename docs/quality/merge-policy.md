# Política obrigatória de merge

**Status:** obrigatória desde 2026-08-31  
**Escopo:** todas as alterações de código, configuração de infraestrutura, migrations, prompts e pipelines que possam mudar o comportamento do produto.

## Regra

Um merge é bloqueado até que todos os gates abaixo estejam aprovados para o commit exato que será integrado.

1. Code review do diff completo da revisão mais recente, realizado por revisor independente ou pelo fluxo de revisão aprovado do projeto.
2. Nenhum achado P0 ou P1 de code review permanece pendente.
3. Todos os testes aplicáveis passam: unitários, integração, e2e, segurança e evals quando a mudança atingir comportamento de IA.
4. A cobertura unitária global é de no mínimo 80% em cada métrica: statements, branches, functions e lines.
5. Os status checks obrigatórios de CI estão aprovados.
6. O gate de alinhamento de specs passa quando uma spec foi criada ou alterada.

Não há exceção implícita para mudanças pequenas, urgentes ou geradas por IA.

## Definição de code review aprovado

O review deve avaliar o diff contra a spec e o código ao redor, cobrindo comportamento, autorização, isolamento por condomínio, erros, concorrência, segurança, privacidade e testes quando aplicável.

O review é aprovado apenas se:

- foi executado sobre a revisão mais recente do branch;
- identifica claramente a base ou o commit revisado;
- não possui achados P0 ou P1 pendentes;
- achados P2 ou P3 aceitos possuem justificativa rastreável;
- confirma que testes relevantes existem para o comportamento alterado.

Uma revisão anterior perde validade se o diff mudar materialmente.

## Cobertura unitária

O relatório deve indicar, no mínimo, estas métricas globais:

| Métrica | Piso de merge |
|---|---:|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

Não é permitido excluir código de produção apenas para elevar o percentual. Exclusões só podem cobrir código gerado, declarativo ou comprovadamente inalcançável e exigem justificativa revisada. Regras de autorização, isolamento, persistência, segurança, migrações e domínio não podem ser excluídas.

Cobertura é um piso, não substitui testes de cenários críticos: isolamento entre condomínios, abstenção, citações, falha segura, upload e revogação continuam exigindo testes direcionados.

## Aplicação técnica

O projeto possui Git e gates locais. Antes de uma integração local, o responsável deve preencher um registro em `docs/reviews/` e executar `pnpm run verify:merge -- -ReviewFile <arquivo>`. O verificador exige aprovação, commit/diff revisado, revisor independente, zero P0/P1 e roda o gate técnico único.

O repositório remoto e o workflow de CI já existem. A proteção da `main` ainda precisa ser ativada; até lá, o plano de bloqueio está em [CI e proteção remota do GitHub](github-deferred.md). A política deve permanecer bloqueio técnico por meio de:

- comando único de testes e cobertura;
- relatório de cobertura processável pela CI;
- workflow de CI no provedor escolhido;
- status checks obrigatórios na branch principal;
- exigência de aprovação de review;
- bloqueio de merge quando qualquer check falhar ou estiver ausente.

Configuração que apenas informa falhas, mas permite merge, não atende a esta política.

## Evidências mínimas por pull request

- link ou identificação do review aprovado;
- commit revisado;
- comandos executados;
- resultados de teste;
- relatório de cobertura com as quatro métricas;
- evals executados, quando aplicável;
- exceções P2/P3 e sua justificativa, se existirem.

## Exceções

Não há exceção automática. Uma exceção extraordinária exige aprovação explícita do responsável pelo produto, registro do risco e um plano com prazo para restaurar o gate. Não é permitida para P0, vazamento entre condomínios, acesso não autorizado ou violação de dados.
