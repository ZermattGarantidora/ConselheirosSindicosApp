# Proposta operacional — Spec 073

**Estado:** proposta para revisão, não aprovada e não aplicada.  
**Configuração legível por máquina:** [proposta-operacional.json](proposta-operacional.json).  
**Rodada atual:** somente sintéticos locais; gasto externo máximo zero; sem fornecedor/destino escolhido.

Os valores abaixo tornam a decisão revisável. Nenhum arquivo é importado pela API/worker,
nenhum cron é iniciado e nenhuma política real muda. O pacote valida a proposta e ensaia os
mecanismos com relógio acelerado e parâmetros sintéticos próprios; não aplica esses valores.

## Limites propostos e capacidade atual

| Item | Valor proposto | Capacidade/condição |
|---|---|---|
| Rascunhos e propostas | 7 dias desde a criação | Teto atual do controle de autoria: 604.800 s; edição/confirmar/retry/restore não renovam. |
| Original de áudio e transcrição | 24 horas | Derivados que dependem do áudio deixam de ser utilizáveis quando a origem expira. Não prometer sete dias de acesso a uma ata cuja fonte expirou. |
| PDF/foto/Word originais | Política documental vigente | Excluir rascunho não exclui o original; os prazos acima não se aplicam silenciosamente ao catálogo. |
| Histórico da conversa | Permanente, conforme briefing | Compatibilidade com retenção/purga de payloads derivados precisa de revisão antes de aprovar a política. |
| Exportação/download | Sem nova cópia persistente no servidor | Revalidar contexto/fontes/revisão em cada entrega. Arquivo já baixado é cópia do usuário. |
| Recibos de consumo, tombstones e metadados de recuperação | Prazo pendente | Não apagar enquanto puder haver backup que restaure conteúdo ou tentativa incerta; decidir prazo/base de retenção antes do destino real. |
| Quantidade por escopo / global | 30 / 200 etapas por dia | São etapas com reserva nas seis finalidades, não quantidade de PDFs. Redação + conferência consomem duas etapas; áudio acrescenta transcrição. |
| Concorrência por escopo / global | 2 / 4 | Tentativa incerta continua comprometendo capacidade até reconciliação comprovada. |
| Despesa externa | Zero nesta rodada | Preço, moeda operacional e orçamento positivo futuros exigem decisão própria; máximo sintético não é fatura. |
| Fontes por pedido / texto | 20 origens / 80 mil caracteres | Páginas/blocos e relato entram nos tetos existentes; sem truncamento silencioso. |
| Áudio | WAV PCM, até 25 MiB; relato 10 min, reunião 60 min | Vale o primeiro limite atingido; não dividir para criar chamadas adicionais. Os limites são de entrada, não promessa de qualidade. |
| Proatividade automática do original | Bloco até 1.000 caracteres; espaços/quebras | Preservar palavras, números, pontuação e ordem; revisão mais ampla depende do pedido explícito. |
| Manutenção | Propor a cada 15 min, lote ≤50, família ≤100, inventário ≤10 mil | Hoje é chamada explícita por contexto autorizado; agendamento permanece desligado. |
| RPO SQL / RTO | Propor 15 min / 4 h | Metas ainda não medidas no destino; não são SLA nem prova de recuperação. |

### Compatibilidade com o histórico permanente

O briefing §8 exige histórico completo dos dois lados. A correção técnica de 18/11 conserva
mensagens públicas completas ao purgar payloads derivados, inclusive na purga direta de áudio.
Recibos internos conservam a marca que os oculta; somente seu conteúdo operacional é expurgado.
PostgreSQL/restore exercitam a separação, sem usar TTL de rascunho para encurtar o histórico.
Essa correção não aprova política ou prazo automático real. Revisar comunicação, custódia,
retenção e exclusão no destino antes de qualquer ativação.

O campo `historyRetentionCompatibility` permanece pendente. Caso uma decisão exija mudar a
permanência da visão canônica, ela requer autorização explícita e atualização do briefing na
mesma decisão. Esta proposta não aprova essa divergência. O usuário determinou em 18/11 que os
limites permanecessem inativos; o JSON e todas as aprovações continuam inalterados.

## Custódia e responsabilidades propostas

Produto revisa duração, limites e utilidade. Segurança/dados revisa destino, acessos, retenção,
exclusão e conteúdo permitido. Operação mantém os cofres, executa manutenção e ensaia restore.
Engenharia conserva versões, revisão independente e CI. Revisor documental/da transcrição
confere gabaritos e resultados; temas de alto risco exigem qualificação apropriada.
Responsáveis nominais, substituto, canal de incidentes e autorização de liberação permanecem
pendentes; os nomes dos papéis no JSON não representam aceite de uma pessoa.

