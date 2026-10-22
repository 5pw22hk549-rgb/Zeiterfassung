import { useState } from "react";
import { Hammer, Mail } from "lucide-react";
import { supabase } from "./supabaseClient";
import { BG_PAGE, BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, DANGER, SYSTEM_FONT } from "./lib/model";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLink = async (e) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex flex-col items-center gap-2 mb-1">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: ACCENT + "1F" }}
          >
            <Hammer size={26} style={{ color: ACCENT }} />
          </div>
          <span className="text-lg font-semibold">Zeiterfassung</span>
        </div>
        <p className="text-xs text-center" style={{ color: TEXT_MUTED }}>
          Anmeldung per E-Mail — kein Passwort nötig. Jede Person sieht nur ihre eigenen Daten.
        </p>

        {sent ? (
          <div className="text-sm text-center flex flex-col items-center gap-2 py-2">
            <Mail size={28} style={{ color: ACCENT }} />
            <span style={{ color: TEXT_MUTED }}>
              Link verschickt an <strong style={{ color: TEXT }}>{email}</strong>. Öffne die
              E-Mail und klicke auf den Anmelde-Link.
            </span>
            <button
              onClick={() => setSent(false)}
              className="text-xs mt-1"
              style={{ color: ACCENT }}
            >
              Andere E-Mail-Adresse verwenden
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-3">
            <label className="text-xs" style={{ color: TEXT_MUTED }}>
              E-Mail-Adresse
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
              className="w-full bg-transparent text-sm px-3 py-2.5 rounded-xl"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
            />
            {error && (
              <div className="text-xs" style={{ color: DANGER }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: ACCENT, color: "#FFFFFF", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Sende Link …" : "Anmelde-Link senden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
