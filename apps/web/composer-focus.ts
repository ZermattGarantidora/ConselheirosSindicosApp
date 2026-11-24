type ComposerInput = Pick<HTMLTextAreaElement, "disabled" | "focus">;

export function focusComposer(
  input: ComposerInput | null,
  state: Readonly<{ entered: boolean; overlayOpen: boolean }>
): void {
  if (!state.entered || state.overlayOpen || input === null || input.disabled) return;
  input.focus({ preventScroll: true });
}
