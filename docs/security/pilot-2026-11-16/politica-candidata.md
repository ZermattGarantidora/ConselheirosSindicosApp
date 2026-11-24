# Política candidata de dados — piloto presencial

**Estado:** rascunho não aprovado, sem efeito sobre a política vigente.  
Versão 2026-11-09. A preparação local permanece exclusivamente sintética.

## Delimitação proposta

Coorte fechada de até cinco condomínios autorizados, entrada por código, conversa e documentos
necessários à tarefa, incluindo PDFs textuais/digitalizados e fotos sob os contratos validados.
Não ampliar por prazo, desempenho sintético ou aceite de um único participante. Não usar dados
reais nem versões anonimizadas de casos reais em fixtures, testes, evals, demonstrações técnicas,
logs, relatórios de engenharia, tickets ou repositórios.

Antes de qualquer coleta, aprovar D01–D12 da [matriz](responsabilidades.md), as versões finais dos
termos/aviso e os [gates da candidata](../../quality/pilot-2026-11-16-release-gates.md).
Os modelos são material de revisão; não atestam conformidade, base legal ou avaliação de fornecedor.

## Mapa de dados e ciclo de vida a aprovar

| Artefatos | Fronteira e acesso propostos | Retenção/saída ainda a decidir e validar |
|---|---|---|
| Relação participante/conta, aceite e poderes | Registro privado, mínimo acesso administrativo; fora do código e relatórios | Finalidade, prazo, guarda e verificação proporcional |
| Códigos, sessões e associação | Hash no servidor, cookie seguro; rotação/revogação; tenant autorizado na operação | Sessão sem expiração automática conforme produto; guarda de registros, segredo e backups a aprovar |
| Tentativas de login | HMAC temporário de origem sem conta/tenant; dado pseudonimizado operacional | Janela 15 min; expiração lógica/limpeza no próximo consumo; purga de vencidos em inatividade e retenção de backups a validar |
| Originais, fotos e metadados | Privados, tenant/versão e poderes documentais | Minimização de metadados/EXIF, prazo, recuperação de removidos, purge e backups |
| Páginas/OCR, chunks, embeddings e índices | Mesma autorização/tenant do original; qualidade e procedência | Exclusão sincronizada, caches e retentativas; provider-side retention |
| Perguntas/respostas, setup, confirmações, anexos e citações históricas | Histórico completo autorizado por usuário/condomínio/chat; durável antes de ACK | Direito de exclusão/exportação, obrigação de guarda e tratamento de snapshots literais |
| Jobs, cache, recibos/idempotência e erros | Payload mínimo e escopado; não misturar condomínio | Expiração, cancelamento de jobs antigos, tombstones e reprocessamento após restore |
| Recibos de orçamento da Spec 072 | UUIDs operacionais, hashes, moeda, finalidade, revisões, estado e custo; sem resposta/documento/token aberto | Permanecem após exclusão do domínio para não zerar consumo; prazo, reconciliação e saída precisam de decisão específica |
| Resultado privado do ledger documental da Spec 071 | Pode conter texto/OCR/resposta; mesma proteção do documento/chat, sem acesso global por conveniência | Inventário, invalidação por documento/política, exportação/purge e backups; não confundir com recibo mínimo da Spec 072 |
| Métricas e suporte | Contagens/status/tempo e IDs operacionais; sem conteúdo ou texto livre real | Risco de reidentificação em coorte pequena, acesso, agregação e prazo |
| Exportações, backup, WAL/snapshots e segredo de acesso | Cifrados, acesso segregado e inventário completo | SLA, ciclo de expiração, região, restore e reaplicação de exclusões fora do snapshot |

Pseudônimos/hashes correlacionáveis não são tratados como dados anônimos. Somente informação
inteiramente sintética entra no Git. Histórico durável não significa guarda ilimitada. A regra
sintética atual de 30 dias não se transforma em política real sem decisão e testes.

## Fornecedores e finalidades

Documentar conta/plano, contrato/DPA, finalidade, categorias, países/regiões e suporte remoto,
suboperadores, retenção em APIs/logs/backups, direitos de auditoria e exclusão, treinamento e
mecanismo aplicável de transferência. Não concluir que escolher região do banco elimina todas
as transferências: API, OCR, embeddings e suporte precisam de avaliação separada.

O controlador, as hipóteses legais e os papéis por operação dependem de revisão competente.
Não pré-selecionar consentimento nem outra base para todos os dados. O termo de participação é
distinto da autorização documental e da base para dados de terceiros. Treinamento, publicidade,
leads e contatos comerciais ficam excluídos; não acrescentar autorização genérica aos termos.

## Direitos e incidente — procedimento proposto

1. Receber solicitação em canal privado aprovado; atribuir ID mínimo e responsável/substituto.
2. Verificar legitimidade e condomínio sem coletar documento pessoal desnecessário. Encaminhar
   decisão ao controlador e jurídico/privacidade quando houver dúvida.
3. Suspender usos afetados quando cabível; exportar com isolamento ou aplicar exclusão aprovada
   em original, derivados, índice, chat/citações, cache e jobs. Testar preservação do outro tenant.
4. Registrar tombstone/decisão fora do backup restaurável, minimizar o recibo e informar prazos,
   limitações de backup/guarda e resultado ao solicitante. Restore deve reaplicar exclusões antes
   de reabrir acesso, sem ressuscitar sessões ou permissões revogadas.
5. Incidente: pausar operações afetadas, preservar evidências mínimas privadas, conter/revogar,
   acionar responsáveis, avaliar risco e cumprir comunicações legais aplicáveis. A comunicação
   cabe ao responsável competente, com confirmação humana; nenhum contato é enviado nesta rodada.

O fluxo, SLA, canal e prazos legais precisam ser validados; não prometer destruição instantânea
de WAL/snapshots nem exportação/exclusão completa com base apenas em mocks.

Procedimentos de revisão: [incidentes e suporte](incidentes-e-suporte.md),
[direitos, exportação e exclusão](direitos-exportacao-exclusao.md) e
[redaction e acesso operacional](redaction-e-acesso-operacional.md).
Essas minutas não aprovam os procedimentos nem indicam sua implantação efetiva.

## Fontes oficiais consultadas em 09/11/2026

- [ANPD — Guia de agentes de tratamento](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado): orienta a análise de papéis; não define os responsáveis deste projeto.
- [ANPD — Titular de dados](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados): referência para dados pessoais, direitos e canais.
- [ANPD — Comunicação de incidente](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis): orienta avaliação e comunicação; aplicar ao caso concreto com revisão competente.
- [ANPD — Resolução 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024): referência para transferências; não determina automaticamente mecanismo válido para os serviços ainda não avaliados.

As fontes fundamentam perguntas de revisão. Não houve contratação, aprovação jurídica,
aplicação de política, envio de dados ou liberação com base nestas minutas.
