import { ChevronLeft, ChevronRight } from "lucide-react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, MONTH_NAMES, getMonthMatrix, keyOf } from "../lib/model";

function MiniMonth({ year, month, onSelect, today }) {
  const cells = getMonthMatrix(year, month);
  return (
    <button
      onClick={() => onSelect(month)}
      className="rounded-xl p-2.5 flex flex-col gap-1.5 text-left"
      style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
    >
      <div className="text-xs font-semibold text-center" style={{ color: TEXT }}>
        {MONTH_NAMES[month]}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          const isToday = day && keyOf(day) === keyOf(today);
          return (
            <div key={i} className="flex items-center justify-center h-4">
              {day && (
                <span
                  className="text-[9px] leading-none rounded-full w-3.5 h-3.5 flex items-center justify-center"
                  style={{
                    color: isToday ? "#fff" : TEXT_MUTED,
                    background: isToday ? ACCENT : "transparent",
                  }}
                >
                  {day.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

export default function YearView({ year, onPrevYear, onNextYear, onSelectMonth }) {
  const today = new Date();
  return (
    <div className="flex flex-col h-full" style={{ color: TEXT }}>
      <div className="flex items-center justify-center gap-4 py-3 shrink-0">
        <button onClick={onPrevYear} style={{ color: ACCENT }}>
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-semibold">{year}</span>
        <button onClick={onNextYear} style={{ color: ACCENT }}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth key={m} year={year} month={m} onSelect={onSelectMonth} today={today} />
          ))}
        </div>
      </div>
    </div>
  );
}
