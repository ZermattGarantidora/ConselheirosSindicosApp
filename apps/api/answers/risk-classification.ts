import type { RiskClass, SpecialistType } from "./answer-contract.js";

export type RiskAssessment = Readonly<{
  riskClass: RiskClass;
  specialistType: SpecialistType | null;
  reason: string | null;
}>;

type RiskRule = Readonly<{
  pattern: RegExp;
  context?: RegExp;
  specialistType: SpecialistType;
  reason: string;
}>;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/\s+/gu, " ");
}

const highRiskRules: readonly RiskRule[] = Object.freeze([
  {
    pattern: /\bpiso\b|cct|regularidade trabalhista/u,
    context: /confirme|confirmar|acima|garant|regular|cumprim|suficien|definitiv/u,
    specialistType: "advogado",
    reason:
      "Confirmar adequação ao piso ou regularidade trabalhista exige regras coletivas aplicáveis e revisão profissional."
  },
  {
    pattern:
      /(?:cheiro|odor|vazamento|vazando|escape).{0,60}\b(?:gas|glp)\b|\b(?:gas|glp)\b.{0,60}(?:cheiro|odor|vazamento|vazando)/u,
    specialistType: "responsável técnico",
    reason:
      "O relato pode envolver perigo imediato; proteção e atendimento habilitado têm prioridade."
  },
  {
    pattern: /fumaca|incendio|fogo|faiscas|centelhas/u,
    context:
      /ha (?:muita |uma |um )?(?:fumaca|incendio|fogo|faiscas|centelhas)|tem (?:muita )?(?:fumaca|fogo|faiscas)|saindo|pegando|vejo|aparec|comecou|socorro|agora/u,
    specialistType: "responsável técnico",
    reason:
      "O relato pode envolver perigo imediato; proteção e atendimento habilitado têm prioridade."
  },
  {
    pattern: /elevador/u,
    context:
      /\b(?:pres[ao]s?|retid[ao]s?|ocupantes?)\b|pessoas? dentro|resgat|abrir|forcar|puxar|religar|reiniciar|destravar/u,
    specialistType: "responsável técnico",
    reason: "A situação pode envolver pessoas em risco e intervenção que exige equipe habilitada."
  },
  {
    pattern: /quadro eletrico|painel eletrico|fiacao|disjuntor|cabo eletrico|circuito eletrico/u,
    context: /agua|molhad|encharc|inund|energiz|choque|consert|repar|toc[ao]|mexer|manusear/u,
    specialistType: "responsável técnico",
    reason: "A situação pode envolver choque ou incêndio e exige atendimento habilitado."
  },
  {
    pattern:
      /(?:vidro|vidraca|janela).{0,40}(?:quebrou|quebrad|trincad|rachad)|(?:quebrou|quebra|queda|caiu).{0,40}(?:vidro|vidraca|janela)/u,
    specialistType: "responsável técnico",
    reason: "O caso pode envolver risco imediato na área comum e exige avaliação técnica."
  },
  {
    pattern:
      /parede|estrutura|fachada|obra estrutural|intervencao.*seguranca|(?:rachadura|fissura|trinca|deformacao).{0,60}(?:viga|pilar|laje)|(?:viga|pilar|laje).{0,60}(?:rachadura|fissura|trinca|cedeu|cedendo|deformad)/u,
    specialistType: "engenheiro",
    reason: "A decisão pode afetar estrutura, segurança ou responsabilidade técnica."
  },
  {
    pattern: /area interditada|local interditado|carregador|modernizacao/u,
    context: /liberar|reabrir|instalar|comecar|iniciar/u,
    specialistType: "responsável técnico",
    reason: "A liberação ou intervenção depende de avaliação técnica de segurança."
  },
  {
    pattern:
      /justa causa|verbas? rescisorias?|rescisao.{0,60}(?:funcionario|empregad|trabalhador)|(?:funcionario|empregad|trabalhador).{0,60}(?:rescisao|demit|dispens)|(?:demit|dispens|demissao).{0,60}(?:funcionario|empregad|trabalhador)/u,
    specialistType: "advogado",
    reason:
      "A decisão trabalhista depende de fatos, registros e avaliação profissional; o relato não comprova falta ou direito."
  },
  {
    pattern: /hora extra|adicional noturno|ferias|encargos trabalhistas|direitos trabalhistas/u,
    context: /calcul|quanto.{0,30}pagar|valor definitivo|confirme.{0,30}direito/u,
    specialistType: "contador",
    reason:
      "O cálculo de direitos e obrigações trabalhistas exige registros e regras aplicáveis verificados."
  },
  {
    pattern: /reconhecimento facial|biometria|cadastro biometrico/u,
    context: /instalar|implantar|implementar|adotar|coletar|cadastrar|exigir|obrigar|ativar/u,
    specialistType: "especialista em proteção de dados",
    reason:
      "A decisão pode envolver tratamento de dados sensíveis e exige avaliação de necessidade e proteção."
  },
  {
    pattern:
      /video|imagens|gravacoes|\bcpf\b|identificac|nomes.{0,40}(?:funcionarios|moradores|visitantes)|lista.{0,40}(?:funcionarios|terceirizados|devedores|inadimplentes)|quem reclamou|identidade.{0,30}reclam/u,
    context:
      /mandar|enviar|publi[qc]|divulg|compartilh|entreg|copia|exigir|colet|grupo|indevido|vazamento|posso contar|revel|colocar/u,
    specialistType: "especialista em proteção de dados",
    reason:
      "O pedido pode expor pessoas; finalidade, necessidade e acesso autorizado exigem avaliação."
  },
  {
    pattern: /consentimento/u,
    context: /generico|todas.{0,30}(?:operacoes|dados)|qualquer.{0,30}(?:operacao|tratamento)/u,
    specialistType: "especialista em proteção de dados",
    reason:
      "A análise de autorização para tratamento de dados exige avaliar finalidade e base aplicável."
  },
  {
    pattern: /acessos?|entrada/u,
    context: /cortar|restringir|bloquear|impedir|barrar|revisao.{0,30}gestao anterior/u,
    specialistType: "advogado",
    reason: "A decisão sobre acesso pode afetar direitos e segurança e exige revisão humana."
  },
  {
    pattern:
      /(?:apague|exclua|revogue|desative).{0,80}(?:acessos|credenciais)|(?:pague|transfira|execute.{0,15}pagamento)\b|confirme.{0,30}contratacao|(?:envie|mande|dispare).{0,60}(?:notificacao|moradores|fornecedor|cobranca)|notificacao.{0,100}(?:envie|mande)\b/u,
    specialistType: "advogado",
    reason:
      "O pedido envolve ação externa ou alteração de acesso e exige revisão e confirmação humana antes de qualquer execução."
  },
  {
    pattern:
      /quorum legal|(?:quorum|votos).{0,60}(?:alterar|mudar|modificar).{0,30}convencao|titulo executivo|parecer definitivo|culpa.{0,50}infiltracao|corrigir.{0,25}ata.{0,60}aprovada|proibir.{0,30}(?:todos|animais)|responde.{0,30}acidente/u,
    specialistType: "advogado",
    reason:
      "A conclusão pode afetar direitos ou atribuir responsabilidade e exige avaliação jurídica."
  },
  {
    pattern:
      /multa|ameaca.*process|processar|disputa juridica|cobranca contestada|\blei\b|legalmente|legislacao|perturbacao do sossego|importunacao do sossego/u,
    specialistType: "advogado",
    reason: "O tema pode gerar disputa ou responsabilidade jurídica."
  },
  {
    pattern: /tribut|imposto|obrigacao contabil|questao contab/u,
    specialistType: "contador",
    reason: "O tema pode envolver obrigação tributária ou contábil."
  },
  {
    pattern: /fraude|desvio|desviou|suspeita criminal/u,
    specialistType: "advogado",
    reason:
      "Avaliar uma possível acusação ou responsabilidade exige evidências e análise profissional; a pergunta não comprova irregularidade."
  },
  {
    pattern:
      /sinistro|apolice|cobertura securitaria|seguradora.{0,60}(?:pagar|indeniz)|integralmente segurad|descartar.{0,60}(?:pecas|seguro)/u,
    specialistType: "seguradora",
    reason: "A análise pode alterar a interpretação de cobertura ou sinistro."
  },
  {
    pattern: /dados pessoais|lgpd|protecao de dados|privacidade/u,
    specialistType: "especialista em proteção de dados",
    reason: "A análise pode envolver dados pessoais e obrigações de proteção de dados."
  }
]);

export function classifyQuestionRisk(question: string): RiskAssessment {
  const normalized = normalize(question.trim());
  if (normalized.length === 0) {
    throw new Error("A pergunta não pode ser vazia.");
  }

  const highRiskRule = highRiskRules.find(
    (rule) =>
      rule.pattern.test(normalized) && (rule.context === undefined || rule.context.test(normalized))
  );
  if (highRiskRule !== undefined) {
    return Object.freeze({
      riskClass: "high" as const,
      specialistType: highRiskRule.specialistType,
      reason: highRiskRule.reason
    });
  }

  if (/contrato|rescisao|vigencia|reajuste|multa/u.test(normalized)) {
    return Object.freeze({
      riskClass: "medium" as const,
      specialistType: null,
      reason: "A resposta depende da leitura cuidadosa da versão documental aplicável."
    });
  }

  return Object.freeze({ riskClass: "low" as const, specialistType: null, reason: null });
}
