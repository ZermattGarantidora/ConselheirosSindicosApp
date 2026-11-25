/** Verify remote TLS even when pg's legacy sslmode=require would accept an untrusted certificate. */
export function persistentDatabaseConfiguration(connectionString: string, certificate?: string) {
  try {
    const url = new URL(connectionString);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname.slice(1)
    )
      throw new Error();
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    const mode = url.searchParams.get("sslmode");
    if (
      [...url.searchParams.keys()].some(
        (key) => (/^ssl/iu.test(key) && key !== "sslmode") || key === "uselibpqcompat"
      ) ||
      (!local && !["require", "verify-full"].includes(mode ?? "")) ||
      (certificate !== undefined && !certificate.trim().startsWith("-----BEGIN CERTIFICATE-----"))
    )
      throw new Error();
    if (local && !certificate && (mode === null || mode === "disable")) return { connectionString };
    url.searchParams.delete("sslmode");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: true as const, ...(certificate ? { ca: certificate.trim() } : {}) }
    };
  } catch {
    throw new Error("A conexão persistente exige PostgreSQL e TLS remoto verificado.");
  }
}
