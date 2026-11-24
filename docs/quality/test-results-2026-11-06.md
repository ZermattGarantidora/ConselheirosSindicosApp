# Baterias de testes — 06/11/2026

**Solicitação:** executar as baterias técnicas e avaliações apresentadas ao usuário.  
**Estado:** execução concluída; gate técnico canônico aprovado, avaliação real de gateway com quatro rejeições e revisão especializada pendente.  
**Base:** checkout local sobre `3b702db6f91dbbeb2ede1a6063053296298d913c`, com alterações preexistentes preservadas. Não é certificação de um commit limpo ou aprovação de merge.

## Resultado técnico

| Bateria | Resultado desta execução | Evidência local |
|---|---|---|
| `pnpm run check` | Aprovado integralmente na repetição final: formatação, lint, tipos, cobertura, visão e scanner de segredos | `.local/validation-2026-11-06/check-final.log` |
| Unidade e E2E, com cobertura | 2.226/2.226 testes; 200 arquivos | `.local/validation-2026-11-06/check-final.log` |
| Cobertura exclusivamente unitária | 2.012/2.012 testes; 168 arquivos; todos os pisos de 80% atendidos | `.local/validation-2026-11-06/unit-coverage.log` |
| Integração PostgreSQL/RLS e recuperação | 17/17; Neon dedicado sintético; migrations já atualizadas | `.local/validation-2026-11-06/integration.log` |
| API e worker em processos separados | 9 grupos aprovados; recuperação integral das 300 páginas, dois workers, dez identidades e negativa entre condomínios | `reports/worker-separated/latest.json` |
| Evals básicos | 20/20; zero falha P0 | `.local/validation-2026-11-06/evals.log` |
| Evals documentais determinísticos | 50/50 | `.local/validation-2026-11-06/documentary.log` |
| Contratos semânticos sintéticos | 50/50; não avaliam qualidade de modelo | `.local/validation-2026-11-06/semantic-contract.log` |
| Contratos de conversas | 280 cenários, 1.010 turnos, zero erro mecânico; uma resposta em modo `failed`, discriminada abaixo | `reports/conversations-synthetic.json` |
| Evals legais determinísticos | 21/21 testes | `.local/validation-2026-11-06/legal.log` |
| Piloto sintético | 100 casos pelo endpoint, encapsulados em um teste aprovado | `.local/validation-2026-11-06/pilot-synthetic.log` |
| Builds web e API | Aprovados | `.local/validation-2026-11-06/build-web.log` e `build-api.log` |
| Runtime compilado | Dois PDFs e 20 consultas; zero chamada de provedor; pico observado de 152 MiB | `.local/validation-2026-11-06/production.log` |
| PDF textual de 300 páginas | Aprovado: indexação em 2.185 ms, consultas repetidas entre 655 e 1.261 ms, pico de RSS de 292,50 MiB | `reports/long-pdf/latest.json` |
| Auditoria de dependências | Nenhuma alta/crítica; cinco baixas e quatro moderadas | `.local/validation-2026-11-06/dependencies-network.log` |
| Gate de visão | 69 specs no gate estrutural | `.local/validation-2026-11-06/check-final.log` |

O `test:coverage` já inclui os 32 arquivos E2E; não se somam novamente esses testes ao total. A cobertura configurada abrange a API e os dois módulos compartilhados declarados em `vitest.config.ts`, não todo o código React.

| Indicador | Unidade + E2E | Somente unidade | Piso |
|---|---:|---:|---:|
| Statements | 91,92% | 88,29% | 80% |
| Branches | 88,73% | 84,12% | 80% |
| Functions | 96,35% | 93,32% | 80% |
| Lines | 93,52% | 90,03% | 80% |

## Cinquenta casos documentais com geração real

Os 50 casos da Spec 036 foram executados pelo `replaySemanticCases`, com injeção explícita do gateway Codex já autorizado e da configuração híbrida local. O gateway escolheu Sol 6.1 low em 48 casos e Luna high em dois; não é uma comparação equilibrada dos modelos. Perguntas e evidências vieram do pacote existente. Gabaritos, rubricas e a leitura técnica posterior não foram enviados ao gateway.

**Resultado: 46 contratos válidos e quatro saídas rejeitadas. A rodada não está aprovada.** As quatro saídas trouxeram envelope JSON dentro de `answer`; o validador compartilhado retornou `answer_body_protocol_json`:

