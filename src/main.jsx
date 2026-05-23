import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppDataProvider } from "./context/AppDataContext.jsx";

import "./styles/themes.css";
import "./styles/global.css";
import "./styles/invoices.css";
import "./styles/signature.css";
import "./styles/navigation.css";
import "./styles/status.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </React.StrictMode>
);
