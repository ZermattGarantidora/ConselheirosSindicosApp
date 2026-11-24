# Revisão cruzada — controles sintéticos de Segurança

**Data:** 11/11/2026. **Revisor por IA:** frente Infraestrutura, sem autoria dos módulos de
Segurança. **Resultado:** nenhum achado novo pendente nas 24 entradas da candidata
`stage6-candidate-2026-11-11-r6.json`; o P2 do Vite aninhado foi corrigido e revalidado.
Não aprova o diff inteiro, arquivos próprios de operação ou
o piloto. A autoria preexistente não é inferida.

## Escopo identificado

Extensão r6: os quatro deltas de Spec 072/aceitação, teste de ambiente e proxy E2E foram lidos.
`envDir:false` agora também pertence à instância Vite interna. A contraprova própria usa o
objeto real contra canário temporário: importado antes, ausente depois; nenhum listener ou
arquivo de ambiente do workspace foi usado. **8/8 testes mantidos de ambiente** repetidos por
Infraestrutura passaram em `security-env-independent-r6-2026-11-11.json`; prova privada em
`nested-vite-env-green-2026-11-11.json`, ambos em `.local/pilot-operations/full-review/`.
**24 fontes e 13 artefatos** da r6 foram conferidos por hash. Produção/040 permanecem iguais;
a revisão da r5 é reutilizada somente nos hashes idênticos. E2E e demais gates locais foram
concluídos na captura final 03/r4, sem mudança nas 910 entradas; ver o
[fechamento global](2026-11-11-pilot-integration-local.md). O vermelho do canário foi preservado.

Extensão r5: sete configurações Vitest desativam descoberta de arquivos com `envDir:false`.
Foram lidos o teste de canário isolado, AC-7215 e seus deltas de documentação/configuração.
Produção/040 permanecem iguais à r4; **23 fontes e 11 artefatos** foram conferidos por hash.
As **36 unidades do plano foram repetidas** na suíte hermética de 113 testes desta frente,
e **sete unidades de ambiente** passaram em execução independente própria. Artefatos:
`full-review/hermetic-review-2026-11-11.json` e
`full-review/security-env-independent-2026-11-11.json`, em `.local/pilot-operations/`.
Relatórios anteriores permanecem históricos: ambiente mínimo por si só não evitava a leitura
automática pelo Vite. Nenhum arquivo de credencial foi aberto para provar essa regressão.

Manifesto do fechamento documental: `.local/pilot-security/stage6-candidate-2026-11-11-r4.json`.
O único delta de r3 para r4, no ADR 0044, distingue proibição de migration real das provas
locais autorizadas e atualiza a situação das ligações sintéticas. Texto lido e coerente com os
recibos; não muda produção/testes. As 17 fontes e sete artefatos da r4 foram conferidos por hash.

Manifesto anterior do dono: `.local/pilot-security/stage6-candidate-2026-11-11-r3.json`, capturado
às 17:46:52 UTC. As 17 fontes e os sete artefatos atuais coincidem por hash. A alteração
documental de README/AGENTS explicita os dois bancos de backup/restore e o terceiro destino
novo; foi lida e é coerente com o runner. Produção e testes não mudaram nessa r3.

Na captura original, às 17:27:56 UTC, 17 fontes/configs/specs/ADRs/documentos e seis artefatos foram conferidos
por SHA-256. Dezesseis fontes e os seis artefatos permaneciam idênticos; a unidade do plano
recebeu depois uma guarda de raiz/prefixo antes de remover seus temporários. Esse pequeno delta
foi lido e as mesmas 36 unidades foram repetidas em artefato novo, sem mudança de produção.
Fonte/diff completos e contratos relevantes foram lidos; a revisão
dos controles novos inclui o cenário SQL mantido, as 36 unidades e os chamadores operacionais.
Mapa por entrada/hash: `.local/pilot-operations/full-review/security-stage6-review-2026-11-11.json`.

Foram confrontados plano exclusivo/HMAC/flush/âncora, allowlists e snapshot, minimização de
resultado/claim, locks de todas as tabelas, inventário independente de OIDs, callback na mesma
transação, rollback, revogação, reexecução restritiva com recibos sobreviventes e manutenção da
quarentena. A união de recibos conserva transições comprovadas, inclusive timestamps iguais,
e recusa claims/custos/resultados contraditórios. Reconciliação mantém pending sem prova e
não dá novo envio a resultado ausente. O resultado da Spec 072 não é somado ao compromisso
espelhado do ledger como outra despesa.

A migration 040 foi confrontada com os contratos anteriores: UUID canônico ativo tem precedência
e UUID ausente/bloqueado não vira alias de outra conta; sujeitos legados não UUID continuam.
Resolver e cinco operações legadas usam a mesma identidade, preservando as demais regras e
ACLs. O trigger da migration 039 continua executando na exclusão. Não apareceu grant novo amplo,
papel de login, dependência, transporte ou ligação positiva ao startup.

## Validação independente

- **36/36 unidades**, executadas por esta frente com temporário/cache próprios e zero rede:
  `.local/pilot-operations/full-review/security-maintenance-independent-r2-2026-11-11.json`
  (a execução anterior permanece preservada).
- **Restore integral e manutenção em SQL real local**, após a estabilização de 040 e do plano:
  `.local/pilot-operations/container-46290f5b31ee4966a6772b806268c68b/result.json`;
  filho `5fbf44da245c4b21aa297056f6e394b8/`, em `.local/pilot-operations/`.
  O runner comparou inventário, aplicou o plano externo em processo novo, recusou alterações de
  RLS/política/chave/escopo/elegibilidade, repetiu sem alteração de estado, conservou tenant B,
  nove recibos/seis chamadas/unknown/login e bloqueou os resultados posteriores ao backup.
  Inputs ficaram idênticos durante a execução. O container próprio foi encerrado.
  A composição foi repetida depois do ajuste do callback documental em
  `container-3b3c9d49692440669f7c0fa1c7410955/result.json`, filho
  `c1476f570f34405e9fcf9934dfe8cdb6/`, com as mesmas guardas/asserções aprovadas e inputs atuais.
- **6/6 cenários SQL/HTTP do dono** tiveram integridade conferida e asserções lidas. Não foram
  repetidos integralmente por esta frente: cobrem também CRUD/colisão de alias e reconciliação
  completed/cancelled/pending, além da contraprova independente da FK feita por Segurança.

## Limites

Os cenários de UI e de posse do destino foram fechados nas contraprovas registradas em
`2026-11-09-full-candidate-infrastructure-findings.md`; são de outro escopo/dono. As correções
posteriores de purga e replay também foram revalidadas e constam do fechamento global.
O ajuste documental de contagem dos bancos foi recebido/conferido na r3. A revisão integral
continua identificada no mapa próprio, sem ampliar esta revisão técnica ao restante do checkout.

Esta revisão é técnica por IA. Não aprova retenção/base legal/fornecedor, semântica/OCR real,
destino, CI remoto, serviço, merge ou uso de dados reais. Não houve chamadas externas ou cobranças.
