# Critérios de aceitação — Spec 002

| ID | Dado | Quando | Então |
|---|---|---|---|
| AC-201 | dependências instaladas pelo lockfile | `pnpm run check` é executado | lint, typecheck, testes, cobertura, specs e scanner de segredos passam em um comando. |
| AC-202 | módulo de produção com cobertura menor que 80% em uma métrica | testes com cobertura são executados | o comando falha e informa a métrica abaixo do piso. |
| AC-203 | `CondominiumId` vazio ou só com espaços | o núcleo cria o identificador | a operação falha antes de qualquer acesso dependente de tenant. |
| AC-204 | dois IDs de condomínio válidos | escopos são criados | cada operação recebe explicitamente apenas seu próprio ID. |
| AC-205 | arquivo com padrão de segredo conhecido | scanner local é executado | o scanner falha sem exibir o valor completo do segredo. |
| AC-206 | variáveis de ambiente de exemplo | a documentação é revisada | nenhuma possui valor operacional ou chave real. |
| AC-207 | contrato de saúde versionado | o contrato é validado nos testes | possui versão, endpoint, resposta de sucesso e erro padronizado. |
| AC-208 | registro de review sem aprovação ou com P0/P1 aberto | `verify-merge.ps1` é executado | a integração é recusada. |
| AC-209 | registro de review aprovado, sem P0/P1 e com comandos preenchidos | `verify-merge.ps1` é executado | os gates técnicos são executados e a evidência é aceita. |
| AC-210 | desenvolvimento sem GitHub | a documentação é consultada | existe plano concreto para habilitar checks remotos posteriormente, sem afirmar que já há bloqueio remoto. |
