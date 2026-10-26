# Levantamento do acervo ctresb/leis para a Alvitra

> Atualização posterior à pesquisa: a autorização de 22/10/2026 resultou na
> [Spec 039](../specs/039-base-legal-verificada/spec.md) e no
> [ADR 0029](../adr/0029-recortes-legais-conferidos.md). A primeira edição de recortes oficiais
> foi incorporada à demonstração; a execução externa da integração alcançou o banco e informou
> oito testes aprovados e duas falhas, ainda em investigação. A rede desta sessão continua restrita.
> As conclusões abaixo registram o levantamento anterior à implementação.

**Data da consulta:** 22/10/2026

**Natureza:** pesquisa documental e técnica; não é spec nem autorização de implementação

**Repositório consultado:** <https://github.com/ctresb/leis>

**Revisão exibida na consulta:** `15eb09b618ff08a38c4dfee06a91bd139d093f5d`

## Conclusão

O acervo pode ajudar a descobrir normas e suas fontes oficiais para ampliar a biblioteca legal
compartilhada da Alvitra. A seleção deve começar pelo direito condominial federal e pelas
alterações que afetam assembleias, quóruns, inadimplência e seguros. Regras estaduais e municipais
dependem da localização de cada condomínio. A quantidade de arquivos não é um critério suficiente
para aprovar uma fonte.

O levantamento encontrou duas limitações práticas no projeto: o importador da Constituição ainda
referencia a EC 139, e a biblioteca atual foi modelada para legislação federal em PDF. Incorporar
Markdown, jurisprudência ou normas locais exige trabalho de especificação e validação antes da
ativação. Nenhuma norma foi importada e nenhum comportamento do aplicativo foi alterado nesta
pesquisa.

## Abrangência e limites da verificação

Foram consultados README, PROGRESSO, COBERTURA, LICENSE e a página principal do repositório,
além das fontes oficiais indicadas neste relatório. A documentação e o código local foram
comparados com esses achados. Não foi feita auditoria individual do milhão de documentos.

O PROGRESSO, gerado em 21/10/2026, informa 1.113.033 documentos e 7.544 pendências de integralidade.
A cobertura municipal declarada é de 0,2% das séries com meta. Esses números descrevem o acervo,
não certificam completude jurídica. O README ainda apresenta números da base inicial.

A busca de arquivos e a abertura de diretórios do GitHub falharam nesta sessão. Assim, as normas
das tabelas abaixo têm **fonte oficial localizada e consultada**, mas sua presença individual,
caminho exato e qualidade de conversão em `ctresb/leis` permanecem **não confirmados**. As pastas
indicadas são famílias documentadas pelo próprio acervo. Não devem ser interpretadas como arquivos
verificados. Antes de qualquer importação, conferir cada correspondência e o original oficial.

## Alinhamento com a visão do projeto

| Referência local | Aplicação ao levantamento |
| --- | --- |
| Briefing §§1, 4 e 9 | Melhorar orientação geral para síndicos com legislação oficial relevante e verificável. |
| Briefing §§8–10 | Preservar procedência, versões, citações, abstenção, conflitos e isolamento dos documentos particulares. |
| Briefing §§11–12 | Manter a experiência no chat, sem parecer jurídico definitivo, novo módulo ou provedor. |
| Spec 001, RQ-017 e AC-029 | Usar a biblioteca legal compartilhada e distinguir lei de documento do condomínio. |
| Spec 026, RQ-2602 e AC-2602 | Só afirmar regra legal específica com evidência oficial aplicável à jurisdição e à data. |
| ADR 0016 | Atualizar fontes públicas uma vez, sem copiá-las para cada condomínio. |

Pelo gate da estratégia competitiva, a proposta preserva o chat e o contrato de evidências;
contribui para a capacidade legal já prevista; melhora utilidade e segurança; e pode ser medida
por citações válidas, respostas corretas e abstenções. O diferencial em relação a uma IA genérica
é combinar lei aplicável com evidência privada autorizada e verificável. A complexidade só se
justifica com seleção pequena, atualização controlada e avaliações. A pesquisa não antecipa módulos
ou integrações fora do briefing.

## Material aproveitável no repositório

