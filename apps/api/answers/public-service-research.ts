import { demoWebResearchTopic } from "../../shared/demo-web-research.js";
import { brazilianMunicipalities } from "./brazilian-municipalities.js";

const normalize = (value: string) =>
  value.normalize("NFD").replaceAll(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
const municipalities = Object.entries(brazilianMunicipalities).flatMap(([state, names]) =>
  names.split("|").map((name) => ({ name, state, normalized: normalize(name) }))
);

export function isBareWebResearchRequest(question: string): boolean {
  return /^(?:por favor[, ]+)?(?:pesquise|pesquisar|busque|buscar|procure|consulte)\s+(?:na|a)\s+(?:internet|web)[.!?\s]*$/u.test(
    normalize(question)
  );
}

export function publicWebResearchPlan(
  question: string
): Readonly<{ topic: string; sourcePolicy: "official" | "providers" }> | undefined {
  const text = normalize(question);
  if (/\b(?:nao|sem)\b.{0,35}(?:pesquis|busc|consult|procur)/u.test(text)) return undefined;
  if (
    /\b(?:limpeza|higienizacao)\b.{0,35}\b(?:caixas? (?:d['’]|de\s+|d\s+)agua|reservatorios? de agua)\b/u.test(
      text
    ) &&
    /\b(?:empresas?|prestador|prestadores|indique|indicar|recomende|contratar|quem faz|pesquise|busque|procure)\b/u.test(
      text
    ) &&
    !/\b(?:pdf|documento|arquivo|contrato|nota fiscal)\b|enviad|anexad/u.test(text)
  ) {
    // Só uma localidade pública canônica, nunca uma substring livre da pergunta.
    const hits = municipalities.filter(({ normalized, state }) => {
      const name = normalized.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const match = new RegExp(
        `(?:^|\\b(?:em|de|para|e|ou)\\s+)${name}(?:\\s*[-,/]?\\s*(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)\\b)?(?=$|[\\s,.!?])`,
        "u"
      ).exec(text);
      return match !== null && (!match[1] || match[1].toUpperCase() === state);
    });
    const candidates = hits;
    if (candidates.length !== 1) return undefined;
    const city = candidates[0]!;
    return {
      sourcePolicy: "providers",
      topic: `Empresas de limpeza e higienização de caixas d’água que anunciem atendimento em ${city.name} - ${city.state}, Brasil.`
    };
  }
  const topic = demoWebResearchTopic(question);
  return topic ? { topic, sourcePolicy: "official" } : undefined;
}
