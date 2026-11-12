import { useEffect, useState } from "react";
import { Plus, Trash2, LogOut } from "lucide-react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, DANGER, newId } from "../lib/model";
import { TimeSelect, MinuteSelect } from "../components/Pickers";

// Bewusst kein <label> um das Feld (siehe EntrySheet): auf iOS öffnet sich die Auswahl sonst erneut.
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </div>
  );
}

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

// Zahlenfeld mit eigenem Text-Zwischenstand: Feld darf beim Tippen leer sein und zeigt
// kein "040" mehr. Übernommen wird nur ein gültiger Wert im erlaubten Bereich.
function NumberField({ label, value, onChange, suffix, min = 0, max = 999, integer = false }) {
  const show = (v) => String(v).replace(".", ",");
  const [text, setText] = useState(show(value));
  useEffect(() => {
    // Wert kam von außen (z. B. anderes Gerät) -> anzeigen; eigenen Tipp-Zwischenstand nicht überschreiben
    setText((t) => (parseNumber(t) === value ? t : show(value)));
  }, [value]);

  const handle = (raw) => {
    setText(raw);
    let n = parseNumber(raw);
    if (n === null) return;
    if (integer) n = Math.round(n);
    if (n >= min && n <= max) onChange(n);
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          aria-label={label}
          enterKeyHint="done"
          value={text}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => setText(show(value))}
          className="w-full min-w-0 rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
        {suffix && <span className="text-xs" style={{ color: TEXT_MUTED }}>{suffix}</span>}
      </div>
    </Field>
  );
}

function parseNumber(raw) {
  const t = String(raw).trim().replace(",", ".");
  if (!/^\d+(\.\d*)?$/.test(t)) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export default function SettingsView({ settings, setSettings, supabase, session, onLogout }) {
  const [email, setEmail] = useState(session?.user?.email || "");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const updateDefault = (type, patch) =>
    setSettings((s) => ({ ...s, defaults: { ...s.defaults, [type]: { ...s.defaults[type], ...patch } } }));
  const updateActivity = (id, label) =>
    setSettings((s) => ({ ...s, activities: s.activities.map((a) => (a.id === id ? { ...a, label } : a)) }));
  const addActivity = () =>
    setSettings((s) => ({ ...s, activities: [...s.activities, { id: newId(), label: "Neue Tätigkeit" }] }));
  const removeActivity = (id) =>
    setSettings((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }));

  const changeEmail = async () => {
    if (!email.trim() || email.trim() === session?.user?.email) return;
    setEmailBusy(true);
    setEmailStatus("");
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setEmailBusy(false);
    if (error) setEmailStatus("Fehler: " + error.message);
    else setEmailStatus("Bestätigungslink wurde an die neue Adresse gesendet. Deine Daten bleiben erhalten.");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 pb-6 pt-4 gap-4" style={{ color: TEXT }}>
      <div>
        <div className="text-xs mb-1" style={{ color: TEXT_MUTED }}>Name (für Export-Betreff)</div>
        <input
          value={settings.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Vor- und Nachname"
          aria-label="Name"
          enterKeyHint="done"
          autoComplete="name"
          className="w-full min-w-0 rounded-xl px-3 py-2.5 text-sm"
          style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      <div>
        <div className="text-xs mb-1" style={{ color: TEXT_MUTED }}>E-Mail-Adresse (Login)</div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-Mail-Adresse"
            enterKeyHint="done"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm"
            style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <button
            onClick={changeEmail}
            disabled={emailBusy}
            className="px-4 rounded-xl text-sm font-medium"
            style={{ background: ACCENT, color: "#fff", opacity: emailBusy ? 0.6 : 1 }}
          >
            Ändern
          </button>
        </div>
        {emailStatus && <div className="text-xs mt-1.5" style={{ color: TEXT_MUTED }}>{emailStatus}</div>}
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-sm font-semibold">Arbeitszeit</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Wochenstunden" value={settings.weeklyHours} onChange={(v) => update({ weeklyHours: v })} suffix="Std." max={80} />
          <NumberField label="Arbeitstage/Woche" value={settings.workDaysPerWeek} onChange={(v) => update({ workDaysPerWeek: v })} min={1} max={6} integer />
          <NumberField label="Urlaubstage/Jahr" value={settings.vacationDaysPerYear} onChange={(v) => update({ vacationDaysPerYear: v })} max={60} />
        </div>

        <div className="text-xs font-semibold mt-1" style={{ color: TEXT_MUTED }}>Standardzeiten</div>
        <div className="grid grid-cols-3 gap-2 items-end">
          <span className="text-xs col-span-3 -mb-1" style={{ color: TEXT_MUTED }}>Arbeiten</span>
          <Field label="Start">
            <TimeSelect label="Arbeiten Start" value={settings.defaults.arbeit.start} onChange={(v) => updateDefault("arbeit", { start: v })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
          </Field>
          <Field label="Ende">
            <TimeSelect label="Arbeiten Ende" value={settings.defaults.arbeit.end} onChange={(v) => updateDefault("arbeit", { end: v })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
          </Field>
          <Field label="Pause (Min)">
            <MinuteSelect label="Arbeiten Pause in Minuten" allowZero value={settings.defaults.arbeit.pause} onChange={(v) => updateDefault("arbeit", { pause: v })} className="rounded-lg px-2 py-1.5 text-sm w-full" style={inputStyle} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2 items-end">
          <span className="text-xs col-span-2 -mb-1" style={{ color: TEXT_MUTED }}>Schule</span>
          <Field label="Start">
            <TimeSelect label="Schule Start" value={settings.defaults.schule.start} onChange={(v) => updateDefault("schule", { start: v })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
          </Field>
          <Field label="Ende">
            <TimeSelect label="Schule Ende" value={settings.defaults.schule.end} onChange={(v) => updateDefault("schule", { end: v })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
          </Field>
        </div>

        <div className="text-xs font-semibold mt-1" style={{ color: TEXT_MUTED }}>Tätigkeiten</div>
        <div className="flex flex-col gap-1.5">
          {settings.activities.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <input
                value={a.label}
                onChange={(e) => updateActivity(a.id, e.target.value)}
                disabled={a.id === "sonstige"}
                aria-label="Tätigkeit"
                enterKeyHint="done"
                className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-sm"
                style={inputStyle}
              />
              {a.id !== "sonstige" && (
                <button onClick={() => removeActivity(a.id)} aria-label="Tätigkeit entfernen" className="p-2 -m-1" style={{ color: DANGER }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addActivity} className="text-xs flex items-center gap-1 mt-1" style={{ color: ACCENT }}>
            <Plus size={14} /> Tätigkeit hinzufügen
          </button>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-full rounded-xl py-3 flex items-center justify-center gap-2 font-medium text-sm mt-2"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, color: DANGER }}
      >
        <LogOut size={16} /> Abmelden
      </button>
    </div>
  );
}
