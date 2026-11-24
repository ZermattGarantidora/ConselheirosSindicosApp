# Leitura documental densa — Spec 075

Cinco documentos sintéticos: financeiro, convenção aprovada, minuta conflitante, atas e
contratos. São 120 páginas e 6.000 registros distintos, com notas finais, IDs semelhantes,
vínculos entre documentos, valores, prazos, votos e estados que não podem ser confundidos.
O ledger e o oracle são gerados antes da extração/modelo, sem importar código de produção.

```powershell
pnpm run evals:dense-documents
pnpm run evals:dense-documents --prepare --run-key=<id-novo>
pnpm run evals:dense-documents --execute --run-key=<id-novo>
```

O primeiro comando mostra o plano sem IA. A preparação passa PDFs reais pelo endpoint,
confere original e todas as páginas e conserva a minuta como pendente, sem promover vigência.
Exporta PDFs em `output/pdf/dense-documents-<id>/`. `qa.py` renderiza amostras iniciais,
centrais e finais com Poppler, cria contato e compilação de consulta de 120 páginas; a
compilação não substitui os originais nem altera sua paginação documental.

A execução usa somente Sol 6.1 low pelo Codex pessoal local já autorizado, sem trocar o
modelo do aplicativo. Congela código/corpus/oracle, usa os budgets e o reparo atuais e não
reexecuta checkpoint concluído. Artefatos em `.local/dense-documents/<id>/`; não copiam `.env`
ou autenticação. O comando real exige configuração local válida, sem fallback para API paga.

O replay consulta todos os documentos autorizados como distratores. Um canário de outro
condomínio testa o isolamento; uma instrução hostil entre notas das atas testa o tratamento
de documento como dado. Gabaritos e localizações esperadas não entram no gateway.

Relatórios separam extração, presença das fontes necessárias na entrada do modelo,
cobertura de informações e existência das citações finais. Checks automáticos não verificam
todos os sentidos possíveis e não são aprovação semântica. Uma auditoria técnica por IA deve
conferir cada resposta e registrar falhas por hash, sem se passar por revisor especializado.
O total global só é aceitável quando todas as linhas necessárias forem verificadas;
limitação honesta é preferível a total inventado e é avaliada separadamente de completude.

Consumo captura também saídas rejeitadas; falha sem usage é desconhecida. Preço equivalente
de API não é fatura/franquia nem inclui escrita de cache que o CLI não informa (Spec 074).
Esta suíte mede PDFs textuais; não certifica OCR, manuscritos, gráficos, tabelas visuais
complexas ou superioridade geral. Rodar evals não altera pesos nem faz fine-tuning.

## Continuação — Spec 076

```powershell
pnpm run evals:dense-comparison
pnpm run evals:dense-comparison --prepare --run-key=<id-novo> --python=<python-com-reportlab>
pnpm run evals:dense-comparison --execute --run-key=<mesmo-id> --python=<mesmo-python>
```

Plano e preparação usam zero inferência. São 60 perguntas por braço: 32 originais, 12 de
registros inéditos, 12 sobre três documentos narrativos de quatro páginas e quatro sobre
uma digitalização de duas páginas. O conjunto tem 132 páginas nativas e duas digitalizadas.
Perguntas originais conservam os cinco documentos originais; inéditas usam o conjunto ampliado.
Gabaritos/associações/locais vêm das entradas, antes de OCR e geração. O caso 029 aceita
explicitamente a mesma declaração repetida em outras páginas; o check estrito permanece.

O OCR real envia apenas duas imagens sintéticas ao Codex local, sem ferramentas, web, skills,
credenciais da aplicação ou API paga. A transcrição não recebe gabarito e não é corrigida
depois. Aferição contra o original sintético mede tokens e campos críticos; só a origem
aprovada nesse ensaio entra nas consultas. Isso não implanta OCR nem mede confiança de
documentos reais. Sem OCR, o pipeline deve marcar revisão. Recibos da leitura visual são
separados do consumo das 120 respostas. Envio incerto impede reenvio automático.

Ambos os braços compartilham snapshot, corpus, budgets e memória desligada. Dois workers
executam pares, alternando a ordem de submissão por caso. Medidas são da execução local
concorrente; não são SLA nem prova estatística de superioridade. Checkpoints vinculam
manifest, braço e caso. Uma resposta concluída não é refeita para melhorar nota.

O avaliador v2 conserva o resultado estrito, aceita flexão equivalente e locais repetidos
explicitamente no oracle e confere recibo integral contra ledger/páginas independentes.
Presença de palavras não prova associação correta; toda resposta exige auditoria técnica
por hash e revisão especializada continua humana. `qa-v2.py` gera compilação de 134 páginas
e 26 amostras para inspeção. Resultados brutos da Spec 075 permanecem intactos.

O progresso é serializado; indisponibilidade transitória desse arquivo não elimina casos
concluídos. Cada tentativa registra o envio antes da chamada e salva os eventos/usage depois.
Uma retomada reutiliza apenas resultado íntegro da mesma entrada/modelo/manifest; marcador
sem resultado ou falha sem usage impedem reenvio automático e mantêm consumo desconhecido.
Rodadas interrompidas são diagnósticos separados, com custo conhecido e incertezas explícitas.
