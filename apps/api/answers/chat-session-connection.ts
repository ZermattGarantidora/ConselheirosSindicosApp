/** Mesmo destino lógico e mesmas opções TLS; somente troca o modo de conexão conhecido. */
export function chatSessionConnectionString(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("A conexão de sessão PostgreSQL é inválida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("A conexão de sessão exige PostgreSQL.");
  if (url.hostname.endsWith(".neon.tech")) url.hostname = url.hostname.replace(/-pooler\./u, ".");
  else if (
    (url.hostname.endsWith(".pooler.supabase.com") || url.hostname.endsWith(".supabase.co")) &&
    url.port === "6543"
  )
    url.port = "5432";
  else if (/pooler/iu.test(url.hostname))
    throw new Error("Configure uma conexão PostgreSQL de sessão para a memória.");
  return url.toString();
}
