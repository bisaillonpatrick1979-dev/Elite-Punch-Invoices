import { useEffect, useMemo, useState } from "react";

import AppStatus from "./components/AppStatus.jsx";
import { useAppData } from "./context/AppDataContext.jsx";
import { useSession } from "./context/SessionContext.jsx";
import { readLocalValue, writeLocalValue } from "./db/storage.js";
import { getTranslations } from "./i18n/index.js";

import HomeRouter from "./modules/home/HomeRouter.jsx";
import Punch from "./modules/punch/Punch.jsx";
import Calendar from "./modules/calendar/Calendar.jsx";
import Invoices from "./modules/invoices/Invoices.jsx";
import Clients from "./modules/clients/Clients.jsx";
import Employees from "./modules/employees/Employees.jsx";
import Payroll from "./modules/payroll/Payroll.jsx";
import Catalog from "./modules/catalog/Catalog.jsx";
import Accounting from "./modules/accounting/Accounting.jsx";
import Settings from "./modules/settings/Settings.jsx";
import DevTools from "./modules/devtools/DevTools.jsx";
import EntryGate from "./modules/home/EntryGate.jsx";
import WorkerOptions from "./modules/worker/WorkerOptions.jsx";
import WorkerInvoices from "./modules/worker/WorkerInvoices.jsx";

const allTabs = [
  { id: "dashboard", icon: "⌂", component: HomeRouter, roles: ["owner", "worker"] },
  { id: "punch", icon: "⏱", component: Punch, roles: ["owner", "worker"] },
  { id: "calendar", icon: "▣", component: Calendar, roles: ["owner", "worker"] },
  { id: "payroll", icon: "$", component: Payroll, roles: ["owner", "worker"] },
  { id: "workerInvoices", icon: "▤", component: WorkerInvoices, roles: ["worker"] },
  { id: "workerOptions", icon: "⚙", component: WorkerOptions, roles: ["worker"] },
  { id: "invoices", icon: "▤", component: Invoices, roles: ["owner"] },
  { id: "clients", icon: "◇", component: Clients, roles: ["owner"] },
  { id: "employees", icon: "👷", component: Employees, roles: ["owner"] },
  { id: "catalog", icon: "◫", component: Catalog, roles: ["owner"] },
  { id: "accounting", icon: "▦", component: Accounting, roles: ["owner"] },
  { id: "settings", icon: "⚙", component: Settings, roles: ["owner"] },
  { id: "devtools", icon: "🛠", component: DevTools, roles: ["owner"] }
];

const themes = [
  { id: "carbon-gold", label: "Carbon Gold" },
  { id: "arctic-ledger", label: "Arctic Ledger" },
  { id: "storm-steel", label: "Storm Steel" }
];

function getTabLabel(tab, t) {
  if (tab.id === "dashboard") return "Accueil";
  if (tab.id === "workerOptions") return "Mes options";
  if (tab.id === "workerInvoices") return "Mes factures";
  if (tab.id === "devtools") return "Dev";
  return t.tabs[tab.id] || tab.id;
}

export default function App() {
  const { appData } = useAppData();
  const { mode, isSelecting, logout } = useSession();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setThemeState] = useState(() => readLocalValue("theme", "carbon-gold"));
  const [language, setLanguageState] = useState(() => readLocalValue("language", "fr"));
  const t = useMemo(() => getTranslations(language), [language]);
  const tabs = useMemo(() => allTabs.filter((tab) => tab.roles.includes(mode)), [mode]);
  const currentTab = useMemo(() => tabs.find((tab) => tab.id === activeTab) || tabs[0], [activeTab, tabs]);
  const setTheme = (nextTheme) => { setThemeState(nextTheme); writeLocalValue("theme", nextTheme); };
  const setLanguage = (nextLanguage) => { setLanguageState(nextLanguage); writeLocalValue("language", nextLanguage); };

  useEffect(() => {
    const savedLanguage = appData.settings?.language;
    if (savedLanguage && savedLanguage !== language) setLanguage(savedLanguage);
  }, [appData.settings?.language, language]);

  if (isSelecting) {
    return <div className="app-shell" data-theme={theme}><main className="app-main"><EntryGate /></main></div>;
  }

  const ActiveComponent = currentTab.component;
  const currentLabel = getTabLabel(currentTab, t);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-header clean-header">
        <div><p className="eyebrow">Elite Punch Invoice</p><h1>{currentLabel}</h1></div>
        <div className="top-controls compact-controls"><button className="secondary-action" type="button" onClick={logout}>Sortir</button><label className="theme-picker"><span>{t.language}</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="fr">FR</option><option value="en">EN</option></select></label><label className="theme-picker"><span>{t.theme}</span><select value={theme} onChange={(event) => setTheme(event.target.value)}>{themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
      </header>
      <main className="app-main"><AppStatus /><ActiveComponent t={t} language={language} /></main>
      <nav className="bottom-tabs scroll-tabs" aria-label="Navigation principale">{tabs.map((tab) => { const isActive = tab.id === currentTab.id; const label = getTabLabel(tab, t); return <button key={tab.id} type="button" className={isActive ? "tab-button active" : "tab-button"} onClick={() => setActiveTab(tab.id)} aria-current={isActive ? "page" : undefined}><span className="tab-icon">{tab.icon}</span><span className="tab-label">{label}</span></button>; })}</nav>
    </div>
  );
}
