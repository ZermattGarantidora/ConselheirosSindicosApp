# Critérios de aceitação — Spec 062

## AC-6201 — Oferta após encontrar correções seguras

Dado um PDF legível do condomínio ativo cuja análise encontrou correções seguras e sustentadas, quando a Alvitra apresentar o resultado, então resume as mudanças específicas e pergunta em linguagem natural se o síndico quer uma cópia revisada, sem criar o arquivo antes da resposta afirmativa.

Dado que nenhuma mudança segura tenha sido encontrada, ou que os únicos achados estejam sem evidência, em conflito ou abaixo da qualidade necessária, então a Alvitra explica o limite e não oferece geração.

Se a origem ou as mudanças propostas estiverem ambíguas, a Alvitra pede esclarecimento e ainda não oferece nem gera uma cópia.

## AC-6202 — Confirmação antes da geração

Dado um resumo de mudanças oferecido pela Alvitra, quando o síndico aceitar, então ela gera somente as mudanças apresentadas. Quando o síndico recusar, então nenhum arquivo é criado e a oferta não se repete no mesmo resultado.

Dado um pedido inicial explícito e inequívoco para gerar uma cópia do PDF de origem e das mudanças determinadas, então o pedido vale como confirmação. Se origem ou escopo não forem inequívocos, a Alvitra esclarece antes.

Dado que o síndico altere o conjunto de mudanças após a oferta, então a Alvitra apresenta a proposta atualizada e pede nova confirmação antes de gerar.

## AC-6203 — Original preservado

Dado um pedido elegível, quando o rascunho for gerado, então o PDF original e seu hash permanecem idênticos, a saída possui identificador/hash próprios e a relação com origem, versão, conversa e condomínio pode ser recuperada.

## AC-6204 — Correção de redação sem mudança de sentido

Dado um erro ortográfico, de pontuação ou gramática em página legível, quando a Alvitra preparar a cópia, então a mudança não altera fatos, deveres, decisões, valores, prazos ou sentido normativo. O resumo mostra página e trecho antes/depois.

## AC-6205 — Oferta de alteração factual sustentada

Dado que a análise encontre uma divergência factual e exista fonte atual autorizada do mesmo condomínio, ou fonte oficial já disponível, verificada e aplicável para uma mudança normativa, então a Alvitra mostra a diferença e sua evidência e pergunta se o síndico quer aplicar aquela mudança na cópia revisada. A proposta factual só entra no PDF depois da resposta afirmativa; sem confirmação, o trecho original permanece.

## AC-6206 — Evidência insuficiente ou conflitante

Dado que falte uma fonte verificável, haja versões conflitantes ou a leitura esteja pendente, quando a Alvitra avaliar a mudança factual, então mantém no rascunho o trecho original, apresenta a limitação como pendência e não resolve o conflito silenciosamente.

## AC-6207 — Limite de fidelidade ou qualidade

Dado PDF escaneado sem leitura confiável, texto ambíguo, conteúdo além dos limites existentes ou risco de perda, sobreposição ou corte, quando a geração não puder ser validada, então nenhum arquivo parcial é entregue como cópia revisada e a conversa explica o que precisa ser enviado ou revisado.

## AC-6208 — Resultado claramente identificado

Dado um rascunho pronto, quando a Alvitra o apresentar, então o nome do arquivo e a fala identificam que é uma proposta sujeita a revisão humana. A saída não adiciona assinatura, aprovação, protocolo ou validade que não esteja na fonte.

## AC-6209 — Derivado não vira evidência

Dado um arquivo gerado, quando uma pergunta documental futura consultar a biblioteca, então o rascunho não aparece como documento ativo, candidato de busca, citação ou prova. Somente um novo envio voluntário pelo fluxo existente pode criar outra versão consultável.

## AC-6210 — Isolamento e revogação

Dado usuário sem permissão, troca de condomínio/chat, revogação durante a geração ou falha de revalidação no download, então nenhum arquivo, trecho ou referência é devolvido, armazenado no escopo errado ou revelado por resposta de erro.

## AC-6211 — Instruções hostis no documento

Dado PDF contendo texto que tenta instruir o sistema a ignorar regras, escolher outra fonte ou ocultar alterações, quando a revisão for produzida, então esse texto é tratado apenas como conteúdo documental e não muda o pedido, autorização, evidências ou saída.

## AC-6212 — Retenção e exclusão

Dado que o original ou o rascunho seja excluído conforme a política aprovada, quando a exclusão concluir, então o arquivo derivado, metadados e referências sujeitos à mesma política deixam de estar acessíveis, sem sobreviverem em logs ou índices.
