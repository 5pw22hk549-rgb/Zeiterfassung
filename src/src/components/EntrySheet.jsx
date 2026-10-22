import { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import {
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  DANGER,
  BG_SURFACE,
  TYPE_META,
  TYPE_ORDER,
  TIME_TYPES,
  BREAK_TYPES,
  FIXED_DAY_HOURS,
  calcHours,
  formatHours,
  parseKey,
  MONTH_NAMES,
} from "../lib/model";

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </label>
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

export default function EntrySheet({ dateKey, entry, settings, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(entry ? { breaks: [], activityId: "", activityNote: "", ...entry } : emptyDraft(settings));

  const date = parseKey(dateKey);
  const title = `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

  const isTime = TIME_TYPES.includes(draft.type);
  const hasBreaks = BREAK_TYPES.includes(draft.type);

  const selectType = (type) => {
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

  const previewHours = isTime || draft.type === "urlaub" || draft.type === "krank" ? calcHours(draft) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-4 max-h-[88vh] overflow-y-auto" style={{ background: BG_SURFACE, borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold">{title}</span>
          <button onClick={onClose}><X size={20} style={{ color: TEXT_MUTED }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_ORDER.map((t) => {
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
                  <input type="time" value={draft.start} onChange={(e) => setDraft((s) => ({ ...s, start: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                </Field>
                <Field label="Ende">
                  <input type="time" value={draft.end} onChange={(e) => setDraft((s) => ({ ...s, end: e.target.value }))} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                </Field>
              </div>

              {hasBreaks && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: TEXT_MUTED }}>Pausen (Min.)</span>
                    <button onClick={addBreak} className="text-xs flex items-center gap-1" style={{ color: ACCENT }}>
                      <Plus size={13} /> Pause
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(draft.breaks || []).length === 0 && <span className="text-xs" style={{ color: TEXT_MUTED }}>Keine Pause</span>}
                    {(draft.breaks || []).map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={b}
                          onChange={(e) => setBreak(i, parseInt(e.target.value) || 0)}
                          className="rounded-lg px-3 py-1.5 text-sm w-24"
                          style={inputStyle}
                        />
                        <button onClick={() => removeBreak(i)} style={{ color: DANGER }}>
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
                      value={draft.activityId || ""}
                      onChange={(e) => setDraft((s) => ({ ...s, activityId: e.target.value }))}
                      className="rounded-lg px-3 py-2 text-sm"
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
                      value={draft.activityNote || ""}
                      onChange={(e) => setDraft((s) => ({ ...s, activityNote: e.target.value }))}
                      placeholder="Welche Tätigkeit?"
                      className="rounded-lg px-3 py-2 text-sm"
                      style={inputStyle}
                    />
                  )}
                </>
              )}
            </>
          )}

          <div className="text-xs text-center" style={{ color: TEXT_MUTED }}>
            {previewHours > 0 && `${formatHours(previewHours)} Stunden`}
          </div>

          <div className="flex gap-2 mt-1">
            {entry && (
              <button onClick={onDelete} className="px-4 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${DANGER}55`, color: DANGER }}>
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}>
              Abbrechen
            </button>
            <button onClick={() => onSave(draft)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: ACCENT, color: "#fff" }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