O banco da aplicação, o cofre de consumo e o journal de retenção/purga têm ciclos distintos.
Os dois últimos ficam fora do dump SQL e precisam de cópia/custódia próprias. Em produção,
diretórios diferentes no mesmo disco não demonstram independência de falha. Definir volume,
ACL real, criptografia, segredos, integridade, sincronização e recuperação das chaves no destino.
Não copiar chaves ou conteúdo para logs. O backend de arquivos do harness continua exclusivamente
sintético e não se transforma em backend público pela aprovação de um documento.

## Roteiros de operação para revisar

| Evento | Procedimento proposto | Evidência exigida |
|---|---|---|
| Inicialização/liberação | Manter provedores e política positiva desligados até todos os gates; conferir destino e papéis. | Revisão/configuração/commit, dados permitidos, modelo e custos aprovados. |
| Limite ou kill switch | Suspender novos envios; recuperar apenas resultados autorizados já salvos pelo fluxo permitido. | Recibos e contadores compartilhados, sem reset ou backend alternativo. |
| Envio incerto | Conservar consumo/concorrência; isolar a tentativa, sem retry/refund por tempo. | Prova correspondente de resultado confirmado ou cancelamento anterior ao dispatch. |
| Cofre/journal ausente ou corrupto | Não recriar vazio. Suspender novas chamadas e manter o destino em quarentena até recuperação validada. | Integridade e identidade do cofre; decisões posteriores ao snapshot preservadas. Quarentena ampla do destino é responsabilidade operacional, não novo automatismo desta proposta. |
| Expiração | Negar uso dependente da origem; informar o estado no fluxo autorizado; executar manutenção limitada conforme política aprovada. | TTL inicial, fontes e relógio, sem renovação por edição/restore. |
| Exclusão/purga | Registrar decisão fora do dump antes de remover conteúdo; seguir pai → derivados; preservar originais independentes e consumo. | Tombstone, reexecução idempotente, fontes históricas e outro tenant intacto. |
| Falha parcial de purga | Manter bloqueio/quarentena e reaplicar; não declarar exclusão concluída sem conferir os derivados tardios. | Inventário final limitado e ausência de payload recuperável. |
| Exportação | Exigir identidade/permissão e revalidar fontes de todas as revisões exportadas. | Arquivo privado do contexto, sem tokens, cofre financeiro ou conteúdo de outro tenant. |
| Incidente de isolamento ou fabricação de fonte | Suspender o fluxo afetado, preservar metadados mínimos e corrigir com regressão sintética. | Nenhum score médio substitui correção de falha crítica; comunicação por canal aprovado. |

## Recuperação sem reabrir chamadas

1. Destino novo e isolado inicia em quarentena, com modelos e workers de envio desligados.
2. Conferir versão do schema, corte do backup SQL e inventário. Restaurar somente no destino
   explicitamente autorizado; nada de migrations remotas ou credenciais `.env` neste ensaio.
3. Recuperar cofre e journal externos ao dump; conferir integridade e decisões posteriores.
   Ausência de resultado no SQL com tentativa consumida conserva cerca incerta, não novo envio.
4. Reaplicar exclusões/revogações; conferir TTL sem renovar prazo, derivados tardios, fontes e
   isolamento entre usuário/condomínio/chat. Não liberar a aplicação só porque o restore terminou.
5. Verificar amostras de Word/áudio/rascunhos e recibos. Medir RPO/RTO no destino e registrar os
   desvios das metas propostas. Só a decisão de liberação adequada pode reabrir o ambiente.

O comando offline da homologação exerce oito cenários com artefatos em memória e cofres/journals
locais reais: seis finalidades sem gasto real, unknown sem retry após recriação, restore em
quarentena, reaplicação de purga, isolamento, revogação, cofre ausente e expiração/manutenção.
Esse ensaio não é restore SQL. A prova PostgreSQL separada já realizada está no
[relatório de controles/demonstração](../../reviews/2026-11-17-original-document-authoring-local.md).
Não foi repetida implicitamente para apenas preparar esta proposta.

## Decisões necessárias antes de operar de verdade

Dados e retenção; compatibilidade do histórico; duração/cotas/preço e fornecedor; destino,
custódia e responsáveis nominais; manutenção e recuperação no destino; qualidade real da IA;
revisão independente e CI do commit de integração; aprovação de liberação. Todos os campos de
aprovação no JSON permanecem nulos. O orçamento externo continua zero, e o código em execução
mantém sua política anterior. Aprovar números propostos não basta para ativar serviços.
