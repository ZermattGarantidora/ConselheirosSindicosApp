/** Limites por geração e margem de transporte; não autorizam novas tentativas. */
export const maximumGenerationTimeoutMs = 300_000;
export const singleGenerationRequestTimeoutMs = maximumGenerationTimeoutMs + 30_000;
export const questionRequestTimeoutMs = 2 * maximumGenerationTimeoutMs + 30_000;
