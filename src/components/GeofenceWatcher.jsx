import { useEffect, useRef, useState } from "react";

import { useAppData } from "../context/AppDataContext.jsx";
import { minutesBetween } from "../utils/dates.js";
import { checkGeofence, DEFAULT_PUNCH_RADIUS_METERS, hasGpsPoint } from "../utils/geofence.js";

export default function GeofenceWatcher() {
  const { appData, updateAppData } = useAppData();
  const [notice, setNotice] = useState("");
  const watchIdRef = useRef(null);
  const activePunch = appData.activePunch || null;
  const settings = appData.settings || {};
  const enabled = settings.geofenceEnabled !== false;
  const target = activePunch ? { latitude: activePunch.jobLatitude, longitude: activePunch.jobLongitude } : null;
  const radiusMeters = Number(activePunch?.geofenceRadiusMeters || settings.geofenceRadiusMeters || DEFAULT_PUNCH_RADIUS_METERS);

  useEffect(() => {
    if (!enabled || !activePunch || !hasGpsPoint(target) || !navigator.geolocation) {
      if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setNotice("");
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const currentPosition = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const result = checkGeofence({ target, position: currentPosition, radiusMeters });
        const meters = result.distance === null ? "" : `${Math.round(result.distance)} m`;

        updateAppData((currentData) => {
          const punch = currentData.activePunch;
          if (!punch || punch.id !== activePunch.id) return currentData;
          const isAutoPaused = Boolean(punch.geofenceAutoPaused);
          const isOnBreak = Boolean(punch.currentBreakStartedAt);

          if (!result.allowed && !isOnBreak) {
            setNotice(`Hors zone chantier (${meters}). Punch mis en pause automatiquement.`);
            return {
              ...currentData,
              activePunch: {
                ...punch,
                currentBreakStartedAt: new Date().toISOString(),
                geofenceAutoPaused: true,
                lastGeoCheck: { ...currentPosition, distanceMeters: result.distance, checkedAt: new Date().toISOString(), allowed: false }
              }
            };
          }

          if (result.allowed && isAutoPaused && isOnBreak) {
            const endedAt = new Date().toISOString();
            const autoBreak = { id: `geo-break-${Date.now()}`, startedAt: punch.currentBreakStartedAt, endedAt, minutes: minutesBetween(punch.currentBreakStartedAt, endedAt), type: "geofence-auto" };
            setNotice(`Retour dans la zone chantier (${meters}). Punch repris automatiquement.`);
            return {
              ...currentData,
              activePunch: {
                ...punch,
                currentBreakStartedAt: null,
                breaks: [...(punch.breaks || []), autoBreak],
                geofenceAutoPaused: false,
                lastGeoCheck: { ...currentPosition, distanceMeters: result.distance, checkedAt: endedAt, allowed: true }
              }
            };
          }

          return {
            ...currentData,
            activePunch: {
              ...punch,
              lastGeoCheck: { ...currentPosition, distanceMeters: result.distance, checkedAt: new Date().toISOString(), allowed: result.allowed }
            }
          };
        });
      },
      () => setNotice("GPS non disponible. La géofence ne peut pas vérifier la zone."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [enabled, activePunch?.id, activePunch?.jobLatitude, activePunch?.jobLongitude, radiusMeters]);

  if (!notice) return null;
  return <div className="app-status geofence-status"><span>GPS chantier</span><small>{notice}</small></div>;
}
