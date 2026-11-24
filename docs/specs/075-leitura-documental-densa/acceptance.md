# Aceitação — Spec 075

- **AC-7501:** cinco PDFs de 24 páginas, 6.000 IDs distintos, >=3.500 caracteres não brancos por página, entre 50 e 70 linhas e no máximo 92 caracteres por linha; nenhum arquivo/página é descartado para passar o piso.
- **AC-7502:** upload real sintético confere 120 páginas, original, texto e ordem integralmente; oracle não importa parser/modelo. QA renderiza e inspeciona páginas iniciais, centrais e finais.
- **AC-7503:** 32 IDs de caso únicos, com gabaritos e fontes esperadas antes da IA; nota tardia, versão disputada, valor semelhante, soma e ausência têm casos explícitos.
- **AC-7504:** relatório separa extração, fontes recuperadas, presença factual e auditoria técnica; resposta sem citação de fato documental não passa como completa. Fonte removida ou número trocado faz o check correspondente falhar.
- **AC-7505:** preparação e plano usam zero IA; execução exige opt-in, snapshot e checkpoints íntegros; falha não aciona API paga nem substitui caso concluído.
- **AC-7506:** gabarito não entra no gateway; citações preservam versão/página/trecho/offset; fontes de outro condomínio e instruções hostis não são utilizadas para vazar ou agir.
- **AC-7507:** consumo de todas as tentativas e tempo da resposta completa observáveis; ausência de usage é desconhecida; custo equivalente identificado conforme Spec 074.
- **AC-7508:** todos os casos reais têm auditoria técnica por hash; gates, limitações, regressões e próximos alvos documentados. Cobertura >=80% nos quatro indicadores, sem enfraquecer asserções.
