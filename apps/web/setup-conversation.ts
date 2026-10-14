export function buildInitialCondominiumNamePrompt(total: number): string {
  if (total === 1) return "Ótimo. Qual é o nome do seu condomínio?";
  return `Ótimo. Vamos configurar um por vez. Qual é o nome do condomínio 1 de ${total}?`;
}

export function buildSetupCompletionMessage(total: number, managerName: string): string {
  const greeting = `Pronto${managerName === "" ? "" : `, ${managerName}`}!`;
  if (total === 1) {
    return `${greeting} Já tenho o contexto inicial desse condomínio. Pode me contar o que você precisa resolver. Você não precisa enviar nenhum documento para usar a Alvitra, mas, quando enviar convenções, regimentos, atas, contratos ou balancetes, eu consigo dar respostas mais precisas e fundamentadas sobre ele.`;
  }
  return `${greeting} Já tenho o contexto inicial dos seus condomínios. Pode me contar o que você precisa resolver. Você não precisa enviar nenhum documento para usar a Alvitra, mas, quando enviar convenções, regimentos, atas, contratos ou balancetes, eu consigo dar respostas mais precisas e fundamentadas para cada condomínio.`;
}
