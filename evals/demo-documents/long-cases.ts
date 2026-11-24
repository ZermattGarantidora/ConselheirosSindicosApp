import type { FactKey, DocumentKey } from "./cases.js";
export type LongTurn = {
  question: string;
  kind: "documentary" | "conversation" | "recall";
  expected: FactKey[];
  documents: DocumentKey[];
  tag: string;
  literal?: string;
};
export type LongScenario = { id: string; title: string; turns: LongTurn[] };
const doc = (
  question: string,
  expected: FactKey[],
  documents: DocumentKey[],
  tag = "documentary"
): LongTurn => ({ question, kind: "documentary", expected, documents, tag });
const conversation = (question: string, tag = "correction"): LongTurn => ({
  question,
  kind: "conversation",
  expected: [],
  documents: [],
  tag
});
const recall = (question: string, literal: string, tag: string): LongTurn => ({
  question,
  kind: "recall",
  literal,
  expected: [],
  documents: [],
  tag
});
export const longScenarios: LongScenario[] = [
  {
    id: "work",
    title: "Obra, correções e retomadas",
    turns: [
      conversation(
        "Vou chamar minha lista de acompanhamento de Cedro. Esse apelido é só uma anotação minha, não um dado dos documentos.",
        "note"
      ),
      doc(
        "Na ata da garagem, qual foi o teto aprovado e quem ficou responsável pela documentação?",
        ["ceiling", "lucas"],
        ["work"]
      ),
      doc("E até quando ele deve apresentar isso ao conselho?", ["jun15"], ["work"], "ellipsis"),
      recall("Qual apelido acabei de dar à minha lista de acompanhamento?", "Cedro", "near_recall"),
      doc(
        "Como o pagamento dessa obra foi dividido?",
        ["threePayments", "installment"],
        ["work"],
        "ellipsis"
      ),
      doc("O que libera a primeira parcela?", ["mobilization"], ["work"], "ellipsis"),
      doc("E a segunda?", ["measure"], ["work"], "ellipsis"),
      doc("E a última parcela?", ["acceptance"], ["work"], "ellipsis"),
      doc(
        "Uma anotação minha diz que o total seria R$ 30.000,00. Ela substitui o teto de R$ 24.000,00 aprovado na ata?",
        ["ceiling", "noProof"],
        ["work"],
        "unconfirmed_proposal"
      ),
      conversation(
        "Corrigindo minha anotação anterior: descarte os R$ 30.000,00. Quero trabalhar somente com o teto registrado na ata.",
        "user_correction"
      ),
      doc(
        "Qual é então o total documental e o valor de cada parcela?",
        ["ceiling", "installment"],
        ["work"],
        "correction_retention"
      ),
      doc(
        "Isso já prova que as três parcelas foram pagas?",
        ["noProof"],
        ["work"],
        "negative_evidence"
      ),
      doc(
        "De qual reserva está previsto sair o dinheiro e qual a condição?",
        ["reserve", "balance"],
        ["work"]
      ),
      doc("Foi criado rateio extraordinário para essa obra?", ["noRate"], ["work"]),
      doc(
        "Mudando de assunto: quem foi eleito síndico e em qual data começa o mandato?",
        ["lucas", "feb1"],
        ["election"],
        "topic_switch"
      ),
      doc("E quando termina?", ["jan31"], ["election"], "ellipsis"),
      doc("Quem é a subsíndica eleita?", ["renata"], ["election"]),
      doc(
        "Quais os três integrantes do conselho fiscal?",
        ["beatriz", "eduardo", "camila"],
        ["election"]
      ),
      doc(
        "Agora sobre o salão: qual o horário geral permitido pela convenção?",
        ["hour8", "hour22"],
        ["convention"],
        "topic_switch"
      ),
      doc(
        "Qual a antecedência para reservar?",
        ["fiveBusiness"],
        ["convention", "common"],
        "ellipsis"
      ),
      doc(
        "Quem coordena o piloto e qual o prazo para o relatório?",
        ["renata", "dec15"],
        ["common"]
      ),
      doc(
        "Voltando à garagem: quem apresenta a documentação e qual a data limite?",
        ["lucas", "jun15"],
        ["work"],
        "distant_document_return"
      ),
      doc(
        "Enumere escopo, cronograma, garantias e responsabilidade técnica exigidos antes do contrato.",
        ["scope", "schedule", "guarantee", "technical"],
        ["work"],
        "completeness"
      ),
      doc(
        "A ata comprova que a obra terminou e foi aceita?",
        ["noProof"],
        ["work"],
        "negative_evidence"
      ),
      doc(
        "Se o custo aumentar além do teto, qual providência é necessária?",
        ["newDecision"],
        ["work"],
        "ellipsis"
      ),
      doc(
        "O prazo de transição da gestão era igual ao de entrega dos documentos da obra? Diga as duas datas.",
        ["feb5", "jun15"],
        ["election", "work"],
        "cross_document"
      ),
      doc(
        "Resuma as condições da primeira e da última parcela, sem confundir previsão com pagamento.",
        ["mobilization", "acceptance"],
        ["work"],
        "completeness"
      ),
      recall(
        "Qual era o apelido que dei à lista no começo desta conversa? Se não conseguir recuperar, diga isso claramente.",
        "Cedro",
        "distant_recall"
      ),
      conversation(
        "Relembro: o apelido da lista é Cedro. Use essa identificação no fechamento, sem apresentá-la como informação da ata.",
        "note_refresh"
      ),
      doc(
        "Feche a lista Cedro com o teto da obra, valor de cada parcela, responsável e prazo da documentação, mais responsável e prazo do relatório do salão.",
        ["ceiling", "installment", "lucas", "jun15", "renata", "dec15"],
        ["work", "common"],
        "final_completeness"
      )
    ]
  },
  {
    id: "common",
    title: "Salão, referências curtas e regras",
    turns: [
      conversation(
        "Minha organização provisória se chama Ipê Roxo. É somente o nome que dou a este acompanhamento, não um nome presente na ata.",
        "note"
      ),
      doc(
        "Qual período está previsto para o piloto de reservas do salão e quem o coordena?",
        ["sep1", "nov29", "renata"],
        ["common"]
      ),
      doc("E quando ela deve apresentar o relatório?", ["dec15"], ["common"], "ellipsis"),
      recall("Que nome dei a este acompanhamento agora há pouco?", "Ipê Roxo", "near_recall"),
      doc(
        "Quantos dias úteis de antecedência são necessários para pedir reserva?",
        ["fiveBusiness"],
        ["common", "convention"]
      ),
      doc(
        "Esse pedido pode ser verbal ou precisa ser escrito?",
        ["written"],
        ["common", "convention"],
        "ellipsis"
      ),
      doc(
        "O protocolo, sozinho, já confirma o uso do salão?",
        ["confirmation", "written"],
        ["common", "convention"],
        "ellipsis"
      ),
      doc(
        "Se dois pedidos disputarem o mesmo período, quem tem prioridade?",
        ["first"],
        ["convention"]
      ),
      doc("Qual é o horário permitido para usar o salão?", ["hour8", "hour22"], ["convention"]),
      doc(
        "Eu tinha entendido que podia usar até as 23h. A convenção autoriza esse horário?",
        ["hour22"],
        ["convention"],
        "unconfirmed_proposal"
      ),
      conversation(
        "Corrigindo: minha anotação de 23h estava errada. Considere o encerramento às 22h previsto na convenção.",
        "user_correction"
      ),
      doc(
        "Qual horário devo colocar no aviso aos moradores, do início ao fim?",
        ["hour8", "hour22"],
        ["convention"],
        "correction_retention"
      ),
      doc(
        "Quando devem ser feitas as vistorias do espaço?",
        ["before", "after"],
        ["common", "convention"]
      ),
      doc(
        "O piloto criou taxa de reserva ou novo rateio?",
        ["noFee"],
        ["common"],
        "negative_evidence"
      ),
      doc(
        "Posso aplicar automaticamente uma multa de R$ 500 com esses arquivos?",
        ["noFine"],
        ["common", "convention"],
        "unconfirmed_proposal"
      ),
      doc(
        "A multa tem algum valor expressamente fixado na convenção demonstrativa?",
        ["noFine"],
        ["convention"]
      ),
      doc(
        "Mudando para a gestão: quem são o síndico e a subsíndica eleitos?",
        ["lucas", "renata"],
        ["election"],
        "topic_switch"
      ),
      doc(
        "Quem compõe o conselho fiscal e quantos integrantes são?",
        ["beatriz", "eduardo", "camila"],
        ["election"]
      ),
      doc("Qual o teto da impermeabilização da garagem?", ["ceiling"], ["work"], "topic_switch"),
      doc(
        "Como esse teto foi dividido em parcelas?",
        ["threePayments", "installment"],
        ["work"],
        "ellipsis"
      ),
      doc(
        "Essa aprovação comprova que há saldo disponível ou que a obra já foi paga?",
        ["noProof"],
        ["work", "convention"],
        "negative_evidence"
      ),
      doc(
        "Retome o piloto do salão: informe responsável, período e data do relatório.",
        ["renata", "sep1", "nov29", "dec15"],
        ["common"],
        "distant_document_return"
      ),
      doc(
        "Quais indicadores devem constar no relatório do piloto?",
        ["requests", "confirmed", "incidents"],
        ["common"],
        "completeness"
      ),
      doc(
        "O piloto pode alterar os horários da convenção e do regimento?",
        ["noChange"],
        ["common", "convention"],
        "negative_evidence"
      ),
      doc(
        "Se algum procedimento do piloto contrariar as regras existentes, o que a administração deve fazer?",
        ["conflicts"],
        ["common", "convention"]
      ),
      doc(
        "A ata já comprova que o piloto foi executado e avaliado?",
        ["noProof"],
        ["common"],
        "negative_evidence"
      ),
      doc(
        "Resuma reserva, confirmação escrita, horário de uso e vistorias, sem criar taxa ou multa.",
        ["fiveBusiness", "written", "hour8", "hour22", "before", "after"],
        ["common", "convention"],
        "completeness"
      ),
      recall(
        "Qual nome provisório dei ao acompanhamento no início? Se a lembrança estiver fora do contexto disponível, explique.",
        "Ipê Roxo",
        "distant_recall"
      ),
      conversation(
        "Relembro que chamei este acompanhamento de Ipê Roxo. Não é o nome do condomínio nem altera os documentos.",
        "note_refresh"
      ),
      doc(
        "Feche o acompanhamento Ipê Roxo com antecedência, confirmação escrita, horário, responsável do piloto e prazo do relatório.",
        ["fiveBusiness", "written", "confirmation", "hour8", "hour22", "renata", "dec15"],
        ["common", "convention"],
        "final_completeness"
      )
    ]
  },
  {
    id: "governance",
    title: "Convenção, eleição e fechamento cruzado",
    turns: [
      conversation(
        "Vou chamar o nosso roteiro de Farol Verde. É uma anotação pessoal para organizar esta conversa, sem valor documental.",
        "note"
      ),
      doc(
        "Qual a data da assembleia de eleição e quem foi eleito síndico?",
        ["jan20", "lucas"],
        ["election"]
      ),
      doc("Qual é o início e o fim do mandato eleito?", ["feb1", "jan31"], ["election"]),
      recall("Como chamei este roteiro no começo?", "Farol Verde", "near_recall"),
      doc(
        "O mandato começa antes da assembleia de eleição? Confirme com as duas datas.",
        ["jan20", "feb1"],
        ["election"],
        "temporal_comparison"
      ),
      doc(
        "Quantos votos favoráveis e abstenções recebeu a chapa?",
        ["eighteen", "abstain2"],
        ["election"]
      ),
      doc(
        "As 20 unidades representadas na eleição provam que o condomínio tem exatamente 20 apartamentos?",
        ["twenty"],
        ["election"],
        "unconfirmed_proposal"
      ),
      conversation(
        "Não quero cadastrar 20 apartamentos: eu estava me referindo apenas às unidades representadas naquela assembleia.",
        "user_correction"
      ),
      doc("Quem presidiu a mesa e quem secretariou a eleição?", ["marina", "paulo"], ["election"]),
      doc(
        "Até quando foi prevista a entrega dos documentos da gestão anterior?",
        ["feb5"],
        ["election"]
      ),
      doc(
        "Até qual dia do mês seguinte devem ser entregues os documentos mensais ao conselho?",
        ["day15", "following"],
        ["election", "convention"]
      ),
      doc(
        "Quais documentos mensais são esses?",
        ["statements", "bank", "receipts"],
        ["election", "convention"],
        "ellipsis"
      ),
      doc(
        "Essa entrega equivale à aprovação das contas?",
        ["noProof"],
        ["election", "convention"],
        "negative_evidence"
      ),
      doc(
        "A versão demonstrativa da convenção tem qual data?",
        ["jan10"],
        ["convention"],
        "topic_switch"
      ),
      doc(
        "O registro imobiliário aparece informado nela?",
        ["registration", "missing"],
        ["convention"],
        "ellipsis"
      ),
      doc(
        "A falta dessa informação, sozinha, basta para afirmar que a convenção não está vigente?",
        ["notAlone"],
        ["convention"],
        "ellipsis"
      ),
      doc(
        "Qual duração de mandato a convenção prevê e quantos membros deve ter o conselho?",
        ["twoYears", "threeMembers"],
        ["convention"]
      ),
      doc(
        "Mudando de assunto: qual empresa foi aprovada para a obra da garagem e qual o teto?",
        ["vendor", "ceiling"],
        ["work"],
        "topic_switch"
      ),
      doc(
        "Quem apresenta os documentos dessa contratação e até quando?",
        ["lucas", "jun15"],
        ["work"],
        "ellipsis"
      ),
      doc(
        "O que deve existir antes da assinatura desse contrato?",
        ["scope", "schedule", "guarantee", "technical"],
        ["work"],
        "completeness"
      ),
      doc(
        "E como ficam as parcelas e seus valores?",
        ["threePayments", "installment"],
        ["work"],
        "ellipsis"
      ),
      doc(
        "Agora retome o salão: quem coordena o piloto e qual a data limite do relatório?",
        ["renata", "dec15"],
        ["common"],
        "distant_document_return"
      ),
      doc(
        "Qual o horário do salão e a antecedência para reservar?",
        ["hour8", "hour22", "fiveBusiness"],
        ["convention", "common"]
      ),
      doc(
        "Compare os votos favoráveis de eleição, obra e piloto.",
        ["eighteen", "seventeen", "fourteen"],
        ["election", "work", "common"],
        "cross_document"
      ),
      doc(
        "Qual é o CNPJ do condomínio segundo os quatro documentos?",
        ["missing"],
        ["convention"],
        "missing_evidence"
      ),
      doc(
        "Esses documentos comprovam que a obra terminou, as parcelas foram pagas e o piloto foi executado?",
        ["noProof"],
        ["work", "common"],
        "negative_evidence"
      ),
      doc(
        "Resuma as três responsabilidades: transição da gestão, documentação da obra e avaliação do piloto, com nomes e prazos.",
        ["lucas", "feb5", "jun15", "renata", "dec15"],
        ["election", "work", "common"],
        "completeness"
      ),
      recall(
        "Qual nome de organização dei a este roteiro no início? Se não houver contexto suficiente, não invente.",
        "Farol Verde",
        "distant_recall"
      ),
      conversation(
        "Relembro: este roteiro se chama Farol Verde. O condomínio continua sendo Jardim do Horizonte.",
        "note_refresh"
      ),
      doc(
        "Feche o roteiro Farol Verde com síndico e mandato, teto e parcelas da obra, responsável e prazo da documentação, responsável e prazo do relatório do salão.",
        [
          "lucas",
          "feb1",
          "jan31",
          "ceiling",
          "threePayments",
          "installment",
          "jun15",
          "renata",
          "dec15"
        ],
        ["election", "work", "common"],
        "final_completeness"
      )
    ]
  }
];
