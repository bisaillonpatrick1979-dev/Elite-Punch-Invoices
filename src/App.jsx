import { useMemo, useState } from "react";

import { readLocalValue, writeLocalValue } from "./db/storage.js";
import { getTranslations } from "./i18n/index.js";

import Dashboard from "./modules/dashboard/Dashboard.jsx";
import Punch from "./modules/punch/Punch.jsx";
import Calendar from "./modules/calendar/Calendar.jsx";
import Invoices from "./modules/invoices/Invoices.jsx";
import Clients from "./modules/clients/Clients.jsx";
import Employees from "./modules/employees/Employees.jsx";
import Payroll from "./modules/payroll/Payroll.jsx";
import Catalog from "./modules/catalog/Catalog.jsx";
import Accounting from "./modules/accounting/Accounting.jsx";
import Settings from "./modules/settings/Settings.jsx";

const tabs = [
  { id: "dashboard", icon: "⌂", component: Dashboard },
  { id: "punch", icon: "⏱", component: Punch },
  { id: "calendar", icon: "▣", component: Calendar },
  { id: "invoices", icon: "▤", component: Invoices },
  { id: "clients", icon: "◇", component: Clients },
  { id: "employees", icon: "👷", component: Employees },
  { id: "payroll", icon: "$", component: Payroll },
  { id: "catalog", icon: "◫", component: Catalog },
  { id: "accounting", icon: "▦", component: Accounting },
  { id: "settings", icon: "⚙", component: Settings }
];

const themes = [
  { id: "carbon-gold", label: "Carbon Gold" },
  { id: "arctic-ledger", label: "Arctic Ledger" },
  { id: "storm-steel", label: "Storm Steel" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setThemeState] = useState(() => readLocalValue("theme", "carbon-gold"));
  const [language, setLanguageState] = useState(() => readLocalValue("language", "fr"));

  const t = useMemo(() => getTranslations(language), [language]);

  const currentTab = useMemo(() => tabs.find((tab) => tab.id === activeTab) || tabs[0], [activeTab]);

  const setTheme = (nextTheme) => {
    setThemeState(nextTheme);
    writeLocalValue("theme", nextTheme);
  };

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    writeLocalValue("language", nextLanguage);
  };

  const ActiveComponent = currentTab.component;
  const currentLabel = t.tabs[currentTab.id] || currentTab.id;

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-header">
        <div>
          <p className="eyebrow">{t.appName}</p>
          <h1>{currentLabel}</h1>
        </div>

        <div className="top-controls">
          <label className="theme-picker">
            <span>{t.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
          </label>

          <label className="theme-picker">
            <span>{t.theme}</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="app-main">
        <ActiveComponent t={t} language={language} />
      </main>

      <nav className="bottom-tabs" aria-label="Navigation principale">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const label = t.tabs[tab.id] || tab.id;
          return (
            <button key={tab.id} type="button" className={isActive ? "tab-button active" : "tab-button"} onClick={() => setActiveTab(tab.id)} aria-current={isActive ? "page" : undefined}>
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
