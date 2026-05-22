import { useAppData } from "../../context/AppDataContext.jsx";

export default function Settings() {
  const { appData } = useAppData();
  const settings = appData.settings;

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Data ready</span>
        <h2>Settings</h2>
        <p>Local app settings and backup tools will live here.</p>
      </div>

      <div className="info-card">
        <h2>Local defaults</h2>
        <p>
          Region: {settings.region} | Currency: {settings.currency} | Time zone: {settings.timeZone}
        </p>
      </div>
    </section>
  );
}
