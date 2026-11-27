# Revisão local — estresse documental e conflitos inéditos

- **Data:** 24/11/2026.
- **Status:** revisão técnica do autor por IA; avaliação real e gates locais concluídos, com falhas de IA documentadas.
- **Escopo:** Spec 077, fixtures, PDF, harness, testes, comando e documentação.
- **Revisão independente/especializada:** pendentes; nenhum campo humano foi preenchido por IA.
- **Produção:** os 202 arquivos de aplicação conferidos são idênticos aos da comparação anterior.
- **Snapshot:** `99d6b86b95c9dd23b9e9cee00aac929ab0661316a4965875185e0949d9a93412`.
- **Manifest:** `72c938b2ef7a80ab15c0fdb7fb82a085af23afeb66ffca95e7319db376b2c4a3`.
- **Merge/deploy/banco remoto:** não executados.

## Delta revisado

Lidos o briefing vigente completo, MVP, estratégia competitiva, template, Spec 076 e ADRs
0003/0031/0038/0048. A Spec 077 e sua aceitação foram registradas antes da implementação.
O escopo mantém os Blocos 6/7 e o contrato de evidência, sem alterar a visão ou a personalidade.

Conferidos `stress-fixture.ts`, `stress-run.ts`, `stress-pdf.py`, `dense-stress.test.ts` e
as alterações pontuais de package.json, README, AGENTS e rastreabilidade. Nenhuma mudança
de produção foi feita para aumentar a nota durante o experimento.

Corpus/ledger e oracle são definidos sem importar parser, retrieval ou modelo. A preparação
gera PDF real, confere todas as páginas com pypdf e novamente pelo leitor da aplicação,
com retorno do original privado idêntico. Minuta conserva estado pendente; não é promovida.
Sete documentos, 350 páginas, 25.200 registros e 72 registros/página. A densidade de caracteres
também é conservada no artefato de verificação, sem confundir volume com complexidade.

O caminho HTTP e os utilitários de snapshot, recibos e progresso da 076 são reutilizados.
Oracle/rubrica só são usados depois da resposta, não entram no gateway nem orientam a busca.
Dois braços usam o mesmo conjunto autorizado, memória desligada, budgets atuais e ordem
alternada. Recibos distinguem resposta concluída, envio incerto e consumo desconhecido.
Não há novo retry, classificador pago, troca de modelo por falha, pacote ou provedor.

Não foram adicionadas exclusões de cobertura nem alteradas asserções existentes. Os quatro
testes novos verificam integridade/densidade e diversidade da fixture, fronteiras do checkpoint
e recusa de aprovação por palavras sem resposta/fontes; durabilidade é reutilizada e testada.
Avaliar palavra-chave não substitui a auditoria de associação, fontes, completude e risco.

## Preparação e QA

- Plano e preflight: zero inferência. Todas as fontes exigidas foram recuperadas nos 40 casos.
- Extração integral: 350/350 páginas; 250 chunks por documento, 1.750 no conjunto autorizado.
- QA: 77 amostras em quatro contatos e duas páginas em ampliação, inspecionadas pelo autor
  por IA, sem cortes/sobreposição. Compilação de 350 páginas preserva os originais.
- Sem novo OCR. Imagens, manuscritos e gráficos não são avaliados por este corpus textual.
- `verification.json` vincula PDFs, páginas, densidade, produção anterior e snapshot atual.

## Gates de software

Binários locais, sem instalação implícita do pnpm:

- Formatação global, ESLint, TypeScript e build da API: passaram.
- Unitários: **2.903/2.903**.
- E2E autorizados: **273/273**.
- Cobertura statements/branches/functions/lines: **85,46 / 81,89 / 90,84 / 87,32%**.
- Evals determinísticos: **20/20** e **50/50** documentários; 50 semânticos anteriores pendentes.
- Alinhamento das 77 specs aprovado; scanner final passou sem padrão conhecido encontrado.

O primeiro E2E no sandbox terminou com 37 falhas de conexão de loopback (`EACCES` em
127.0.0.1). O relatório foi preservado em `e2e.json`; a repetição com conexão local permitida
passou integralmente em `e2e-authorized.json`, sem alterar código, timeout ou asserções.
A preparação do snapshot também exigiu a junction local de dependências permitida fora do
sandbox; não houve inferência antes de concluir a preparação.

O primeiro scanner foi interrompido por `ENOENT` após remoção concorrente de um temporário
em `.local/pilot-operations/`, sem produzir veredito. O erro está preservado em `secrets.log`;
a repetição integral passou em `secrets-final.log`, sem alterar o scanner ou suas exclusões.

Relatórios em `.local/dense-stress/gates-2026-11-24/`. Comparação, checkpoints, eventos,
auditoria e verificação em `.local/dense-stress/2026-11-24-stress-r1/`.
Hashes finais dos 13 arquivos revisados em `reviewed-files.json` nessa rodada.

## Limites da revisão

Comparação real concluída: Sol 34/40 e híbrido 36/40 factuais/completos, com 50 tentativas
e dez reparos por braço. Equivalência USD 1,6074068 e 1,2032830; médias 24,859 s e 25,056 s.
Dez falhas de entrega por validação de modo, com fontes recuperadas e comparações relevantes
nos textos brutos. Não são erros corrigidos nesta tarefa, nem prova de superioridade de modelo.
Resultados, ressalvas e formulário humano pendente no
[relatório da Spec 077](../specs/077-estresse-documental-e-conflitos-ineditos/results.md).

O workspace tinha mudanças extensas preexistentes, preservadas. Esta revisão cobre o delta
de avaliação e não aprova o diff inteiro do branch. Falhas novas da aplicação encontradas no
ensaio são resultados a registrar; não foram corrigidas ou ocultadas nesta tarefa. Nenhuma
nota média permite recomendar produção com falhas documentais ou de segurança pendentes.
