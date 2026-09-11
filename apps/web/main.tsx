import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./styles.css";
import { SyntheticReview } from "./SyntheticReview.js";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Elemento raiz da aplicação não encontrado.");
}

const isSyntheticReview =
  new URLSearchParams(window.location.search).get("mode") === "synthetic-review";

createRoot(rootElement).render(
  <StrictMode>{isSyntheticReview ? <SyntheticReview /> : <App />}</StrictMode>
);
