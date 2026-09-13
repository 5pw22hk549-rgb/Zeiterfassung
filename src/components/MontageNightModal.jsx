import { useState } from "react";
import { X, Moon } from "lucide-react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, generateDateRange, newId } from "../lib/model";

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </label>
  );
}

export default function MontageNightModal({ settings, onClose, onApply }) {
  const [jobId, setJobId] = useState(settings.jobs[0]?.id || "");
  const [project, setProject] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [nightsOverride, setNightsOverride] = useState(null);

  const dayCount = start && end ? generateDateRange(start, end).length : 0;
  const nights = nightsOverride ?? Math.max(0, dayCount - 1);

  const apply = () => {
    if (!start || !end || nights <= 0) return;
    const days = generateDateRange(start, end).slice(0, nights);
    const entries = days.map((key) => ({
      key,
      entry: {
        id: newId(),
        jobId,
        type: "uebernachtung",
        project,
        nights: 1,
      },
    }));
    onApply(entries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-4" style={{ background: BG_SURFACE, borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold flex items-center gap-2">
            <Moon size={18} style={{ color: ACCENT }} /> Montage mit Übernachtung
          </span>
          <button onClick={onClose}><X size={20} style={{ color: TEXT_MUTED }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          {settings.jobs.length > 1 && (
            <Field label="Job">
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                {settings.jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Projekt / Baustelle">
            <input value={project} onChange={(e) => setProject(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="z.B. Baustelle Müller" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
            </Field>
            <Field label="Bis">
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
            </Field>
          </div>
          <Field label="Anzahl Übernachtungen">
            <input
              type="number"
              value={nights}
              onChange={(e) => setNightsOverride(parseInt(e.target.value) || 0)}
              className="rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            />
          </Field>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            Die normale Arbeitszeit für diese Tage trägst du weiterhin separat über den Tageseintrag ein –
            hier wird nur die Übernachtungs-Zulage hinterlegt.
          </p>

          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}>
              Abbrechen
            </button>
            <button onClick={apply} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: ACCENT, color: "#fff" }}>
              Übernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
