# Direitos, exportação, exclusão e restore — pacote de execução futura

**Estado:** rascunho operacional para revisão jurídica/privacidade e técnica.
Não executa exclusão, exportação, restauração ou coleta de dado real. Política vigente sintética.

## Fluxo por dependência

Pedido recebido em canal privado aprovado → legitimidade/escopo → decisão do responsável →
contenção/revogação quando cabível → inventário → execução autorizada → verificação de isolamento
e integridade → recibo minimizado → comunicação humana. Se faltar etapa, manter pendência clara
e avançar somente trabalho independente. Não pedir documentos pessoais em canal público.

Campos do registro privado: ID, tipo do pedido, titular/representante verificado por referência
privada, conta/condomínio autorizados, finalidade/base da decisão, artefatos abrangidos, prazos/
exceções aprovados, responsável/substituto, evidência minimizada e conclusão. Nenhum preenchimento
real entra no Git ou em relatório técnico. Modelos não criam prazo ou fundamento legal aprovado.

## Inventário obrigatório

| Artefato | Exportação/consulta | Exclusão/bloqueio e teste necessário |
|---|---|---|
| Associações, códigos e sessões | Informação própria sob autorização, sem exportar credencial/token | Revogar escopo/acesso correto; logout de um preserva outro; rotação revoga todos quando autorizada |
| Originais, versões e fotos | Bytes privados e procedência autorizados, checksum e metadados necessários | Busca deixa de usar o item; prazo de recuperação/purge e metadados EXIF conforme política |
| Páginas/OCR/chunks/vetores | Derivados autorizados com relação à versão, sem tenant cruzado | Enumerar/revogar todos, inclusive índice e caches; jobs antigos não ressuscitam derivados |
| Histórico dos dois lados/setup/confirmações | Mensagens literais/ordem/referências sob titularidade e condomínio | Compatibilizar direitos/guarda com histórico durável; ocultar chat não equivale a apagar trilha |
| Citações/snapshots e feedback | Escopo e procedência explícitos, fonte removida marcada como histórica | Purga do PDF não apaga automaticamente trecho exibido; política precisa decidir esses dados |
| Jobs, recibos e idempotência | Estado próprio e mínimo necessário, sem payload/token/erro nativo | Cancelar só sem execução; não apagar recibo de chamada iniciada nem resetar orçamento para retry |
| Recibos de consumo da Spec 072 | UUIDs/hashes/custos/moeda/estado, privados e pseudonimizados | São metadados operacionais que podem sobreviver ao domínio; retenção/direitos exigem decisão própria |
| Logs/métricas/tickets | Buscar referências autorizadas no inventário de sistemas | Não conter texto real; corrigir coleta indevida com política de retenção e trilha mínima |
| Exportações e backups/WAL/snapshots | Entrega privada cifrada, acesso temporário e recibo sem conteúdo | Prazos reais do provedor, chaves/custódia e tombstones fora do snapshot; não prometer apagamento instantâneo |

## Caso sintético de aceitação a executar no destino

Criar dois condomínios e duas contas fictícias com dados de todas as linhas acima. Exportar o
escopo A, conferir bytes/IDs/ordem e negar B; remover/revogar A conforme política de teste,
conferir busca/histórico/índice/fila/cache/derivados e manter B intacto. Registrar somente IDs
sintéticos, hashes, contagens, status e duração. Exercícios antigos da B7 são contratos parciais;
não substituem essa implementação no ambiente completo atual.

Antes de restore, colocar destino em quarentena. Restaurar banco/originais/derivados/histórico/
fila/segredos conforme procedimento aprovado. Reaplicar exclusões, revogações e decisões de
consumo/idempotência posteriores ao ponto recuperado **a partir de registro durável fora desse
snapshot**, antes de habilitar rede/worker. Reexecutar controles positivos/negativos e conferir
que usuário revogado não voltou, conteúdo excluído não reapareceu e chamada incerta não repetiu.

## Entrega ao solicitante

Somente pelo canal aprovado após verificar legitimidade e autorização. Não colocar exportação em
URL pública ou enviar por conta de suporte genérica. Informar o que foi atendido, o que ficou
pendente, fundamento/limites e prazos aprovados e como pedir revisão. Não colar o conteúdo da
exportação no recibo. Nenhum arquivo/recibo real foi criado ou enviado por este pacote.

## Dependências concretas ainda abertas

Política/base legal/papéis, prazos, terceiros/suboperadores e canais aprovados; ferramenta completa
de exportação/purge e restauração no destino; tombstones/revogações/consumo fora do snapshot;
retenção de recibos operacionais; prova de isolamento e revisão competente. Por serem necessárias
à liberação, permanecem bloqueios explícitos. Consulte o [aviso candidato](aviso-de-privacidade.md)
e a [referência oficial da ANPD para titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados).
