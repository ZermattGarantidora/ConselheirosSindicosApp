# Revisão cruzada por IA — Infraestrutura, pela frente Documentos

**Data:** 09/11/2026. **Base:** `3b702db6f91dbbeb2ede1a6063053296298d913c`.
**Resultado:** nenhum novo defeito concreto confirmado no escopo abaixo. Não aprova o branch inteiro.

## Cobertura e autoria

Revisão independente da autoria operacional desta rodada, orientada pela skill `code-review`.
Não editei os 46 arquivos do manifesto de Infraestrutura. A autoria de alterações anteriores
ao início das três frentes não é inferida; o manifesto da revisão integral deve conservar esse
limite. Esta revisão não emite selo independente sobre os meus módulos de OCR/ledger/API.

Escopo por arquivo, hash e estado de leitura:
`.local/pilot-documents-2026-11-09/closure/infrastructure-review-coverage.json`.
A lista parte de `local-backend-source-hashes-2026-11-09.json` e confere o conteúdo atual.
Ela cobre novos arquivos e deltas preexistentes desses caminhos contra a base, não apenas a
última alteração da frente. O inventário integral coordenado tem 690 arquivos; os demais caminhos
exigem os outros revisores. Notas de coordenação são mutáveis e não aprovam código futuro.

Lidos os controles de backup/restore, runner Docker, guardas/runner de integração local,
worker contínuo/configuração/main, ensaios de worker separado/recuperação/ledger, backup lógico
de histórico, fixtures de processo, matriz RLS e testes unitários correspondentes. Também
foram conferidos Blueprint/workflow manual, `.env.example`, SQLs e exemplos operacionais,
configs de teste, Specs 040/069/070, aceitação, ADR 0042 e runbooks. Valores comerciais datados
nas notas não são revalidados como cotação nem recomendação de ativação nesta revisão.

## Fluxos confrontados

- Confirmação/loopback/nome/marcador antes de fixtures; nenhum fallback remoto no caminho local.
- Pool e papéis de API/worker/ledger distintos, sem privilégios elevados ou credencial do
  operador promovida a runtime; isolamento por condomínio, usuário e chat.
- Dump e inventário no mesmo snapshot; ACLs/RLS/sequências/ownership conferidos, destino vazio,
  checksum e falhas em corrupção/ocupação/divergência. Sequências exigem escritores parados;
  o ensaio explicita a quiescência e mantém destinos em quarentena.
- Container só local, imagem em cache, porta loopback, configuração Docker vazia, mount restrito,
  ambiente filho mínimo e encerramento após conferir ID/label. Nenhum comando remoto executado.
- Lease renovável, perda de ownership, tentativa antiga, queda/esgotamento e encerramento do
  worker. Nenhuma alteração de prompt ou habilitação de OCR por flag no startup.
- Política A/B, resultados completos/incertos, falha de ACK operacional, retomada por outro
  processo/restore e preservação de compromisso; recibos não viram outra autorização de envio.
- Preparação/observação não simulam aprovações, notificações ou saúde real. CI é manual e não
  foi acionado. Histórico lógico é identificado como subconjunto, separado de restore integral.

## Evidência aproveitada e limites

Não repeti baterias sem alteração ou preocupação concreta. A etapa 4 já executou check exit 0,
2.347 unidades, 232 E2E, 17 RLS em PostgreSQL local, worker separado, builds/runtime, scanner e
restore integral. Nesta frente também foram executados os wrappers de recovery/RLS/worker;
recibos em `docs/release/pilot-2026-11-16-documents.md`. Hashes funcionais da candidata r3 foram
conferidos sem divergência após os gates. A revisão leu código e asserções; não transforma
transporte simulado em aprovação semântica de OCR ou IA.

Nenhum P0/P1/P2 novo reproduzível confirmado nestes arquivos. A nota operacional ainda contém
parágrafos históricos com verbos de pendência já resolvida (runner local/ledger/gates); o dono
deve identificá-los como histórico e conservar o resumo atual coerente. Não alterei arquivo alheio.
Não houve revisão profissional/humana, CI remoto, merge, ativação, dado real ou cobrança.

Exclusões/revogações posteriores ao backup e reconciliação de resultado incerto continuam
contratos próprios. A preparação local a acrescentar pela frente documental não deve alterar
esses runners sem o dono nem reinterpretar a política real de retenção.
