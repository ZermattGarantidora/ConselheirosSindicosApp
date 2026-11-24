# Integração local — fechamento de 11/11/2026

**Resultado:** preparação e validação local concluídas na janela 03/r4. Não é liberação para
uso real ou aprovação do branch inteiro. Nenhum commit, merge, deploy ou migration remota.
Base Git: `3b702db6f91dbbeb2ede1a6063053296298d913c`, com alterações compartilhadas preservadas.

A documentação e a implementação mantêm continuidade da sessão no mesmo aparelho e histórico
dos dois lados, inclusive falas da Alvitra. WhatsApp permanece reservado à abertura pública;
o piloto fechado conserva seu caminho de código. Não foi ativado fornecedor nesta rodada.

## Mudanças verificadas

- Identidade canônica da sessão na migration 040, com negativas de UUID bloqueado/colidente e
  preservação do legado não UUID. Planos sintéticos restritivos conservam revogações, consumo,
  login, resultados incertos e quarentena após restore, sem reenvio ou reabertura automática.
- Replay documental confere política, membership, catálogo e hash da página inteira. Alterar
  vigência ou conteúdo fora da citação nega análise corrente; histórico literal permanece.
  Interface conserva a chave até consumir e validar o corpo completo da resposta.
- Purga inclui originais órfãos e prepara todas as invalidações antes dos locks do lote.
  Restore usa destinos novos e guardados. Exclusão conserva recibos/custos mínimos e tenant B.
- O leitor do demo usa páginas integrais dos uploads com catálogo ativo obrigatório. Fonte
  arquivada retorna 404; trecho histórico permanece marcado, replay corrente é negado e
  recuperação autorizada restaura a leitura. Versões históricas de documento ativo permanecem.
- Configurações Vite/Vitest e o proxy Vite aninhado usam `envDir:false`. Regressões resolvem
  os objetos reais contra canários exclusivamente temporários, sem credencial real na fixture.

Specs 068/070/071/072, aceitação e rastreabilidade foram atualizadas antes dos respectivos
comportamentos. Não houve mudança de prompt, dependência ou autorização positiva real.

## Gates da candidata final

| Gate | Resultado | Evidência |
|---|---|---|
| `pnpm run check` | Exit 0; 2.459/2.459 unidades, 196 arquivos; formato/lint/tipos/72 specs/scanner aprovados | `.local/pilot-security/global-check-window03-1794424246880.log` |
| Cobertura unitária, sem E2E | Statements 87,57%; branches 83,70%; functions 92,84%; lines 89,44% | `.local/pilot-security/coverage-window03-1794424246880/coverage-summary.json` |
| E2E | 247/247, 39 arquivos | `.local/pilot-security/global-e2e-window03-1794424690672.{log,json,xml}` |
| Builds API/web | Aprovados; web em diretório exclusivo, sem dotenv | `global-build-api-window03-1794424756589.log` e `global-build-web-window03-1794424756615.log`, em `.local/pilot-security/` |
| Runtime compilado | Login, dois PDFs e 20 perguntas; zero provedor; pico RSS 148 MiB | `.local/pilot-security/global-runtime-window03-1794424800578.log` |
| Worker/processos/PostgreSQL local | Nove grupos, dez identidades, 300 páginas, reinício/claim/concorrência/isolamento; container encerrado | `.local/pilot-operations/container-d89b1317733e49c3b15c80b38feba266/result.json` e filho `5a0d082bd51644c79f61a42c543c9d64/worker-result.json` |
| Evals sintéticos | Core 20/20; documental 50/50 determinísticos; 280 cenários/1.010 turnos mecânicos sem falha | Logs `global-evals-*-window03-17944247809*.log`; conversas `evals-conversations-window03-1794424807835.json`, em `.local/pilot-security/` |
| Entradas congeladas | 910 arquivos sem mudança entre before/after r4; HEAD idêntico | `.local/pilot-security/global-window03-{before,after}-r4.json` |

Os evals executaram **zero inferência externa**. Os 50 casos semânticos documentais e a
qualidade de modelo/OCR efetivos continuam pendentes; contrato mecânico não os substitui.
Não houve exclusão nova de produção, redução de assertiva ou aumento de timeout para passar.

O runner recebeu ambiente explícito, temporário próprio, quatro workers e rede do Corepack
desativada. Usou o pnpm 11.19.0 já instalado. O aviso preexistente de estrutura de node_modules
foi registrado com `pnpm_config_verify_deps_before_run=warn`; não houve instalação, download,
mudança do lockfile ou alegação de nova instalação frozen. O scanner mantém sua inspeção
estática normal; `envDir:false` trata a importação automática de ambiente pelo framework.

