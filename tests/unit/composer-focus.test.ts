import { describe, expect, it, vi } from "vitest";

import { focusComposer } from "../../apps/web/composer-focus.js";

describe("AC-2412 — foco do campo de mensagem", () => {
  it("permite escrever ao entrar e continuar após envio ou falha, sem rolar a página", () => {
    const input = { disabled: false, focus: vi.fn() };

    focusComposer(input, { entered: true, overlayOpen: false });
    expect(input.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });

    input.disabled = true;
    focusComposer(input, { entered: true, overlayOpen: false });
    expect(input.focus).toHaveBeenCalledTimes(1);

    input.disabled = false;
    focusComposer(input, { entered: true, overlayOpen: false });
    expect(input.focus).toHaveBeenCalledTimes(2);
    expect(input.focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it("não interfere no controle auxiliar durante uma resposta e retorna ao fechar", () => {
    const input = { disabled: true, focus: vi.fn() };
    focusComposer(input, { entered: true, overlayOpen: true });

    input.disabled = false;
    focusComposer(input, { entered: true, overlayOpen: true });
    expect(input.focus).not.toHaveBeenCalled();

    focusComposer(input, { entered: true, overlayOpen: false });
    expect(input.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it.each([
    { entered: false, overlayOpen: false, disabled: false },
    { entered: true, overlayOpen: true, disabled: false },
    { entered: true, overlayOpen: false, disabled: true }
  ])("preserva indisponibilidade ou navegação auxiliar: %j", (state) => {
    const input = { disabled: state.disabled, focus: vi.fn() };
    focusComposer(input, state);
    expect(input.focus).not.toHaveBeenCalled();
  });

  it("aceita o campo desmontado ao sair da conversa", () => {
    expect(() => focusComposer(null, { entered: true, overlayOpen: false })).not.toThrow();
  });
});
