import { ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import {
  BG_SURFACE,
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  WARNING,
  HOLIDAY,
  MONTAGE,
  TYPE_META,
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  getMonthDays,
  keyOf,
  calcHours,
  formatHours,
  isWeekend,
  holidayName,
  dateKey,
  formatDateKey,
  tripsForDay,
  tripsInMonth,
} from "../lib/model";

export default function CalendarView({ year, month, entries, settings, onPrevMonth, onNextMonth, onOpenYear, onSelectDay, onAddTrip, onEditTrip }) {
  const days = getMonthDays(year, month);
  const today = new Date();
  const todayKey = keyOf(today);
  const trips = settings.montagen || [];
  const monthTrips = tripsInMonth(trips, year, month);
  // Neue Montage: heute vorschlagen, wenn der aktuelle Monat offen ist – sonst der Monatserste
  const newTripStart = today.getFullYear() === year && today.getMonth() === month ? todayKey : dateKey(year, month, 1);

  let monthHours = 0;

  const rows = days.map((day) => {
    const key = keyOf(day);
    const entry = entries[key];
    const holiday = holidayName(day);
    const hours = entry ? calcHours(entry, day, settings) : 0;
    monthHours += hours;
    return { day, key, entry, holiday, hours, dayTrips: tripsForDay(trips, key) };
  });

  return (
    <div className="flex flex-col h-full" style={{ color: TEXT }}>
      <button
        onClick={onOpenYear}
        className="flex items-center justify-center gap-1 py-3 shrink-0"
        style={{ color: TEXT }}
      >
        <span className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</span>
        <ChevronDown size={18} style={{ color: TEXT_MUTED }} />
      </button>

      <div className="flex items-center justify-between px-4 pb-2 shrink-0">
        <button onClick={onPrevMonth} className="p-2 -ml-2" style={{ color: ACCENT }}>
          <ChevronLeft size={22} />
        </button>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>
          Gesamt: <span style={{ color: TEXT }}>{formatHours(monthHours)} Std.</span>
        </span>
        <button onClick={onNextMonth} className="p-2 -mr-2" style={{ color: ACCENT }}>
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {rows.map(({ day, key, entry, holiday, hours, dayTrips }, i) => {
            const weekend = isWeekend(day);
            const isToday = key === todayKey;
            const meta = entry ? TYPE_META[entry.type] : null;
            return (
              <button
                key={key}
                onClick={() => onSelectDay(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                style={{
                  background: BG_SURFACE,
                  borderTop: i === 0 ? "none" : `1px solid ${BORDER}`,
                }}
              >
                <div className="flex flex-col items-center w-11 shrink-0">
                  <span
                    className="text-[11px] uppercase tracking-wide"
                    style={{ color: weekend ? WARNING : TEXT_MUTED }}
                  >
                    {WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}
                  </span>
                  <span
                    className="text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center"
                    style={{
                      color: isToday ? "#fff" : weekend ? WARNING : TEXT,
                      background: isToday ? ACCENT : "transparent",
                    }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
                  {holiday && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: HOLIDAY + "26", color: HOLIDAY }}>
                      Feiertag · {holiday}
                    </span>
                  )}
                  {entry && meta && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full inline-block"
                      style={{ background: (meta.color || TEXT_MUTED) + "26", color: meta.color || TEXT }}
                    >
                      {meta.short}
                      {entry.start ? ` · ${entry.start}–${entry.end}` : ""}
                    </span>
                  )}
                  {dayTrips.map((t) => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded-full max-w-full truncate" style={{ background: MONTAGE + "26", color: MONTAGE }}>
                      Montage{t.place ? ` · ${t.place}` : ""}
                    </span>
                  ))}
                  {!holiday && !entry && dayTrips.length === 0 && <span className="text-sm" style={{ color: TEXT_MUTED }}>–</span>}
                </div>

                <div className="text-sm font-medium shrink-0" style={{ color: hours ? TEXT : TEXT_MUTED }}>
                  {hours ? formatHours(hours) : ""}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl mt-3 overflow-hidden" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-semibold">Montage mit Übernachtung</span>
            <button onClick={() => onAddTrip(newTripStart)} className="text-xs flex items-center gap-1 py-1" style={{ color: ACCENT }}>
              <Plus size={14} /> Hinzufügen
            </button>
          </div>
          {monthTrips.length === 0 && (
            <div className="px-3 pb-3 text-xs" style={{ color: TEXT_MUTED }}>Keine Übernachtung in diesem Monat.</div>
          )}
          {monthTrips.map((t) => (
            <button
              key={t.id}
              onClick={() => onEditTrip({ id: t.id, from: t.from, to: t.to, place: t.place })}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm truncate" style={{ color: MONTAGE }}>{t.place || "Montage"}</span>
                <span className="text-xs" style={{ color: TEXT_MUTED }}>
                  {formatDateKey(t.from)} – {formatDateKey(t.to)}
                </span>
              </div>
              <div className="text-sm font-medium shrink-0" style={{ color: TEXT }}>
                {t.nights} {t.nights === 1 ? "Nacht" : "Nächte"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
