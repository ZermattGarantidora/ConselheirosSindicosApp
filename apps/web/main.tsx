import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { getInitialAppearance } from "./appearance.js";
import "./styles.css";

document.documentElement.dataset.theme = getInitialAppearance();
const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Elemento raiz da aplicação não encontrado.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
