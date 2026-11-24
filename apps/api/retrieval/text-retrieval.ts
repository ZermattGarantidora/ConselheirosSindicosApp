import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { evaluateEvidenceSufficiency } from "./retrieval-ranking.js";
import {
  retrievalPipelineVersion,
  retrievalQueryHash,
  type RetrievalEvidence,
  type RetrievalSearchInput,
  type ScopedRetrievalIndex,
  type ScopedRetrievalResult
} from "./retrieval-contract.js";
import { rerankScore } from "./retrieval-ranking.js";
import { containsExactRecordId, definesRecord, explicitRecordIds } from "./exact-identifiers.js";
import {
  expandRetrievalQuery,
  queryEntities,
  requestedDocumentGroups,
  documentMatchesGroup
} from "./retrieval-query.js";

const defaultMaximumResults = 8;
const defaultMinimumQualityScore = 0.7;
const portugueseStopWords = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "como",
  "da",
  "das",
  "de",
  "deve",
  "devem",
  "do",
  "dos",
  "e",
  "em",
  "entre",
  "foi",
  "foram",
  "ha",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "pode",
  "posso",
  "qual",
  "quando",
  "que",
  "quem",
  "regra",
  "regras",
  "sao",
  "segundo",
  "sem",
  "ser",
  "sobre",
  "um",
  "uma",
  "uns",
  "umas",
  "ir"
]);

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function queryTerms(query: string): readonly string[] {
  return Object.freeze([
    ...new Set(
      normalizeText(query)
        .replaceAll(/\b([\p{L}\p{N}]+)-([\p{L}\p{N}]+)\b/gu, "$1-$2 $1$2")
        .split(/[^\p{L}\p{N}]+/gu)
        .filter((term) => term.length > 1 && !portugueseStopWords.has(term))
    )
  ]);
}

function termMatches(term: string, normalizedContent: string, terms?: readonly string[]): boolean {
  if (normalizedContent.includes(term)) {
    return true;
  }

  const contentTerms = terms ?? normalizedContent.split(/[^\p{L}\p{N}]+/gu);
  const prefix = term.slice(0, Math.min(7, term.length));
  return (
    prefix.length >= 6 &&
    contentTerms.some(
      (contentTerm) =>
        contentTerm.length >= 6 &&
        (contentTerm.startsWith(prefix) || term.startsWith(contentTerm.slice(0, 7)))
    )
  );
}

function validateInput(input: RetrievalSearchInput): void {
  if (input.query.trim().length === 0) {
    throw new Error("A pergunta de retrieval não pode ser vazia.");
  }

  if (
    input.maxResults !== undefined &&
    (!Number.isInteger(input.maxResults) || input.maxResults < 1 || input.maxResults > 50)
  ) {
    throw new Error("A quantidade de resultados deve estar entre 1 e 50.");
  }

  if (
    input.minimumQualityScore !== undefined &&
    (input.minimumQualityScore < 0 || input.minimumQualityScore > 1)
  ) {
    throw new Error("A qualidade mínima deve estar entre 0 e 1.");
  }

  if (input.asOf !== undefined && Number.isNaN(input.asOf.getTime())) {
    throw new Error("A data de referência do retrieval deve ser válida.");
  }
}

function isTemporallyApplicable(
  validFrom: Date | null,
  validUntil: Date | null,
  asOf: Date
): boolean {
  return (validFrom === null || validFrom <= asOf) && (validUntil === null || validUntil > asOf);
}

function lexicalScore(query: string, content: string): number {
  const normalizedQuery = normalizeText(query).trim();
  const normalizedContent = normalizeText(content);
  const terms = queryTerms(query);

  if (terms.length === 0) {
    return 0;
  }

  const contentTerms = normalizedContent.split(/[^\p{L}\p{N}]+/gu);
  const matchedTerms = terms.filter((term) => termMatches(term, normalizedContent, contentTerms));
  const coverage = matchedTerms.length / terms.length;
  const frequency = matchedTerms.reduce((total, term) => {
    return total + (normalizedContent.split(term).length - 1);
  }, 0);
  const frequencyScore = Math.min(1, frequency / terms.length);
  const phraseBoost = normalizedContent.includes(normalizedQuery) ? 0.25 : 0;
  const entityBoost = queryEntities(query).some((entity) => normalizedContent.includes(entity))
    ? 0.4
    : 0;

  return Math.min(1, Math.sqrt(coverage) * 0.6 + frequencyScore * 0.15 + phraseBoost + entityBoost);
}

