/** Corpus fictício textual: nenhum dado de cliente, pessoa, contato ou credencial. */
type Topic = Readonly<{
  title: string;
  activity: string;
  inventory: string;
  unit: string;
  record: string;
  context: string;
  decision: string;
  items: readonly string[];
}>;

const topics: readonly Topic[] = [
  {
    title: "Assembleia de eleição",
    activity: "reunião eleitoral",
    inventory: "credenciamento eleitoral",
    unit: "participantes",
    record: "ata eleitoral",
    context:
      "A assembleia fictícia organiza a eleição da gestão e do conselho. O credenciamento separa presença, representação e votação, preservando a conferência das unidades habilitadas.",
    decision:
      "A secretaria registra a contagem de votos em folha própria e apresenta o resultado antes do encerramento. A minuta somente vira ata final depois da conferência das deliberações.",
    items: [
      "Credenciamento de unidades",
      "Verificação de procurações",
      "Apuração das chapas",
      "Conferência da minuta"
    ]
  },
  {
    title: "Planejamento do orçamento",
    activity: "oficina orçamentária",
    inventory: "cadastro orçamentário",
    unit: "rubricas",
    record: "planilha orçamentária",
    context:
      "O planejamento reúne as despesas recorrentes e distingue os investimentos extraordinários. Cada estimativa indica mês de referência, suporte documental e responsável pela conferência.",
    decision:
      "A comparação usa valores previstos e realizados do mesmo período. Transferências entre contas próprias ficam separadas das receitas e despesas para evitar dupla contagem.",
    items: ["Folha e encargos", "Limpeza contratada", "Consumo de energia", "Manutenção preventiva"]
  },
  {
    title: "Conferência de caixa",
    activity: "conciliação financeira",
    inventory: "lote de comprovantes",
    unit: "comprovantes",
    record: "relatório de conciliação",
    context:
      "A conferência do caixa associa recebimentos e pagamentos aos comprovantes fictícios. Saldo contábil informado e saldo do extrato são campos distintos, com referência ao dia de fechamento.",
    decision:
      "Uma divergência permanece pendente até receber suporte verificável. O relatório não transforma ausência de recibo em indício de fraude e mantém a memória dos ajustes propostos.",
    items: [
      "Saldo de abertura",
      "Recebimentos ordinários",
      "Pagamentos registrados",
      "Saldo de encerramento"
    ]
  },
  {
    title: "Controle de água",
    activity: "leitura dos hidrômetros",
    inventory: "roteiro hidráulico",
    unit: "pontos de medição",
    record: "mapa de consumo hídrico",
    context:
      "O acompanhamento do consumo de água registra leitura inicial, leitura final e intervalo de medição. Oscilações são comparadas com ocupação e intervenções conhecidas, sem presumir vazamento.",
    decision:
      "A equipe anota leituras incomuns e solicita verificação técnica antes de atribuir causa. Consumo das áreas comuns e consumo individual permanecem em campos separados.",
    items: ["Hidrômetro principal", "Reservatório superior", "Jardim coletivo", "Área de lavagem"]
  },
  {
    title: "Energia das áreas comuns",
    activity: "ronda elétrica",
    inventory: "inventário de iluminação",
    unit: "luminárias",
    record: "quadro de consumo elétrico",
    context:
      "O levantamento de energia identifica iluminação, bombas e equipamentos de uso comum. A conferência mantém o período faturado, a leitura e os serviços extraordinários associados à conta.",
    decision:
      "Uma proposta de economia precisa indicar premissas e base de comparação. A troca de equipamento depende de avaliação técnica e não autoriza intervenção em circuitos energizados.",
    items: [
      "Iluminação das escadas",
      "Bombas de recalque",
      "Sensores de presença",
      "Luzes da garagem"
    ]
  },
  {
    title: "Manutenção de elevadores",
    activity: "vistoria dos elevadores",
    inventory: "plano de inspeções verticais",
    unit: "verificações",
    record: "livro de manutenção vertical",
    context:
      "A manutenção dos elevadores reúne ordens de serviço, visitas preventivas e apontamentos da empresa contratada. O registro distingue constatação operacional e diagnóstico de profissional habilitado.",
    decision:
      "A administração acompanha o fechamento de cada chamado e pede comprovante de execução. Uma ocorrência com risco exige avaliação humana, sem liberar equipamento por conclusão automática.",
    items: [
      "Portas das cabines",
      "Nivelamento dos pavimentos",
      "Comunicação de emergência",
      "Registro das visitas"
    ]
  },
  {
    title: "Organização dos seguros",
    activity: "conferência securitária",
    inventory: "índice de apólices",
    unit: "documentos",
    record: "quadro securitário",
    context:
      "O arquivo de seguros reúne apólice, endossos, comprovantes e comunicações fictícias. A existência de uma cobertura depende da redação aplicável, da vigência e das condições do contrato.",
    decision:
      "A síntese não confirma indenização nem dispensa análise do corretor. Dúvidas de cobertura e divergências de versão ficam explícitas até a conferência dos documentos correspondentes.",
    items: [
      "Apólice de referência",
      "Endossos emitidos",
      "Comprovantes de prêmio",
      "Comunicações recebidas"
    ]
  },
  {
    title: "Obra de impermeabilização",
    activity: "vistoria da cobertura",
    inventory: "roteiro de impermeabilização",
    unit: "pontos de inspeção",
    record: "diário de impermeabilização",
    context:
      "O planejamento da impermeabilização reúne escopo, orçamento, autorização e cronograma fictícios. As etapas distinguem preparação da superfície, execução, ensaio e recebimento do serviço.",
    decision:
      "Mudanças de material ou área exigem novo registro e suporte técnico. A conclusão administrativa de uma etapa não substitui laudo, garantia ou aceite de responsável habilitado.",
    items: [
      "Preparação da superfície",
      "Aplicação da manta",
      "Ensaio de estanqueidade",
      "Recebimento técnico"
    ]
  },
  {
    title: "Reserva do salão",
    activity: "conferência do salão",
    inventory: "agenda do salão",
    unit: "reservas",
    record: "livro de reservas do salão",
    context:
      "A agenda do salão apresenta solicitação, confirmação, vistoria de entrega e devolução. A disponibilidade do espaço é separada da autorização de uso e das condições do regimento fictício.",
    decision:
      "Conflitos de datas permanecem visíveis para decisão da administração. A reserva só é considerada confirmada quando o registro correspondente estiver completo e aplicável ao período.",
    items: [
      "Solicitações de uso",
      "Vistorias de entrega",
      "Registro de chaves",
      "Vistorias de devolução"
    ]
  },
  {
    title: "Conservação da piscina",
    activity: "inspeção da piscina",
    inventory: "controle da piscina",
    unit: "medições",
    record: "diário de tratamento da piscina",
    context:
      "A rotina da piscina reúne medições de qualidade, limpeza e manutenção dos equipamentos. O registro fictício identifica data, ponto avaliado e necessidade de conferência pelo responsável.",
    decision:
      "Um resultado fora do parâmetro exige encaminhamento técnico e registro da providência. A síntese não libera o uso da água nem substitui avaliação sanitária ou manutenção especializada.",
    items: ["Medição da água", "Limpeza das bordas", "Revisão dos filtros", "Inspeção do entorno"]
  },
  {
    title: "Circulação na garagem",
    activity: "ronda da garagem",
    inventory: "mapa de circulação",
    unit: "trechos",
    record: "planta operacional da garagem",
    context:
      "O roteiro da garagem identifica circulação, áreas de carga e pontos de sinalização. O documento não transfere vagas nem altera direitos de uso definidos em documentos próprios.",
    decision:
      "Obstruções e sinalizações danificadas são registradas com localização. Alterações permanentes de circulação exigem decisão formal e avaliação das condições de acesso e emergência.",
    items: [
      "Faixas de circulação",
      "Área de carga",
      "Sinalização horizontal",
      "Acesso de pedestres"
    ]
  },
  {
    title: "Convivência com animais",
    activity: "reunião de convivência",
    inventory: "pauta de convivência animal",
    unit: "assuntos",
    record: "registro de convivência animal",
    context:
      "A pauta trata circulação, limpeza e comunicação de ocorrências envolvendo animais. Relatos são distinguidos de fatos documentados e nenhuma penalidade é presumida pelo roteiro.",
    decision:
      "A administração confere a regra aplicável e ouve as partes antes de encaminhar uma questão. O documento fictício organiza evidências e preserva a necessidade de validação humana.",
    items: [
      "Circulação nas áreas comuns",
      "Limpeza dos trajetos",
      "Comunicação de ocorrências",
      "Conferência do regimento"
    ]
  },
  {
    title: "Coleta de resíduos",
    activity: "ronda da coleta seletiva",
    inventory: "roteiro de resíduos",
    unit: "pontos de coleta",
    record: "plano de coleta seletiva",
    context:
      "A coleta seletiva organiza locais, recipientes e retiradas de resíduos comuns. Materiais com destinação especial permanecem identificados para consulta às orientações competentes.",
    decision:
      "A equipe registra retiradas realizadas e impedimentos de acesso. Uma mudança de frequência precisa indicar o período de teste e a forma de acompanhar o volume efetivamente recolhido.",
    items: [
      "Recipientes de papel",
      "Recipientes de plástico",
      "Área de armazenamento",
      "Comprovantes de retirada"
    ]
  },
  {
    title: "Serviços contratados",
    activity: "conferência dos prestadores",
    inventory: "índice de ordens de serviço",
    unit: "ordens",
    record: "cadastro de serviços contratados",
    context:
      "A organização de serviços vincula solicitação, orçamento, aprovação e comprovante de execução. Os fornecedores do cenário são fictícios e não possuem contatos ou dados pessoais.",
    decision:
      "A comparação considera escopo equivalente e registra exclusões de cada proposta. O material não autoriza contratação, envio de mensagem ou pagamento sem decisão humana explícita.",
    items: [
      "Escopo solicitado",
      "Orçamentos recebidos",
      "Aprovação registrada",
      "Comprovante de execução"
    ]
  },
  {
    title: "Proteção das informações",
    activity: "revisão de acessos documentais",
    inventory: "inventário de permissões",
    unit: "perfis",
    record: "matriz de acesso documental",
    context:
      "O inventário de permissões distingue consulta, atualização e exclusão de documentos. O cenário usa somente grupos fictícios e não reproduz cadastros de pessoas ou dados reais.",
    decision:
      "A retirada de um vínculo precisa interromper o acesso correspondente. Compartilhamentos são limitados ao contexto autorizado e qualquer alteração exige registro de responsável e motivo.",
    items: [
      "Perfis de consulta",
      "Perfis de atualização",
      "Revisão de vínculos",
      "Registro de revogações"
    ]
  },
  {
    title: "Manutenção dos portões",
    activity: "teste dos portões",
    inventory: "checklist dos portões",
    unit: "itens",
    record: "livro de manutenção dos portões",
    context:
      "O acompanhamento dos portões registra manutenção, sensores e chamados de funcionamento. A observação operacional não substitui diagnóstico mecânico ou elétrico de profissional habilitado.",
    decision:
      "Falhas são encaminhadas à equipe responsável com localização e descrição objetiva. O roteiro não executa comandos de abertura nem autoriza acesso de moradores ou prestadores.",
    items: [
      "Sensores de passagem",
      "Travas mecânicas",
      "Sinalização de movimento",
      "Ordens de manutenção"
    ]
  },
  {
    title: "Preparação para emergências",
    activity: "simulado de abandono",
    inventory: "roteiro de emergência",
    unit: "etapas",
    record: "plano de preparação emergencial",
    context:
      "A preparação reúne rotas, pontos de encontro e responsáveis por conferir os materiais. O roteiro fictício serve para organizar documentos e não oferece diagnóstico ou garantia de segurança.",
    decision:
      "Pendências técnicas devem ser avaliadas por profissional responsável. Em uma ocorrência real, a prioridade segue o plano aplicável e as orientações das autoridades competentes.",
    items: [
      "Rotas sinalizadas",
      "Pontos de encontro",
      "Comunicação interna",
      "Conferência dos equipamentos"
    ]
  },
  {
    title: "Acessibilidade das áreas comuns",
    activity: "vistoria de acessibilidade",
    inventory: "mapa de barreiras",
    unit: "locais",
    record: "relatório de acessibilidade",
    context:
      "A vistoria administrativa identifica obstáculos de circulação e documentos técnicos disponíveis. As observações descrevem os locais sem certificar conformidade normativa ou solução de engenharia.",
    decision:
      "Adaptações propostas precisam de análise técnica, orçamento e autorização aplicável. O acompanhamento registra o que foi constatado, o que foi contratado e o que permanece pendente.",
    items: [
      "Acesso principal",
      "Circulação dos corredores",
      "Sinalização dos ambientes",
      "Acesso ao salão"
    ]
  },
  {
    title: "Prestação de contas",
    activity: "revisão dos demonstrativos",
    inventory: "pasta de prestação de contas",
    unit: "anexos",
    record: "índice de prestação de contas",
    context:
      "A prestação de contas organiza demonstrativos, extratos, comprovantes e atas de referência. A ausência de um anexo fica explícita e não é preenchida com conclusões baseadas em outro período.",
    decision:
      "Cada conclusão deve indicar a fonte, a versão e a página pertinente. Questões contábeis controvertidas permanecem sujeitas à validação do profissional responsável e do conselho.",
    items: [
      "Demonstrativo mensal",
      "Extrato correspondente",
      "Comprovantes numerados",
      "Ata de apreciação"
    ]
  },
  {
    title: "Transição administrativa",
    activity: "reunião de transição",
    inventory: "inventário de entrega",
    unit: "pastas",
    record: "termo de transição administrativa",
    context:
      "A transição relaciona documentos recebidos, versões disponíveis e pendências de entrega. O roteiro separa a existência de uma pasta da conferência efetiva de todos os seus arquivos.",
    decision:
      "A confirmação de recebimento não equivale à aprovação do conteúdo. Cada pendência mantém responsável, prazo e critério de conferência para acompanhamento pela nova gestão.",
    items: [
      "Atas e convenção",
      "Contratos vigentes",
      "Histórico financeiro",
      "Pendências documentais"
    ]
  }
];

