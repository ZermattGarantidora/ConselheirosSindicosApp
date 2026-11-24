# Alterações históricas preservadas em 24/11/2026

Este diretório conserva os deltas de código e documentação encontrados em worktrees antigos
durante a consolidação solicitada pelo usuário. Os patches são arquivo histórico: não foram
aplicados à implementação atual, não são specs ativas e não autorizam integrações ou piloto.
O briefing vigente e a documentação atual continuam sendo as fontes de verdade.

| Patch | Origem | Conteúdo |
| --- | --- | --- |
| `b3-document-processing.patch` | Worktree destacado em `9c3a8c2` | Processamento documental, OCR, persistência, testes e documentação antigos. |
| `b7-pilot-preparation.patch` | Worktree destacado em `7bcce1e` | Preparação documental do piloto de setembro e registros correspondentes. |
| `synthetic-pilot-ui.patch` | Cópia `piloto-sintetico` desse worktree | Alterações antigas da interface sintética e seus testes. |

Os deltas incluem arquivos versionados alterados e novos arquivos de código/documentação.
Credenciais, arquivos de ambiente privados, dependências, caches, `output/` e `tmp/` não fazem
parte dos patches. Os diretórios originais foram preservados. A existência desses arquivos
não significa que a revisão ou os testes antigos aprovem sua aplicação sobre a versão atual.

Cada patch foi gerado contra o `HEAD` de sua própria origem, registrado no cabeçalho.
Qualquer reaproveitamento exige comparação com o código atual, revisão e os gates aplicáveis.