/** Uma pergunta composta não deve diluir o assunto de cada subpergunta. */
function queryFacets(query: string): readonly string[] {
  return query
    .split(/[\n;?]+/u)
    .map((part) => part.trim())
    .filter((part) => queryTerms(part).length >= 2)
    .slice(-9);
}

function createRelevanceScorer() {
  // Cache vive apenas nesta busca autorizada; nunca compartilha conteúdo entre tenants.
  const scores = new Map<string, number>();
  const expansions = new Map<string, string>();
  const score = (query: string, content: string) => {
    const key = JSON.stringify([query, content]);
    const saved = scores.get(key);
    if (saved !== undefined) return saved;
    const expanded = expansions.get(query) ?? expandRetrievalQuery(query);
    expansions.set(query, expanded);
    const value = lexicalScore(expanded, content);
    scores.set(key, value);
    return value;
  };
  return (query: string, content: string) =>
    Math.max(
      score(query, content),
      ...queryFacets(query).map((part) => score(part, content) * 0.95)
    );
}

/** Prioriza o trecho do acordo; a palavra no cabeçalho não comprova essa faceta. */
function agreementFacetScore(content: string): number {
  const text = normalizeText(content);
  return [
    /\bacordos?\b/u,
    /\bpropostas?\b/u,
    /\bparcel(?:as?|amentos?)\b/u,
    /\b(?:assinad[oa]s?|assinaturas?)\b/u,
    /\b(?:aceite|aceit[oa]s?|recebimentos?)\b/u,
    /\b(?:pagamentos?|quitad[oa]s?|negociacao)\b/u
  ].reduce((score, pattern) => score + Number(pattern.test(text)), 0);
}

function compareEvidence(left: RetrievalEvidence, right: RetrievalEvidence): number {
  return (
    right.rerankScore - left.rerankScore ||
    Number((right.sourceScope ?? "condominium") === "legislation") -
      Number((left.sourceScope ?? "condominium") === "legislation") ||
    right.qualityScore - left.qualityScore ||
    right.documentVersionNumber - left.documentVersionNumber ||
    left.pageNumber - right.pageNumber ||
    left.id.localeCompare(right.id)
  );
}

export type ScopedTextRetriever = Readonly<{
  search(
    context: AuthorizedCondominiumContext,
    input: RetrievalSearchInput
  ): Promise<ScopedRetrievalResult>;
}>;

