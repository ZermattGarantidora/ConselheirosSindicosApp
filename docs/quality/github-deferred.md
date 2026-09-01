# GitHub adiado — plano obrigatório antes do primeiro merge remoto

**Decisão atual:** o projeto começa com Git local, sem repositório ou automações no GitHub.

Isto não reduz a política de merge: até haver colaboração remota, a integração local exige o registro de review e `scripts/verify-merge.ps1`. O bloqueio remoto ainda não existe e não deve ser declarado como configurado.

## Itens para executar quando GitHub for adotado

1. Criar repositório privado e definir as pessoas responsáveis por produto e segurança.
2. Adicionar CI que execute `pnpm install --frozen-lockfile` e `pnpm run check` em cada pull request.
3. Publicar e exigir os checks de lint, typecheck, testes, cobertura (quatro métricas), specs, segredos e dependências.
4. Proteger a branch principal: pull request obrigatório, ao menos um review aprovado para o commit atual, conversa resolvida, branches atualizadas e nenhum bypass rotineiro.
5. Configurar secrets no repositório/ambiente, nunca no código; separar ambientes de desenvolvimento, homologação e produção.
6. Ativar Dependabot ou equivalente, scanner de segredos, CodeQL/SAST, geração de SBOM e política de atualizações.
7. Adicionar `CODEOWNERS` para módulos de segurança, tenancy, migrações, IA e infraestrutura.
8. Exigir artefatos de cobertura, resultados de eval e evidência do review em toda mudança de comportamento de IA.

O item 2 é o marco que transforma os gates locais em bloqueios remotos reais.
