# ADR 0047 — Relatório financeiro de caderno integral

**Status:** aceito para implementação/prova sintética local por autorização de 18/11/2026.

O teste de parsing de 300 páginas não mede qualidade financeira, e o redator geral aceita vinte
origens. A prova usa análise integral separada da redação: páginas autorizadas completas, grupos
documentais por cabeçalho explícito, conferência determinística das Specs 022/049 e síntese/conferência
por modelo. IDs lógicos internos não são citações: toda referência é remapeada e conferida contra
documento/versão/página/trecho originais. Inventário integral e resultados participam da identidade
imutável, revalidados antes de publicar ou entregar PDF. O gabarito só é usado pelo avaliador.

Reutilizar journal e editor/PDF. Referência de autoria do rascunho pode apontar ao recibo de relatório
financeiro; o servidor resolve o tipo e revalida a origem integral. Recibos separados impedem reenvio
incerto. O limite de referências de saída cresce para quinhentas sob o mesmo teto de bytes; isso não muda
as vinte origens do modelo geral nem aprova quotas, retenção ou custo da proposta operacional.

A reprodução literal simples deixa de exigir especialista apenas pela origem; recomendações de
avaliação técnica/contábil de fatos e decisões permanecem separadas da revisão do texto. Casos
substantivos continuam protegidos. A mudança é rastreada aos dois feedbacks humanos registrados.

A política estrita do servidor classifica a cópia integral elegível como `requiresSpecialist=false`;
conferência separada recebe o plano classificado. Texto e pendências não são alterados. Se o modelo
incluir revisão excessiva nesses campos, o conferente rejeita; a política não silencia essa objeção
nem transforma uma saída rejeitada em aprovação. Os recibos do ensaio preservam o bruto e o parecer.

Sem pacote npm, provedor, API paga, publicação ou dados reais. PDF de teste é gerado com reportlab
já incluído no runtime e verificado com Poppler; a aplicação conserva seu renderizador determinístico.
Codex usa a sessão ChatGPT conforme ADR 0046. A homologação de produto permanece humana.

Na composição do texto gerado, subtração e evolução usam hífen e a palavra `para` antes de
abrir o rascunho, permitindo o PDF WinAnsi existente. Citações permanecem literais. O PDF
reproduz o rascunho exibido e continua rejeitando outros caracteres fora do repertório,
sem substituição silenciosa durante a exportação.

Continuação autorizada em 18/11/2026: a soma de comprovantes vinculados passa a distinguir
suporte completo, parcial, ausente, ambíguo e excessivo. Usa centavos inteiros, exclui outras
competências e não desconta nota cancelada. Parcial explicita valor apoiado e parcela pendente,
com referências de cada apoio; não certifica pagamento, regularidade ou aprovação das contas.

O editor comum do chat inclui seleção por título e página do balancete integrante. Abrir,
selecionar e listar pedidos são leituras sem modelo; preparar é ação explícita. O journal
permite recuperar revisão humana e PDF sem modelo, inclusive materializar resultados de
redação/conferência já salvos após falha ao salvar o rascunho. A consulta de pedidos é paginada.
Recibos novos usam `financial-dossier-v2`; resultados v1 concluídos continuam legíveis sem
reanálise. Pedido v1 incompleto exige reconciliação explícita. Envio incerto continua bloqueado.
Controles operacionais, quando injetados explicitamente, protegem também as fases financeiras;
esta continuação não ativa a proposta nem muda o startup.

A prova específica usa PDF de 300 páginas, PostgreSQL em container próprio, processos novos
sem modelo e restore em banco separado. Recupera bytes, edição, confirmação e PDF por hash;
mudança da página 300 e revogação bloqueiam entrega. Modelos programados testam o contrato,
sem substituir a homologação humana anterior ou afirmar qualidade semântica nova de IA.
