import { useState } from "react";

type ContextResponse = Readonly<{
  condominiumId: string;
  role: string;
  permissions: readonly string[];
}>;

export function App() {
  const [condominiumId, setCondominiumId] = useState("alameda");
  const [context, setContext] = useState<ContextResponse | undefined>();
  const [message, setMessage] = useState("Selecione um condomínio para iniciar.");

  async function selectCondominium() {
    const response = await fetch(`/v1/condominiums/${encodeURIComponent(condominiumId)}/context`, {
      headers: { "x-development-user-id": "sindico-demo" }
    });

    if (!response.ok) {
      setContext(undefined);
      setMessage("O acesso a este condomínio não foi autorizado.");
      return;
    }

    const body = (await response.json()) as ContextResponse;
    setContext(body);
    setMessage(`Contexto autorizado para ${body.condominiumId}.`);
  }

  return (
    <main>
      <h1>Conselheiro para Síndicos</h1>
      <p>Ambiente local com dados sintéticos.</p>
      <label htmlFor="condominium-id">Condomínio</label>
      <input
        id="condominium-id"
        value={condominiumId}
        onChange={(event) => setCondominiumId(event.target.value)}
      />
      <button type="button" onClick={selectCondominium}>
        Selecionar contexto
      </button>
      <p role="status">{message}</p>
      {context === undefined ? null : <p>Perfil: {context.role}</p>}
    </main>
  );
}
