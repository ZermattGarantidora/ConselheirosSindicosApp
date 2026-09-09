# Gates de qualidade

**Status:** inicial, deve ser calibrado com a baseline  
**Atualizado em:** 2026-08-31

## Princípio

Qualidade de software e qualidade da IA são verificadas separadamente. Nenhum score médio pode compensar falha de isolamento, autorização ou fabricação de fonte.

## Gates por mudança

| Gate | Aplicação | Critério inicial |
|---|---|---|
| Alinhamento com a visão | Toda spec nova ou alterada | Revisão semântica e `scripts/validate-spec-vision.ps1` aprovados |
| Rastreabilidade | Toda mudança funcional | Requisito, aceitação e teste/eval vinculados |
| Code review | Todo merge | Diff completo da revisão mais recente aprovado; nenhum P0 ou P1 pendente |
| Formatação e lint | Todo código | Sem erros |
| Typecheck/compilação | Todo código tipado | Sem erros |
| Testes unitários | Regras de domínio | Todos passam; cobertura de statements, branches, functions e lines >= 80% |
| Testes de integração | Banco, storage, fila e provedores | Todos passam |
| Testes de isolamento | Toda persistência e recuperação | Zero acesso cruzado |
| E2E | Fluxos prioritários | Todos os cenários P0 passam |
| Evals | Prompt, modelo, retrieval ou parsing | Sem regressão P0; demais dentro da tolerância aprovada |
| Segurança | Upload, auth, dados e dependências | Sem achado crítico ou alto não aceito |
| Migração | Mudança de schema | Ida, compatibilidade e rollback/forward-fix verificados |
| CI e proteção de branch | Todo merge | Todos os status checks obrigatórios aprovados no commit que será integrado |

## Invariantes P0

Os seguintes resultados exigem bloqueio da entrega:

- merge sem code review aprovado da revisão mais recente;
- qualquer teste aplicável ausente, não executado ou reprovado;
- cobertura unitária abaixo de 80% em statements, branches, functions ou lines;
- qualquer vazamento ou recuperação entre condomínios;
- acesso sem autorização vigente;
- citação de documento, versão ou página inexistente;
- execução de instrução encontrada dentro de documento;
- apresentação de fato sem evidência em cenário que exige abstenção;
- exposição de segredo ou dado pessoal em log, fixture ou telemetria;
- ação externa sem confirmação humana.

## Metas iniciais para evals

Estas metas são provisórias e devem ser recalibradas depois da primeira execução com casos revisados por especialistas:

- 100% dos casos P0 aprovados;
- pelo menos 95% de citações válidas e realmente sustentadoras;
- pelo menos 90% de respostas corretas nos casos respondíveis;
- pelo menos 95% de abstenções corretas nos casos sem base;
- 100% de escalonamento nos casos de alto risco marcados como obrigatórios;
- nenhuma regressão estatisticamente relevante de custo ou latência sem decisão registrada.

## Definition of Done

Uma tarefa está pronta quando:

1. a spec demonstra alinhamento com a visão canônica do briefing;
2. a spec e a aceitação descrevem o comportamento entregue;
3. a matriz de rastreabilidade foi atualizada;
4. testes e evals relevantes foram criados ou justificados;
5. todos os gates aplicáveis foram executados;
6. falhas conhecidas estão registradas e classificadas;
7. telemetria não coleta conteúdo sensível desnecessário;
8. documentação, contratos e código estão coerentes;
9. o diff foi revisado com foco em correção, segurança, escopo e aderência à visão, sem achados P0 ou P1 pendentes;
10. todos os testes aplicáveis passaram no commit atual;
11. a cobertura unitária atende a 80% em statements, branches, functions e lines;
12. os status checks obrigatórios de CI estão aprovados.

## Evolução

Cada incidente, bug de produção, correção do usuário ou falha de especialista deve originar um teste ou eval sanitizado. O conjunto de 20 casos sintéticos deve crescer para pelo menos 100 perguntas reais anonimizadas antes da seleção definitiva de modelos e do piloto pago.
# Gates executáveis locais

## Comando canônico

```powershell
pnpm run check
```

Ele executa formatação, lint, typecheck, cobertura unitária, validação de alinhamento de specs e scanner de segredos. Qualquer falha bloqueia a continuação.

## Integração local

```powershell
pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md
```

O arquivo de review deve seguir [o template](../reviews/TEMPLATE.md). O processo não substitui a proteção remota de branch, que será configurada ao adotar GitHub.

Para mudanças em retrieval, respostas, prompts, parsing ou evals, o checklist local de
release também exige:

```powershell
pnpm run evals
```

## Segurança de dependências

```powershell
pnpm run audit:dependencies
```

Execute antes de releases; achados altos ou críticos bloqueiam a liberação até tratamento registrado.
