# Aceitação — Spec 042

| Caso | Requisitos | Resultado esperado |
|---|---|---|
| AC-4201 | RQ-4201 | Opt-in em demonstração local seleciona Codex para resposta e configuração, mesmo com chaves de API presentes; sem opt-in mantém seleção anterior. |
| AC-4202 | RQ-4201 | Produção ou execução fora da demonstração recusa a ativação do adaptador. Falhas não acionam outros provedores. |
| AC-4203 | RQ-4202 | Execução sem shell, credenciais de API, sessões anteriores, ferramentas ou configuração pessoal; temporários distintos por chamada e limpos em sucesso e erro. |
| AC-4204 | RQ-4203 | Resposta geral e JSON de configuração preservados; saída documental reconstrói documento, versão e página das evidências recebidas. |
| AC-4205 | RQ-4203 | Erro, timeout, saída vazia/inválida/incompleta, ferramenta inesperada ou processo ausente falham de forma fechada, sem vazar stderr ou prompt. |
| AC-4206 | RQ-4204 | Tokens, hashes, modelo e latência presentes; API e interface identificam Codex sem chave ou texto sensível. |
| AC-4207 | RQ-4201 a RQ-4204 | Smoke local com dados sintéticos confirma sessão ChatGPT e uma conversa; gates mecânicos passam e limitações semânticas permanecem explícitas. |

Comandos: `pnpm run check`, `pnpm run test:e2e`, `pnpm run evals`, `pnpm run evals:documentary`, `pnpm run build:web`. Smoke pessoal usa a configuração local ignorada pelo Git e consome a cota do operador.
