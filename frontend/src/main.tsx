import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { DEMO } from "./demo/ativo.ts";

if (DEMO) {
  document.title = "Amparo • Demonstração";
  document.querySelector('meta[name="description"]')?.setAttribute("content", "Demonstração do Amparo com casos e respostas fictícios. Nenhum modelo ou serviço externo é executado.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
