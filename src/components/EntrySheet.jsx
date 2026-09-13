import { useState } from "react";
import { X, Plus, Trash2, Pencil } from "lucide-react";
import {
  BG_SURFACE,
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  DANGER,
  TYPE_META,
  TYPE_ORDER,
  TIME_TYPES,
  BREAK_TYPES,
  MONTAGE_LEVELS,
  calcHours,
  formatHours,
  newId,
  parseKey,
  MONTH_NAMES,
  jobById,
} from "../lib/model";

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

function Field({ label, children, className = "" }) {
  return (
    <label className={"flex flex-col gap-1 " + className}>
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </label>
  );
}

function emptyDraft(job) {
  return {
    id: newId(),
    jobId: job?.id || "",
    type: "arbeit",
    start: job?.defaults?.arbeit?.start || "07:00",
    end: job?.defaults?.arbeit?.end || "15:45",
    breaks: job?.defaults?.arbeit?.pause ? [job.defaults.arbeit.pause] : [],
    project: "",
    activityId: "",
    activityNote: "",
    montage: { on: false, level: "unter8" },
  };
}

function EntryForm({ draft, setDraft, settings, onCancel, onSave }) {
  const job = jobById(settings, draft.jobId) || settings.jobs[0];
  const isTime = TIME_TYPES.includes(draft.type);
  const hasBreaks = BREAK_TYPES.includes(draft.type);
  const hasProjectActivity = BREAK_TYPES.includes(draft.type);
  const hasMontage = draft.type === "arbeit";

  const applyDefaults = (type, jobId) => {
    const j = jobById(settings, jobId);
    const d = j?.defaults?.[type];
    const breakable = BREAK_TYPES.includes(type);
    if (d) setDraft((s) => ({ ...s, type, jobId, start: d.start, end: d.end, breaks: breakable && d.pause ? [d.pause] : [] }));
    else setDraft((s) => ({ ...s, type, jobId }));
  };

  const setBreak = (i, val) =>
    setDraft((s) => ({ ...s, breaks: s.breaks.map((b, idx) => (idx === i ? val : b)) }));
  const addBreak = () => setDraft((s) => ({ ...s, breaks: [...s.breaks, 15] }));
  const removeBreak = (i) => setDraft((s) => ({ ...s, breaks: s.breaks.filter((_, idx) => idx !== i) }));

  return (
    <div className="flex flex-col gap-3">
      {settings.jobs.length > 1 && (
        <Field label="Job">
          <select
            value={draft.jobId}
            onChange={(e) => applyDefaults(draft.type, e.target.value)}
            className="rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
          >
            {settings.jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TYPE_ORDER.map((t) => {
          const meta = TYPE_META[t];
          const active = draft.type === t;
          return (
            <button
              key={t}
              onClick={() => applyDefaults(t, draft.jobId)}
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
                {draft.breaks.length === 0 && <span className="text-xs" style={{ color: TEXT_MUTED }}>Keine Pause</span>}
                {draft.breaks.map((b, i) => (
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

          {hasProjectActivity && (
            <>
              <Field label="Projekt (frei, optional)">
                <input
                  value={draft.project}
                  onChange={(e) => setDraft((s) => ({ ...s, project: e.target.value }))}
                  placeholder="z.B. Baustelle Müller"
                  className="rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </Field>

              <Field label="Tätigkeit (optional)">
                <select
                  value={draft.activityId}
                  onChange={(e) => setDraft((s) => ({ ...s, activityId: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                >
                  <option value="">–</option>
                  {job?.activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </Field>
              {draft.activityId === "sonstige" && (
                <input
                  value={draft.activityNote}
                  onChange={(e) => setDraft((s) => ({ ...s, activityNote: e.target.value }))}
                  placeholder="Welche Tätigkeit?"
                  className="rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                />
              )}
            </>
          )}

          {hasMontage && (
            <div className="rounded-lg p-3" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}` }}>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={draft.montage.on}
                  onChange={(e) => setDraft((s) => ({ ...s, montage: { ...s.montage, on: e.target.checked } }))}
                />
                Montage-Zulage
              </label>
              {draft.montage.on && (
                <div className="flex gap-1.5">
                  {MONTAGE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setDraft((s) => ({ ...s, montage: { ...s.montage, level: lvl.id } }))}
                      className="text-xs px-2.5 py-1.5 rounded-full"
                      style={{
                        background: draft.montage.level === lvl.id ? ACCENT : "#2C2C2E",
                        color: draft.montage.level === lvl.id ? "#fff" : TEXT_MUTED,
                      }}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}>
          Abbrechen
        </button>
        <button onClick={onSave} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: ACCENT, color: "#fff" }}>
          Speichern
        </button>
      </div>
    </div>
  );
}

export default function EntrySheet({ dateKey, dayEntries, settings, onClose, onSaveEntry, onDeleteEntry }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const date = parseKey(dateKey);
  const title = `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

  const startAdd = () => {
    setEditingId("new");
    setDraft(emptyDraft(settings.jobs[0]));
  };
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setDraft({ montage: { on: false, level: "unter8" }, ...entry });
  };
  const cancelForm = () => {
    setEditingId(null);
    setDraft(null);
  };
  const save = () => {
    onSaveEntry(draft);
    cancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md rounded-t-2xl p-4 max-h-[88vh] overflow-y-auto"
        style={{ background: BG_SURFACE, borderTop: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold">{title}</span>
          <button onClick={onClose}><X size={20} style={{ color: TEXT_MUTED }} /></button>
        </div>

        {editingId ? (
          <EntryForm draft={draft} setDraft={setDraft} settings={settings} onCancel={cancelForm} onSave={save} />
        ) : (
          <div className="flex flex-col gap-2">
            {dayEntries.length === 0 && (
              <div className="text-sm text-center py-4" style={{ color: TEXT_MUTED }}>Keine Einträge</div>
            )}
            {dayEntries.map((e) => {
              const meta = TYPE_META[e.type] || {};
              const job = jobById(settings, e.jobId);
              const isTime = TIME_TYPES.includes(e.type);
              return (
                <div key={e.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}` }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meta.label || e.type}{job && settings.jobs.length > 1 ? ` · ${job.name}` : ""}</div>
                    <div className="text-xs" style={{ color: TEXT_MUTED }}>
                      {isTime ? `${e.start}–${e.end} · ${formatHours(calcHours(e))} Std.` : ""}
                      {e.project ? ` · ${e.project}` : ""}
                    </div>
                  </div>
                  <button onClick={() => startEdit(e)} style={{ color: ACCENT }}><Pencil size={16} /></button>
                  <button onClick={() => onDeleteEntry(e.id)} style={{ color: DANGER }}><Trash2 size={16} /></button>
                </div>
              );
            })}
            <button
              onClick={startAdd}
              className="rounded-xl py-2.5 mt-1 flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: ACCENT, color: "#fff" }}
            >
              <Plus size={16} /> Eintrag hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
