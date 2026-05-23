import { useAppData } from "../../context/AppDataContext.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import LoginGate from "./LoginGate.jsx";
import OnboardingGate from "./OnboardingGate.jsx";

export default function EntryGate() {
  const { appData, updateAppData } = useAppData();
  const { loginOwner, loginWorker } = useSession();
  const settings = appData.settings || {};
  const workers = (appData.workers || []).filter((worker) => worker.active !== false && worker.id !== "owner");

  if (!settings.onboardingDone) {
    return <OnboardingGate settings={settings} updateAppData={updateAppData} />;
  }

  return <LoginGate settings={settings} workers={workers} loginOwner={loginOwner} loginWorker={loginWorker} />;
}
