# Briefing de produto — Alvitra

**Status:** visão canônica aprovada
**Atualizado em:** 2026-10-09

## 1. Visão do produto

A Alvitra é uma assistente de IA que ajuda síndicos a cuidar dos condomínios por meio de uma única
experiência: a conversa. O aplicativo abre diretamente no chat, sem landing page, onboarding,
cadastro ou formulários longos visíveis. O único controle de acesso apresentado nessa página é um
botão “Entrar”. Informações, documentos e ações entram na experiência de modo contextual, quando a
conversa precisar deles.

O produto deve parecer simples para o síndico mesmo quando executa trabalho documental complexo.
A Alvitra conversa em linguagem natural, consulta somente o contexto autorizado, mostra a base das
afirmações documentais, reconhece quando não há evidência suficiente e ajuda a definir o próximo
passo.

## 2. Hipótese central

Síndicos perdem tempo procurando informações, interpretando documentos e comparando períodos. Uma
assistente conversacional que aprende o contexto aos poucos e usa uma memória documental
verificável pode reduzir esse esforço sem exigir que o usuário aprenda uma estrutura de sistema.

A hipótese de experiência é que uma única conversa reduz atrito e torna o valor perceptível mais
cedo do que onboarding, formulários e telas paralelas.

## 3. Público inicial

- síndicos profissionais independentes e pequenas empresas de sindicatura;
- síndicos moradores que precisam consultar e organizar informações do próprio condomínio.

## 4. Problema inicial

Permitir que o síndico peça ajuda em linguagem natural e receba uma resposta útil, sustentada pelos
documentos autorizados quando a resposta envolver fatos, regras ou números do condomínio.

Exemplos:

- entender uma regra da convenção ou do regimento;
- localizar uma decisão em ata;
- analisar um documento enviado durante a conversa;
- comparar balancetes e identificar variações quando houver histórico suficiente.

## 5. Proposta de valor

> Converse com a Alvitra para cuidar do condomínio; ela pede o contexto necessário no momento certo,
> consulta os documentos disponíveis e ajuda a transformar o que encontrou em próximos passos.

## 6. Experiência principal

O aplicativo é o chat com a Alvitra. Não há onboarding obrigatório nem telas de trabalho paralelas.

1. A página inicial abre diretamente na conversa, com um único botão “Entrar”.
2. Depois de entrar, o síndico escreve o que precisa.
3. A Alvitra responde ou pede, de forma natural, a informação ou o documento que falta.
4. Documentos enviados pelo chat são processados, vetorizados e ficam disponíveis para consultas
   posteriores autorizadas.
5. Informações aprendidas na conversa podem alimentar o perfil do síndico e do condomínio quando a
   capacidade correspondente for implementada.

Em uma etapa futura, “Entrar” pedirá somente o número de telefone do síndico e validará um código
enviado pelo WhatsApp. Na jornada normal, essa será a única autenticação explícita: a sessão ficará
persistente. Recuperação de acesso, troca de aparelho e revogação de sessão serão detalhadas antes
da integração para preservar a segurança.

Controles auxiliares podem aparecer sobre o chat apenas quando previstos nos blocos abaixo. Eles
não se tornam fluxos de onboarding nem substituem a conversa como interface principal.

## 7. Escopo por blocos

### Bloco 1 — limpeza e nova página inicial

- remover cadastro, senha, e-mail e formulários de login, mantendo apenas o botão “Entrar”;
- deixar a coleta de telefone e o código pelo WhatsApp para uma implementação futura;
- remover da experiência a criação de condomínio;
- remover landing page, onboarding, painel administrativo, configurações e outras telas paralelas;
- abrir a página inicial diretamente no chat;
- manter envio, processamento, recuperação e vetorização de documentos;
- manter evidências, citações, abstenção, conflitos, feedback e recomendações de validação humana
  dentro da conversa.

### Bloco 2 — personalidade da Alvitra

- definir um tom casual, humano, franco e prestativo;
- apontar o que está bom e o que está ruim;
- quando algo estiver ruim, oferecer próximos passos claros;
- apresentar o system prompt ao usuário antes de aplicá-lo.

### Bloco 3 — múltiplos chats e barra lateral

- permitir vários chats;
- manter a lista na lateral esquerda, escondida por padrão;
- oferecer novo chat, histórico, renomear e excluir;
- usar painel deslizante no desktop e overlay no celular.

### Bloco 4 — menu sanduíche

- abrir no canto superior direito um menu com “Condomínios”, “Meus dados” e “Preferências”;
- listar os condomínios do síndico e oferecer criação opcional;
- permitir que a criação também aconteça pela conversa.

### Bloco 5 — perfil construído pela conversa

