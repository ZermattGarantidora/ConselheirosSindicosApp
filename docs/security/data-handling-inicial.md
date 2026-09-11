# Política inicial de dados e riscos aceitos

**Status:** aceita somente para desenvolvimento local; bloqueia piloto  
**Atualizado em:** 2026-09-01

## Classificação inicial

| Classe | Exemplos | Regra inicial |
|---|---|---|
| Confidencial do condomínio | documentos, texto extraído, chunks, embeddings, perguntas, respostas, feedback e exportações | proibido no ambiente local atual; quando autorizado, exige escopo por condomínio, controles de acesso e purge verificável |
| Restrito operacional | associações, IDs pseudonimizados, trilhas, custos, chaves e configuração | acesso mínimo necessário; segredos ficam fora do Git e logs não carregam conteúdo confidencial |
| Interno sanitizado | fixtures, evals, hashes e métricas agregadas | pode ser versionado somente sem dados pessoais, segredos ou texto de cliente |
| Público | documentação de produto sem dados reais | pode ser versionado |

## Retenção inicial

- Desenvolvimento e testes usam apenas dados sintéticos versionados; não há retenção autorizada de dados reais de clientes neste ambiente.
- Por decisão operacional da B7, documentos, perguntas e identificadores reais, inclusive anonimizados, também ficam fora de testes, evals, benchmarks e exercícios de piloto.
- Arquivos locais temporários criados por testes ou processamento sintético devem ser removidos ao fim da execução; artefatos de cobertura e logs não podem conter conteúdo do corpus além do necessário para o teste.
- Prazos para documentos, perguntas, respostas, backups, trilhas e comprovantes de exclusão permanecem pendentes e bloqueiam piloto, produção ou importação de dados reais.

## Riscos aceitos para esta fase

- Não há criptografia em repouso adicional para corpus sintético local; a aceitação não se estende a dados reais.
- Não há provedor externo de identidade ou storage. A exceção limitada do ADR 0009 permite enviar exclusivamente PDFs sintéticos ao OCR da OpenAI, com `store: false`, sem registrar conteúdo ou chave em logs. Nenhum dado real, pessoal ou de piloto pode ser enviado.
- Não há disponibilidade, backup, disaster recovery ou suporte operacional prometidos nesta fase.

## Riscos não aceitos

- vazamento entre condomínios, inclusive por cache, job, storage, busca ou log;
- acesso sem autorização, citação fabricada, resposta documental sem evidência ou execução de instruções contidas em documentos;
- inclusão de dados reais, pessoais ou segredos em fixtures, testes, evals, logs ou repositório.

## Gate antes do piloto

Antes de qualquer dado real, aprovar uma política específica com: base legal e responsabilidades, prazos de retenção, exportação e exclusão, ciclo de backups, papéis administrativos, resposta a incidente, avaliação de fornecedores e evidência de testes de purge e revogação.
