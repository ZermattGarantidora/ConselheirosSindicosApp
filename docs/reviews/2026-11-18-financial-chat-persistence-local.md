# Fluxo financeiro no chat e persistência local — 18/11/2026

**Resultado:** suporte parcial automatizado, percurso financeiro no editor do chat e recuperação
específica do relatório de 300 páginas comprovados localmente. RQ-7327–7329,
AC-7355–7360 e AC-4904b. Dados exclusivamente sintéticos, modelos programados, zero chamada
de provedor, nenhuma contratação e proposta operacional inalterada/inativa.

## Comportamento entregue

Manutenção de R$ 9.688,75 passa a informar automaticamente **suporte parcial de R$ 9.382,80**
e **R$ 305,95 de comprovação pendentes**, com fontes e pedido apenas da parcela pendente.
O cálculo usa centavos inteiros. Apoio completo e ausente continuam distintos; duplicidade de
identificador/lançamento, extração ambígua e excesso não certificam suporte. Outra competência
é excluída da soma. O vínculo não certifica pagamento, execução ou aprovação de contas.

Em **Documentos em preparação → Relatório financeiro**, o usuário seleciona material completo
e confirmado e o balancete por título/página. Consultar/selecionar não chama modelo. Preparar
é explícito e abre o editor comum; edição, confirmação da revisão e download usam o fluxo
existente. Pedidos anteriores são paginados. Recuperar conserva a revisão humana e dispensa
modelo; resultados de redação/conferência já salvos podem materializar o rascunho após falha
de armazenamento. Etapa enviada sem resultado exige reconciliação, sem reenvio automático.

Recibos novos usam `financial-dossier-v2`. Um relatório v1 concluído conserva texto/hash e
permanece recuperável sem reanálise; um pedido v1 incompleto não é retomado silenciosamente.
Controles operacionais explicitamente injetados também protegem o serviço financeiro,
sem ativar limites ou alterar o startup. Não há nova dependência ou migration.

## Evidências reproduzíveis

| Prova | Resultado e evidência |
|---|---|
| `test:authoring:financial` | 59 testes focados aprovados; parcial, ambiguidades, fontes, seleção sem geração, recuperação sem modelo, paginação, controle operacional, legado e envio incerto. `.local/financial-flow/20261118/focused-results.json`. |
| `test:authoring:financial:browser` | PDF de 300 páginas por upload real, seleção sem geração, resposta perdida e retomada com somente uma redação/uma conferência simuladas, edição, confirmação/PDF, reload e troca de chat. Desktop/mobile inspecionados, sem overflow ou destinos externos. `.local/financial-flow/20261118/browser/result.json`, `desktop.png`, `mobile.png`. |
| `test:authoring:postgres` | Três testes de autoria aprovados. Wrapper `container-e4f453e1746b4ed7baa584accca031e4`, resultado em `.local/pilot-operations/container-e4f453e1746b4ed7baa584accca031e4/result.json`; container encerrado. |
| Persistência financeira específica | `.local/pilot-operations/29f77dade4d148629633426a00567646/financial-report-proof.json`: 300 páginas processadas em PostgreSQL; processo novo PID 10700 recupera edição, confirmação, original e PDF. Backup restaurado em outro banco e processo PID 12328 recupera os mesmos hashes, sem modelo configurado. Alteração da página 300 e revogação negam leitura/replay/PDF. Outro usuário/condomínio negados. |
| Gabarito independente integral | `evals:financial-300 -- --run=flow-20261118-offline --python=<python-local>`: 300 páginas, 9.126 valores estruturados, 8.790 itens, dez verificações e controles saudáveis conferidos, 983 referências brutas verificadas. Zero chamada de modelo; não mede qualidade de IA. Resultado em `.local/financial-300/flow-20261118-offline/result.json`. |
| PDF automático atual | `output/pdf/financial-300-flow-20261118-offline/relatorio-alvitra.pdf`: 26 páginas, texto extraído de todas as páginas e página 2 renderizada/inspecionada com suporte parcial e parcela de R$ 305,95. Prova técnica distinta do artefato homologado anteriormente. |

