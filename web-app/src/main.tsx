import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

try {
  const savedTheme = window.localStorage.getItem("bookspace-theme");
  document.documentElement.dataset.theme =
    savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/bookspace">
      <App />
    </BrowserRouter>
  </StrictMode>
);