- coletar informações do síndico aos poucos e somente quando fizer sentido;
- alimentar “Meus dados” e os dados do condomínio com o que foi confirmado na conversa.

### Bloco 6 — documentos sob demanda

- nenhum documento é obrigatório;
- pedir cada documento somente quando ele for necessário;
- vetorizar os documentos enviados e disponibilizá-los à Alvitra nas conversas autorizadas.

### Bloco 7 — análise de documentos e raio-X de balancetes

- analisar a qualidade do material recebido e sugerir melhorias;
- comparar balancetes com meses anteriores;
- destacar variações, pontos de atenção e sinais saudáveis;
- pedir os meses anteriores quando o histórico não estiver disponível.

### Bloco 8 — base para níveis da conta

- manter um campo de nível na conta;
- calcular o nível a partir das informações confirmadas do perfil;
- deixar regras finais e telas elaboradas para decisão posterior.

Os blocos devem ser implementados somente quando solicitados explicitamente. A autorização de um
bloco não antecipa os seguintes, salvo quando o usuário autorizar explicitamente blocos compatíveis
em paralelo. Mesmo nesse caso, cada bloco mantém seu próprio escopo, validação e aprovação final.

## 8. Memória documental e vetorização

A vetorização de documentos é parte permanente do produto e não pode ser removida na
reestruturação. Todo documento enviado deve manter:

- vínculo com um `condominium_id` autorizado;
- original privado e metadados de procedência;
- versão, página e trecho recuperável quando aplicável;
- estado de processamento e qualidade;
- embeddings e derivados isolados pelo mesmo condomínio;
- política de retenção e exclusão coerente para original e derivados.

Conteúdo de documento é dado não confiável e nunca instrução de sistema.

## 9. Respostas e evidências

- uma afirmação documental exige evidência recuperada;
- toda citação aponta para documento, versão, página e trecho verificáveis;
- conflitos de versão ou vigência são exibidos, nunca resolvidos silenciosamente;
- quando a evidência for insuficiente, a Alvitra se abstém da conclusão documental e explica o que
  falta;
- fatos do condomínio, interpretação e recomendação permanecem distinguíveis;
- temas jurídicos, contábeis, técnicos, financeiros ou de segurança de maior risco recomendam
  validação humana.

## 10. Segurança e confiança

- toda operação de domínio parte de um `condominium_id` autorizado;
- banco, arquivos, busca vetorial, cache, jobs e logs não misturam condomínios;
- nenhuma ação externa é executada sem confirmação humana;
- dados reais e pessoais não entram em fixtures, testes ou evals;
- documentos não são usados para treinamento sem consentimento específico;
- respostas não podem inventar regras, valores ou fontes;
- a simplificação visual não enfraquece autenticação interna, autorização, auditoria, retenção ou
  proteção de dados.

## 11. Fora do escopo

- onboarding e cadastro obrigatórios;
- telas públicas de login com e-mail, senha ou cadastro de conta;
- integração com WhatsApp, coleta de telefone e validação de código no Bloco 1;
- formulário longo para criar condomínio;
- dashboards, painéis administrativos ou módulos paralelos ao chat;
- contabilidade completa, emissão de boletos ou movimentação bancária;
- portaria, controle de acesso ou aplicativo de moradores;
- marketplace de fornecedores;
- parecer jurídico definitivo;
- ações irreversíveis ou contato externo sem confirmação humana.

## 12. Estratégia técnica

- TypeScript/Node, Fastify, React/Vite e PostgreSQL com RLS/pgvector permanecem a base;
- recuperação semântica usa somente trechos relevantes e autorizados;
- OCR, texto, metadados e embeddings são processados uma vez e reutilizados;
- cálculos financeiros futuros devem ser determinísticos e reproduzíveis;
- provedores de IA permanecem substituíveis;
- o caminho mais econômico pode ser usado desde que preserve o piso de qualidade e segurança.

## 13. Métricas de validação

- tempo até a primeira conversa útil;
- retorno semanal ao chat;
- tarefas resolvidas ou encaminhadas com próximo passo claro;
- respostas documentais corretas e fundamentadas;
- citações que sustentam as afirmações;
- abstenções corretas;
- documentos pedidos somente quando necessários;
- incidentes de isolamento, com tolerância zero;
- custo médio por resposta aprovada.

## 14. Critério de continuidade

A reestruturação avança bloco a bloco por padrão. Blocos compatíveis só podem avançar em paralelo
com autorização explícita do usuário. Cada bloco termina somente quando comportamento,
documentação, testes e rastreabilidade estão coerentes e o usuário aprova ou pede ajustes. A
ausência dessa aprovação impede iniciar blocos não autorizados.
