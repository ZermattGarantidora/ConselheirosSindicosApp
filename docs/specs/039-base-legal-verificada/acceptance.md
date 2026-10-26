# Aceitação — Spec 039

## AC-3901 — Fonte real e edição íntegra

Dado o catálogo conferido em 22/10/2026, quando a edição é carregada, cada URL é HTTPS oficial,
cada recorte possui dispositivos e jurisdição BR e todos os hashes correspondem ao conteúdo.
Alterar um caractere, uma página ou metadado de versão sem atualizar o manifesto reprova o carregamento.

## AC-3902 — PDF e citação conferíveis

Dado um recorte elegível sobre assembleia eletrônica, juros, rateio ou proteção de dados, quando
é recuperado, a citação identifica legislação e cópia de consulta. Página, offsets e trecho
existem na extração do PDF. O cabeçalho identifica a paginação da Alvitra e a origem oficial.
Uma consulta histórica pode abrir a cópia citada, mas não a torna elegível para nova conclusão.

## AC-3903 — Data da conferência

Dada conferência em 22/10/2026 e revisão em 21/11/2026, quando a data consultada está antes do
intervalo ou em/depois de 21/11/2026, nenhum recorte dessa edição participa da resposta. No início
e imediatamente antes do fim, a edição permanece elegível. Não se afirma que a lei deixou de vigorar.

## AC-3904 — Autorização e isolamento

Dadas duas associações e documentos privados distintos, quando se consulta um condomínio, as
leis públicas pertinentes podem ser recuperadas, mas nenhum documento do outro condomínio aparece.
Sem leitura, associação vigente ou autenticação, páginas e cópias não são abertas. Upload ou
instrução documental não pode alterar a biblioteca global.

## AC-3905 — Lacuna local

Dada uma pergunta por nome de síndico eleito, regra municipal ou aprovação de obra específica sem
ata/convenção, uma regra federal não pode ser apresentada como confirmação desse fato. Fontes
irrelevantes não são incluídas apenas para ter citação. O limite e o documento pertinente permanecem claros.
Se o provedor classificar como fato local uma afirmação sustentada somente por lei, a validação
recusa a resposta; a existência de uma citação válida não remove a exigência de evidência privada.

## AC-3906 — Importação controlada

Dada uma cópia íntegra, a importação registra versão, hash, páginas e prazo de conferência em
transação. Repetir o conteúdo é idempotente; conteúdo anterior não substitui edição mais recente
silenciosamente. Falha de persistência faz rollback. A consulta PostgreSQL filtra o intervalo e
continua sob RLS e associação autorizada.
No banco dedicado de integração, reiniciar as fixtures remove também fontes, versões, páginas
e trechos legais do cenário anterior. Uma busca autorizada que encontrava a fonte sintética
antes do reinício deixa de encontrá-la depois, mantendo a mesma identidade autorizada.

## AC-3907 — Evals legais

O comando `pnpm run evals:legal` executa casos sintéticos de recuperação, citação, pertinência,
datas, ausência de fonte e isolamento. Exige todos os casos aprovados e nenhuma chamada paga.
