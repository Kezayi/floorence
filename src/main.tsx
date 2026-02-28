import { createRoot } from "react-dom/client";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for offline support (with one-time stale-cache reset)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const RESET_KEY = 'floorence-sw-reset-v4';

    if (!localStorage.getItem(RESET_KEY)) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith('floorence-')).map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.warn('[SW] Reset failed:', err);
      } finally {
        localStorage.setItem(RESET_KEY, '1');
        window.location.reload();
        return;
      }
    }

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
