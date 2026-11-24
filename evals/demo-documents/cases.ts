export const files = {
  election: "Ata_01_Eleicao_Posse_Jardim_do_Horizonte.pdf",
  work: "Ata_02_Obra_Impermeabilizacao_Jardim_do_Horizonte.pdf",
  common: "Ata_03_Areas_Comuns_Jardim_do_Horizonte.pdf",
  convention: "Convencao_Jardim_do_Horizonte_Demonstracao.pdf"
} as const;
export type DocumentKey = keyof typeof files;
export const facts = {
  lucas: ["lucas andrade"],
  renata: ["renata campos"],
  council: ["conselho fiscal"],
  beatriz: ["beatriz lima"],
  eduardo: ["eduardo matos"],
  camila: ["camila torres"],
  marina: ["marina duarte"],
  paulo: ["paulo reis"],
  jan20: ["20/01/2026", "20 de janeiro de 2026", "20.01.2026"],
  feb1: [
    "01/02/2026",
    "1/2/2026",
    "1º de fevereiro de 2026",
    "1 de fevereiro de 2026",
    "01 de fevereiro de 2026"
  ],
  jan31: ["31/01/2028", "31 de janeiro de 2028", "31/1/2028"],
  feb5: ["05/02/2026", "5/2/2026", "5 de fevereiro de 2026", "05 de fevereiro de 2026"],
  jun15: ["15/06/2026", "15 de junho de 2026", "15/6/2026"],
  sep1: ["01/09/2026", "1/9/2026", "1º de setembro de 2026", "1 de setembro de 2026"],
  nov29: ["29/11/2026", "29 de novembro de 2026"],
  dec15: ["15/12/2026", "15 de dezembro de 2026"],
  may14: ["14/05/2026", "14 de maio de 2026", "14/5/2026"],
  aug6: ["06/08/2026", "6 de agosto de 2026", "6/8/2026"],
  jan10: ["10/01/2026", "10 de janeiro de 2026", "10/1/2026"],
  twoYears: ["dois anos", "2 anos"],
  threeMembers: ["tres integrantes", "3 integrantes", "tres membros", "3 membros", "tres pessoas"],
  day15: ["dia 15", "ate 15", "15 do mes"],
  following: ["mes seguinte", "mes subsequente", "mes posterior"],
  statements: ["balancete"],
  bank: ["extratos", "extrato bancario"],
  receipts: ["comprovantes"],
  eighteen: ["18 votos favoraveis", "18 favoraveis", "dezoito votos favoraveis", "eleicao: 18"],
  abstain2: ["2 abstencoes", "duas abstencoes"],
  twenty: ["20 unidades", "vinte unidades", "20 votos", "vinte votos"],
  seventeen: ["17 votos favoraveis", "17 favoraveis", "dezessete votos favoraveis", "obra: 17"],
  fourteen: [
    "14 votos favoraveis",
    "14 favoraveis",
    "quatorze votos favoraveis",
    "catorze votos favoraveis",
    "piloto: 14"
  ],
  abstain1: ["1 abstencao", "uma abstencao"],
  contrary1: ["1 voto contrario", "um voto contrario", "1 contrario"],
  ceiling: ["24.000", "24000", "24 mil", "vinte e quatro mil"],
  installment: ["8.000", "8000", "8 mil", "oito mil"],
  threePayments: ["tres parcelas", "3 parcelas"],
  vendor: ["empresa exemplo de impermeabilizacao"],
  guarantee: ["garantia"],
  schedule: ["cronograma"],
  scope: ["escopo"],
  technical: ["responsabilidade tecnica"],
  balance: ["saldo"],
  reserve: ["reserva para obras", "reserva de obras", "reserva destinada a obras"],
  noRate: [
    "nao foi aprovado rateio",
    "nao aprovou rateio",
    "sem rateio extraordinario",
    "nao houve aprovacao de rateio",
    "nao foi aprovado um rateio",
    "nao aprova rateio"
  ],
  noProof: [
    "nao comprova",
    "nao prova",
    "nao demonstra",
    "nao permite afirmar",
    "nao permite concluir",
    "nao ha comprovacao",
    "nao significa",
    "nao pode concluir",
    "nao equivale"
  ],
  noAuthorize: ["nao autoriza", "nao permite", "nao da autorizacao", "nao concede"],
  newDecision: ["nova deliberacao", "nova aprovacao", "nova assembleia", "assembleia"],
  mobilization: ["mobilizacao"],
  measure: ["medicao"],
  acceptance: ["aceite"],
  fiveBusiness: ["5 dias uteis", "cinco dias uteis"],
  ninety: ["90 dias", "noventa dias"],
  written: ["escrito", "escrita"],
  confirmation: ["confirmacao", "confirmada", "confirmado", "confirmar"],
  before: ["antes", "entrada"],
  after: ["depois", "saida", "apos o uso"],
  first: ["primeiro pedido", "primeiro protocolo", "ordem de protocolo", "ordem do protocolo"],
  eightDays: ["oito dias corridos", "8 dias corridos"],
  hour8: ["08h", "8h", "08:00", "8:00", "oito horas"],
  hour22: ["22h", "22:00", "vinte e duas horas"],
  noFee: [
    "nao criou taxa",
    "nao ha taxa",
    "nao define taxa",
    "nao fixa taxa",
    "nao cria taxa",
    "nenhuma taxa",
    "sem taxa",
    "nao estabelece taxa",
    "nao foi definida taxa",
    "nao ha uma taxa"
  ],
  noFine: [
    "nao fixa",
    "nao estabelece",
    "nao ha",
    "nao define",
    "sem valor",
    "nao cria",
    "nao pode aplicar",
    "nao autoriza"
  ],
  registration: ["registro"],
  missing: [
    "nao esta informado",
    "nao consigo informar",
    "nao consigo confirmar",
    "nao informado",
    "nao e informado",
    "nao consta",
    "nao informa",
    "nao ha",
    "nao contem",
    "nao apresenta",
    "nao possui",
    "nao fornec",
    "ausen",
    "sem informacao",
    "nao encontrado",
    "nao foi informado"
  ],
  notAlone: [
    "nao basta",
    "nem permite",
    "isoladamente",
    "por si so",
    "sozinh",
    "apenas",
    "somente",
    "nao permite",
    "nao significa"
  ],
  general: ["gerais", "geral"],
  specific: ["especifica", "especifico"],
  conflicts: ["conflit", "divergenc", "incompatib"],
  human: ["humana", "profissional", "especialista", "juridic"],
  requests: ["pedidos", "solicitacoes"],
  confirmed: ["confirmadas", "confirmados", "confirmacao"],
  incidents: ["ocorrencias"],
  noChange: ["nao altera", "nao alterou", "nao modifica", "preserva", "respeitar", "permanecem"],
  synthetic: ["fictici", "demonstrativ", "sintetic"],
  publicNotice: ["pauta"],
  location: ["local"],
  time: ["horario"],
  date: ["data"]
} as const;
export type FactKey = keyof typeof facts;
export type DemoCase = {
  id: string;
  question: string;
  expected: FactKey[];
  documents: DocumentKey[];
};
const rows: [string, FactKey[], DocumentKey[]][] = [
  ["Quem foi eleito síndico na ata de eleição?", ["lucas"], ["election"]],
  ["Quem é a subsíndica eleita?", ["renata"], ["election"]],
  [
    "Quais os três nomes eleitos para o conselho fiscal?",
    ["beatriz", "eduardo", "camila"],
    ["election"]
  ],
  ["Qual a data da assembleia que elegeu a administração?", ["jan20"], ["election"]],
  ["Quando começa o mandato eleito?", ["feb1"], ["election"]],
  ["Quando termina o mandato eleito?", ["jan31"], ["election"]],
  [
    "Qual o prazo de entrega dos documentos da gestão anterior e quem coordena?",
    ["feb5", "lucas"],
    ["election"]
  ],
  ["Quem presidiu e quem secretariou a assembleia de eleição?", ["marina", "paulo"], ["election"]],
  [
    "Quantos votos favoráveis e abstenções recebeu a chapa?",
    ["eighteen", "abstain2"],
    ["election"]
  ],
  ["Quantas unidades estavam representadas na eleição?", ["twenty"], ["election"]],
  [
    "Quais documentos mensais devem ser enviados ao conselho fiscal?",
    ["statements", "bank", "receipts"],
    ["election"]
  ],
  [
    "Até qual dia e de qual mês devem ser disponibilizados os documentos ao conselho?",
    ["day15", "following"],
    ["election"]
  ],
  ["Quem confere os documentos mensais e registra dúvidas?", ["council"], ["election"]],
  [
    "A eleição sozinha autoriza despesa extraordinária? Explique o limite da ata.",
    ["noAuthorize"],
    ["election"]
  ],
  [
    "Diga o nome do síndico e as datas inicial e final do mandato.",
    ["lucas", "feb1", "jan31"],
    ["election"]
  ],
  ["Qual o teto financeiro aprovado para a impermeabilização da garagem?", ["ceiling"], ["work"]],
  ["Qual empresa foi aprovada para a impermeabilização?", ["vendor"], ["work"]],
  ["Qual a data da assembleia da impermeabilização?", ["may14"], ["work"]],
  [
    "Como ficou a votação da obra, com votos favoráveis e abstenção?",
    ["seventeen", "abstain1"],
    ["work"]
  ],
  [
    "Qual o valor de cada parcela e quantas parcelas foram previstas para a obra?",
    ["installment", "threePayments"],
    ["work"]
  ],
  ["Qual condição libera a primeira parcela da impermeabilização?", ["mobilization"], ["work"]],
  ["O que deve ocorrer antes da segunda parcela da obra?", ["measure"], ["work"]],
  ["O que condiciona a terceira parcela da obra?", ["acceptance"], ["work"]],
  [
    "Até quando Lucas deve apresentar os documentos da contratação ao conselho?",
    ["lucas", "jun15"],
    ["work"]
  ],
  [
    "Quais os quatro documentos ou condições técnicas principais exigidos antes do contrato?",
    ["scope", "schedule", "guarantee", "technical"],
    ["work"]
  ],
  [
    "De onde está previsto sair o recurso da impermeabilização e o que precisa ser verificado?",
    ["reserve", "balance"],
    ["work"]
  ],
  ["Essa ata da garagem comprova execução e pagamento da obra?", ["noProof"], ["work"]],
  ["Foi aprovado rateio extraordinário para a impermeabilização?", ["noRate"], ["work"]],
  ["A autorização da obra prova que existe saldo bancário para pagar?", ["noProof"], ["work"]],
  ["Se a empresa quiser ampliar o custo, o que precisa acontecer?", ["newDecision"], ["work"]],
  ["Quem coordena o piloto de reservas do salão?", ["renata"], ["common"]],
  ["Quando começa e termina o piloto do salão?", ["sep1", "nov29"], ["common"]],
  ["Quantos dias dura o piloto de reservas?", ["ninety"], ["common"]],
  [
    "Qual é o prazo para apresentar o relatório do piloto e quem é responsável?",
    ["dec15", "renata"],
    ["common"]
  ],
  ["Qual antecedência mínima é exigida para pedir reserva do salão?", ["fiveBusiness"], ["common"]],
  ["Como o pedido de reserva deve ser apresentado?", ["written"], ["common"]],
  [
    "Uma solicitação de reserva já garante o uso? O que falta?",
    ["written", "confirmation"],
    ["common"]
  ],
  ["Quando devem ser realizadas as vistorias do salão?", ["before", "after"], ["common"]],
  [
    "Qual foi a votação do piloto, com favoráveis, contrários e abstenção?",
    ["fourteen", "contrary1", "abstain1"],
    ["common"]
  ],
  ["Qual a data da assembleia sobre uso das áreas comuns?", ["aug6"], ["common"]],
  [
    "Que três grupos de números Renata deve apurar no relatório do piloto?",
    ["requests", "confirmed", "incidents"],
    ["common"]
  ],
  ["O piloto alterou a convenção e o regimento?", ["noChange"], ["common"]],
  ["A ata do piloto já prova que as providências foram realizadas?", ["noProof"], ["common"]],
  ["O piloto criou taxa de reserva ou autorizou nova despesa?", ["noFee"], ["common"]],
  [
    "Diga responsável, período e prazo do relatório do piloto.",
    ["renata", "sep1", "nov29", "dec15"],
    ["common"]
  ],
  ["Qual é a data da versão demonstrativa da convenção?", ["jan10"], ["convention"]],
  [
    "Qual duração de mandato a convenção prevê e quantos integrantes tem o conselho?",
    ["twoYears", "threeMembers"],
    ["convention"]
  ],
  ["Qual o horário de uso do salão previsto na convenção?", ["hour8", "hour22"], ["convention"]],
  ["Quem tem prioridade quando duas reservas disputam o mesmo período?", ["first"], ["convention"]],
  [
    "Qual a antecedência para convocar assembleia e como comunicar?",
    ["eightDays", "written"],
    ["convention"]
  ],
  [
    "O que deve constar na convocação da assembleia?",
    ["date", "time", "location", "publicNotice"],
    ["convention"]
  ],
  ["Como convenção e atas se complementam?", ["general", "specific"], ["convention"]],
  [
    "O registro da convenção está informado no arquivo?",
    ["missing", "registration"],
    ["convention"]
  ],
  [
    "A falta de informação do registro basta para declarar a convenção sem vigência?",
    ["notAlone"],
    ["convention"]
  ],
  [
    "O conjunto contém laudo técnico que comprove a conclusão da impermeabilização?",
    ["missing"],
    ["work", "convention"]
  ],
  ["Qual é o CNPJ do condomínio segundo os quatro documentos?", ["missing"], ["convention"]],
  ["Qual é a matrícula imobiliária informada na convenção?", ["missing"], ["convention"]],
  [
    "Qual o valor da multa por ocorrência no salão segundo a convenção?",
    ["noFine"],
    ["convention"]
  ],
  ["Há taxa de reserva definida na convenção?", ["noFee"], ["convention"]],
  [
    "Quais documentos mensais e qual prazo aparecem tanto na ata de eleição quanto na convenção?",
    ["statements", "bank", "receipts", "day15", "following"],
    ["election", "convention"]
  ]
];
const holdout: typeof rows = [
  [
    "Prepare uma linha com síndico, subsíndica e fim do mandato.",
    ["lucas", "renata", "jan31"],
    ["election"]
  ],
  [
    "O mandato de Lucas começa antes da assembleia de eleição? Diga as duas datas.",
    ["jan20", "feb1"],
    ["election"]
  ],
  [
    "Quais são os três conselheiros e quando termina o mandato deles?",
    ["beatriz", "eduardo", "camila", "jan31"],
    ["election"]
  ],
  [
    "Compare o prazo da transição da gestão com o prazo de entrega da documentação da obra.",
    ["feb5", "jun15"],
    ["election", "work"]
  ],
  [
    "Quem fica encarregado de providenciar a documentação técnica da garagem e quando?",
    ["lucas", "jun15"],
    ["work"]
  ],
  [
    "Explique o total da obra e as condições da primeira e da última parcelas.",
    ["ceiling", "mobilization", "acceptance"],
    ["work"]
  ],
  ["As parcelas da impermeabilização já constam como pagas?", ["noProof"], ["work"]],
  [
    "Que limite de orçamento foi autorizado e a ata permite ampliá-lo sem nova deliberação?",
    ["ceiling", "newDecision"],
    ["work"]
  ],
  [
    "Qual a fonte planejada para pagar a obra e houve aprovação de rateio extra?",
    ["reserve", "noRate"],
    ["work"]
  ],
  [
    "O conjunto comprova saldo disponível na reserva para obras?",
    ["noProof"],
    ["work", "convention"]
  ],
  [
    "O piloto de reservas permite usar o salão depois das 22h?",
    ["hour22", "noChange"],
    ["common", "convention"]
  ],
  [
    "Posso reservar o salão com apenas dois dias úteis de antecedência?",
    ["fiveBusiness"],
    ["common", "convention"]
  ],
  ["Quem apresentará o balanço do piloto e em que data limite?", ["renata", "dec15"], ["common"]],
  [
    "Compare a quantidade de votos favoráveis na eleição, na obra e no piloto.",
    ["eighteen", "seventeen", "fourteen"],
    ["election", "work", "common"]
  ],
  [
    "Qual o período exato do piloto e quais regras gerais ele precisa respeitar?",
    ["sep1", "nov29", "noChange"],
    ["common", "convention"]
  ],
  [
    "O protocolo da reserva dispensa a confirmação da administração?",
    ["written", "confirmation"],
    ["common", "convention"]
  ],
  [
    "O que registrar antes e depois de usar o salão?",
    ["before", "after"],
    ["common", "convention"]
  ],
  [
    "Qual a duração do mandato prevista na convenção e as datas concretas eleitas em ata?",
    ["twoYears", "feb1", "jan31"],
    ["election", "convention"]
  ],
  [
    "Indique as três datas das assembleias das atas, em ordem cronológica.",
    ["jan20", "may14", "aug6"],
    ["election", "work", "common"]
  ],
  [
    "O prazo dos documentos mensais é no próprio mês ou no seguinte? Liste o material.",
    ["following", "day15", "statements", "bank", "receipts"],
    ["election", "convention"]
  ],
  [
    "A disponibilização do balancete ao conselho equivale a contas aprovadas?",
    ["noProof"],
    ["convention"]
  ],
  [
    "O registro imobiliário omitido torna automaticamente o texto sem vigência?",
    ["notAlone", "registration"],
    ["convention"]
  ],
  [
    "Qual documento geral define o horário do salão e qual horário é esse?",
    ["hour8", "hour22"],
    ["convention"]
  ],
  [
    "Pode aplicar automaticamente uma multa de R$ 500 com base nestes arquivos?",
    ["noFine"],
    ["convention", "common"]
  ],
  ["Os documentos comprovam acontecimentos de um condomínio real?", ["synthetic"], ["convention"]],
  ["Que dados sobre frações ideais aparecem no acervo?", ["missing"], ["convention"]],
  [
    "Quais condições da contratação e qual prazo Lucas tem de levar ao conselho?",
    ["scope", "schedule", "technical", "guarantee", "jun15"],
    ["work"]
  ],
  [
    "Quem tem preferência se duas pessoas pedirem o salão para o mesmo horário?",
    ["first"],
    ["convention"]
  ],
  [
    "Como o condomínio deve lidar com conflito material entre versões documentais?",
    ["conflicts", "human"],
    ["convention"]
  ],
  [
    "Resuma três responsabilidades: transição da gestão, contratação da obra e avaliação do piloto, com nomes e prazos.",
    ["lucas", "feb5", "jun15", "renata", "dec15"],
    ["election", "work", "common"]
  ]
];
export function demoCases(round: "baseline" | "validation"): DemoCase[] {
  return (round === "baseline" ? rows : holdout).map(([question, expected, documents], i) => ({
    id: round + "-" + String(i + 1).padStart(2, "0"),
    question,
    expected,
    documents
  }));
}
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim();
}
export function hasFact(text: string, fact: FactKey): boolean {
  const normalized = normalize(text);
  return facts[fact].some((term) => normalized.includes(term));
}
