import { useState } from "react";
import { Plus, Trash2, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, DANGER, createDefaultJob, MONTAGE_LEVELS, DEFAULT_ACTIVITIES, newId } from "../lib/model";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

function NumberField({ label, value, onChange, step = 1, suffix }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
        {suffix && <span className="text-xs" style={{ color: TEXT_MUTED }}>{suffix}</span>}
      </div>
    </Field>
  );
}

function JobEditor({ job, onChange, onDelete, canDelete }) {
  const [open, setOpen] = useState(false);
  const update = (patch) => onChange({ ...job, ...patch });
  const updateDefault = (type, patch) =>
    update({ defaults: { ...job.defaults, [type]: { ...job.defaults[type], ...patch } } });
  const updateActivity = (id, label) =>
    update({ activities: job.activities.map((a) => (a.id === id ? { ...a, label } : a)) });
  const addActivity = () =>
    update({ activities: [...job.activities, { id: newId(), label: "Neue Tätigkeit" }] });
  const removeActivity = (id) => update({ activities: job.activities.filter((a) => a.id !== id) });

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">{job.name || "Job"}</span>
        {open ? <ChevronUp size={18} style={{ color: TEXT_MUTED }} /> : <ChevronDown size={18} style={{ color: TEXT_MUTED }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <Field label="Name">
            <input
              value={job.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm mt-1"
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Wochenstunden" value={job.weeklyHours} onChange={(v) => update({ weeklyHours: v })} suffix="Std." />
            <NumberField label="Arbeitstage/Woche" value={job.workDaysPerWeek} onChange={(v) => update({ workDaysPerWeek: v })} />
            <NumberField label="Urlaubstage/Jahr" value={job.vacationDaysPerYear} onChange={(v) => update({ vacationDaysPerYear: v })} />
            <NumberField label="Übernachtungs-Zulage" value={job.overnightRate} onChange={(v) => update({ overnightRate: v })} step={0.5} suffix="€" />
          </div>

          <div className="text-xs font-semibold mt-1" style={{ color: TEXT_MUTED }}>Montage-Zulagen</div>
          <div className="grid grid-cols-3 gap-2">
            {MONTAGE_LEVELS.map((lvl) => (
              <NumberField
                key={lvl.id}
                label={lvl.label}
                value={job.montageRates[lvl.id]}
                onChange={(v) => update({ montageRates: { ...job.montageRates, [lvl.id]: v } })}
                step={0.5}
                suffix="€"
              />
            ))}
          </div>

          <div className="text-xs font-semibold mt-1" style={{ color: TEXT_MUTED }}>Standardzeiten</div>
          {["arbeit", "fahrtzeit", "schule"].map((type) => (
            <div key={type} className="grid grid-cols-3 gap-2 items-end">
              <span className="text-xs col-span-3 -mb-1" style={{ color: TEXT_MUTED }}>
                {type === "arbeit" ? "Arbeiten" : type === "fahrtzeit" ? "Fahrtzeit" : "Schule"}
              </span>
              <Field label="Start">
                <input type="time" value={job.defaults[type].start} onChange={(e) => updateDefault(type, { start: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
              </Field>
              <Field label="Ende">
                <input type="time" value={job.defaults[type].end} onChange={(e) => updateDefault(type, { end: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
              </Field>
              <Field label="Pause (Min)">
                <input type="number" value={job.defaults[type].pause} onChange={(e) => updateDefault(type, { pause: parseInt(e.target.value) || 0 })} className="rounded-lg px-2 py-1.5 text-sm" style={inputStyle} />
              </Field>
            </div>
          ))}

          <div className="text-xs font-semibold mt-1" style={{ color: TEXT_MUTED }}>Tätigkeiten</div>
          <div className="flex flex-col gap-1.5">
            {job.activities.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <input
                  value={a.label}
                  onChange={(e) => updateActivity(a.id, e.target.value)}
                  disabled={a.id === "sonstige"}
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm"
                  style={inputStyle}
                />
                {a.id !== "sonstige" && (
                  <button onClick={() => removeActivity(a.id)} style={{ color: DANGER }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addActivity} className="text-xs flex items-center gap-1 mt-1" style={{ color: ACCENT }}>
              <Plus size={14} /> Tätigkeit hinzufügen
            </button>
          </div>

          {canDelete && (
            <button
              onClick={onDelete}
              className="text-xs flex items-center gap-1 mt-2 justify-center py-2 rounded-lg"
              style={{ color: DANGER, border: `1px solid ${DANGER}55` }}
            >
              <Trash2 size={14} /> Job löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsView({ settings, setSettings, supabase, session, onLogout }) {
  const [email, setEmail] = useState(session?.user?.email || "");
  const [emailStatus, setEmailStatus] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const updateJob = (id, patch) =>
    setSettings((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? patch : j)) }));
  const deleteJob = (id) =>
    setSettings((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== id) }));
  const addJob = () =>
    setSettings((s) => ({ ...s, jobs: [...s.jobs, createDefaultJob(`Job ${s.jobs.length + 1}`)] }));

  const changeEmail = async () => {
    if (!email || email === session?.user?.email) return;
    setEmailBusy(true);
    setEmailStatus("");
    const { error } = await supabase.auth.updateUser({ email });
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
          onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
          placeholder="Vor- und Nachname"
          className="w-full rounded-xl px-3 py-2.5 text-sm"
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
            className="flex-1 rounded-xl px-3 py-2.5 text-sm"
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Jobs</span>
          <button onClick={addJob} className="text-xs flex items-center gap-1" style={{ color: ACCENT }}>
            <Plus size={14} /> Job hinzufügen
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {settings.jobs.map((job) => (
            <JobEditor
              key={job.id}
              job={job}
              onChange={(patch) => updateJob(job.id, patch)}
              onDelete={() => deleteJob(job.id)}
              canDelete={settings.jobs.length > 1}
            />
          ))}
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
