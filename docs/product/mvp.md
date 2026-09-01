# Definição do MVP

**Status:** proposta inicial derivada do briefing  
**Atualizado em:** 2026-08-31

## Relação com a visão

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica. Este documento é uma projeção operacional resumida e não substitui o briefing. Toda spec deve ser conferida diretamente contra o briefing completo; em caso de incompatibilidade, a spec deve ser corrigida ou a mudança de visão deve ser explicitamente aprovada e registrada no briefing.

## Visão

Oferecer ao síndico uma forma confiável de consultar documentos do condomínio, receber respostas fundamentadas e registrar próximos passos sem depender de memória pessoal ou releitura manual.

O produto não é apenas um chat com arquivos. Seu valor está no isolamento entre condomínios, controle de versão e vigência, evidências verificáveis, memória institucional e acompanhamento de obrigações.

## Público inicial

Síndicos profissionais independentes e pequenas empresas de sindicatura que administram aproximadamente 3 a 20 condomínios.

## Problema inicial

Encontrar, cruzar e explicar informações específicas de convenções, regimentos, atas e contratos com rapidez e evidência documental suficiente para apoiar uma decisão.

## Promessa do MVP

> Encontre respostas confiáveis nos documentos do condomínio, acompanhe obrigações e prepare decisões em minutos, sempre com indicação da fonte.

## Capacidades do MVP

1. Autenticar usuários e autorizar acesso por condomínio.
2. Criar e manter condomínios com dados separados.
3. Receber PDF, DOCX, planilhas e imagens digitalizadas.
4. Classificar documentos, registrar procedência, versão e vigência.
5. Processar texto e OCR com indicador de qualidade.
6. Responder perguntas usando somente evidências autorizadas do condomínio selecionado.
7. Citar documento, versão, página e trecho.
8. Resumir convenções, atas e contratos.
9. Gerar rascunhos de comunicados com confirmação humana.
10. Extrair datas, obrigações e responsáveis para uma lista de pendências.
11. Registrar feedback, fontes, versão de prompt/modelo, latência e custo estimado.

## Formato de resposta

- resposta direta;
- base documental;
- pontos de atenção;
- próximo passo sugerido;
- indicação de especialista quando aplicável.

Fatos encontrados, interpretação e recomendação devem permanecer claramente separados.

## Fora do escopo inicial

- contabilidade completa;
- boletos e operações bancárias;
- portaria e controle de acesso;
- aplicativo completo para moradores;
- marketplace de fornecedores;
- parecer jurídico definitivo;
- envio automático de mensagens;
- decisões ou alterações irreversíveis;
- integrações amplas antes de validar uso recorrente.

## Princípios

- evidência antes da resposta;
- isolamento por condomínio em todas as camadas;
- abstenção segura quando a base for insuficiente;
- confirmação humana para ações externas;
- transparência sobre fontes, conflitos e incerteza;
- privacidade e direitos compatíveis com a LGPD;
- arquitetura independente de provedor de IA;
- menor custo capaz de cumprir o piso de qualidade.

## Hipóteses que o MVP deve validar

- os documentos disponíveis contêm contexto suficiente;
- a recuperação encontra a versão e os trechos corretos;
- respostas citadas aumentam a confiança;
- o fluxo economiza tempo mensurável;
- o uso se repete semanalmente;
- existe disposição de pagamento;
- o custo de IA é sustentável por condomínio ativo.

## Indicadores de validação

- respostas corretas e fundamentadas;
- citações que realmente sustentam a resposta;
- abstenções corretas;
- redução de tempo por tarefa;
- retorno semanal e perguntas por condomínio;
- correções e rejeições;
- conversão de piloto para pago;
- custo médio por resposta aprovada.

## Primeira fatia vertical

A primeira entrega implementável é descrita em `docs/specs/001-consulta-documental/`: carregar PDFs de dois condomínios, fazer uma pergunta, recuperar somente evidências autorizadas, responder com citações ou se abster e registrar feedback e telemetria.
