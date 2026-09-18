import { randomBytes, timingSafeEqual } from "node:crypto";

export const googleOAuthStateCookie = "conselheiro_google_oauth_state";
export const googleOAuthStateTtlSeconds = 600;

const googleAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleUserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleAccountProfile = Readonly<{
  subject: string;
  email: string;
  displayName: string;
}>;

export type GoogleOAuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  successRedirectUri: string;
}>;

export interface GoogleOAuthClient {
  readonly successRedirectUri: string;
  createAuthorizationUrl(state: string): string;
  exchangeAuthorizationCode(code: string): Promise<GoogleAccountProfile>;
}

export class GoogleOAuthError extends Error {
  public constructor(message = "Não foi possível validar o acesso pelo Google.") {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

function requiredString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseRedirectUri(value: string, fieldName: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error(`${fieldName} deve ser uma URL HTTP ou HTTPS válida.`);
  }
  return value;
}

function isValidEmail(value: string): boolean {
  return value.length >= 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function responseBody(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function createGoogleOAuthClient(
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch
): GoogleOAuthClient {
  const clientId = requiredString(config.clientId);
  const clientSecret = requiredString(config.clientSecret);
  const redirectUri = parseRedirectUri(config.redirectUri, "GOOGLE_OAUTH_REDIRECT_URI");
  const successRedirectUri = parseRedirectUri(
    config.successRedirectUri,
    "GOOGLE_OAUTH_SUCCESS_REDIRECT_URI"
  );
  if (clientId === undefined || clientSecret === undefined) {
    throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórios.");
  }

  return {
    successRedirectUri,

    createAuthorizationUrl(state) {
      const url = new URL(googleAuthorizationEndpoint);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("state", state);
      url.searchParams.set("prompt", "select_account");
      return url.toString();
    },

    async exchangeAuthorizationCode(code) {
      const normalizedCode = requiredString(code);
      if (normalizedCode === undefined) throw new GoogleOAuthError();

      let tokenResponse: Response;
      try {
        tokenResponse = await fetchImpl(googleTokenEndpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: normalizedCode,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
          }),
          signal: AbortSignal.timeout(10_000)
        });
      } catch {
        throw new GoogleOAuthError();
      }
      if (!tokenResponse.ok) throw new GoogleOAuthError();

      const tokenPayload = responseBody(await tokenResponse.json().catch(() => undefined));
      const accessToken = requiredString(tokenPayload.access_token);
      if (accessToken === undefined) throw new GoogleOAuthError();

      let profileResponse: Response;
      try {
        profileResponse = await fetchImpl(googleUserInfoEndpoint, {
          headers: { authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000)
        });
      } catch {
        throw new GoogleOAuthError();
      }
      if (!profileResponse.ok) throw new GoogleOAuthError();

      const profilePayload = responseBody(await profileResponse.json().catch(() => undefined));
      const subject = requiredString(profilePayload.sub);
      const email = requiredString(profilePayload.email)?.toLocaleLowerCase("en-US");
      const displayName = requiredString(profilePayload.name) ?? "Usuário Google";
      if (
        subject === undefined ||
        email === undefined ||
        displayName === undefined ||
        !isValidEmail(email) ||
        profilePayload.email_verified !== true
      ) {
        throw new GoogleOAuthError();
      }

      return Object.freeze({ subject, email, displayName });
    }
  };
}

export function createGoogleOAuthFromEnvironment(
  environment: NodeJS.ProcessEnv
): GoogleOAuthClient | undefined {
  const clientId = requiredString(environment.GOOGLE_CLIENT_ID);
  const clientSecret = requiredString(environment.GOOGLE_CLIENT_SECRET);
  const redirectUri = requiredString(environment.GOOGLE_OAUTH_REDIRECT_URI);
  const configuredSuccessRedirectUri = requiredString(
    environment.GOOGLE_OAUTH_SUCCESS_REDIRECT_URI
  );
  const isProduction = environment.APP_ENV?.trim().toLowerCase() === "production";
  const successRedirectUri =
    configuredSuccessRedirectUri ?? (isProduction ? undefined : "http://127.0.0.1:5173/");
  if (clientId === undefined || clientSecret === undefined || redirectUri === undefined) {
    return undefined;
  }
  if (successRedirectUri === undefined) return undefined;

  return createGoogleOAuthClient({
    clientId,
    clientSecret,
    redirectUri,
    successRedirectUri
  });
}

export function createGoogleOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (cookieHeader === undefined) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function readGoogleOAuthState(cookieHeader: string | undefined): string | undefined {
  return readCookie(cookieHeader, googleOAuthStateCookie);
}

export function googleOAuthStatesMatch(
  expected: string | undefined,
  actual: string | undefined
): boolean {
  if (expected === undefined || actual === undefined) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export function serializeGoogleOAuthStateCookie(state: string, secure: boolean): string {
  return [
    `${googleOAuthStateCookie}=${encodeURIComponent(state)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${googleOAuthStateTtlSeconds}`,
    ...(secure ? ["Secure"] : [])
  ].join("; ");
}

export function serializeClearedGoogleOAuthStateCookie(secure: boolean): string {
  return [
    `${googleOAuthStateCookie}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(secure ? ["Secure"] : [])
  ].join("; ");
}