export type FullPageProbe = Readonly<{ question: string; statement: string }>;
export type FullDocumentPage = Readonly<{
  lines: readonly string[];
  expectedText: string;
  probes: readonly FullPageProbe[];
}>;
export type FullPageDocument<PageCount extends number = 1 | 2 | 8> = Readonly<{
  id: string;
  title: string;
  pageCount: PageCount;
  pages: readonly FullDocumentPage[];
}>;

function wrapText(text: string): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/u)) {
    const previous = lines.at(-1);
    if (previous === undefined || previous.length + word.length + 1 > 92) lines.push(word);
    else lines[lines.length - 1] = `${previous} ${word}`;
  }
  return lines;
}

function createPage(
  topic: Topic,
  documentIndex: number,
  pageNumber: number,
  pageCount: number
): FullDocumentPage {
  const hour = `${8 + (documentIndex % 8)}:${pageNumber % 2 === 0 ? "45" : "15"}`;
  const capacity = 25 + documentIndex * 3 + pageNumber;
  const date = `${String(3 + (documentIndex % 24)).padStart(2, "0")}/11/2026`;
  const probes = [
    {
      question: `Quando inicia a atividade "${topic.activity}"?`,
      statement: `A atividade "${topic.activity}" inicia às ${hour}.`
    },
    {
      question: `Qual é o limite registrado para ${topic.inventory}?`,
      statement: `Limite registrado para ${topic.inventory}: ${capacity} ${topic.unit}.`
    },
    {
      question: `Qual é o prazo de revisão de "${topic.record}"?`,
      statement: `A revisão de "${topic.record}" vence em ${date}.`
    }
  ];
  const paragraphs = [
    "FICTÍCIO - SOMENTE TESTE - SEM DADOS REAIS",
    `Condomínio Alameda | Caderno ${documentIndex + 1} | Página ${pageNumber} de ${pageCount}`,
    `${topic.title.toLocaleUpperCase("pt-BR")} - REGISTRO OPERACIONAL`,
    probes[0]!.statement,
    `1. Objeto e contexto. ${topic.context}`,
    `2. Deliberação registrada. ${topic.decision}`,
    `3. Organização dos suportes. O conjunto referente a ${topic.title.toLocaleLowerCase("pt-BR")} possui índice por assunto, data e versão. A equipe confere o original antes de classificar um anexo como válido e mantém disponível a localização de cada informação usada na síntese. O material desta página pertence exclusivamente ao cenário fictício Alameda.`,
    `4. Registro do período. A atividade de ${topic.activity} possui agenda própria. Alterações de horário devem constar no registro de acompanhamento, com justificativa e referência ao documento que as autorizou. A anotação anterior permanece consultável para que uma mudança não seja confundida com a condição originalmente comunicada.`,
    "QUADRO DE ACOMPANHAMENTO | RESPONSÁVEL FICTÍCIO | SITUAÇÃO | SUPORTE",
    ...topic.items.map(
      (item, index) =>
        `${item} | Equipe ${index + 1} | ${index % 2 === 0 ? "Conferido" : "Pendente"} | Anexo ${documentIndex + 1}.${pageNumber}.${index + 1}`
    ),
    probes[1]!.statement,
    `5. Conferência do quadro. Os itens de ${topic.inventory} são contados somente após verificar sua relação com o assunto desta página. Um suporte pendente não é considerado comprovado. A coluna de situação representa o acompanhamento administrativo e não equivale a aprovação técnica, autorização de despesa ou encerramento automático da pendência.`,
    `6. Tratamento das diferenças. Quando o registro de ${topic.record} divergir do documento de suporte, as duas informações devem permanecer identificadas. A equipe registra o trecho, a página e a versão de cada fonte. A análise fica limitada ao que está disponível, indicando qual documento ou esclarecimento ainda é necessário para concluir a conferência.`,
    `7. Procedimentos de acompanhamento. A coordenação organiza a pauta de ${topic.activity}, verifica a ordem dos anexos e anota os encaminhamentos. O retorno de uma demanda precisa apontar o item atendido e o suporte correspondente. Mensagens informais não substituem documentos exigidos e não alteram silenciosamente os dados já registrados.`,
    "LISTA DE VERIFICAÇÃO DO RECEBIMENTO E DA LEITURA",
    "[1] Conferir título, período e identificação do condomínio no original recebido.",
    "[2] Preservar a ordem das páginas, as quebras de linha e os itens do quadro textual.",
    "[3] Relacionar cada pendência ao anexo correspondente, sem inventar suporte ausente.",
    "[4] Solicitar validação humana quando a decisão depender de interpretação especializada.",
    `8. Critério de encerramento. A conferência de ${topic.title.toLocaleLowerCase("pt-BR")} termina apenas quando cada pendência possui uma decisão documentada ou limitação explícita. Uma resposta parcial deve explicar seu alcance. Os suportes de outro condomínio ou de outra versão não completam automaticamente o conjunto considerado nesta página.`,
    probes[2]!.statement,
    `9. Fechamento do registro. O prazo acima pertence a ${topic.record} neste caderno. A próxima conferência deve consultar os originais novamente, registrar eventuais mudanças e preservar as diferenças entre versões. Este texto descreve uma situação inteiramente fictícia para verificar envio, leitura integral e recuperação documental.`,
    `FIM DA PÁGINA ${pageNumber} DE ${pageCount} | ALAMEDA | CADERNO ${documentIndex + 1} | SOMENTE TESTE`
  ];
  const lines = paragraphs.flatMap(wrapText);
  return { lines, expectedText: lines.join("\n"), probes };
}

