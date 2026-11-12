// Auswahlfelder im Viertelstunden-Raster. Bewusst <select> statt <input type="time">:
// iOS ignoriert bei Zeit-Feldern das 15-Minuten-Raster (step) – nur so sind krumme Zeiten
// wirklich ausgeschlossen. Außerdem schließt sich die Auswahl beim Antippen von selbst,
// das Feld wird also immer sauber verlassen.
import { QUARTER_TIMES, PAUSE_OPTIONS } from "../lib/model";

export function TimeSelect({ value, onChange, className = "", style, label }) {
  // Alt-Einträge außerhalb des Rasters (z. B. 07:10) bleiben sichtbar, bis man sie ändert.
  const options = !value || QUARTER_TIMES.includes(value) ? QUARTER_TIMES : [...QUARTER_TIMES, value].sort();
  return (
    <select
      aria-label={label}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`min-w-0 w-full ${className}`}
      style={style}
    >
      {!value && <option value="">–</option>}
      {options.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

export function MinuteSelect({ value, onChange, allowZero = false, className = "", style, label }) {
  const v = Number(value) || 0;
  let options = allowZero ? [0, ...PAUSE_OPTIONS] : PAUSE_OPTIONS;
  if (!options.includes(v)) options = [...options, v].sort((a, b) => a - b);
  return (
    <select
      aria-label={label}
      value={v}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className={`min-w-0 ${className}`}
      style={style}
    >
      {options.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}
