# Aceitação — Spec 065

- AC-6501 / RQ-6501: desativada por padrão; configuração incompatível com produção ou sem Codex/demo é recusada.
- AC-6502 / RQ-6501: pergunta sobre tópico público reconhecido pode disparar pesquisa sem comando explícito; tema desconhecido nunca vaza a pergunta livre. Consulta somente documental, recusa de pesquisa e retomada ambígua não acionam busca pública.
- AC-6503 / RQ-6502: canário privado em pergunta/histórico/perfil/evidência não aparece no subprocesso; consulta não chama retrieval ou memória.
- AC-6504 / RQ-6502: fluxo exige conclusão e web real; ferramentas locais, eventos desconhecidos, fonte inventada/perigosa ou texto sem referência são recusados.
- AC-6505 / RQ-6503: link clicável corresponde a URL oficial retornada pela ferramenta; HTML e URLs perigosas continuam literais, sem execução.
- AC-6506 / RQ-6503: conversa grava ambos os lados; repetição idempotente não faz nova pesquisa e resposta pública não recebe replay seguro como evidência local.
- AC-6507 / RQ-6503: falha/tema indisponível não fabrica resultado, não faz fallback pago e conserva privacidade/telemetria controlada.
- AC-6508 / RQ-6501–6503: smoke sintético público e gates registrados antes da ativação local; PDFs privados nunca entram no teste.
- AC-6509 / RQ-6503: o cliente recebe o sinal e mostra “Pesquisando na internet” antes da resposta, somente após início da tentativa web autorizada. Conclusão, erro e cancelamento retiram o aviso; consulta comum, repetição idempotente e acesso negado não simulam pesquisa. Cliente sem negociação mantém JSON e status HTTP anteriores.
- AC-6510 / RQ-6504: procurar empresa de limpeza/higienização de caixa d’água em Pinhais PR, sem pedir a ferramenta, pesquisa somente serviço constante e município/UF canônicos. Canários, endereço, nome/CNPJ e histórico não chegam ao subprocesso; cidade desconhecida, cidade ambígua, outro serviço e recusa não iniciam essa busca.
- AC-6511 / RQ-6504: “pesquise na internet” retoma somente o último pedido autorizado e suportado no mesmo chat; não usa fala da assistente, outro chat/condomínio, documento ou assunto anterior a uma mudança. Sem tópico, não chama o pesquisador nem retorna erro genérico por tópico vazio.
- AC-6512 / RQ-6502/6504: fontes empresariais observadas são aceitas apenas na política de prestadores; pesquisa legal continua recusando-as. URLs locais, IPs, credenciais, HTTP e contatos/ações são recusados. Links exibidos preservam texto literal, escape HTML, noreferrer e no-referrer; nomes não comprovam qualidade nem contratação.
