# Aceitação — Spec 076

- **AC-7601:** ID completo prioriza a linha no documento solicitado; prefixo, referência em minuta, vizinho e tenant estrangeiro não a substituem. DENSE-005 permanece regressão.
- **AC-7602:** soma integral confere catálogo e todas as páginas, filtra mês/ano/situação, usa centavos e identifica páginas/linhas/total; DENSE-032 tem total esperado anterior ao modelo.
- **AC-7603:** página/linha ausente, baixa qualidade, duplicata, valor ilegível, versão pendente/ambígua, escopo estranho, overflow, conflito relevante ou alteração concorrente recusam o total.
- **AC-7604:** resposta com total alterado, citações fora da versão, prova JSON fabricada ou alegação de quitação/aprovação não é aprovada como soma comprovada. Recibo privado é persistido sem migration.
- **AC-7605:** variantes inéditas e corpus narrativo/tabelas/anexos têm gabaritos prévios e fontes verificáveis; avaliador v2 preserva baseline e separa equivalência de falha.
- **AC-7606:** Sol e híbrido executam os mesmos casos com ordem alternada, snapshot e checkpoints, budgets iguais e consumo de toda tentativa; custos desconhecidos não valem zero.
- **AC-7607:** PDF digitalizado não possui texto embutido, ausência de OCR exige revisão; qualquer prova real de OCR é identificada e separada de mocks. QA visual e originais preservados.
- **AC-7608:** respostas são auditadas por hash e formulário especializado fica pendente para pessoa; gates globais, cobertura >=80% nos quatro indicadores e rastreabilidade informados.
- **AC-7609:** comparação de minuta pendente/disputada validada e persistida chega por HTTP e pode ser retomada pelo recibo exato; sem resposta persistida correspondente, claims qualificadas, propriedade confirmada, páginas e catálogo iguais, o recibo é recusado. Arquivamento, mudança de estado/texto ou revogação bloqueiam replay; resumo automático de minuta continua proibido.
  O simples uso da palavra “minuta” não qualifica uma afirmação que a apresenta como vigente;
  proposta, pendência/disputa ou limitação de aprovação/autorização/vigência devem estar explícitas.

- **AC-7610:** registro e nota de valor divergente não conciliado do mesmo ID/tenant/documento/versão acionam conflito; IDs vizinhos, valores iguais, outra versão/tenant, instrução hostil, ausência de fonte ou nota conciliada não o inventam.
- **AC-7611:** contrato inicial e reparo recebem os IDs das duas evidências reais; resposta sem registro, algum valor, fonte ou pendência é recusada. Resposta correta não falha só por flexão/vocabulário financeiro equivalente; outros requisitos e guardas permanecem.
- **AC-7612:** DENSE-017/027/031 chegam por HTTP com a divergência e as limitações corretas nos dois braços, sem acusação/regularidade/aprovação presumidas; comparação de 60 casos por braço conserva oracle/corpus, tentativas e consumo desconhecido explícito. Auditoria técnica é separada de aprovação humana.
