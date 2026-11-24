# Revisão cruzada documental — Segurança

**Estado:** EM ANDAMENTO; candidata não aprovada. 09/11/2026.
Revisão por IA do delta documental contra a base Git, incluindo callers e contratos.
Não inclui aprovação independente dos trechos de continuidade de política escritos pela
Segurança; esses pertencem à revisão da Infraestrutura. Não é revisão humana ou de todo branch.

## [P1] Preservar a exclusão do condomínio ao adicionar o ledger

`infrastructure/database/039_hosted_document_call_ledger.sql:35` introduz FK restritiva de
`hosted_call_records.condominium_id` para `app.condominiums`. A função pública existente
`app.delete_condominium_for_user` (migration 015, usada pelo diretório PostgreSQL) não trata
esse novo vínculo. Após uma chamada documental salva, a exclusão termina em SQLSTATE 23503
na constraint `hosted_call_records_condominium_id_fkey` e toda a transação é desfeita.

Reprodução SQL real local: fixture nova com usuário/condomínio/membership fictícios; excluir
sem ledger funciona. Mesma fixture com recibo completed válido falha exatamente nessa nova
FK. Todas as mutações foram revertidas. Nenhum documento/serviço externo ou dado real.
Prova: `.local/pilot-security/stage5-delete-ledger-repro.mjs` e
`.local/pilot-security/stage5-delete-ledger-red.json`. Banco/container exclusivos guardados.

**Dono:** Documentos e IA (039/ledger/ciclo documental). Corrigir na janela 03, precedido por
spec/aceitação. Não usar cascade que elimine compromisso e permita repetir/zerar custo.
Expurgar resultado privado ao excluir escopo, conservar recibo mínimo e consumo sem conceder
acesso a escopo órfão. Testar exclusão pelo caminho real, tenant B intacto, resultado removido,
recibos/cota/unknown conservados e nova chamada negada. Teste vermelho acima é histórico e
não deve ser sobrescrito; promover regressão mantida e publicar verde separado.

O outro P1 de replay HTTP foi confirmado pela Infraestrutura e está em
`2026-11-09-full-candidate-infrastructure-findings.md`; não é uma nova descoberta desta revisão.

## Cobertura e limites

Mapa por arquivo/hash será anexado após conclusão das leituras. O patch documental rastreado
tem 2.285 linhas em `.local/pilot-security/stage5-document-tracked-diff.patch`; novos módulos
também exigem leitura. Arquivos pendentes não são tratados como revisados. Gates da janela 02
identificam sua candidata histórica e não cobrem automaticamente a correção da janela 03.
