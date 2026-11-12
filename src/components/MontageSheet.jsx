import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import {
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  DANGER,
  BG_SURFACE,
  isDateKey,
  nightsBetween,
  findOverlappingTrip,
  formatDateKey,
  keyOf,
  parseKey,
  newId,
} from "../lib/model";

const inputStyle = { background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT };

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </div>
  );
}

function nextDayKey(key) {
  const d = parseKey(key);
  d.setDate(d.getDate() + 1);
  return keyOf(d);
}

// Montage mit Übernachtung: nur von wann bis wann und wo – reine Dokumentation.
// `trip` = bestehende Montage (bearbeiten) oder null (neu, Start = startKey).
export default function MontageSheet({ trip, startKey, trips, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(
    trip ? { ...trip } : { id: newId(), from: startKey, to: nextDayKey(startKey), place: "" }
  );

  const setFrom = (from) =>
    setDraft((s) => {
      // Rückkehr mitziehen, wenn sie sonst vor/auf der Abfahrt läge
      const to = isDateKey(from) && isDateKey(s.to) && s.to <= from ? nextDayKey(from) : s.to;
      return { ...s, from, to };
    });

  const datesOk = isDateKey(draft.from) && isDateKey(draft.to);
  const nights = datesOk ? nightsBetween(draft.from, draft.to) : 0;
  const place = draft.place.trim();
  const overlap = datesOk && nights > 0 ? findOverlappingTrip(trips, draft) : null;

  const [tried, setTried] = useState(false);

  // Datumsfehler sofort zeigen; der fehlende Ort erst, wenn man speichern wollte.
  let problem = "";
  if (!datesOk) problem = "Bitte beide Daten wählen.";
  else if (nights < 1) problem = "„Bis“ muss nach „Von“ liegen (mindestens eine Nacht).";
  else if (overlap) problem = `Überschneidet sich mit ${overlap.place || "Montage"} (${formatDateKey(overlap.from)}–${formatDateKey(overlap.to)}).`;
  const placeMissing = !place;
  const message = problem || (tried && placeMissing ? "Bitte den Ort eintragen." : "");

  const save = () => {
    if (problem || placeMissing) {
      setTried(true);
      return;
    }
    onSave({ id: draft.id, from: draft.from, to: draft.to, place });
    onClose();
  };

  const remove = () => {
    onDelete(draft.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="sheet-panel w-full max-w-md rounded-t-2xl p-4 overflow-y-auto" style={{ background: BG_SURFACE, borderTop: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold">Montage mit Übernachtung</span>
          <button onClick={onClose} aria-label="Schließen" className="p-2 -m-2"><X size={20} style={{ color: TEXT_MUTED }} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Von (Abfahrt)">
              <input
                type="date"
                aria-label="Von (Abfahrt)"
                value={draft.from}
                onChange={(e) => setFrom(e.target.value)}
                className="date-input rounded-lg px-3 py-2 text-sm min-w-0 w-full"
                style={inputStyle}
              />
            </Field>
            <Field label="Bis (Rückkehr)">
              <input
                type="date"
                aria-label="Bis (Rückkehr)"
                value={draft.to}
                min={isDateKey(draft.from) ? nextDayKey(draft.from) : undefined}
                onChange={(e) => setDraft((s) => ({ ...s, to: e.target.value }))}
                className="date-input rounded-lg px-3 py-2 text-sm min-w-0 w-full"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Wo">
            <input
              aria-label="Wo"
              value={draft.place}
              onChange={(e) => setDraft((s) => ({ ...s, place: e.target.value }))}
              placeholder="Ort / Baustelle"
              maxLength={80}
              enterKeyHint="done"
              className="rounded-lg px-3 py-2 text-sm min-w-0 w-full"
              style={inputStyle}
            />
          </Field>

          <div className="text-xs text-center" style={{ color: message ? DANGER : TEXT_MUTED, minHeight: 16 }}>
            {message || `${nights} ${nights === 1 ? "Übernachtung" : "Übernachtungen"}`}
          </div>

          <div className="flex gap-2 mt-1">
            {trip && (
              <button onClick={remove} aria-label="Montage löschen" className="px-4 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${DANGER}55`, color: DANGER }}>
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}>
              Abbrechen
            </button>
            <button
              onClick={save}
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
