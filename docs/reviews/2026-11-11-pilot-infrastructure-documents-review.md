# Revisão cruzada por IA — extensão operacional de 11/11

**Resultado atual:** nenhum novo defeito concreto confirmado nas dez entradas da candidata
`maintenance-candidate-2026-11-11-r2.json`; todos os hashes conferidos atuais após a releitura.
Base Git `3b702db6f91dbbeb2ede1a6063053296298d913c`.
Não é aprovação do branch, dos meus módulos documentais ou de liberação real.

Esta revisão complementa `2026-11-09-pilot-infrastructure-documents-review.md`. Conferi os
hashes publicados e li o helper integral de manutenção, suas chamadas no recovery, o runner
source/restore, wrapper, testes de preflight, configuração, Spec 070/aceitação e ADR 0042.
Nenhum desses arquivos foi escrito ou editado pela frente Documentos nesta rodada. A autoria
anterior das partes preexistentes não é inferida. Módulos de Segurança e meu callback são
dependências confrontadas, sem lhes atribuir aprovação independente nesta revisão.

O helper grava plano e âncora fora de `app` antes dos efeitos; usa allowlists, digest/HMAC,
inventário independente de OID e elegibilidade explícita com orçamento desativado. Restore
ocorre em outro banco novo, comparado antes da reaplicação por outro processo. As negativas
conservam inventário; aplicações repetidas conservam consumo e estado. Resultados posteriores
ao ponto recuperado sem payload ficam incertos, sem transporte ou claim novo. Tenant B e seu
original/histórico são comparados; o histórico de A é preservado conforme o modo sintético.

O perfil `documents` fixa a configuração mantida pelo dono e a recusa ausente antes de criar
recursos. URLs são loopback e bancos/marcadores sintéticos exclusivos, sem fallback remoto;
filhos recebem ambiente mínimo. O wrapper usa imagem em cache, tmpfs, mount de saída restrito,
porta loopback, configuração Docker vazia, senha pública de fixture por arquivo e encerramento
após conferir ID/label. Os testes exercitam também entrada insegura sem conexão e sem eco de
credenciais. Não executei CI ou comandos remotos.

Reaproveitei a prova do dono `container-e059049d39f7480483cb0dfd72fd0c46/result.json`, que
encerrou seu container, e suas 136 unidades/cobertura focada, sem repetir uma bateria inalterada.
Executei também o novo perfil documental: wrapper `container-e05fcf39b866467680d8800cf121d1b5`
e filho `7777f5e8455b4e1c951d7d111b42c1d3`, dois cenários amplos aprovados em PostgreSQL real
local. Essa segunda execução prova a composição operacional com a suíte documental, mas não é
uma revisão independente dos testes/callbacks que escrevi. OCR e embeddings foram simulados.

Cobertura por arquivo/hash e reutilização das entradas idênticas de 09/11 em
`.local/pilot-documents-2026-11-11/infrastructure-review-coverage.json`. Alteração posterior
invalida a entrada correspondente. A nota de coordenação é mutável e não certifica código futuro.
A revisão integral e os gates globais da janela 03 continuam coordenados por seus donos;
nenhum trecho de autoria própria foi contado como aprovação independente.

## Complemento da candidata r2

Reli os deltas de vínculo de destino, guardas de ambiente e critérios de aceitação antes de
atualizar os hashes. O auxiliar confere manifesto/rodada e recibo externo de destino antes de
abrir conexão; o orquestrador cria outro banco, prepara o marcador e somente então chama a
verificação. O marcador de quarentena vincula digest e rodada. As negativas missing/different
usam porta local sem serviço e falham na fase de vínculo, sem conexão/efeito. `target.json` é
exclusivo e recebe flush. Não há reset automático de banco preenchido.

Operations/RLS agora usam `envDir:false`. Li a regressão com canário próprio temporário e
controle positivo, além de Spec 070/aceitação completas nos trechos atualizados. O ambiente
mínimo do filho não substitui essa opção do Vite. Nenhum arquivo de ambiente real foi aberto
para a revisão. Os runners sem alteração reutilizam a leitura anterior por hash idêntico.

Reaproveitei as 139 unidades, a prova RLS 17/17 e o restore atual identificados pelo dono na r2;
Segurança repetiu independentemente as guardas operacionais. Minha execução atual do wrapper
`-Suite documents`, com `envDir:false`, passou 2/2 em
`container-c88c1c6700be421ea96cb0030d7265ef/result.json` e encerrou o container. A execução valida
a composição, sem constituir revisão independente do meu callback/teste documental.

Mapa novo e preservação do anterior:
`.local/pilot-documents-2026-11-11/infrastructure-review-coverage-r2.json`. A nota operacional
mutável permanece apenas coordenação; não conta como aprovação de código. Mudança posterior
exige nova conferência do arquivo correspondente. Este complemento não aprova Segurança,
Documentos ou o diff integral do checkout.
