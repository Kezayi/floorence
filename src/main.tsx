import { createRoot } from "react-dom/client";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('[SW] Registered:', reg.scope),
      (err) => console.warn('[SW] Registration failed:', err)
    );
  });
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
