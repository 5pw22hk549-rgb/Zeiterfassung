import { useState } from "react";
import { Hammer, Mail } from "lucide-react";
import { supabase } from "./supabaseClient";

const BG = "#000000";
const SURFACE = "#1C1C1E";
const BORDER = "#2C2C2E";
const TEXT = "#FFFFFF";
const TEXT_MUTED = "#8E8E93";
const ACCENT = "#0A84FF";
const DANGER = "#FF453A";
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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
      style={{ background: BG, color: TEXT, fontFamily: SYSTEM_FONT }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2 justify-center mb-1">
          <Hammer size={22} style={{ color: TEXT_MUTED }} />
          <span className="text-lg">Zeiterfassung</span>
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
              className="w-full bg-transparent text-sm px-3 py-2 rounded-md"
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
              className="py-2.5 rounded-md text-sm font-semibold"
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
