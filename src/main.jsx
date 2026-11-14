import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { IS_APP } from "./context.js";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(<App />);

// Saytda: internetsiz ishlash uchun service worker (Android ilovada fayllar allaqachon ichida)
if (!IS_APP && location.protocol.startsWith("http") && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