| Família documentada | Utilidade para a Alvitra | Condição de uso |
| --- | --- | --- |
| `constituicao.md` | Referência constitucional e descoberta de atualizações. | Conferir consolidação oficial e disposições transitórias. |
| `federal/leis-ordinarias/AAAA/` | Principal grupo para o núcleo condominial. | Selecionar por norma e dispositivo, conferindo alterações. |
| `federal/decretos/` e `federal/decretos-lei/` | Regulamentação e legislação trabalhista. | Validar redação e período de aplicação. |
| `estaduais/UF/` e `municipais/UF/municipio/` | Pesquisa territorial. | Exigir UF e município confirmados do condomínio. |
| `reguladores/` | Atos de trabalho, saúde, seguros e outros temas operacionais. | Conferir ato exato e texto consolidado no órgão competente. |
| `jurisprudencia/` | Descobrir precedentes e temas pertinentes. | Validar inteiro teor, status e alcance no tribunal. |
| Metadados e referências às fontes | Apoiar identificação e rastreamento. | Nunca aceitar um rótulo de vigência como certificação. |

O README alerta para conversões automáticas, OCR e coexistência de redações históricas. Scripts
de coleta e auditoria podem servir de referência técnica, mas não foram auditados ou executados.
Os originais de muitas normas não estão versionados; será necessário obtê-los na fonte oficial.

## Núcleo federal recomendado para a primeira seleção

As prioridades abaixo são recomendações desta pesquisa. A consulta a um portal oficial não
equivale à aprovação jurídica de todos os dispositivos da norma.

