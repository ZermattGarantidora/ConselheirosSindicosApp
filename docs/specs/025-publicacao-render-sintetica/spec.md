# Spec 025 — Demonstração online sintética no Render

**Status:** implementada e aguardando publicação
**Responsável:** engenharia
**Atualizado em:** 2026-10-15

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Experiência principal | §§1 e 6 | Permite validar a conversa por uma URL, sem mudar a experiência. |
| Estratégia técnica | §12 | Mantém TypeScript, Fastify e React/Vite em uma implantação reversível. |
| Segurança e confiança | §§8–10 | Restringe a demonstração a dados sintéticos e não expõe segredos ou banco. |
| Validação | §13 | Permite observar tempo até a primeira conversa útil fora do ambiente local. |

### Limites respeitados

- Não recebe dados reais, documentos de clientes, credenciais de provedor ou banco persistente.
- Não inicia piloto, convite, autenticação definitiva, WhatsApp, ação externa ou funcionalidade de
  blocos futuros.
- Não substitui os gates da Spec 011 para piloto real.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Disponibilizar uma URL HTTPS para testar remotamente a conversa sintética da Alvitra.

## 2. Promessa testada

> Consigo abrir a Alvitra pela internet e experimentar a conversa sem cadastrar ou expor dados reais.

## 3. Escopo

- Web Service gratuito no Render configurado por `render.yaml`.
- API e build web entregues pela mesma origem, com endpoint de saúde.
- Demonstração explicitamente sem banco, IA externa ou persistência.

## 4. Fora do escopo

- Piloto, banco remoto, uploads ou documentos reais.
- Dados pessoais, contas reais, e-mail, OAuth, WhatsApp ou serviços pagos.

## 5. Requisitos

### RQ-2501 — URL demonstrativa segura

O ambiente inicia somente em modo demonstração e não contém configuração de segredo ou banco.

### RQ-2502 — Mesma origem

O build React é servido pela API para que chamadas relativas e cookies continuem na mesma origem HTTPS.

### RQ-2503 — Implantação verificável

A configuração registra build com lockfile, comando de início e `/health` para verificar disponibilidade.

## 6. Critérios de sucesso

- a URL abre a página de entrada e o chat sintético;
- `/health` responde `200`;
- não há `DATABASE_URL` ou chave de IA configurada;
- reinício não preserva contexto ou arquivo enviado;
- a publicação não afirma prontidão para piloto real.
