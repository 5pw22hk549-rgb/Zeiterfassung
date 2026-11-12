import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import Zeiterfassung from "./Zeiterfassung";

export default function App() {
  // undefined = wird noch geprüft, null = kein Login, Objekt = eingeloggt
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Handy: Nach dem Schließen von Tastatur/Auswahl lässt iOS die Seite gern ein Stück
  // verschoben stehen. Sobald kein Eingabefeld mehr aktiv ist, wieder sauber ausrichten.
  // Außerdem: Enter/"Fertig" auf der Tastatur verlässt das Feld.
  useEffect(() => {
    const isField = (el) => el instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    let timer;
    const onFocusOut = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isField(document.activeElement)) window.scrollTo(0, 0);
      }, 80);
    };
    const onKeyDown = (e) => {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement && !e.target.form) e.target.blur();
    };
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (session === undefined) {
    return (
      <div
        className="app-shell w-full flex items-center justify-center"
        style={{ background: "#000000", color: "#8E8E93" }}
      >
        Lädt …
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <Zeiterfassung
      key={session.user.id}
      session={session}
      supabase={supabase}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}
