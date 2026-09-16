import { describe, expect, it } from "vitest";

import { splitBoldText } from "../../apps/web/message-format.js";

describe("formatação das mensagens", () => {
  it("interpreta somente pares de asteriscos duplos como negrito", () => {
    expect(splitBoldText("Isole a área e use **luvas de proteção**.")).toEqual([
      { text: "Isole a área e use ", bold: false },
      { text: "luvas de proteção", bold: true },
      { text: ".", bold: false }
    ]);
  });

  it("mantém marcação incompleta como texto literal", () => {
    expect(splitBoldText("Use **luvas")).toEqual([{ text: "Use **luvas", bold: false }]);
  });
});
