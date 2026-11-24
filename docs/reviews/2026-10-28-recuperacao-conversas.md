# Revisão do autor — recuperação e esforço

**Status:** implementação e experimentos revisados; pendências semânticas abertas, sem aprovação de adoção ou merge.
**Escopo:** Spec 054; revisão técnica do autor, sem aprovação independente ou de merge.

## Mudanças revisadas

Diff desta fatia comparado com o snapshot R3 imutável e o baseline local; preservadas alterações alheias. Revisados contexto/foco, fidelidade, fluxo geral/documental, projeção de referências, recuperação textual, seleção de esforço, observabilidade, runner, testes e documentação. O system prompt v26 não foi alterado.

As causas reproduzidas em fixtures incluíram tópico de versão exigido por rascunho, aviso de sinistro confundido com denúncia contratual e valor do relato não confirmado tratado como fato. Novas recusas do S2 mostraram guarda excessiva ao negar transferência de acordo e variante de frase monetária; ambas receberam controle positivo e negativo. A paráfrase “unidade que corrigi” não era continuação reconhecida. Revalidação offline não substitui inferência nem nota de uma falha anterior.

Referências são exibidas somente se já recuperadas; classe, texto e modo não são convertidos. Desconhecida, minuta como fato, abstenção factual, valor falso em outra cláusula e revogação permanecem recusados. A guarda de seleção atua no pedido de escolher identificador, preservando recusa de aplicar acordo alheio e comparação explícita. A recuperação reserva páginas pertinentes já autorizadas, sem ampliar oito fontes nem modificar SQL/RLS, temporalidade ou piso de qualidade.

Metadados de tarefa, data e contrato são dados não privilegiados dentro de oito interações/12.000 bytes. Não há memória global, resumo de fatos ou reaproveitamento documental. O esforço é opção explícita no construtor, low por padrão; ambiente e roteamento do aplicativo não mudam. O runner verifica flags enviadas ao CLI e registra modelo/esforço e uso conhecido/desconhecido, sem receber chaves de API.

## Limites de avaliação

O replay dirigido usa perguntas da janela e evidências pré-selecionadas da bateria sintética; não reexecuta busca, HTTP, persistência ou autorização. Respostas antigas são omitidas. Os 40 alvos e as três configurações foram fixados antes da matriz; uma rodada é exploratória, com auditoria IA pelo autor. O benchmark completo posterior preserva os 280 casos e 80/79 alvos. Custos de diagnóstico, falhas operacionais e validação ficam separados, sem estimar fatura ou franquia.

Não houve dependência, novo serviço, provedor, credencial, migração, ação externa de domínio, commit ou deploy. Inferências usaram o CLI pessoal autorizado. Falhas semânticas remanescentes impedem declarar solução completa.

## Gates da fonte congelada

Fonte `03bee28deb25b9c679c790ee2ec483306462def228aa3d3568d8d7161088589b`: 1.432 testes em 155 arquivos aprovados, incluindo unitários e e2e. São 32 testes novos de regressão. Cobertura: statements 92,04%, branches 87,72%, funções 96,87% e linhas 93,72%. Nenhuma asserção antiga ou limite foi reduzido.

Tipagem, lint e formato passaram. O gate de visão passou para 54 specs, os 20 evals legados e os 50 evals documentais determinísticos passaram. Registros locais: `.local/recovery-054-full-tests-03.log`, `.local/recovery-054-coverage-final-03/coverage-summary.json`, `.local/recovery-specs-03.log`, `.local/recovery-evals-03.log` e `.local/recovery-documentary-03.log`. Após os dois runners terminarem com exit 0, o scanner passou sem padrão conhecido de segredo; visão e formato foram reconferidos, e `git diff --check` passou. A verificação final da R4 confirmou novamente fonte atual idêntica ao snapshot e hashes das 80 respostas auditadas. Nenhum código foi alterado após o congelamento.

O hash de `prompt-catalog.ts` permanece `77b97eeff2c5faa9df82d62c889e59d5f07960df4af156c366b41e2e56a53d0e`, idêntico à R3. O snapshot da R4 não inclui alterações alheias de interface como parte desta revisão. Aprovação técnica automática não substitui auditoria semântica, revisão independente ou aprovação profissional.

## Experimentos concluídos e achados abertos

R4 terminou com exit 0, 280 cenários/1.010 turnos, somente Luna low/memória, 1.143 tentativas com usage. Auditoria fixa de 80/79 pontos: 62 S, 16 P, 1 F e um oráculo excluído. Referência R3: 59 S, 13 P e 7 F. As sete falhas antigas viraram cinco S e duas P, porém surgiram seis regressões para P e uma para F. Finais longos passaram de 23/40 a 25/40, com regressão nos grupos de 20 e 30 turnos.

A matriz terminou com exit 0 e 120/120 pontos, fonte idêntica e paridade de inputs base verificada: Luna low 31/40 S, Luna high 26/40 e Sol low 30/40. Uso completo nas 133 tentativas. Custo observado da bateria: 21,2411895 créditos equivalentes; matriz por configuração: 0,951208/1,524760/31,221920. Subtotal desta tarefa: 56,529805, mais 20 tentativas iniciais sem usage. Não são fatura ou franquia, e não houve API paga.

Permanecem abertos: sínteses incompletas; recusa genérica nova CONV-long-30/20; regra local de rateio sem citação em abstenção CONV-crosscutting-06/2, embora esse oráculo permaneça excluído da taxa comparável; variantes monetárias de recusa/relato; guard lexical de assembleia. Há risco de grounding e utilidade, portanto esta revisão não autoriza adoção. O diagnóstico offline reproduziu os quatro bloqueios da matriz; no Sol, acrescentar apenas o rótulo correto Na AGE fez o mesmo conteúdo passar. Notas F foram preservadas, sem edição da fonte congelada ou promoção retroativa.

Relatórios: [resultados](../specs/054-recuperacao-conversas-comparacao/observed-results-2026-10-28.md), [verificação R4](../../reports/conversations-2026-10-28-luna-quality-r4-verification.json), [matriz](../../reports/conversations-2026-10-28-recovery-matrix-m1-technical-audit.json), [diagnóstico offline](../../reports/conversations-2026-10-28-recovery-matrix-m1-block-diagnosis.json). Os 50 documentais semânticos e a aprovação profissional continuam fora desta auditoria técnica.
