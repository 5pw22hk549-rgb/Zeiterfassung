import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  BG_SURFACE,
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  WARNING,
  HOLIDAY,
  TYPE_META,
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  getMonthDays,
  keyOf,
  calcHours,
  formatHours,
  isWeekend,
  holidayName,
} from "../lib/model";

export default function CalendarView({ year, month, entries, onPrevMonth, onNextMonth, onOpenYear, onSelectDay }) {
  const days = getMonthDays(year, month);
  const today = new Date();

  let monthHours = 0;

  const rows = days.map((day) => {
    const key = keyOf(day);
    const entry = entries[key];
    const holiday = holidayName(day);
    const hours = entry ? calcHours(entry) : 0;
    monthHours += hours;
    return { day, key, entry, holiday, hours };
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
          {rows.map(({ day, key, entry, holiday, hours }, i) => {
            const weekend = isWeekend(day);
            const isToday = key === keyOf(today);
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

                <div className="flex-1 min-w-0">
                  {holiday ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: HOLIDAY + "26", color: HOLIDAY }}>
                      Feiertag · {holiday}
                    </span>
                  ) : entry ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full inline-block"
                      style={{ background: (meta.color || TEXT_MUTED) + "26", color: meta.color || TEXT }}
                    >
                      {meta.short}
                      {entry.start ? ` · ${entry.start}–${entry.end}` : ""}
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: TEXT_MUTED }}>–</span>
                  )}
                </div>

                <div className="text-sm font-medium shrink-0" style={{ color: hours ? TEXT : TEXT_MUTED }}>
                  {hours ? formatHours(hours) : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
