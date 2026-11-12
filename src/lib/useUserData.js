import { useEffect, useState, useSyncExternalStore } from "react";
import { DataSync } from "./sync";

const LOADING = { status: "loading", entries: {}, settings: {}, saveState: "saved" };
const noopSubscribe = () => () => {};
const getLoading = () => LOADING;

// Bindet die Sync-Logik an React und an die Browser-Ereignisse
// (Tab wieder sichtbar / wieder online -> neu abgleichen, Tab verlassen -> sofort speichern).
export function useUserData(supabase, userId) {
  const [sync, setSync] = useState(null);

  useEffect(() => {
    const s = new DataSync({ supabase, userId });
    setSync(s);
    s.syncNow();

    const onVisibility = () => {
      if (document.visibilityState === "visible") s.refreshIfStale();
      else if (s.isDirty()) s.syncNow(); // vor dem Wegwischen noch schnell speichern
    };
    const onOnline = () => s.syncNow();
    const onFocus = () => s.refreshIfStale();
    const onPageHide = () => {
      if (s.isDirty()) s.syncNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      s.dispose();
      setSync(null);
    };
  }, [supabase, userId]);

  const snap = useSyncExternalStore(sync ? sync.subscribe : noopSubscribe, sync ? sync.getSnapshot : getLoading);

  return {
    ...snap,
    setEntries: (fn) => sync?.setEntries(fn),
    setSettings: (fn) => sync?.setSettings(fn),
    retry: () => sync?.syncNow(),
  };
}
