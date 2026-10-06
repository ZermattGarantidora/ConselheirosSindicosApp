# Critérios de aceitação — Spec 005

| ID | Cenário | Resultado esperado |
|---|---|---|
| AC-501 | Usuário envia “Olá” ou pergunta “Como a Alvitra pode me ajudar?” sem citar um assunto condominial | Alvitra responde brevemente, sem busca ou citação documental, limitação genérica ou indicação de risco. |
| AC-502 | Usuário pergunta uma regra do condomínio | Alvitra usa somente evidência autorizada e mostra fonte verificável. |
| AC-503 | Usuário relata risco físico imediato | Alvitra prioriza segurança e serviço responsável, sem executar ação externa. |
| AC-504 | Usuário pergunta sobre multa ou disputa | Alvitra mostra a informação disponível e indica validação humana sem parecer definitivo. |
| AC-505 | Usuário relata conflito entre partes | Alvitra organiza fatos e próximos passos de mediação, sem decidir culpa ou executar ação externa. |
| AC-506 | Alvitra orienta um caso conversacional | A resposta tem até 130 palavras, no máximo quatro passos, tom cordial e pouco formal, palavras comuns e frases curtas. Não usa gírias, linguagem infantil, juridiquês, fórmulas burocráticas nem frases emocionais. Pode destacar ação ou ressalva com `**negrito**`, exibido como negrito sem interpretar HTML. |
| AC-507 | Pergunta não tem resposta nos documentos | Alvitra formula orientação geral adequada à pergunta, explica que ela não foi confirmada nos documentos e não inventa fonte ou regra local. |
| AC-508 | Pergunta tem resposta nos documentos | Alvitra formula uma resposta natural baseada nos trechos recuperados e apresenta a fonte destacada com documento, versão, página e trecho. |
| AC-509 | Resposta documental comum tem risco baixo ou médio | Alvitra entrega a resposta e as fontes sem criar ponto de atenção, próximo passo ou etiquetas rotineiras de base documental/risco; detalhes indispensáveis ficam no texto principal. |
| AC-510 | Ressalva ou ação é essencial | Alvitra usa no máximo um ponto de atenção e um próximo passo somente em abstenção, falha, conflito, risco alto, validação profissional ou degradação relevante, e a interface os mantém no mesmo cartão da resposta; indicador visual extra só aparece se acrescentar contexto relevante. |
| AC-511 | Evidência traz a conclusão e detalhes complementares úteis | Alvitra começa pela conclusão, inclui um ou dois detalhes sustentados como condição, prazo, exceção ou consequência e permanece com até 90 palavras, sem introdução, despedida, repetição ou conteúdo genérico. |
