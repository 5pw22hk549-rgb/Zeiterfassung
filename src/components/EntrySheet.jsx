import { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import {
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  DANGER,
  BG_SURFACE,
  MONTAGE,
  TYPE_META,
  TYPE_ORDER,
  TIME_TYPES,
  BREAK_TYPES,
  FIXED_DAY_HOURS,
  calcHours,
  formatHours,
  formatDateKey,
  parseKey,
  MONTH_NAMES,
  HOLIDAY,
  holidayName,
  isWorkday,
  tripsForDay,
  stripEntry,
} from "../lib/model";
import { TimeSelect, MinuteSelect } from "./Pickers";

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

// Bewusst kein <label> um das Feld: auf iOS öffnet ein Tipp auf das Label die Auswahl
// sonst sofort wieder, nachdem man sie bestätigt hat.
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </div>
  );
}

function emptyDraft(settings) {
  const d = settings.defaults.arbeit;
  return {
    type: "arbeit",
    start: d.start,
    end: d.end,
    breaks: d.pause ? [d.pause] : [],
    activityId: "",
    activityNote: "",
  };
}

export default function EntrySheet({ dateKey, entry, settings, onClose, onSave, onDelete, onAddTrip, onEditTrip }) {
  const [draft, setDraft] = useState(entry ? { breaks: [], activityId: "", activityNote: "", ...entry } : emptyDraft(settings));

  const date = parseKey(dateKey);
  const title = `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  const holiday = holidayName(date);
  const workday = isWorkday(date, settings.workDaysPerWeek);
  // Urlaub/Krank nur an Soll-Arbeitstagen anbieten (bestehende Einträge bleiben sichtbar)
  const types = TYPE_ORDER.filter((t) => workday || (t !== "urlaub" && t !== "krank") || entry?.type === t);
  const trips = tripsForDay(settings.montagen, dateKey);

  const isTime = TIME_TYPES.includes(draft.type);
  const hasBreaks = BREAK_TYPES.includes(draft.type);

  const selectType = (type) => {
    if (type === draft.type) return; // erneutes Antippen setzt die Zeiten nicht zurück
    if (type === "arbeit" || type === "schule") {
      const d = settings.defaults[type];
      setDraft((s) => ({
        type,
        start: d.start,
        end: d.end,
        breaks: type === "arbeit" && d.pause ? [d.pause] : [],
        activityId: s.activityId || "",
        activityNote: s.activityNote || "",
      }));
    } else {
      setDraft({ type });
    }
  };

  const setBreak = (i, val) => setDraft((s) => ({ ...s, breaks: s.breaks.map((b, idx) => (idx === i ? val : b)) }));
  const addBreak = () => setDraft((s) => ({ ...s, breaks: [...(s.breaks || []), 15] }));
  const removeBreak = (i) => setDraft((s) => ({ ...s, breaks: s.breaks.filter((_, idx) => idx !== i) }));

  const previewHours = calcHours(draft, date, settings);
  let problem = "";
  if (isTime) {
    if (!draft.start || !draft.end) problem = "Bitte Start und Ende wählen.";
    else if (previewHours <= 0) problem = draft.start === draft.end ? "Start und Ende sind gleich." : "Die Pause ist länger als die Arbeitszeit.";
  }

  const save = () => {
    if (problem) return;
    const clean = { ...draft };
    if (hasBreaks) clean.breaks = (draft.breaks || []).map((b) => Number(b) || 0).filter((b) => b > 0);
    if (clean.activityId !== "sonstige" && "activityNote" in clean) clean.activityNote = "";
    onSave(stripEntry(clean));
    onClose();
  };

  const remove = () => {
    onDelete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="sheet-panel w-full max-w-md rounded-t-2xl p-4 overflow-y-auto" style={{ background: BG_SURFACE, borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold">{title}</span>
            {holiday && <span className="text-xs" style={{ color: HOLIDAY }}>Feiertag · {holiday}</span>}
          </div>
          <button onClick={onClose} aria-label="Schließen" className="p-2 -m-2"><X size={20} style={{ color: TEXT_MUTED }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => {
              const meta = TYPE_META[t];
              const active = draft.type === t;
              return (
                <button
                  key={t}
                  onClick={() => selectType(t)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{
                    background: active ? meta.color : "#1C1C1E",
                    color: active ? "#fff" : TEXT_MUTED,
                    border: `1px solid ${active ? meta.color : BORDER}`,
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          {(draft.type === "urlaub" || draft.type === "krank") && (
            <div className="text-xs rounded-lg px-3 py-2" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
              Wird pauschal mit {FIXED_DAY_HOURS} Stunden gezählt.
            </div>
          )}

          {isTime && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start">
                  <TimeSelect label="Start" value={draft.start} onChange={(v) => setDraft((s) => ({ ...s, start: v }))} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                </Field>
                <Field label="Ende">
                  <TimeSelect label="Ende" value={draft.end} onChange={(v) => setDraft((s) => ({ ...s, end: v }))} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                </Field>
              </div>

              {hasBreaks && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>Pausen (Min.)</span>
                    <button onClick={addBreak} className="text-xs flex items-center gap-1 py-1" style={{ color: ACCENT }}>
                      <Plus size={13} /> Pause
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(draft.breaks || []).length === 0 && <span className="text-xs" style={{ color: TEXT_MUTED }}>Keine Pause</span>}
                    {(draft.breaks || []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <MinuteSelect
                          label={`Pause ${i + 1} in Minuten`}
                          value={b}
                          onChange={(v) => setBreak(i, v)}
                          className="rounded-lg px-3 py-1.5 text-sm w-24"
                          style={inputStyle}
                        />
                        <button onClick={() => removeBreak(i)} aria-label="Pause entfernen" className="p-2 -m-1" style={{ color: DANGER }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draft.type === "arbeit" && (
                <>
                  <Field label="Tätigkeit (optional)">
                    <select
                      aria-label="Tätigkeit"
                      value={draft.activityId || ""}
                      onChange={(e) => setDraft((s) => ({ ...s, activityId: e.target.value }))}
                      className="rounded-lg px-3 py-2 text-sm min-w-0 w-full"
                      style={inputStyle}
                    >
                      <option value="">–</option>
                      {settings.activities.map((a) => (
                        <option key={a.id} value={a.id}>{a.label}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.activityId === "sonstige" && (
                    <input
                      aria-label="Welche Tätigkeit?"
                      value={draft.activityNote || ""}
                      onChange={(e) => setDraft((s) => ({ ...s, activityNote: e.target.value }))}
                      placeholder="Welche Tätigkeit?"
                      enterKeyHint="done"
                      className="rounded-lg px-3 py-2 text-sm min-w-0 w-full"
                      style={inputStyle}
                    />
                  )}
                </>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => onEditTrip(t)}
                className="text-xs px-2.5 py-1 rounded-xl text-left"
                style={{ background: MONTAGE + "26", color: MONTAGE }}
              >
                Montage{t.place ? ` · ${t.place}` : ""} · {formatDateKey(t.from).slice(0, 6)}–{formatDateKey(t.to)}
              </button>
            ))}
            <button onClick={() => onAddTrip(dateKey)} className="text-xs flex items-center gap-1 py-1" style={{ color: ACCENT }}>
              <Plus size={13} /> Montage mit Übernachtung
            </button>
          </div>

          <div className="text-xs text-center" style={{ color: problem ? DANGER : TEXT_MUTED, minHeight: 16 }}>
            {problem || (previewHours > 0 && `${formatHours(previewHours)} Stunden`)}
          </div>

          <div className="flex gap-2 mt-1">
            {entry && (
              <button onClick={remove} aria-label="Eintrag löschen" className="px-4 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${DANGER}55`, color: DANGER }}>
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}>
              Abbrechen
            </button>
            <button
              onClick={save}
              disabled={!!problem}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: ACCENT, color: "#fff", opacity: problem ? 0.5 : 1 }}
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
