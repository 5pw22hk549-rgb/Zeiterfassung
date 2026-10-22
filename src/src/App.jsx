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

  if (session === undefined) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{ background: "#000000", color: "#8E8E93" }}
      >
        Lade …
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <Zeiterfassung
      session={session}
      supabase={supabase}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}
