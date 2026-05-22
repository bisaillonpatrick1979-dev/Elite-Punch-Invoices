import { useMemo, useState } from "react";

import Dashboard from "./modules/dashboard/Dashboard.jsx";
import Punch from "./modules/punch/Punch.jsx";
import Invoices from "./modules/invoices/Invoices.jsx";
import Employees from "./modules/employees/Employees.jsx";
import Payroll from "./modules/payroll/Payroll.jsx";
import Catalog from "./modules/catalog/Catalog.jsx";
import Accounting from "./modules/accounting/Accounting.jsx";
import Settings from "./modules/settings/Settings.jsx";

const tabs = [
  { id: "dashboard", label: "Accueil", icon: "⌂", component: Dashboard },
  { id: "punch", label: "Punch", icon: "⏱", component: Punch },
  { id: "invoices", label: "Factures", icon: "▤", component: Invoices },
  { id: "employees", label: "Employés", icon: "👷", component: Employees },
  { id: "payroll", label: "Payes", icon: "$", component: Payroll },
  { id: "catalog", label: "Catalogue", icon: "◫", component: Catalog },
  { id: "accounting", label: "Comptabilité", icon: "▦", component: Accounting },
  { id: "settings", label: "Réglages", icon: "⚙", component: Settings }
];

const themes = [
  { id: "carbon-gold", label: "Carbon Gold" },
  { id: "arctic-ledger", label: "Arctic Ledger" },
  { id: "storm-steel", label: "Storm Steel" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("carbon-gold");

  const currentTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) || tabs[0];
  }, [activeTab]);

  const ActiveComponent = currentTab.component;

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Elite Punch Invoice</p>
          <h1>{currentTab.label}</h1>
        </div>

        <label className="theme-picker">
          <span>Thème</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            {themes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="app-main">
        <ActiveComponent />
      </main>

      <nav className="bottom-tabs" aria-label="Navigation principale">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
