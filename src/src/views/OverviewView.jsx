import { useState, useMemo } from "react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, SUCCESS, DANGER, calcOverview, formatHours, MONTH_NAMES } from "../lib/model";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
      <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{label}</span>
      <span className="text-xl font-semibold" style={{ color: color || TEXT }}>{value}</span>
      {sub && <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{sub}</span>}
    </div>
  );
}

export default function OverviewView({ settings, entries, year, month }) {
  const [periodMode, setPeriodMode] = useState("monat"); // "monat" | "jahr"

  const stats = useMemo(
    () => calcOverview(settings, entries, year, periodMode === "monat" ? month : null),
    [settings, entries, year, month, periodMode]
  );

  const periodLabel = periodMode === "monat" ? `${MONTH_NAMES[month]} ${year}` : `${year}`;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 pb-4" style={{ color: TEXT }}>
      <div className="flex items-center justify-center gap-1 py-3 shrink-0">
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {["monat", "jahr"].map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className="px-4 py-1.5 text-sm font-medium"
              style={{
                background: periodMode === m ? ACCENT : "transparent",
                color: periodMode === m ? "#fff" : TEXT_MUTED,
              }}
            >
              {m === "monat" ? "Monat" : "Jahr"}
            </button>
          ))}
        </div>
      </div>
      <div className="text-center text-xs mb-3" style={{ color: TEXT_MUTED }}>{periodLabel}</div>

      <div className="rounded-2xl p-5 flex flex-col items-center mb-3" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>Überstunden</span>
        <span className="text-3xl font-bold" style={{ color: stats.ueberstunden >= 0 ? SUCCESS : DANGER }}>
          {stats.ueberstunden >= 0 ? "+" : ""}
          {formatHours(stats.ueberstunden)} Std.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <StatCard label="Ist-Stunden" value={`${formatHours(stats.istStunden)} Std.`} />
        <StatCard label="Soll-Stunden" value={`${formatHours(stats.sollStunden)} Std.`} />
        <StatCard label="Kranktage" value={stats.krankTage} color={stats.krankTage ? DANGER : undefined} />
        <StatCard label="Schultage" value={stats.schulTage} />
        <StatCard label="Resturlaub" value={`${stats.resturlaub} Tage`} />
        <StatCard label="Feiertage" value={stats.feiertagTage} />
      </div>
    </div>
  );
}