export function createFullPageDocumentCorpus(): readonly FullPageDocument[] {
  return (
    [
      { count: 20, pageCount: 1 },
      { count: 10, pageCount: 2 },
      { count: 5, pageCount: 8 }
    ] as const
  ).flatMap(({ count, pageCount }) =>
    Array.from({ length: count }, (_, index) => {
      const documentIndex = pageCount === 1 ? index : pageCount === 2 ? 20 + index : 30 + index;
      const firstTopic = pageCount === 1 ? index : pageCount === 2 ? index * 2 : index * 4;
      return {
        id: `pdf-${pageCount}p-${String(index + 1).padStart(2, "0")}`,
        title: `${pageCount === 8 ? "Caderno de gestão" : topics[firstTopic % topics.length]!.title} - Alameda - ${documentIndex + 1}`,
        pageCount,
        pages: Array.from({ length: pageCount }, (_, pageIndex) =>
          createPage(
            topics[(firstTopic + pageIndex) % topics.length]!,
            documentIndex,
            pageIndex + 1,
            pageCount
          )
        )
      };
    })
  );
}

export function createLongPdfDocument(pageCount = 300): FullPageDocument<number> {
  return {
    id: `pdf-${pageCount}p`,
    title: "Caderno de gestão - Alameda - teste extenso",
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => {
      const topic = topics[index % topics.length]!;
      const code = `R${String(index + 1).padStart(4, "0")}`;
      return createPage(
        {
          ...topic,
          activity: `${topic.activity} ${code}`,
          inventory: `${topic.inventory} ${code}`,
          record: `${topic.record} ${code}`
        },
        index,
        index + 1,
        pageCount
      );
    })
  };
}

