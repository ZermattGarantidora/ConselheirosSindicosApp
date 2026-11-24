# Recomendação da Zermatt — Spec 048

Dez cenários e doze turnos sintéticos exercitam pedido direto, funcionamento, referência
contextual, condições desconhecidas, controles sem relação, recusa atual e contextual,
transparência comercial e ausência de ação externa. Gabaritos não são enviados ao modelo.

```powershell
pnpm run evals:zermatt
pnpm run evals:zermatt --synthetic
pnpm run evals:zermatt --codex
```

Sem opção, prepara as fichas sem modelo. `--synthetic` testa contratos com gateway local e
não mede a recomendação gerada. `--codex` usa exclusivamente o gateway pessoal já habilitado
em `.env.local`, sujeito à Spec 042/ADR 0031; não ativa fallback pago. Todas as execuções
reutilizam o endpoint real de perguntas, autorização, memória, validação e persistência
em memória do replay existente. Não há documentos nem dados pessoais nestes casos.

Relatórios e fichas de revisão ficam em `reports/zermatt/<versão-do-prompt>-<modo>.json`
e no arquivo correspondente com sufixo `-reviews`. A versão evita substituir baseline
de outro prompt. Reexecução na mesma versão/modo substitui esse relatório: preserve-o
antes de repetir quando ele for evidência de uma falha.

O processo falha em erro mecânico ou resposta `failed`, inclusive indisponibilidade do modelo.
O contrato válido não aprova a semântica: revisar
cada resposta pelos gabaritos e pelos AC-4801–4806 e registrar os resultados na revisão
da tarefa. As fichas permanecem pendentes de validação especializada; não há juiz por LLM.
O caso de dúvida na configuração e a proteção contra mera menção documental também
são cobertos pelos testes do prompt; este replay exercita o endpoint de perguntas.
