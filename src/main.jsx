import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import { SessionProvider } from "./context/SessionContext.jsx";

import "./styles/themes.css";
import "./styles/themes-extra.css";
import "./styles/themes-extra-2.css";
import "./styles/global.css";
import "./styles/invoices.css";
import "./styles/signature.css";
import "./styles/navigation.css";
import "./styles/status.css";
import "./styles/dialog.css";
import "./styles/premium-animations.css";
import "../public/premium-materials.css";
import "../public/premium-punch.css";
import "../public/premium-invoices.css";
import "../public/premium-calendar.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppDataProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AppDataProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
