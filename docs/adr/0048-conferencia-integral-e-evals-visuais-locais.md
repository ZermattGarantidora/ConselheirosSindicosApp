# ADR 0048 — Conferência integral e ensaio visual local

**Status:** aceito para implementação e testes sintéticos locais por autorização de 23/11/2026.

A Spec 076 sucede o diagnóstico da Spec 075 sem modificar sua baseline. Identificadores
exatos reservam fontes antes de distratores, com fronteiras e filtros existentes. Somatórias
integrais usam catálogo/leitor autorizados e formato tabular fechado; ausência de cobertura,
duplicidade ou conflito impede total. Cálculo em centavos e recibo privado são separados da
redação gerada. A geração recebe resumo do cálculo e amostras citáveis, não todo o corpus.

O resumo calculado possui prova interna vinculada por identidade no processo, não autoridade
por igualdade de JSON. Validação monetária só aceita o total correspondente às fontes e ao
escopo. Revalidar origens antes de persistir; alteração impede publicação do total e conserva
recibos de consumo. Prova completa vai aos metadados privados do audit existente, sem schema.
Não permitir replay da resposta calculada sem nova conferência. Não alterar personalidade ou
texto do system prompt: somente dados contextuais e contratos de validação internos.

A confirmação HTTP/replay confere o hash integral de todas as páginas do cálculo, não apenas
as amostras citadas. Comparação de minuta pendente/disputada pode ser entregue somente como
resposta de pergunta já validada e persistida, com interpretação qualificada, dono/tenant,
texto/citações exatos, propriedade confirmada, catálogo e páginas íntegros. Isso não permite
resumo automático de documento pendente nem o torna vigente. Mudança de estado ou arquivamento
invalida o recibo; não remover a guarda geral de documentos inelegíveis.

A comparação usa os dois destinos já aprovados, sem trocar o roteador do aplicativo. O ensaio
de digitalização usa imagens sintéticas anexadas ao `codex exec --image`, opção verificada no
CLI instalado. É autorização restrita ao eval local, não ativação de OCR no produto. Sessão
ChatGPT, diretório temporário isolado, ferramentas/MCP/web/skills desativados e ambiente filho
sem credenciais da aplicação seguem o ADR 0031. O gabarito não é entregue ao OCR nem à resposta.
Recibos distinguem custo da leitura visual e consultas; não existe fallback para API paga.

O original digitalizado não tem camada textual. Extração sem OCR deve exigir revisão; OCR real
é medido contra campos/transcrição independentes e não recebe qualidade alta por autodeclaração
do modelo. Integração com OCR programado permanece identificada como mock, sem alegação de
qualidade visual. Não há pacote, provedor, dado real, deploy ou aprovação especializada nova.

## Continuação de 24/11/2026 — conflitos intradocumentais

A solicitação de corrigir DENSE-017/027/031 estende a detecção local a registro tabular e
nota explicitamente divergente e não conciliada, do mesmo ID/tenant/documento/versão.
Mantém modo estrito: somente conflito comprovado aciona `document_conflict`; o contrato
da geração/reparo identifica as duas evidências reais, sem pressupor versões diferentes.
A cobertura exige ID, ambos os valores, pendência e citações. Essa prova satisfaz o tópico
financeiro sem exigir uma palavra específica, sem remover outras coberturas ou validações.
Não muda personalidade/system prompt, roteador de modelos, provedores, budgets ou quantidade de reparos.

## Continuação após o estresse de 24/11/2026 — validação condicional

A classificação da tarefa não esgota os modos documentais válidos. A Spec 077 permite
`conflict` em tarefa documental/especializada quando o mesmo registro e campo apresentam
valores distintos em fontes elegíveis, com pendência explícita e todos os lados citados.
O contrato informa essa possibilidade antes da geração e no reparo; o servidor valida a
prova depois das citações, sem reclassificar a tarefa/modelo nem aceitar conflitos genéricos.
Precedência já resolvida e diferenças de escopo/unidade não viram divergência por contagem
de fontes. A limitação do reconhecedor literal permanece explícita, com controles negativos,
gates e repetição da matriz original. Sem schema, provedor ou dependência novos.