O navegador usa API em memória; sua recarga não é prova de durabilidade. A prova PostgreSQL
encerra a API original e os pools antes de iniciar outro processo, sem RAM compartilhada;
recuperação e restauração usam somente repositórios PostgreSQL e nenhum modelo. A geração
da prova usa modelo programado com duas fases. Isso testa o percurso técnico, sem afirmar
uma nova avaliação semântica de modelo ou homologação humana.

No ensaio SQL, SHA-256 do original: `133e2bf42fa5f3a41781ba5ab32c036ceab699e2c64555e999d1f1c654b77482`;
do PDF confirmado: `537718d7068ac0326882f74de2c88a2ef21bb29549887a42e3ddd5eae20c536f`.
Ambos foram comparados após reinício e após restore. O PDF desse harness usa a mesma massa
financeira com diagramação sintética própria; seus bytes diferem do caderno original da
homologação anterior, que permanece preservado.

## Gates e revisão

Formatação, lint, TypeScript, cobertura unitária, E2E, alinhamento de 73 specs, scanner de
segredos, builds de API/web e runtime compilado foram executados. Resultados consolidados
em `.local/financial-flow/20261118/gates.json`; relatórios de unitários/cobertura e E2E ficam
no mesmo diretório. Runtime compilado processou dois PDFs e vinte perguntas sintéticas,
sem provedor. Evals: 31 documentais simulados, 26 de atas simuladas, 24 contratos de
homologação, 20 de consulta documental e 50 determinísticos documentais aprovados; os
cinquenta semânticos da suíte documental permanecem pendentes, sem aprovação fabricada.

Contagem final: **2.789 unitários**, **272 E2E** e **59 testes financeiros focados** aprovados
(os focados se sobrepõem às suítes globais). Cobertura: statements **85,38%**, branches **81,78%**,
functions **90,96%**, lines **87,25%**. O último caso unitário de legado v1 incompleto foi
acrescentado após a execução global e passou na suíte financeira focada da candidata final;
o código de produção permaneceu igual entre essas execuções.

As duas primeiras tentativas do SQL identificaram problemas do harness: diretório/nome de
snapshot fora do contrato de restore e revogação sem `revoked_at`. Corrigidos o diretório
próprio/allowlist exata e a escrita consistente com a constraint; nenhum guard, constraint
ou asserção foi relaxado. A terceira execução passou integralmente e encerrou seu container.
Testes adicionados de recuperação usam fixture reduzida de oito páginas; expectativas de
valores foram corrigidas para essa entrada, mantendo a prova integral de 300 páginas separada.

Revisão própria do diff desta tarefa contra o snapshot anterior, incluindo arquivos novos,
rotas/permissões, isolamento, fontes, hashes, retomada, legado, UI e guardas dos harnesses,
sem achado P0/P1 pendente. O checkout contém alterações anteriores de outras tarefas;
não houve merge ou revisão independente do branch inteiro. CI e revisão independente da
revisão a integrar continuam gates de integração.

## Homologação e política preservadas

O PDF homologado revisão 2 permanece byte a byte igual, SHA-256
`9b0176a0111e912299801c7e3ec70efbe052f76ed69a0026e10576eef63b3e08`,
com a decisão `003-financial-300.json` preservada. A nova execução automática não substitui
essa aprovação nem aprova outros casos.

`proposta-operacional.json` permanece com SHA-256
`c88424ef27f3bfb798d4d22e65f95da9ec65cb6bab6a0af5d7ccdb95446c169c`,
desabilitada, aprovações pendentes e gasto externo zero. Não foram adotados sete dias/24 horas,
fornecedor, dados reais, publicação ou startup de modelo. A Spec 073 integral continua com
homologações restantes e liberação operacional pendentes, conforme sua matriz.