| Norma e fonte oficial | Uso previsto | Recorte ou cuidado |
| --- | --- | --- |
| [Código Civil — Lei 10.406/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) | Convenção, deveres, rateio, obras, síndico, contas, seguro e assembleias. | Priorizar arts. 1.331–1.358 e dispositivos de vizinhança relevantes. Não indexar redação superada como vigente. |
| [Lei 4.591/1964](https://www.planalto.gov.br/ccivil_03/leis/l4591.htm) | Condomínios em edificações e contexto das incorporações. | Selecionar o conteúdo pertinente à operação; compatibilizar com o Código Civil, sem presumir vigência integral ou revogação total. |
| [Lei 14.309/2022](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14309.htm) | Assembleias eletrônicas e sessão permanente. | Recuperar os dispositivos atuais do Código Civil e consultar a convenção quando necessário. |
| [Lei 14.405/2022](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14405.htm) | Alteração de convenção e mudança de destinação. | Evitar respostas baseadas em redações anteriores do art. 1.351. |
| [Lei 14.905/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm) | Correção monetária e juros na inadimplência. | O art. 1.336, §1º, mudou. Não assumir automaticamente juros de 1% ao mês; conferir convenção, período e regra aplicável. |
| [Lei 15.040/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l15040.htm) | Contratos de seguro e leitura de apólices. | Arts. 133–134 tratam de revogações e vigência. Conferir datas do contrato e do evento antes de selecionar o regime. |
| [CPC — Lei 13.105/2015](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm) | Representação e documentação para cobrança de cotas. | Recorte dos arts. 75 e 784; orientação processual de maior risco exige validação profissional. |
| [Lei do Inquilinato — Lei 8.245/1991](https://www.planalto.gov.br/ccivil_03/leis/l8245.htm) | Dúvidas sobre despesas de locador e locatário. | Arts. 22–23; distinguir repartição na locação de responsabilidade perante o condomínio. |
| [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) | Dados de moradores, visitantes, imagens e documentos. | Selecionar bases, princípios, direitos e segurança conforme a operação; evitar consentimento como resposta automática. |
| [Constituição compilada](https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm) e [EC 141/2026](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm) | Direitos fundamentais e contexto trabalhista. | A EC 141 contém transições; publicação e aplicação imediata não são equivalentes. |

As leis modificadoras servem também para testar se o texto consolidado está correto. Não precisam
gerar trechos duplicados competindo com o mesmo dispositivo na recuperação.

## Complementos conforme a pergunta e o perfil do condomínio

| Tema | Fontes oficiais localizadas | Uso e limite |
| --- | --- | --- |
| Acessibilidade | [Lei 13.146/2015](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm), [Lei 10.098/2000](https://www.planalto.gov.br/ccivil_03/leis/l10098.htm), [Decreto 5.296/2004](https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/decreto/d5296.htm) | Orientação sobre barreiras e adaptações, com verificação do edifício, das regras locais e da avaliação técnica. |
| Incêndio | [Lei 13.425/2017](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13425.htm) | Contexto federal, condicionado ao âmbito da lei; complementar com normas estaduais, bombeiros e município. Não inferir regularidade de uma edificação. |
| Piscinas | [Lei 14.327/2022](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14327.htm) | Segurança de piscinas e similares; complementar com atos locais e inspeção profissional. |
| Climatização | [Lei 13.589/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13589.htm) | PMOC quando o sistema e o uso estiverem no âmbito da norma. Não generalizar a qualquer apartamento. |
| Obras e responsabilidade técnica | [Lei 6.496/1977](https://www.planalto.gov.br/ccivil_03/leis/l6496.htm) e [Lei 12.378/2010](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12378.htm) | ART/RRT e documentação do responsável técnico; não produzir laudo de segurança. |
| Resíduos | [Lei 12.305/2010](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm) | Contexto de destinação e gerenciamento, acrescido da disciplina municipal e do tipo de resíduo. |
| Empregados e prestadores | [CLT](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm) e [NRs do MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes) | Selecionar NR-1, NR-6, NR-7, NR-10, NR-18 e NR-35 conforme atividade e risco. Exigir análise das convenções coletivas e da categoria quando pertinentes. |
| Fornecedores | [CDC — Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | Contratação de produtos e serviços quando houver relação de consumo. Não aplicar indistintamente à relação interna entre condomínio e condômino. |

Atos da ANPD, SUSEP/CNSP, ANVISA, CONAMA, Receita e conselhos profissionais podem ser necessários
em casos concretos. Sua inclusão depende da pergunta, da competência do órgão e da verificação
do ato atual. O diretório de um órgão não deve ser importado integralmente por associação temática.

Para condomínios de lotes, multipropriedade ou outras configurações especiais, pesquisar também a
legislação específica antes de habilitar respostas sobre esse regime. A seleção inicial acima
não certifica cobertura desses casos.

## Regras locais e jurisprudência

Sem UF e município de cada condomínio não é possível fechar uma lista territorial. A curadoria
deve pesquisar ruído, obras e posturas, elevadores, inspeção predial, incêndio e gás, água e
reservatórios, resíduos, piscinas e deveres locais de comunicação de violência, conforme o caso.
Ausência de arquivo no GitHub não demonstra ausência de obrigação. Normas técnicas devem ter
origem e permissão de uso próprias; não presumir que a licença do repositório as autoriza.

Em jurisprudência, começar por questões recorrentes: animais, locação de curta duração, multas e
defesa, cobrança, rateio e validade de deliberações. Cada precedente precisa de tribunal, processo,
órgão julgador, datas, inteiro teor, situação e alcance; uma notícia não substitui o acórdão.

Um exemplo atual é o [Tema 1.443 do STJ](https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?cod_tema_final=1443&cod_tema_inicial=1443&novaConsulta=true&tipo_pesquisa=T).
A [comunicação de 17/09/2026](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/17092026-Airbnb-afetacao-de-repetitivo-sobre-locacao-de-curta-temporada-em-condominios-suspende-processos-em-todo-o-pais.aspx)
informa afetação sobre locação de curta temporada e suspensão dos processos na controvérsia
descrita. Isso não deve ser cadastrado como tese repetitiva já julgada: conferir a ficha atual
antes de responder. Outro conjunto útil são os acórdãos sobre animais, como o
[REsp 1.783.076/DF](https://www.stj.jus.br/websecstj/cgi/revista/REJ.cgi/ATC?nreg=201&seq=95118486&tipo=91),
com análise dos fatos e de eventuais precedentes posteriores.

## Alertas concretos encontrados

1. **Referência constitucional local anterior ao acervo.**
   `scripts/import-brazilian-constitution.ts` fixa URL, título e marco na EC 139. O portal oficial
   já contém a EC 141/2026. Isso comprova uma referência fixa anterior, mas não informa qual versão
   está instalada no banco de um ambiente. Conferir o conteúdo persistido antes de declarar a
   base atualizada. As transições da EC 141 precisam ser representadas.
2. **A redação mais nova pode ainda não ser aplicável.** A
   [página oficial da NR-10](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-10-nr-10)
   distingue o texto vigente até 31/05/2027 da nova redação com vigência em 01/06/2027.
   Um único indicador de versão atual não resolve essa diferença.
3. **Juros e seguros exigem atualização dirigida.** As Leis 14.905/2024 e 15.040/2024 tornam
   arriscado reutilizar respostas antigas sobre inadimplência e apólices sem conferir o período.
4. **A referência autoral do repositório contém um inciso incorreto.** README e LICENSE citam
   art. 8º, I, da Lei 9.610/1998 para textos oficiais; a previsão correspondente está no
   [art. 8º, IV](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm).
   Os scripts estão sob MIT, com preservação dos avisos exigidos. Isso não dispensa verificar
   direitos sobre material adicional.

## Compatibilidade técnica com a implementação atual

| Evidência local | Consequência antes de ampliar o acervo |
| --- | --- |
| ADR 0016 e tabelas `app.legal_*` | Reaproveitar a biblioteca pública compartilhada; manter documentos privados no escopo autorizado. |
| `018_shared_legal_reference.sql`: jurisdição limitada a `BR` | Especificar representação territorial e filtro por localização antes de importar regras locais. |
| Mesma migração: `source_type = legislation` | Jurisprudência exige classificação e tratamento próprios, sem fingir que um acórdão é lei. |
| Mesma migração: mídia limitada a PDF | Markdown não entra diretamente no contrato atual. A opção mais compatível é obter o original oficial paginado; HTML/Markdown exigem decisão e critérios de citação próprios. |
| `postgres-scoped-retrieval.ts`: seleção legal por `active` e `is_current`, com datas retornadas como nulas | Não há nesse trecho uma seleção legal por data do fato e território. Especificar vigência e transições antes de ampliar a cobertura. |
| Importador específico da Constituição | Ainda não é um importador genérico de leis; requer generalização controlada e validação dos domínios e destinos finais. |

Uma futura importação deve registrar identificador oficial, órgão, jurisdição, original, URL,
datas de consulta e publicação, início e fim de eficácia quando determináveis, versão imutável,
hash, qualidade, dispositivos e localizadores verificáveis. Página não pode ser inventada para
um texto sem paginação. Se o original não permitir o contrato atual, a fonte não fica pronta
para citações até existir uma solução especificada.

## Sequência proposta para eventual implementação

1. Conferir a versão constitucional efetivamente persistida e preparar sua atualização oficial,
   com transições e preservação do histórico.
2. Fechar um manifesto pequeno do núcleo federal acima: arquivo localizado no acervo, original
   oficial, hash, versão, vigência, recorte e situação de revisão de cada norma.
3. Detalhar a spec e as aceitações antes de alterar importação, schema ou recuperação. Registrar
   decisões necessárias, preservando o ADR 0016 e o briefing.
4. Validar a ingestão e a recuperação com fontes públicas e perguntas sintéticas. Selecionar
   somente trechos pertinentes; comparar custo e qualidade com a base anterior.
5. Acrescentar complementos temáticos e territoriais conforme perguntas reais do produto,
   sem levar dados reais para fixtures ou evals.

Casos mínimos a exigir na implementação: assembleia eletrônica; mudança de destinação; juros
após alteração legal; seguro com datas distintas; texto publicado com vigência futura; norma
de outro município; conflito entre convenção e lei; fonte ausente; redação histórica; acórdão
sem tese vinculante; e tentativa de um documento instruir a assistente. Todos devem preservar
autorização, citações sustentadoras, limites e encaminhamento humano quando necessário.

## Verificação desta entrega

Esta entrega adiciona somente este relatório. As alterações preexistentes do projeto foram
preservadas. Não houve mudança em código, prompt, spec, banco, dependência ou produção.
Os gates de implementação e de alteração de specs não se aplicam a esta pesquisa; não foram
executados testes de aplicação. O relatório foi relido integralmente, com conferência da distinção
entre achados e candidatos e das referências consultadas. A checagem de whitespace do diff foi
executada sem erros após remover espaços finais do cabeçalho.

## Referências do acervo

- [README e página principal](https://github.com/ctresb/leis)
- [PROGRESSO](https://github.com/ctresb/leis/blob/main/PROGRESSO.md)
- [COBERTURA](https://github.com/ctresb/leis/blob/main/COBERTURA.md)
- [LICENSE](https://github.com/ctresb/leis/blob/main/LICENSE)

Os links oficiais das normas e dos órgãos estão junto aos respectivos itens. O resultado é um
mapa de curadoria e de lacunas, não uma certificação de que o repositório reúne tudo o que cada
condomínio precisa nem uma validação jurídica integral do acervo.
