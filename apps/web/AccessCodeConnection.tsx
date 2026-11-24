import { useEffect, useState } from "react";

export function AccessCodeConnection() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void fetch("/v1/access/code", {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)])
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { code?: unknown };
        if (typeof body.code !== "string" || !/^[A-F0-9]{4}(?:-[A-F0-9]{4}){7}$/u.test(body.code))
          throw new Error();
        if (!controller.signal.aborted) setCode(body.code);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Não foi possível carregar seu código.");
      });
    return () => controller.abort();
  }, [revision]);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError("");
    } catch {
      setError("Selecione e copie o código acima.");
    }
  }
  return (
    <section className="profile-access-code" aria-labelledby="connect-device-title">
      <h3 id="connect-device-title">Conectar outro aparelho</h3>
      <p>
        Abra a Alvitra no outro aparelho e entre com este código. Quem tiver o código pode acessar
        sua conta.
      </p>
      {code ? (
        <>
          <label htmlFor="profile-access-code">Seu código de acesso</label>
          <textarea
            id="profile-access-code"
            value={code}
            readOnly
            rows={2}
            autoComplete="off"
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" className="profile-option" onClick={() => void copyCode()}>
            {copied ? "Código copiado" : "Copiar código"}
          </button>
          {copied ? <span role="status">Código copiado.</span> : null}
        </>
      ) : error ? (
        <button
          type="button"
          className="profile-option"
          onClick={() => setRevision((value) => value + 1)}
        >
          Tentar novamente
        </button>
      ) : (
        <p role="status">Carregando código...</p>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
