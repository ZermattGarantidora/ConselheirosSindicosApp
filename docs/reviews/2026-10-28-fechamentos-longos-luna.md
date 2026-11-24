# Revisão do autor — fechamentos longos Luna

**Status:** implementação, gates locais e R3 concluídos; pacote com regressões semânticas, sem aprovação de adoção ou merge.  
**Escopo:** Spec053, sem aprovação independente de merge, piloto ou produção.

## Diff e limites revisados

Revisado o diff desta fatia contra o snapshot imutável da R1 e a baseline local, incluindo contexto/requisitos, caso de uso, fidelidade, enum de validação, conflitos, grupos de busca, schema/projeção de saída, testes e documentação. O texto/versão do prompt v26 tem o mesmo hash77B97EEFF2C5FAA9DF82D62C889E59D5F07960DF4AF156C366B41E2E56A53D0E. Alterações alheias de upload e interface foram preservadas.

Foco e diagnóstico usam somente perguntas literais da janela autorizada e IDs atuais; cabem no orçamento de8 interações/12.000 bytes sem ampliar leitura ou reaproveitar respostas documentais. Grupos de consulta permanecem sob o contexto autorizado, com até8 evidências. Critérios lexicais são auxiliares e podem errar; definições, exclusões, comparação de ambas as unidades e mudança de assunto têm controles negativos.

No schema estável, metadados de especialista e claims documentais evitam combinações estruturalmente inválidas. A projeção mostra referências que o modelo já exigiu nos claims usando somente páginas recuperadas/autorizadas. Não altera texto, tipo de claim ou modo para aprová-lo. Referência desconhecida, minuta como fato, fato local sustentado só por lei e abstenção documental continuam recusados localmente. O contrato remoto não é tratado como autorização ou prova de grounding.

Revalidação antes de cada geração e persistência e o teto de duas tentativas foram preservados. A correção recebe dados de contrato dentro da memória existente; não contém texto da saída rejeitada ou conteúdo adicional de documento. Nenhum log textual de produção foi adicionado. Diagnósticos locais usam exclusivamente fixtures sintéticas.

## Exploração interrompida e recuperação

A R2 com enums de IDs/modos por consulta foi interrompida após247cenários/330turnos por regressões nos curtos e consumo maior com cache baixo. Seus checkpoints, fonte, erros e subtotal11,84908créditos foram preservados; até dois cenários em andamento têm consumo adicional desconhecido. Não é comparação completa nem resultado aprovado.

O schema estrutural foi estabilizado; autorização, vigência e modos permanecem exigidos localmente. AC-5304c mudou de restrição remota para teste do caminho completo e da mesma recusa de domínio, com decisão/custo documentados. Nenhum oráculo ou asserção de segurança foi enfraquecido. Foram acrescentados controles de abstenção sobre registros passados e recusas monetárias conjugadas. O texto originalmente rejeitado em R2 não foi retido, e um replay posterior variou; não se conclui alucinação ou falso positivo apenas pelo código.

Dois replays completos curtos de recuperação confirmaram transição com ata/termo citados e recusa de trocar saldo por15mil. Isso não substitui a bateria integral R3, congelada em50f1705175de5fc5492a4a77940e2c4e0e8d5f94e903117fbf02a4c9e42dd2c4, somente Luna/memória, low e concorrência2.

## Gates locais

154 arquivos e1.400 testes passaram, incluindo30 novas regressões. Cobertura: statements92%, branches87,59%, funções96,85%, linhas93,68%. Typecheck, lint, formatação global e visão de53 specs passaram. Evals legados20/20 e50 documentais determinísticos passaram; a falha anterior EVAL-008 foi corrigida por reconhecimento de formulações equivalentes de mínimo de locação. Os50 documentais semânticos continuam pendentes.

Logs: `.local/luna-recovery-full-final.log`, `.local/luna-recovery-typecheck-final.log`, `.local/luna-recovery-lint.log`, `.local/luna-recovery-format.log`, `.local/luna-recovery-evals-final.log` e `.local/luna-recovery-documentary-final.log`; cobertura em `.local/luna-recovery-coverage-final/`. Logs de falhas anteriores permanecem disponíveis; cache temporário do sandbox foi contornado usando TEMP/TMP dentro do workspace, sem mudar asserções ou timeouts.

Nenhuma instalação, dependência, provedor, configuração de ambiente, migração, ação externa, commit ou deploy. Autorização/SQL não foram modificados; testes de domínio e HTTP existentes cobrem os filtros conservados. A integridade dos artefatos e os gates finais estão registrados no fechamento abaixo. Esta revisão do autor não autoriza merge.

## Resultado observado da R3

Execução completa de 280 cenários/1.010 turnos; 80 decisões técnicas com hashes, 79 comparáveis. Resultado: 59/79 satisfatórias, 13 parciais e 7 falhas, contra 58/14/7 na R1; finais longos 23/40 contra 23/40. Houve 1.165 tentativas somente Luna, todas com usage e memória habilitada; zero Sol. Consumo da bateria: 21,9389360 créditos equivalentes.

Snapshot e fonte atual coincidem em `50f1705175de5fc5492a4a77940e2c4e0e8d5f94e903117fbf02a4c9e42dd2c4`. Conferidos checkpoints, perguntas originais, contexto, escopo, fontes e hashes de saída. Os testes locais não garantiram melhora semântica em todo fechamento; novas recusas por cobertura e regressões de moeda/referências continuam registradas. O replay curto de recuperação de integridade havia passado, mas o caso da bateria voltou a falhar; o sucesso isolado não substitui a falha preservada.

As alterações de código e documentos desta fatia foram revistas integralmente contra a baseline R1 e após o congelamento; alterações alheias foram preservadas. Não houve alteração de fonte durante a bateria. [Comparação completa](../specs/053-fechamentos-longos-luna/observed-results-2026-10-28.md).

Este fechamento documenta a implementação e a medição. Não aprova qualidade de produto, revisão independente, merge, deploy ou piloto.

Formatação global, alinhamento de 53 specs, `git diff --check` e scanner de segredos passaram no fechamento, com o scanner executado após o término dos processos Codex. Logs: `.local/luna-quality-r3-close-format.log`, `.local/luna-quality-r3-close-specs.log`, `.local/luna-quality-r3-close-whitespace.log` e `.local/luna-quality-r3-close-secrets.log`. Nenhum teste, oráculo, resposta histórica ou asserção foi enfraquecido para aprovar a rodada; as falhas semânticas novas e remanescentes continuam abertas.
