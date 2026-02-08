import { createRoot } from "react-dom/client";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