export function createScopedTextRetriever(index: ScopedRetrievalIndex): ScopedTextRetriever {
  return Object.freeze({
    async search(context, input) {
      validateInput(input);
      const maxResults = input.maxResults ?? defaultMaximumResults;
      const minimumQualityScore = input.minimumQualityScore ?? defaultMinimumQualityScore;
      const asOf = input.asOf ?? new Date();

      if (!context.permissions.includes("document:read")) {
        return Object.freeze({
          pipelineVersion: retrievalPipelineVersion,
          queryHash: retrievalQueryHash(input.query),
          candidateCount: 0,
          selectedCount: 0,
          evidence: Object.freeze([]) as readonly RetrievalEvidence[],
          sufficiency: evaluateEvidenceSufficiency([])
        });
      }

      // O índice recebe o contexto autorizado, não um ID livre do cliente. A
      // checagem repetida aqui é uma defesa adicional antes de qualquer score.
      let candidates = await index.findAuthorizedCandidates(context, {
        query: expandRetrievalQuery(input.query),
        limit: Math.max(maxResults, 50),
        minimumQualityScore,
        asOf
      });
      for (const id of explicitRecordIds(input.query).slice(0, 8)) {
        if (candidates.some((candidate) => definesRecord(candidate.content, id))) continue;
        const exact = await index.findAuthorizedCandidates(context, {
          query: id,
          limit: 50,
          minimumQualityScore,
          asOf
        });
        candidates = [
          ...new Map(
            [...candidates, ...exact].map((candidate) => [candidate.id, candidate])
          ).values()
        ];
      }
      const relevanceScore = createRelevanceScorer();
      const scopedCandidates = candidates.filter(
        (candidate) => candidate.condominiumId === context.condominiumId
      );
      const relevantCandidates = scopedCandidates.filter(
        (candidate) =>
          relevanceScore(input.query, `${candidate.documentTitle} ${candidate.content}`) > 0 ||
          (candidate.semanticScore ?? 0) >= 0.35
      );
      const lowQualityCount = relevantCandidates.filter(
        (candidate) =>
          candidate.processingStatus !== "ready" || candidate.qualityScore < minimumQualityScore
      ).length;
      const pendingValidityCount = relevantCandidates.filter((candidate) =>
        ["pending", "disputed"].includes(candidate.validityStatus)
      ).length;
      const ranked = relevantCandidates
        .filter((candidate) => candidate.processingStatus === "ready")
        .filter(
          (candidate) =>
            candidate.validityStatus === "confirmed" ||
            candidate.validityStatus === "not_applicable" ||
            ((candidate.sourceScope ?? "condominium") === "condominium" &&
              ["pending", "disputed"].includes(candidate.validityStatus))
        )
        .filter((candidate) => candidate.qualityScore >= minimumQualityScore)
        .filter((candidate) =>
          isTemporallyApplicable(candidate.validFrom, candidate.validUntil, asOf)
        )
        .map((candidate) => {
          let score = relevanceScore(
            input.query,
            `${candidate.documentTitle} ${candidate.content}`
          );
          // Entidades curtas permanecem discriminantes; U-B não se reduz a letras descartadas.
          const entities = queryEntities(input.query);
          if (entities.some((entity) => normalizeText(candidate.content).includes(entity)))
            score = Math.min(1, score + 0.4);
          // Contrato sobre outro assunto não ocupa o lugar do contrato explicitamente pedido.
          const subjectTerms = queryTerms(input.query).filter(
            (term) =>
              ![
                "contrato",
                "contratos",
                "ata",
                "atas",
                "propostas",
                "balancetes",
                "cruze",
                "comprado",
                "novo"
              ].includes(term)
          );
          if (
            subjectTerms.some(
              (term) =>
                term.length >= 4 && termMatches(term, normalizeText(candidate.documentTitle))
            )
          )
            score = Math.min(1, score + 0.12);
          if (
            /elevador/iu.test(input.query) &&
            !/funcion[aá]rio|empregado|sal[aá]rio|jornada|encargos|limpeza|seguro/iu.test(
              input.query
            ) &&
            candidate.documentType === "contract" &&
            !/elevador/iu.test(candidate.documentTitle) &&
            !documentMatchesGroup(candidate.documentTitle, "proposta")
          )
            score *= 0.25;
          return Object.freeze({
            ...candidate,
            lexicalScore: score,
            semanticScore: candidate.semanticScore,
            rerankScore: rerankScore({
              lexicalScore: score,
              semanticScore: candidate.semanticScore,
              qualityScore: candidate.qualityScore
            }),
            rank: 0
          });
        })
        .filter(
          (candidate) =>
            candidate.rerankScore >= 0.35 &&
            (candidate.lexicalScore > 0 ||
              (candidate.semanticScore !== null && candidate.semanticScore > 0))
        )
        .sort(compareEvidence);
      const selected: RetrievalEvidence[] = [];
      const add = (candidate: RetrievalEvidence | undefined) => {
        if (
          candidate !== undefined &&
          selected.length < maxResults &&
          !selected.some((item) => item.id === candidate.id)
        )
          selected.push(candidate);
      };
      // Registros completos antecedem distratores; referências de outra versão não
      // substituem a própria linha. Só usa candidatos já autorizados e elegíveis.
      for (const id of explicitRecordIds(input.query)) {
        const matches = ranked.filter((item) => containsExactRecordId(item.content, id));
        for (const candidate of matches
          .toSorted(
            (a, b) =>
              Number(definesRecord(b.content, id)) - Number(definesRecord(a.content, id)) ||
              compareEvidence(a, b)
          )
          .slice(0, 2))
          add(candidate);
      }
      // Quando a pergunta pede anexo/ressalva, reservar o trecho identificável
      // do instrumento focal antes de diversificar entre documentos tangenciais.
      const focalIds = explicitRecordIds(input.query);
      const focal =
        ranked.find((item) => focalIds.some((id) => definesRecord(item.content, id))) ?? ranked[0];
      const requiresAnnex =
        /anex|ressalv|nota.{0,12}fina|exce/iu.test(input.query) ||
        (focal &&
          /anexo final|(?:consultar|ler|verifique).{0,30}(?:anexo|ressalva)/iu.test(focal.content));
      if (requiresAnnex) {
        const ids = explicitRecordIds(input.query);
        const versions = new Set(
          ranked
            .filter((item) => ids.some((id) => definesRecord(item.content, id)))
            .map((item) => item.documentVersionId)
        );
        if (!versions.size && ranked[0]) versions.add(ranked[0].documentVersionId);
        for (const version of versions) {
          for (const candidate of ranked
            .filter(
              (item) =>
                item.documentVersionId === version &&
                /(?:ANEXO|RESSALVA|NOTA)-[\p{L}\p{N}]+\s*:/u.test(item.content)
            )
            .slice(0, 3))
            add(candidate);
          // A nota não substitui a cláusula geral da mesma origem.
          if (!ids.length)
            add(ranked.find((item) => item.documentVersionId === version && item.pageNumber === 1));
        }
      }
      // Facetas financeiras explícitas antecedem páginas tangenciais. O orçamento continua oito.
      const financialQuestion = normalizeText(input.query.split("\n").at(-1) ?? input.query);
      const financialFacet = /rateio|emissao/u.test(financialQuestion)
        ? /rateio mensal|emissao total|emissoes do mes/iu
        : /aprov.{0,30}contas|contas.{0,60}aprov/u.test(financialQuestion)
          ? /revisao e aprovacao|pendentes de deliberacao/iu
          : /fundo de reserva/u.test(financialQuestion) &&
              /evolu|fechamento/u.test(financialQuestion)
            ? /fundo de reserva\s+[\d.,]+/iu
            : /titulos vencidos|principal.*aberto|inadimpl/u.test(financialQuestion)
              ? /titulos vencidos|saldo final em aberto/iu
              : /agua.*esgoto/u.test(financialQuestion)
                ? /abastecimento de agua e esgoto/iu
                : undefined;
      const eligibleFinancial = scopedCandidates
        .filter(
          (item) =>
            documentMatchesGroup(item.documentTitle, "balancete") &&
            item.processingStatus === "ready" &&
            item.qualityScore >= minimumQualityScore &&
            ["confirmed", "not_applicable"].includes(item.validityStatus) &&
            isTemporallyApplicable(item.validFrom, item.validUntil, asOf)
        )
        .map((item) => {
          const lexicalScore = relevanceScore(input.query, `${item.documentTitle} ${item.content}`);
          return {
            ...item,
            lexicalScore,
            rerankScore: rerankScore({
              lexicalScore,
              semanticScore: item.semanticScore,
              qualityScore: item.qualityScore
            }),
            rank: 0
          };
        })
        .sort(compareEvidence);
      if (financialFacet !== undefined) {
        for (const version of new Set(
          eligibleFinancial
            .filter((item) => financialFacet.test(normalizeText(item.content)))
            .map((item) => item.documentVersionId)
        ))
          add(
            eligibleFinancial.find(
              (item) =>
                item.documentVersionId === version &&
                financialFacet.test(normalizeText(item.content))
            )
          );
      }
      // A moeda é contexto da versão, não inferência pelo nome do PDF. Reservar antes do preenchimento.
      const financialRequest =
        /balancete|saldo|financeir|rateio|emissao|cotas?|reserva|inadimpl|recebiment|agua|esgoto|rendimento|principal|administracao|contas|pessoal|encargos/u.test(
          financialQuestion
        );
      const relevantVersions = new Set(
        [...ranked, ...selected]
          .filter((item) => documentMatchesGroup(item.documentTitle, "balancete"))
          .map((item) => item.documentVersionId)
      );
      const financiallyRelevant =
        financialRequest || financialFacet !== undefined
          ? eligibleFinancial.filter((item) => relevantVersions.has(item.documentVersionId))
          : [];
      for (const version of new Set(financiallyRelevant.map((item) => item.documentVersionId))) {
        const currency = financiallyRelevant.find(
          (item) =>
            item.documentVersionId === version &&
            /valores (?:expressos |apresentados )?em (?:reais|brl)/iu.test(
              normalizeText(item.content)
            )
        );
        add(currency);
      }
      // Acordo é uma evidência própria de cada unidade, não substituída pela página de débitos.
      const lastQuestion = input.query.split("\n").at(-1) ?? input.query;
      if (/unidade|cobran[cç]a|acordo|negocia[cç][aã]o|parcelamento/iu.test(input.query)) {
        const explicitEntities = queryEntities(lastQuestion);
        const entities = explicitEntities.length ? explicitEntities : queryEntities(input.query);
        // “Cada unidade” pode não repetir IDs que já saíram da janela. A relação
        // entre páginas do instrumento atual continua verificável, sem lembrar IDs antigos.
        if (/\b(?:cada|ambas|ambos|duas|dois)\b/iu.test(lastQuestion)) {
          const collections = ranked.filter((item) =>
            /cotas|inadimpl|acordos|cobran[cç]a/iu.test(item.documentTitle)
          );
          for (const version of new Set(collections.map((item) => item.documentVersionId))) {
            const pages = collections.filter((item) => item.documentVersionId === version);
            add(
              pages
                .filter((item) =>
                  /acordo|proposta|parcelamento|assinatur|aceite/iu.test(item.content)
                )
                .toSorted(
                  (left, right) =>
                    agreementFacetScore(right.content) - agreementFacetScore(left.content) ||
                    compareEvidence(left, right)
                )
                .at(0)
            );
            add(
              pages.find((item) => /principal|saldo|cotas? vencid|em aberto/iu.test(item.content))
            );
          }
        }
        for (const entity of entities) {
          add(
            ranked.find(
              (candidate) =>
                queryEntities(candidate.content).includes(entity) &&
                /acordo|negocia[cç][aã]o|parcelamento/iu.test(candidate.content)
            )
          );
        }
      }
      const groups = requestedDocumentGroups(input.query);
      for (const group of groups) {
        const matches = ranked.filter((candidate) =>
          documentMatchesGroup(candidate.documentTitle, group)
        );
        const versions = new Set<string>();
        for (const candidate of matches) {
          if (versions.has(candidate.documentVersionId)) continue;
          add(candidate);
          versions.add(candidate.documentVersionId);
          if (group !== "balancete") break;
        }
      }
      // Uma síntese de decisões pode depender de mais de uma página da ata.
      // Reserva limitada às fontes já ranqueadas; não amplia busca ou escopo.
      const currentQuestion = normalizeText(input.query.split("\n").at(-1) ?? input.query);
      if (
        /decisoes|deliberacoes|(?:resum|conclu|fech).{0,35}(?:atas|assembleias)/u.test(
          currentQuestion
        )
      ) {
        const counts = new Map<string, number>();
        for (const candidate of ranked.filter((item) =>
          documentMatchesGroup(item.documentTitle, "ata")
        )) {
          const count = counts.get(candidate.documentVersionId) ?? 0;
          if (count >= 3) continue;
          add(candidate);
          counts.set(candidate.documentVersionId, count + 1);
        }
      }
      // Uma proposta de mudança pode mencionar apenas o preço novo. Recupera
      // um campo comparável da versão confirmada, sem ampliar para outros documentos.
      for (const pending of ranked.filter((item) =>
        ["pending", "disputed"].includes(item.validityStatus)
      )) {
        const confirmed = ranked.find(
          (item) =>
            item.documentId === pending.documentId &&
            item.documentVersionId !== pending.documentVersionId &&
            ["confirmed", "not_applicable"].includes(item.validityStatus)
        );
        if (confirmed === undefined) continue;
        add(confirmed);
        add(pending);
        if (confirmed.documentType !== "contract") continue;
        const fields = [
          ...(/renova|vig[eê]ncia|vencimento|vence/iu.test(input.query)
            ? [/vig[eê]ncia|vencimento|validade/iu]
            : []),
          ...(/pre[cç]o|valor|reajuste|compare|comparativo/iu.test(input.query)
            ? [/(?:pre[cç]o|valor)\s+mensal|mensalidade/iu]
            : [])
        ];
        for (const version of [confirmed, pending])
          for (const field of fields) {
            const companion = scopedCandidates.find(
              (item) =>
                item.documentVersionId === version.documentVersionId &&
                item.documentId === version.documentId &&
                item.processingStatus === "ready" &&
                item.qualityScore >= minimumQualityScore &&
                item.validityStatus === version.validityStatus &&
                isTemporallyApplicable(item.validFrom, item.validUntil, asOf) &&
                field.test(item.content)
            );
            if (companion !== undefined)
              add(
                Object.freeze({
                  ...companion,
                  lexicalScore: 0,
                  semanticScore: companion.semanticScore,
                  rerankScore: rerankScore({
                    lexicalScore: 0,
                    semanticScore: companion.semanticScore,
                    qualityScore: companion.qualityScore
                  }),
                  rank: 0
                })
              );
          }
      }
      // Pergunta sobre um instrumento deve comparar primeiro as páginas desse
      // instrumento, evitando que uma referência legal tangencial ocupe seu lugar.
      for (const facet of queryFacets(input.query).toReversed()) {
        for (const group of requestedDocumentGroups(facet)) {
          const best = ranked
            .filter((candidate) => documentMatchesGroup(candidate.documentTitle, group))
            .toSorted(
              (a, b) =>
                relevanceScore(facet, `${b.documentTitle} ${b.content}`) -
                relevanceScore(facet, `${a.documentTitle} ${a.content}`)
            )[0];
          if (best !== undefined && relevanceScore(facet, best.content) >= 0.35) add(best);
        }
      }
      // Cada subpergunta recente pode precisar de outra página da mesma versão.
      // Selecionar só uma página por versão escondia salário, encargos e ressalvas.
      for (const facet of queryFacets(input.query).toReversed()) {
        const best = ranked.toSorted(
          (a, b) =>
            relevanceScore(facet, `${b.documentTitle} ${b.content}`) -
            relevanceScore(facet, `${a.documentTitle} ${a.content}`)
        )[0];
        if (best !== undefined && relevanceScore(facet, best.content) >= 0.35) add(best);
      }
      // Uma primeira fatia por versão amplia cobertura sem enviar o corpus inteiro.
      for (const candidate of ranked)
        if (!selected.some((item) => item.documentVersionId === candidate.documentVersionId))
          add(candidate);
      for (const candidate of ranked) add(candidate);
      const directIds = explicitRecordIds(input.query);
      const directDetail =
        !requiresAnnex &&
        directIds.length > 0 &&
        /valor|prazo|situacao|localize|capacidade|horario|votos/iu.test(
          normalizeText(input.query)
        ) &&
        !/nota|ressalva|exce|anex|versao|versoes|minuta|cruz|compar|cobrar|bastam|conflit/iu.test(
          normalizeText(input.query)
        );
      const primaryVersions = new Set(
        ranked
          .filter((item) => directIds.some((id) => definesRecord(item.content, id)))
          .map((item) => item.documentVersionId)
      );
      const narrowed =
        directDetail &&
        directIds.every((id) => ranked.some((item) => definesRecord(item.content, id)))
          ? ranked
              .filter(
                (item) =>
                  primaryVersions.has(item.documentVersionId) &&
                  directIds.some((id) => containsExactRecordId(item.content, id))
              )
              .toSorted(
                (a, b) =>
                  Number(directIds.some((id) => definesRecord(b.content, id))) -
                    Number(directIds.some((id) => definesRecord(a.content, id))) ||
                  compareEvidence(a, b)
              )
              .slice(0, maxResults)
          : selected;
      const evidence = narrowed
        .sort(compareEvidence)
        .map((candidate, index) => Object.freeze({ ...candidate, rank: index + 1 }));

      return Object.freeze({
        pipelineVersion: retrievalPipelineVersion,
        queryHash: retrievalQueryHash(input.query),
        candidateCount: scopedCandidates.length,
        selectedCount: evidence.length,
        evidence: Object.freeze(evidence),
        sufficiency: evaluateEvidenceSufficiency(evidence),
        diagnostics: Object.freeze({
          relevantCount: relevantCandidates.length,
          lowQualityCount,
          pendingValidityCount,
          temporallyExcludedCount: relevantCandidates.filter(
            (candidate) => !isTemporallyApplicable(candidate.validFrom, candidate.validUntil, asOf)
          ).length
        })
      });
    }
  });
}

export { lexicalScore, normalizeText };
