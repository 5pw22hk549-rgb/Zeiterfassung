import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  BG_SURFACE,
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  DANGER,
  WARNING,
  TYPE_META,
  TIME_TYPES,
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  getMonthDays,
  keyOf,
  calcHours,
  formatHours,
  isWeekend,
  jobById,
} from "../lib/model";

export default function CalendarView({
  year,
  month,
  entries,
  settings,
  activeJobId,
  onPrevMonth,
  onNextMonth,
  onOpenYear,
  onSelectDay,
}) {
  const days = getMonthDays(year, month);
  const today = new Date();

  let monthHours = 0;
  const jobSums = {};

  const rows = days.map((day) => {
    const key = keyOf(day);
    let dayEntries = entries[key] || [];
    if (activeJobId) dayEntries = dayEntries.filter((e) => e.jobId === activeJobId);
    let dayHours = 0;
    for (const e of dayEntries) {
      if (TIME_TYPES.includes(e.type)) {
        const h = calcHours(e);
        dayHours += h;
        monthHours += h;
        jobSums[e.jobId] = (jobSums[e.jobId] || 0) + h;
      }
    }
    return { day, key, dayEntries, dayHours };
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
          {rows.map(({ day, key, dayEntries, dayHours }, i) => {
            const weekend = isWeekend(day);
            const isToday = key === keyOf(today);
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
                      color: weekend ? WARNING : TEXT,
                      background: isToday ? ACCENT : "transparent",
                      ...(isToday ? { color: "#fff" } : {}),
                    }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {dayEntries.length === 0 ? (
                    <span className="text-sm" style={{ color: TEXT_MUTED }}>
                      –
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {dayEntries.map((e) => {
                        const meta = TYPE_META[e.type] || {};
                        const isTime = TIME_TYPES.includes(e.type);
                        return (
                          <span
                            key={e.id}
                            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: (meta.color || TEXT_MUTED) + "26", color: meta.color || TEXT }}
                          >
                            {meta.short || e.type}
                            {isTime ? ` · ${e.start}–${e.end}` : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-sm font-medium shrink-0" style={{ color: dayHours ? TEXT : TEXT_MUTED }}>
                  {dayHours ? formatHours(dayHours) : ""}
                </div>
              </button>
            );
          })}
        </div>

        {settings.jobs.length > 1 && !activeJobId && (
          <div className="mt-3 rounded-xl px-4 py-3 flex flex-col gap-1.5" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
            {settings.jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-xs">
                <span style={{ color: TEXT_MUTED }}>{job.name}</span>
                <span style={{ color: TEXT }}>{formatHours(jobSums[job.id] || 0)} Std.</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