## Provas SQL e revisões delimitadas

Reutilizadas somente onde os respectivos controles persistentes não mudaram:

- Segurança: seis cenários SQL/HTTP em `postgres-1794420919101-11476/results.json`, incluindo
  identidade, revogação, lost result, unknown/login, rollback, reconciliação e tenant B.
- Documentos: dois cenários SQL amplos, wrapper `container-911401d9b83548b58e82029a849a8fdd`.
  Os deltas posteriores corrigem o leitor do demo; SQL/ledger/purga permanecem idênticos.
- Infraestrutura: 17 RLS no wrapper `container-34d2a184928947afa135984b38fe716a` e restore/
  manutenção em `container-3b3c9d49692440669f7c0fa1c7410955`. Todos os containers encerrados.

Segurança r6 tem 24 fontes/13 artefatos, revisados independentemente por Infraestrutura,
incluindo oito canários repetidos. Infraestrutura r2 tem dez entradas revisadas por Segurança
e Documentos. Documentos r4 tem 96 entradas conferidas, 27 testes afetados pelo dono e
contraprova independente do startup arquivado, além de cinco unidades repetidas pelo revisor.
Relatórios: `2026-11-11-pilot-security-infrastructure-review.md`,
`2026-11-11-pilot-maintenance-security-review.md` e
`2026-11-11-pilot-documents-security-review.md`; mapa documental atual r5.
Autoria própria, assets, dependências sem diff e leitura parcial de `App.tsx` são identificadas.
Nenhum gatilho P0/P1/P2 reproduzido permanece aberto nesses deltas; isso não assina o checkout.

## Integridade e limites do fechamento

Manifesto final: [snapshot de 11/11](pilot-integration-snapshot-2026-11-11.json), com 910 hashes
de entrada e 18 artefatos de evidência. Capturas e vermelhos anteriores foram preservados.

**Adendo documental posterior aos gates:** Documentos corrigiu uma linha de AC-2414 da Spec
024 para a escala já vigente na Spec 016/CSS. Recibo
`.local/pilot-documents-2026-11-11/post-gates-ac2414.json`: SHA anterior `2d45c40dfc27…`,
posterior `ab0e7c366a47…`, 72 specs validadas pelo dono e 96 entradas da candidata documental
inalteradas. O snapshot r4 preserva o conteúdo testado; a conferência posterior encontra
909/910 hashes iguais e essa diferença documental explícita. Código/config/testes e os
18 artefatos de resultado permanecem iguais; não foi repetida bateria funcional por esse adendo.

EACCES do sandbox foi separado do 403 funcional; o E2E final usa HTTP local autorizado e a
guarda do Vite aninhado corrigida. O ajuste de retenção preservou a assertiva anterior.

`git diff --check` passou no conjunto de 130 entradas das três candidatas. No checkout inteiro,
retornou exit 1 apenas pelos quatro hard breaks Markdown já existentes na Spec 016,
`acceptance.md:64–67`, inalterados entre snapshots. Não foram removidos para ocultar o aviso.

O container sintético próprio mantido para as provas também foi encerrado após conferir ID,
imagem, rótulos e tmpfs: `container-stop-window03-1794424895784.json`, em `.local/pilot-security/`.
Não foram encerrados outros containers ou o Docker Desktop; backups/relatórios foram preservados.

**Leitura/conciliação técnica do inventário concluída:** Infraestrutura registrou os 744
arquivos com escopo de leitura e hashes, sem leitura pendente ou novo P0/P1 concreto no
fechamento. Relatório: [revisão técnica da candidata completa](2026-11-11-full-candidate-infrastructure-review.md);
mapa vivo: `.local/pilot-operations/full-review/manifest.json`. Os números de 307 pendentes/18
mudados de 16:14:59 e a leitura de interface/testes das 16:40:48 são estados históricos.
Autoria própria, tipos de leitura e limites das revisões cruzadas continuam explícitos.
Não há aprovação integral independente: autorias preexistentes não comprovadas e o
commit/configuração a integrar ainda exigem identificação e revisão competente. Não se
repetiram testes por este ajuste documental, nem se atribuiu ao novo texto um gate anterior.

**Dependências externas:** CI/status checks, auditoria online de dependências,
política/fornecedor/retenção, responsáveis, baseline especializado e configuração do destino
continuam separados e pendentes. Minutas não viraram aprovações. A evidência local não autoriza
dados reais, serviço hospedado, cobrança, WhatsApp público ou rollout. Alteração futura exige
nova candidata e repetição dos gates afetados, sem sobrescrever este fechamento.
