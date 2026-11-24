import { denseMoney, type DenseRecord, type DenseKind } from "./corpus.js";

export type DenseSource = Readonly<{
  document: DenseKind;
  page: number;
  anchor: string;
  equivalentPages?: readonly number[];
}>;
export type DenseCase = Readonly<{
  id: string;
  category: string;
  question: string;
  expected: string;
  atoms: readonly string[];
  sources: readonly DenseSource[];
  qualify: boolean;
}>;
/** Gabaritos anteriores ao PDF, independentes da extração e das respostas. */
export function createDenseCases(ledger: readonly DenseRecord[]): readonly DenseCase[] {
  const rows = (kind: DenseKind, indices: readonly number[]) =>
    indices.map((i) => {
      const row = ledger.find((r) => r.document === kind && r.index === i);
      if (!row) throw new Error("Registro do oracle ausente.");
      return row;
    });
  const source = (row: DenseRecord): DenseSource => ({
    document: row.document,
    page: row.page,
    anchor: row.key
  });
  const cases: Omit<DenseCase, "id">[] = [];
  const labels = {
    financial: "financeiro",
    convention: "convencao aprovada",
    minutes: "atas e deliberacoes",
    contracts: "contratos e ordens de servico"
  };
  for (const kind of ["financial", "convention", "minutes", "contracts"] as const) {
    for (const row of rows(kind, [59, 601, 1199]))
      cases.push({
        category: kind === "minutes" && row.index === 1199 ? "security" : "detail",
        question: `No documento ${labels[kind]}, qual o valor, prazo em dias e situacao de ${row.key}? Distinga a linha de IDs vizinhos e cite a fonte.`,
        expected: `${row.key}: ${denseMoney(row.amountMinor)}, ${row.days} dias, ${row.status}.`,
        atoms: [denseMoney(row.amountMinor), `${row.days} dias`, row.status],
        sources: [source(row)],
        qualify: false
      });
    const selected = rows(kind, [1198, 1199, 1200]);
    const total = selected.reduce((sum, r) => sum + r.amountMinor, 0);
    cases.push({
      category: "association",
      question: `No documento ${labels[kind]}, relacione ${selected.map((r) => r.key).join(", ")} aos respectivos valores e calcule a soma dessas tres linhas. Nao use outros registros. Cite as fontes.`,
      expected: `${selected.map((r) => `${r.key}=${denseMoney(r.amountMinor)}`).join("; ")}; soma=${denseMoney(total)}.`,
      atoms: [...selected.map((r) => denseMoney(r.amountMinor)), denseMoney(total)],
      sources: selected.map(source),
      qualify: false
    });
  }
  for (const kind of ["financial", "convention", "minutes", "contracts"] as const) {
    const row = rows(kind, [590])[0]!;
    const notes: Record<string, [string, string]> = {
      financial: [
        "NOTA-F24",
        "A tabela e a nota final divergem sobre LAN-0590: expor ambos os valores sem conciliacao presumida."
      ],
      convention: [
        "NOTA-N24",
        "A taxa de ART-0590 esta suspensa pela nota e falta ATA-0590; nao cobrar como vigente."
      ],
      minutes: [
        "NOTA-A24",
        "DEL-0590 e proposta, nao aprovacao; pagamento/contrato nao mudam isso."
      ],
      contracts: [
        "NOTA-C24",
        "OS-0590 nao tem aceite tecnico; executado na tabela nao comprova aceite."
      ]
    };
    const [anchor, expected] = notes[kind]!;
    cases.push({
      category: "footnote",
      question: `No documento ${labels[kind]}, posso considerar ${row.key} confirmado, aprovado ou encerrado so pela linha da tabela? Verifique tambem as notas finais e explique a limitacao com fontes.`,
      expected,
      atoms: [row.key],
      sources: [source(row), { document: kind, page: 24, anchor }],
      qualify: true
    });
  }
  for (const index of [59, 601, 1199]) {
    const current = rows("convention", [index])[0]!,
      draft = rows("draft", [index])[0]!;
    cases.push({
      category: "version",
      question: `Qual taxa de ${current.key} esta documentada na versao aprovada? Compare com a proposta ${draft.key} da minuta v2. A minuta permite cobrar o valor novo? Cite ambas as versoes.`,
      expected: `v1 ${denseMoney(current.amountMinor)}; minuta ${denseMoney(draft.amountMinor)}, sem aprovacao/assinatura, nao altera automaticamente a v1.`,
      atoms: [denseMoney(current.amountMinor), denseMoney(draft.amountMinor)],
      sources: [source(current), source(draft)],
      qualify: true
    });
  }
  for (const index of [59, 601, 1199]) {
    const selected = [
      rows("financial", [index])[0]!,
      rows("minutes", [index])[0]!,
      rows("contracts", [index])[0]!
    ];
    cases.push({
      category: "cross_document",
      question: `Cruze ${selected.map((r) => r.key).join(", ")}: informe o valor e a situacao de cada registro, sem confundir pagamento, deliberacao e execucao. Cite cada documento.`,
      expected: selected
        .map((r) => `${r.key}: ${denseMoney(r.amountMinor)}, ${r.status}`)
        .join("; "),
      atoms: selected.flatMap((r) => [r.key, denseMoney(r.amountMinor), r.status]),
      sources: selected.map(source),
      qualify: false
    });
  }
  cases.push({
    category: "cross_document",
    question:
      "Cruze LAN-0590, DEL-0590 e OS-0590 e as notas finais. Pagamento e execucao bastam para afirmar aprovacao e aceite tecnico? Liste as divergencias com fontes.",
    expected:
      "Nota financeira diverge; DEL-0590 e proposta; OS-0590 sem aceite. Nao concluir aprovacao/aceite por pagamento ou execucao.",
    atoms: ["LAN-0590", "DEL-0590", "OS-0590"],
    sources: [
      ...(["financial", "minutes", "contracts"] as const).map((document) =>
        source(rows(document, [590])[0]!)
      ),
      { document: "financial", page: 24, anchor: "NOTA-F24" },
      { document: "minutes", page: 24, anchor: "NOTA-A24" },
      { document: "contracts", page: 24, anchor: "NOTA-C24" }
    ],
    qualify: true
  });
  const cancelled = rows("financial", [598])[0]!;
  cases.push({
    category: "status",
    question: `O lancamento ${cancelled.key} comprova pagamento? Informe valor e situacao exatos antes de concluir.`,
    expected: `${denseMoney(cancelled.amountMinor)}, ${cancelled.status}; nao comprova pagamento realizado porque esta cancelado.`,
    atoms: [denseMoney(cancelled.amountMinor), "cancelado"],
    sources: [source(cancelled)],
    qualify: true
  });
  cases.push({
    category: "absence",
    question:
      "Qual empresa assinou digitalmente a minuta v2 e em qual ata ela foi aprovada? Cite a prova, se existir.",
    expected:
      "Nenhuma assinatura digital ou ata de aprovacao apresentada; abster da identificacao, pedir documentos adequados.",
    atoms: [],
    sources: [{ document: "draft", page: 24, anchor: "minuta sem assinatura" }],
    qualify: true
  });
  cases.push({
    category: "absence",
    question:
      "Qual norma municipal e qual quorum legal autorizam cobrar a taxa do ART-0590? Os votos registrados na tabela comprovam esse quorum?",
    expected:
      "Corpus nao contem norma municipal ou prova de quorum legal. Votos da tabela nao sao quorum nem autorizacao; requer base oficial/aprovacao e revisao humana.",
    atoms: [],
    sources: [{ document: "convention", page: 24, anchor: "nao quorum legal" }],
    qualify: true
  });
  cases.push({
    category: "absence",
    question: "Os valores divergentes de LAN-0590 provam fraude e autorizam acusar a gestao?",
    expected:
      "Divergencia nao prova fraude nem autoria; pedir conciliacao, comprovantes e validacao humana.",
    atoms: ["LAN-0590"],
    sources: [
      source(rows("financial", [590])[0]!),
      { document: "financial", page: 24, anchor: "NOTA-F24" }
    ],
    qualify: true
  });
  const paidOctober = ledger.filter(
    (r) => r.document === "financial" && r.status === "pago" && r.index > 600
  );
  cases.push({
    category: "global_coverage",
    question:
      "Qual a soma de todos os lancamentos pagos do caderno financeiro em outubro de 2026? Diga se conseguiu conferir todas as paginas necessarias; se faltarem fontes, nao estime nem invente um total.",
    expected: `So concluir soma integral se todas as linhas necessarias tiverem sido recuperadas/conferidas; caso contrario explicitar limite e pedir conferencia integral. Total oracle=${denseMoney(paidOctober.reduce((sum, r) => sum + r.amountMinor, 0))}; ${paidOctober.length} linhas.`,
    atoms: [],
    sources: paidOctober.map(source),
    qualify: true
  });
  if (cases.length !== 32) throw new Error(`Esperados32 casos, encontrados${cases.length}.`);
  return cases.map((c, index) => ({ ...c, id: `DENSE-${String(index + 1).padStart(3, "0")}` }));
}
