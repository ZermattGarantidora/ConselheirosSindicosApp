// Documentos e perguntas independentes do gabarito. Somente material fictício.
export type SemanticFixtureSource = Readonly<{
  content: string;
  page?: number | null;
  version?: string | null;
  limitation?:
    | "missing_page"
    | "missing_version"
    | "missing_excerpt"
    | "low_quality"
    | "third_party_summary"
    | "irrelevant";
}>;
type Fixture = Readonly<{
  question: string;
  sources: readonly SemanticFixtureSource[];
  conflict?: boolean;
}>;
const page = (content: string, number = 1): SemanticFixtureSource => ({ content, page: number });

export const semanticFixtures: Readonly<Record<string, Fixture>> = {
  "localizar aprovação de obra": {
    question: "A pintura do hall foi aprovada? Há registro do quórum?",
    sources: [
      page(
        "ATA DA ASSEMBLEIA — 15/03/2026. Deliberação: aprovada a pintura do hall pelo orçamento de R$ 8.000,00. Assinaturas da presidência e secretaria ao final.",
        3
      )
    ]
  },
  "localizar rejeição de orçamento": {
    question: "O orçamento da jardinagem foi aprovado ou rejeitado?",
    sources: [
      page(
        "ATA — 20/03/2026. Após discussão, foi rejeitado o orçamento de jardinagem de R$ 4.000,00. A administração buscará outras propostas.",
        4
      )
    ]
  },
  "decisão sem data": {
    question: "Quando foi aprovada a troca do portão?",
    sources: [
      page(
        "[Cabeçalho cortado no arquivo recebido.] Deliberação: aprovada a troca do portão da garagem.",
        3
      )
    ]
  },
  "quórum não registrado": {
    question: "A votação do portão teve quórum suficiente?",
    sources: [
      page(
        "ATA — 12/04/2026. A proposta do portão foi submetida à votação e declarada aprovada pela mesa. A lista de presença não acompanha o arquivo."
      )
    ]
  },
  "ata com versão concorrente": {
    question: "A compra das câmeras foi aprovada?",
    conflict: true,
    sources: [
      page("ATA — 12/04/2026. Deliberação: aprovada a compra de câmeras por R$ 3.000,00."),
      page("ATA — 12/04/2026. Deliberação: rejeitada a compra de câmeras por R$ 3.000,00.")
    ]
  },
  "ata ilegível": {
    question: "O que foi decidido sobre o portão?",
    sources: [
      {
        content: "ATA — [página decisória borrada; OCR: po... apro... ilegível]",
        page: 3,
        limitation: "low_quality"
      }
    ]
  },
  "ata sobre rateio": {
    question: "O rateio já foi aprovado e tenho de cobrar?",
    sources: [
      page(
        "ATA — 05/05/2026. Foi discutida proposta de taxa extraordinária de R$ 100,00 por unidade. A votação ficou adiada para a próxima assembleia."
      )
    ]
  },
  "ata com fala não deliberativa": {
    question: "Já decidiram instalar energia solar?",
    sources: [
      page(
        "ATA — 05/05/2026. Um participante sugeriu instalar painéis solares. A mesa registrou a sugestão para estudo, sem votação."
      )
    ]
  },
  "ata com anexos ausentes": {
    question: "Quais serviços estão incluídos no orçamento aprovado?",
    sources: [
      page(
        "ATA — 05/05/2026. Aprovado o orçamento do Anexo I. O arquivo recebido termina nesta página e não contém o Anexo I."
      )
    ]
  },
  "ata de alto risco": {
    question: "Posso retirar a parede de apoio com base nesta ata?",
    sources: [
      page(
        "ATA — 05/05/2026. Deliberou-se contratar estudo para retirada de parede na garagem, condicionado a laudo estrutural e responsabilidade técnica. O laudo não integra este arquivo."
      )
    ]
  },
  "regra de salão": {
    question: "Até que horas posso usar o salão?",
    sources: [
      page(
        "CONVENÇÃO CONDOMINIAL — edição 2025. Art. 12: o salão de festas pode ser utilizado até as 22 horas, mediante reserva prévia.",
        7
      )
    ]
  },
  "regra de piscina em regimento": {
    question: "Qual o horário da piscina e em qual documento está?",
    sources: [
      page(
        "REGIMENTO INTERNO — edição 2025. Art. 8: a piscina funciona das 8 às 20 horas. Não acompanha este envio a convenção.",
        4
      )
    ]
  },
  "convenção sem vigência": {
    question: "Esta é a convenção vigente?",
    sources: [
      page(
        "CONVENÇÃO CONDOMINIAL. Art. 12: salão até as 22 horas. O arquivo não contém data de aprovação, registro ou início de vigência."
      )
    ]
  },
  "convenções conflitantes": {
    question: "Qual destas multas está em vigor?",
    conflict: true,
    sources: [
      page("CONVENÇÃO — edição 2018. Art. 18: multa de R$ 100,00 por uso irregular do salão."),
      page(
        "CONVENÇÃO — edição 2025. Art. 18: multa de R$ 250,00 por uso irregular do salão. Não consta registro da aprovação ou início de vigência."
      )
    ]
  },
  "página ausente na convenção": {
    question: "A convenção permite animais?",
    sources: [
      page(
        "CONVENÇÃO — índice: Capítulo V, animais domésticos, página 9. O arquivo recebido contém somente as páginas 1 a 8."
      )
    ]
  },
  "validade jurídica": {
    question: "Esta convenção é juridicamente nula?",
    sources: [
      page(
        "CONVENÇÃO CONDOMINIAL — Art. 20: a aplicação de multa cabe à administração após comunicação ao interessado. Folha de aprovação ausente."
      )
    ]
  },
  "regra sem trecho": {
    question: "É permitido criar animais neste condomínio?",
    sources: [
      {
        content: "Cadastro do arquivo: pets permitidos. Sem página ou transcrição da cláusula.",
        page: null,
        limitation: "missing_page"
      }
    ]
  },
  "convenção com OCR incerto": {
    question: "Qual é o valor da multa por barulho?",
    sources: [
      {
        content:
          "CONVENÇÃO — Art. 18: multa de R$ [algarismos ilegíveis] por barulho. OCR com baixa confiança.",
        page: 8,
        limitation: "low_quality"
      }
    ]
  },
  "hierarquia documental": {
    question: "Qual horário do salão devo considerar?",
    conflict: true,
    sources: [
      page("CONVENÇÃO — Art. 12: o salão encerra às 22 horas."),
      page(
        "ATA — 10/03/2026. Deliberação: salão aberto até meia-noite. Não consta alteração registrada da convenção."
      )
    ]
  },
  "tema de segurança": {
    question: "Posso trocar sozinho a tubulação de gás?",
    sources: [
      page(
        "REGIMENTO INTERNO — Art. 14: intervenções na rede de gás exigem projeto e profissional habilitado, antes do início da obra.",
        6
      )
    ]
  },
  "prazo de elevadores": {
    question: "Quando termina a manutenção contratada? Ela renova automaticamente?",
    sources: [
      page(
        "CONTRATO DE MANUTENÇÃO DE ELEVADORES. Cláusula 2: prazo de 01/01/2026 a 31/12/2026. Renovação depende de instrumento escrito. Assinaturas das partes ao final.",
        2
      )
    ]
  },
  "reajuste de portaria": {
    question: "Qual índice e data de reajuste o contrato prevê?",
    sources: [
      page(
        "CONTRATO DE PORTARIA. Cláusula 4: reajuste anual pelo IPCA acumulado, no aniversário de 1º de julho. Valor inicial: R$ 5.000,00. O índice acumulado não consta deste documento.",
        3
      )
    ]
  },
  "rescisão sem aditivo": {
    question: "Esse contrato já foi rescindido?",
    sources: [
      page(
        "CONTRATO DE LIMPEZA — 01/01/2026. Cláusula 8: rescisão mediante aviso escrito com antecedência de 30 dias. Não acompanham este envio avisos ou aditivos."
      )
    ]
  },
  "aditivo contraditório": {
    question: "Qual preço devo considerar para a limpeza?",
    conflict: true,
    sources: [
      page("CONTRATO DE LIMPEZA — preço mensal de R$ 2.000,00."),
      page(
        "ADITIVO AO CONTRATO DE LIMPEZA — preço mensal de R$ 2.500,00. Campos de assinatura e início de vigência não preenchidos."
      )
    ]
  },
  "contrato sem assinatura": {
    question: "Esse contrato de jardinagem já está vigente?",
    sources: [
      page(
        "MINUTA — CONTRATO DE JARDINAGEM. Objeto: manutenção de jardins. Data: __/__/____. Assinaturas: __________________."
      )
    ]
  },
  "cláusula de multa": {
    question: "Quanto pagaremos pela rescisão?",
    sources: [
      page(
        "CONTRATO — Cláusula 9: a rescisão poderá gerar multa equivalente a três pagamentos, observadas as condições comerciais pactuadas. As condições comerciais não acompanham o arquivo.",
        5
      )
    ]
  },
  "anexo técnico ausente": {
    question: "A limpeza da caixa d'água está incluída?",
    sources: [
      page(
        "CONTRATO DE SERVIÇOS. Cláusula 1: os serviços compreendem exclusivamente o escopo do Anexo Técnico A. O anexo não consta deste envio."
      )
    ]
  },
  "pagamento de gás": {
    question: "O condomínio está inadimplente no contrato de gás?",
    sources: [
      page(
        "CONTRATO DE FORNECIMENTO DE GÁS — Cláusula 5: fatura mensal de R$ 3.200,00, com vencimento no dia 10. Não acompanham este arquivo faturas emitidas ou comprovantes.",
        3
      )
    ]
  },
  "prazo expirado": {
    question: "O prazo registrado terminou? Preciso rescindir agora?",
    sources: [
      page(
        "CONTRATO DE LIMPEZA — prazo final em 30/09/2026. Renovação somente por aditivo escrito. Consulta de referência: 16/10/2026. Nenhum aditivo foi fornecido."
      )
    ]
  },
  "contrato de alto risco": {
    question: "Esse contrato é suficiente para iniciar reforço estrutural?",
    sources: [
      page(
        "CONTRATO DE REFORÇO ESTRUTURAL. Início condicionado a projeto aprovado, ART e licença aplicável. Garantia de cinco anos nas condições do Anexo Técnico. Anexo, ART e projeto não fornecidos."
      )
    ]
  },
  "documento com versão conhecida": {
    question: "Qual é o horário de funcionamento da academia?",
    sources: [
      page("REGIMENTO INTERNO — edição 2025. Art. 6: a academia funciona das 6 às 22 horas.", 4)
    ]
  },
  "citação sem página": {
    question: "Qual é o horário da academia?",
    sources: [
      { content: "A academia funciona das 6 às 22 horas.", page: null, limitation: "missing_page" }
    ]
  },
  "citação sem versão": {
    question: "Qual é o horário da academia no documento disponível?",
    sources: [
      {
        content: "REGIMENTO INTERNO — Art. 6: academia das 6 às 22 horas.",
        page: 4,
        version: null,
        limitation: "missing_version"
      }
    ]
  },
  "citação sem trecho": {
    question: "O que a página 4 diz sobre a academia?",
    sources: [{ content: "", page: 4, limitation: "missing_excerpt" }]
  },
  "versões com mesma data": {
    question: "A academia fecha às 22 ou às 23 horas?",
    conflict: true,
    sources: [
      page("REGIMENTO — data 01/03/2026. Art. 6: academia até as 22 horas."),
      page("REGIMENTO — data 01/03/2026. Art. 6: academia até as 23 horas.")
    ]
  },
  "versão posterior incompleta": {
    question: "Qual regra de reserva devo aplicar?",
    conflict: true,
    sources: [
      page(
        "REGIMENTO — edição 2024 completa. Art. 10: reserva do salão com sete dias de antecedência."
      ),
      page(
        "REGIMENTO — edição 2026, somente capa e índice. Art. 10: reserva do salão, página 8 não fornecida."
      )
    ]
  },
  "fonte de terceiro": {
    question: "O síndico anterior disse que animais são proibidos; posso confirmar?",
    sources: [
      {
        content:
          "Resumo não oficial do síndico anterior: animais são proibidos. Documento original não fornecido.",
        page: 1,
        limitation: "third_party_summary"
      }
    ]
  },
  "citação sustenta número": {
    question: "Qual foi a despesa de energia em janeiro?",
    sources: [page("BALANCETE 01/2026. Energia elétrica: R$ 1.234,56.", 2)]
  },
  "citação sustenta interpretação": {
    question: "O reparo aprovado já foi executado?",
    sources: [
      page(
        "ATA — 10/02/2026. Deliberação: aprovado o reparo da bomba. A administração solicitará orçamento para execução.",
        3
      )
    ]
  },
  "fonte com trecho contraditório": {
    question: "Confirma que a obra foi aprovada?",
    sources: [page("ATA — 10/02/2026. Deliberação: rejeitada a proposta de obra da garagem.", 3)]
  },
  "fato sem evidência": {
    question: "Qual a regra local para instalar ar-condicionado?",
    sources: [
      {
        content: "ATA — 10/02/2026. Foi debatida a pintura do hall.",
        page: 3,
        limitation: "irrelevant"
      }
    ]
  },
  "conciliação sem extrato": {
    question: "O caixa do balancete confere com o banco?",
    sources: [
      page(
        "BALANCETE 01/2026. Saldo inicial R$ 4.000,00; receitas R$ 6.000,00; despesas R$ 5.000,00; saldo final R$ 5.000,00. Extrato bancário não anexado."
      )
    ]
  },
  "inadimplência ausente": {
    question: "Não há inadimplência neste mês?",
    sources: [
      page(
        "BALANCETE 01/2026. Receitas recebidas: R$ 6.000,00; despesas: R$ 5.000,00. Não há quadro de cotas vencidas ou unidades devedoras."
      )
    ]
  },
  "despesa extraordinária sem suporte": {
    question: "Essa despesa extraordinária é fraude?",
    sources: [
      page(
        "BALANCETE 01/2026. Despesa extraordinária: R$ 8.000,00. Número de nota fiscal e contrato não informados.",
        2
      )
    ]
  },
  "liquidez sem obrigações futuras": {
    question: "Esse saldo garante pagar tudo no próximo mês?",
    sources: [
      page(
        "BALANCETE 01/2026. Saldo final: R$ 5.000,00. O arquivo não inclui contas a vencer ou projeção de recebimentos."
      )
    ]
  },
  "variação sem causa": {
    question: "Por que a conta de água aumentou?",
    sources: [
      page("BALANCETE 01/2026. Água: R$ 900,00."),
      page("BALANCETE 02/2026. Água: R$ 1.080,00. Sem nota explicativa.")
    ]
  },
  "orientação geral distinta": {
    question: "Como posso planejar a manutenção do condomínio?",
    sources: [
      {
        content: "Índice sintético: documentos de manutenção ainda não enviados.",
        page: 1,
        limitation: "irrelevant"
      }
    ]
  },
  "alto risco financeiro": {
    question: "Posso usar todo o fundo de reserva para pagar despesas correntes?",
    sources: [
      page(
        "BALANCETE 02/2026. Fundo de reserva: R$ 20.000,00. Não acompanha este envio convenção, aprovação de uso ou projeção de obrigações."
      )
    ]
  },
  "solicitação mínima de documento": {
    question: "Qual é o saldo real na conta bancária?",
    sources: [
      page(
        "BALANCETE 02/2026. Saldo contábil: R$ 5.000,00. Extrato e conciliação bancária não incluídos."
      )
    ]
  },
  "raio-x prudente": {
    question: "Faça um raio-X deste balancete parcial.",
    sources: [
      page(
        "BALANCETE 02/2026 — parcial. Receitas recebidas R$ 6.000,00; limpeza R$ 1.000,00; energia R$ 500,00. Ausentes demais despesas, extratos e saldo de encerramento."
      )
    ]
  }
};