/** PDF A4 em Courier/WinAnsi, com largura calculada em caracteres monoespaçados. */
export function renderFullPagePdf(document: FullPageDocument<number>): Buffer {
  const fontId = 3 + document.pages.length * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${document.pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${document.pages.length} >>`,
    ...document.pages.map(
      (_, index) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${3 + document.pages.length + index} 0 R >>`
    ),
    ...document.pages.map(({ lines }) => {
      // 9 pt Courier: até 92 * 5,4 = 496,8 pt; área útil horizontal de 511,28 pt.
      if (lines.length < 50 || lines.length > 70 || lines.some((line) => line.length > 92)) {
        throw new Error("A página fictícia não atende à densidade ou às margens A4.");
      }
      const leading = (758 / (lines.length - 1)).toFixed(4);
      const stream = `BT /F1 9 Tf ${leading} TL 42 800 Td\n${lines.map((line, index) => `${index === 0 ? "" : "T* "}(${line.replaceAll(/([()\\])/gu, "\\$1")}) Tj`).join("\n")}\nET`;
      return `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>"
  ];
  const buffers = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets = [0];
  let byteLength = buffers[0]!.length;
  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const buffer = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, "latin1");
    buffers.push(buffer);
    byteLength += buffer.length;
  });
  const xref = offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  buffers.push(
    Buffer.from(
      `xref\n0 ${offsets.length}\n0000000000 65535 f \n${xref}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${byteLength}\n%%EOF`,
      "latin1"
    )
  );
  return Buffer.concat(buffers);
}