| Caso | Pergunta/tema | Resultado |
|---|---|---|
| `SR-06-ATA` | Decisão sobre portão sem evidência legível | JSON no corpo da fala; rejeitado |
| `SR-08-NOR` | Valor de multa sem fonte verificável | JSON no corpo da fala; rejeitado |
| `SR-04-VER` | Conteúdo da página 4 sem trecho disponível | JSON no corpo da fala; rejeitado |
| `SR-07-CIT` | Orientação geral para manutenção | JSON no corpo da fala; rejeitado |

O replay invoca o gateway diretamente e valida sua saída, sem o reparo do caso de uso HTTP completo. Portanto, essas falhas não demonstram que o JSON seria publicado na interface nem medem a recuperação após reparo. O comportamento observado fica preservado; nenhum resultado foi substituído por outra geração bem-sucedida.

O assistente leu tecnicamente as 50 respostas e suas evidências. Nas 46 válidas não identificou outra extrapolação relevante nessa leitura. O raio-X parcial preservou valores e lacunas, mas não usou literalmente os rótulos do gabarito antigo; a observação foi conservada. Isso não é homologação profissional, revisão independente ou taxa geral de acurácia. Os julgamentos de contador, jurista e síndico permanecem em branco; `semanticApproved` continua nulo.

Artefatos locais: `.local/validation-2026-11-06/semantic-real-r2/report.json` e `technical-review.json`, com evidências, telemetria e hashes das respostas. Observados 688.453 tokens de entrada e 13.487 de saída nas 50 gerações concluídas. Oito tentativas anteriores de processo não produziram telemetria de uso; não se presume custo zero. Não houve fallback para API paga.

## Limitação revelada no replay de conversas

`CONV-long-36`, turno 30, terminou em modo `failed` no fechamento da pauta corrigida, com `task_coverage_missing`. O formato e o isolamento passaram, mas o pedido não foi atendido. A resposta é conservada separadamente de zero erros mecânicos e não conta como aprovação de qualidade. Essa rodada usa gateway sintético: não atribui o comportamento a um modelo real. Não foi repetida nesta tarefa a matriz histórica inteira de conversas com Luna/Sol.

## Verificação no navegador

Instância compilada isolada, acesso `sindico-demo`, armazenamento de credenciais próprio e nenhuma chamada externa de IA. Confirmados: página mínima de entrada, login pelo código sintético, sessão restaurada após recarga, menu de documentos, Perfil, alternância claro/escuro, ausência de transbordamento horizontal em 320 px e logout mantido após recarga.

A configuração conversacional estava corretamente indisponível nesse runtime sem IA; envio e resposta documental completos pelo navegador não foram medidos. Os fluxos HTTP e ingestão foram exercitados pelas suítes automatizadas. A sessão sintética e a instância isolada foram encerradas, e o viewport restaurado. A demonstração existente não foi reiniciada.

## Condições da execução e integridade

Node 24.20.0, pnpm 11.19.0 e um worker do Vitest. Nenhuma dependência foi instalada ou atualizada. O pnpm tentou consultar metadados no registro sob rede restrita, sem impedir a execução dos binários instalados. A auditoria foi repetida com rede e aprovada no limite alto/crítico.

O caminho de CLI guardado no ambiente local estava desatualizado; foi substituído somente nos processos desta validação pelo executável instalado. O arquivo de ambiente não mudou. A geração real e o Neon exigiram execução com rede/sessão autorizadas. A seleção do banco removeu somente no processo as variáveis de Supabase e operação, preservando TLS, confirmação, marcador e proteção de limpeza do destino sintético.

O primeiro `pnpm run check` aprovou formatação, lint, tipos, todos os testes, cobertura e visão. O scanner final interrompeu com `ENOENT` ao ler `answer-schema.json` removido por uma geração concorrente em diretório temporário. Não foi achado de segredo. O gate completo foi repetido, mantendo a segunda varredura após o encerramento das gerações: terminou com código zero e nenhum padrão conhecido de segredo encontrado. Resultado final em `.local/validation-2026-11-06/check-final.log`.

A inspeção do diff também sinalizou quatro espaços finais preexistentes em `docs/specs/016-chat-unico-bloco-1/acceptance.md` (linhas 64–67, quebras de linha Markdown); a comparação de hashes confirma que esse arquivo não foi alterado nesta tarefa.

Os manifestos locais `source-before.json` e `git-before.txt` registram a base. A comparação de hashes de 844 arquivos preexistentes detectou somente a inclusão desta rodada na rastreabilidade; este relatório é novo. Não foram alterados comportamento, prompt, gabarito, asserções ou configuração de cobertura para obter aprovação. Nenhum commit, merge, deploy ou uso de dados reais foi realizado. A prova sintética não certifica OCR real, disponibilidade da hospedagem, capacidade de produção ou restauração completa do ambiente real.
