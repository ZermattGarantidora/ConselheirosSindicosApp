import { describe, expect, it, vi } from "vitest";
import { requestAccessSession } from "../../apps/web/access-session.js";
import { signOut } from "../../apps/web/profile-session.js";

describe("sessão de acesso no navegador", () => {
  it("AC-6802/6807: restaura por cookie sem ler ou escrever localStorage", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ userId: "sintetico" })));
    expect(await requestAccessSession(request)).toEqual({ userId: "sintetico", displayName: "" });
    expect(request).toHaveBeenCalledWith(
      "/v1/access/session",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" })
    );
  });
  it("AC-6801: envia código somente no corpo e não usa o código como nome", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ userId: "sintetico" })));
    expect(await requestAccessSession(request, "codigo-sintetico")).toEqual({
      userId: "sintetico",
      displayName: ""
    });
    expect(request).toHaveBeenCalledWith(
      "/v1/access/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "codigo-sintetico" })
      })
    );
  });
  it("AC-6807: distingue ausência de sessão de indisponibilidade", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    expect(await requestAccessSession(request)).toBeUndefined();
    await expect(requestAccessSession(request, "invalido")).rejects.toThrow(
      "Código de acesso inválido"
    );
    request.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(requestAccessSession(request)).rejects.toThrow("Não foi possível acessar");
    request.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(requestAccessSession(request, "invalido")).rejects.toThrow("Muitas tentativas");
    request.mockResolvedValue(new Response("{}"));
    await expect(requestAccessSession(request)).rejects.toThrow("confirmar seu acesso");
  });
  it("AC-6805: revoga cookie antes de descartar estado e mantém acesso se falhar", async () => {
    const removeItem = vi.fn();
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(signOut("development", { removeItem }, request, true)).rejects.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
    request.mockResolvedValue(new Response(null, { status: 204 }));
    await signOut("development", { removeItem }, request, true);
    expect(request).toHaveBeenLastCalledWith(
      "/v1/access/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" })
    );
    expect(removeItem).toHaveBeenCalled();
  });
});
