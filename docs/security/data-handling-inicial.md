# Política inicial de dados e riscos aceitos

**Status:** aceita somente para desenvolvimento local; bloqueia piloto  
**Atualizado em:** 2026-10-07

## Classificação inicial

| Classe                     | Exemplos                                                                                     | Regra inicial                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Confidencial do condomínio | documentos, texto extraído, chunks, embeddings, perguntas, respostas, feedback e exportações | proibido no ambiente local atual; quando autorizado, exige escopo por condomínio, controles de acesso e purge verificável |
| Restrito operacional       | associações, IDs pseudonimizados, trilhas, custos, chaves e configuração                     | acesso mínimo necessário; segredos ficam fora do Git e logs não carregam conteúdo confidencial                            |
| Interno sanitizado         | fixtures, evals, hashes e métricas agregadas                                                 | pode ser versionado somente sem dados pessoais, segredos ou texto de cliente                                              |
| Público                    | documentação de produto sem dados reais                                                      | pode ser versionado                                                                                                       |

## Retenção inicial

- Desenvolvimento e testes usam apenas dados sintéticos versionados; não há retenção autorizada de dados reais de clientes neste ambiente.
- Por decisão operacional da B7, documentos, perguntas e identificadores reais, inclusive anonimizados, também ficam fora de testes, evals, benchmarks e exercícios de piloto.
- Arquivos locais temporários criados por testes ou processamento sintético devem ser removidos ao fim da execução; artefatos de cobertura e logs não podem conter conteúdo do corpus além do necessário para o teste.
- Documentos removidos ficam fora da busca imediatamente e são recuperáveis com original e derivados por 30 dias. Depois, a purga transacional remove o arquivo, os índices e as referências de busca do banco ativo; perguntas, respostas, feedback e snapshots de citação permanecem no chat. Citações do arquivo removido são marcadas como históricas e mantêm o trecho já exibido, mas não permitem abrir o PDF. O recibo técnico sem conteúdo expira após 30 dias.
- Retenção de perguntas, respostas, trechos históricos de documentos, feedback, trilhas e backups permanece pendente e bloqueia piloto, produção ou importação de dados reais.
- A purga no banco ativo não apaga snapshots/WAL/backups gerenciados. Antes de dados reais, é obrigatório aprovar o prazo efetivo do provedor e um procedimento de restore que reaplique exclusões registradas fora do snapshot restaurado.

## Riscos aceitos para esta fase

- Não há criptografia em repouso adicional para corpus sintético local; a aceitação não se estende a dados reais.
- Não há provedor externo de identidade ou storage. As exceções limitadas permitem enviar exclusivamente PDFs sintéticos ao OCR da OpenAI (ADR 0009) e imagens sintéticas à Gemini API paga para interpretação e embeddings (ADR 0019), sem registrar conteúdo ou chave em logs. O fluxo de imagens exige faturamento ativo confirmado, flags de habilitação, aviso e envio explícito. A cota gratuita Gemini é proibida. Nenhum dado real, pessoal ou de piloto pode ser enviado; o gate de LGPD, avaliação de fornecedor, retenção, exclusão, backup e resposta a incidentes continua bloqueando uso real.
- Não há disponibilidade, backup, disaster recovery ou suporte operacional prometidos nesta fase.

## Riscos não aceitos

- vazamento entre condomínios, inclusive por cache, job, storage, busca ou log;
- acesso sem autorização, citação fabricada, resposta documental sem evidência ou execução de instruções contidas em documentos;
- inclusão de dados reais, pessoais ou segredos em fixtures, testes, evals, logs ou repositório.

## Gate antes do piloto

Antes de qualquer dado real, aprovar uma política específica com: base legal e responsabilidades, prazos de retenção, exportação e exclusão, ciclo de backups, papéis administrativos, resposta a incidente, avaliação de fornecedores e evidência de testes de purge e revogação.
