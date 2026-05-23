import { useEffect, useState } from "react";

export default function AppStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div className={isOnline ? "app-status online" : "app-status offline"}>
      <span>{isOnline ? "Online" : "Offline mode"}</span>
      <small>{isOnline ? "Local data saved on this device" : "You can keep working locally"}</small>
    </div>
  );
}
