# ADR 0031 — Codex CLI nas conversas pessoais locais

**Status:** aceito para demonstração sintética local por solicitação explícita do usuário
**Data:** 2026-10-26

## Contexto

O operador quer usar seu plano ChatGPT/Codex em todas as conversas locais, inclusive boas-vindas e configuração, além dos evals. O CLI já está instalado e autenticado com ChatGPT. O gateway atual usa a API com cobrança própria; copiar credenciais do CLI não é uma configuração de API.

## Decisão

Extensão solicitada em 04/11/2026: a [Spec 066](../specs/066-documentos-teste-locais/spec.md)
delimita contexto opt-in de simulação no gateway local, para não recusar apenas a origem
sintética nem repetir avisos rotineiros de teste. Não altera o prompt padrão ou a personalidade;
todos os validadores desta decisão permanecem obrigatórios. A versão da variante é observável.

O usuário autorizou explicitamente nesta sessão o envio de perguntas, contexto recente e trechos
recuperados de documentos sintéticos ao Codex/OpenAI, pela sessão ChatGPT, consumindo seu plano,
somente no computador pessoal. Essa autorização não inclui dados reais ou hospedagem remota.

Adicionar adaptador opt-in de `AnswerGateway` usando `codex exec` sem nova dependência de pacote. Exigir demonstração local, autenticação ChatGPT, sessão efêmera por geração, diretório temporário isolado, stdin e ferramentas desabilitadas. O processo filho não recebe chaves de API. Manter prompt, recuperação autorizada, reconstrução de citações e validação da Alvitra. Falhas não migram para APIs cobradas separadamente.

Configurar o ambiente local ignorado pelo Git. Não alterar o login do produto, ler/copiar `auth.json`, oferecer essa integração no Render ou autorizar dados reais. OCR, imagens e embeddings mantêm suas políticas próprias e não passam automaticamente a consumir o plano.

## Consequências

Exceção opt-in de 04/11/2026: o [ADR 0039](0039-pesquisa-publica-isolada-na-demo.md) permite
web somente em subprocesso público da Spec 065, sem pergunta livre, histórico ou PDFs.
O gateway documental e a configuração mantêm ferramentas desabilitadas.

- Consumo e limites seguem o plano e o modelo disponíveis ao operador; tokens e latência são registrados, mas custo legado em BRL não estima cobrança nem cota restante.
- Há overhead do processo e instruções do harness Codex; comparações com produção devem identificar esse modo.
- CLI ausente, logout, limite ou falha geram indisponibilidade clara sem fallback pago.
- Ajuste operacional de 03/11/2026: os prazos HTTP abrangem o teto configurável do subprocesso
  (300 s), mais 30 s de margem; perguntas abrangem as duas gerações já permitidas. Não acrescenta
  chamadas, reenvio ou geração automática. O cliente recusa respostas incompletas antes de renderizar.
- Refinamento de 31/10/2026 (Spec 060): eventos passivos `todo_list` são validados por estrutura
  e descartados, sem converter seu texto em instrução, resposta ou memória. Ações, eventos
  desconhecidos e mensagens após a conclusão continuam recusados. Diagnóstico registra apenas
  enums de tipo/etapa e latência; a avaliação pode conservar esses metadados sem conteúdo bruto.
  Nas consultas com versão pendente, o schema exige interpretação nas claims documentais da
  comparação, gerada pelo próprio modelo. Isso evita reclassificar ou trocar citações após a
  geração; qualificação visível, valores e referências continuam sujeitos à validação.
- O CLI atual usa `skip_host_skill_discovery` experimental para não carregar skills do computador;
  a advertência dessa opção é suprimida por configuração, sem desabilitar validação de erros de turno.
  Atualizações do CLI exigem repetir o smoke, inclusive a ausência de ferramentas inesperadas.
- Sign in with ChatGPT direto pode ser avaliado separadamente; requer OAuth próprio, consentimento e tratamento de streaming. Uma integração pública/remota depende da disponibilidade e dos termos oficiais.

## Fontes

- [OpenAI Docs — autenticação](https://learn.chatgpt.com/docs/auth)
- [OpenAI Docs — execução não interativa](https://learn.chatgpt.com/docs/non-interactive-mode)
- [OpenAI Docs — configuração](https://learn.chatgpt.com/docs/config-file/config-reference)
- [OpenAI Docs — uso do plano por aplicações](https://developers.openai.com/siwc/token-sharing-open-source)
