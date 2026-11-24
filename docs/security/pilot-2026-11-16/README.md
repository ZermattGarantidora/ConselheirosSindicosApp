# Pacote para revisão — piloto presencial de 16/11/2026

**Estado:** RASCUNHOS NÃO APROVADOS — não entregar para aceite nem receber dados reais.  
**Versão de trabalho:** 2026-11-09. Nenhuma assinatura ou dado de participante deve entrar no Git.

A política vigente é [data-handling-inicial.md](../data-handling-inicial.md), exclusivamente
sintética. Estes arquivos não a substituem. A meta de segunda-feira, 16/11/2026, no fuso
America/Sao_Paulo, não dispensa decisões competentes e evidências dos gates.

## Ordem de revisão

1. Preencher [responsabilidades e decisões](responsabilidades.md): pessoas, papéis, base legal,
   fornecedores/regiões, retenção e canais. A autorização do síndico não resolve sozinha dados
   pessoais de moradores, funcionários, prestadores ou outras pessoas.
2. Revisar a [política candidata](politica-candidata.md), incluindo o inventário de dados,
   transferências, backups e exercício de direitos.
3. Revisar [aviso de privacidade](aviso-de-privacidade.md), [termo de participação](termo-de-participacao.md)
   e [autorização documental](autorizacao-documental.md) com a política já definida.
4. Revisão técnica independente e especialista de domínio confrontam o ambiente com o que os
   textos prometem. Corrigir promessas não implementadas; não aceitar risco P0/P1 por prazo.
5. Só depois da aprovação documentada da política/fornecedores e liberação dos gates, criar as
   versões finais privadas de aceite e preparar sessões conforme o [roteiro](../../quality/pilot-2026-11-16-sessions.md).

## Material que deve sair do repositório

Versões assinadas, contatos, relação pessoa/ID, lista de documentos reais, poderes de representação,
aceites e solicitações de direitos ficam em repositório privado aprovado com acesso mínimo,
retenção e responsável definidos. Aqui ficam apenas modelos vazios e IDs inteiramente sintéticos.
Não colar documentos nem capturas de tela em issue, chat técnico, log ou relatório de testes.

## Perguntas para os revisores

- Jurídico/privacidade: quem decide cada finalidade e quem opera? Qual base legal por operação e
  categoria? Quem pode autorizar documentos e como respeitar direitos de terceiros? Há dados de
  crianças ou sensíveis? Quais obrigações contratuais e mecanismo de transferência são aplicáveis?
- Técnica/segurança: o commit/configuração respeita isolamento/RLS, revogação e limites em
  múltiplas instâncias, logs sem conteúdo, backup/restore integral, exclusão e exportação? Que
  evidência demonstra cada afirmação? Qual parte ainda está somente em mock?
- Domínio: a resposta, a citação e a abstenção ajudam o síndico? Os valores OCR correspondem ao
  original? O encaminhamento humano funciona nos casos contábeis, jurídicos e de segurança?

Não há nomes, aprovações ou revisões independentes presumidos neste pacote.

## Procedimentos concretos para revisão

- [Incidente e suporte](incidentes-e-suporte.md), incluindo resultado incerto e prevenção de retry cobrando novamente.
- [Direitos, exportação, exclusão e restore](direitos-exportacao-exclusao.md), com inventário e exercício sintético de dois condomínios.
- [Redaction e acesso operacional](redaction-e-acesso-operacional.md), com matriz de canários por superfície e menor privilégio.

Execução segue dependências, sem lotes diários ou datas intermediárias. Procedimentos/minutas
não aprovam política nem ativam serviços. Recibos da Spec 072 guardam metadados pseudonimizados
de consumo; retenção/exclusão e coordenação com resultado/journal precisam de decisão própria.
