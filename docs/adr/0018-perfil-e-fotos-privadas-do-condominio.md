# ADR 0018 — Perfil e fotos privadas do condomínio

**Status:** aceito  
**Data:** 2026-10-06

## Contexto

O síndico precisa reconhecer e manter os dados básicos do espaço de trabalho sem transformar o conselheiro documental em um portal operacional. Fotos não podem depender do disco local da instância nem ser confundidas com evidência documental.

## Decisão

- Nome, endereço, administradora, quantidade de unidades, contato da gestão e descrição curta são atualizados no registro do condomínio. O CNPJ permanece somente leitura nesta capacidade.
- Até cinco fotos JPEG, PNG ou WebP de até 5 MiB são persistidas como `bytea` em PostgreSQL, vinculadas ao `condominium_id` e servidas apenas pela API autenticada.
- A API confere tamanho e assinatura de conteúdo; o banco mantém as operações de escrita atrás de funções que revalidam a membership ativa e o papel `manager`. RLS limita a leitura ao tenant ativo.
- Nenhum caminho de arquivo local ou provedor externo é introduzido. As fotos e a descrição não entram na ingestão, recuperação, resposta ou citação documental.
- O fluxo de exclusão já confirmado do condomínio também remove as fotos em cascata.

## Consequências

- O perfil continua disponível após reinício ou troca de instância, com o mesmo isolamento dos demais dados do condomínio.
- Imagens podem elevar o tamanho de backups e do banco; o limite de quantidade e tamanho reduz esse custo inicial.
- Galeria pública, processamento visual das fotos, OCR e gerenciamento completo de moradores permanecem fora do escopo.
