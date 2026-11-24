# Revisão do autor — preferência de tratamento “Síndico”

- **Status:** revisão do autor; não autoriza merge
- **Data:** 2026-11-03
- **Escopo:** Spec 021/RQ-2002 e AC-2105; correção de `development-identity.ts`, regressões de gravação/restauração e rastreabilidade.
- **Revisor independente:** pendente
- **P0/P1 no delta:** nenhum encontrado na revisão do autor

## Causa e correção

O servidor aceitava a preferência explícita “Síndico”, mas a lista antiga `nonNameReplies`
do navegador recusava “sindico” e “sindica” ao gravar o perfil. A conversa mostrava a confirmação
salva no journal e a interface exibia o erro contraditório. Removidos somente esses dois termos
da lista; limites, controles de formato e demais recusas continuam. Tratamento não concede papel
ou permissão e não altera autenticação, contexto ou documentos.

Quatro regressões variam gênero e acentuação, gravam nome e condomínio, restauram o perfil e
verificam que outra identidade não o recebe. As quatro falharam no código anterior; os demais
oito testes existentes de identidade já passavam. O gate completo passou após a correção:
1.731 testes/171 arquivos; cobertura statements 91,43%, branches 87,58%, functions 96,17% e
lines 93,11%. Formatação, lint, tipos e visão passaram; build web aprovado. Logs em
`.local/preferred-title-fix/` preservam o antes/depois. Scanner incluído no gate canônico.

## Revisão e limites

Diff completo da fatia revisto: fonte, teste, spec, aceitação e rastreabilidade. Nenhuma asserção
anterior foi enfraquecida; a correção não muda prompt ou modelo nem usa inferência externa.
Não houve reinício da API, alteração de dados do teste manual, commit, merge ou deploy.
A página aberta pode conservar o aviso antigo até uma atualização; o servidor e seu journal
em RAM foram mantidos. Revisão independente do branch completo e CI permanecem necessários
antes de merge. Esta revisão não substitui teste semântico ou autorização de produção.
