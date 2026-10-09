import type { AccountAction } from "./account-security.js";

export type AccountActionDeliveryResult = Readonly<{
  developmentActionUrl?: string;
}>;

export interface AccountActionDelivery {
  readonly channel: "development_preview" | "external_email";
  deliver(action: AccountAction): Promise<AccountActionDeliveryResult>;
}

export function createDevelopmentAccountActionDelivery(baseUrl: string): AccountActionDelivery {
  const normalizedBaseUrl = new URL(baseUrl);
  const delivery: AccountActionDelivery = {
    channel: "development_preview",
    async deliver(action) {
      const url = new URL(normalizedBaseUrl);
      url.searchParams.set(
        action.purpose === "verify_email" ? "verify_email" : "reset_password",
        action.token
      );
      return Object.freeze({ developmentActionUrl: url.toString() });
    }
  };
  return Object.freeze(delivery);
}

export function createAccountActionDeliveryFromEnvironment(
  environment: NodeJS.ProcessEnv
): AccountActionDelivery | undefined {
  const mode = environment.AUTH_EMAIL_DELIVERY?.trim().toLowerCase();
  if (mode === undefined || mode.length === 0 || mode === "disabled") return undefined;
  if (mode !== "development") {
    throw new Error(
      "AUTH_EMAIL_DELIVERY aceita somente 'development' enquanto nenhum provedor foi aprovado."
    );
  }
  if (environment.APP_ENV?.trim().toLowerCase() === "production") {
    throw new Error("A prévia local de e-mail não pode ser ativada em produção.");
  }
  return createDevelopmentAccountActionDelivery(
    environment.AUTH_PUBLIC_BASE_URL?.trim() || "http://127.0.0.1:5173/"
  );
}
