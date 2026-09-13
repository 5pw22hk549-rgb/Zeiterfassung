import { useState, useMemo } from "react";
import {
  BG_SURFACE,
  BORDER,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  SUCCESS,
  DANGER,
  calcOverview,
  formatHours,
  MONTH_NAMES,
} from "../lib/model";

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

  const totals = stats.reduce(
    (acc, s) => ({
      istStunden: acc.istStunden + s.istStunden,
      sollStunden: acc.sollStunden + s.sollStunden,
      ueberstunden: acc.ueberstunden + s.ueberstunden,
      krankTage: acc.krankTage + s.krankTage,
      schulTage: acc.schulTage + s.schulTage,
      montageTage: acc.montageTage + s.montageTage,
      montageZulageSumme: acc.montageZulageSumme + s.montageZulageSumme,
      uebernachtungen: acc.uebernachtungen + s.uebernachtungen,
    }),
    { istStunden: 0, sollStunden: 0, ueberstunden: 0, krankTage: 0, schulTage: 0, montageTage: 0, montageZulageSumme: 0, uebernachtungen: 0 }
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
        <span
          className="text-3xl font-bold"
          style={{ color: totals.ueberstunden >= 0 ? SUCCESS : DANGER }}
        >
          {totals.ueberstunden >= 0 ? "+" : ""}
          {formatHours(totals.ueberstunden)} Std.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <StatCard label="Ist-Stunden" value={`${formatHours(totals.istStunden)} Std.`} />
        <StatCard label="Soll-Stunden" value={`${formatHours(totals.sollStunden)} Std.`} />
        <StatCard label="Kranktage" value={totals.krankTage} color={totals.krankTage ? DANGER : undefined} />
        <StatCard label="Schultage" value={totals.schulTage} />
      </div>

      <div className="mb-2 text-sm font-semibold">Urlaub je Job</div>
      <div className="grid grid-cols-1 gap-2 mb-3">
        {stats.map((s) => (
          <div key={s.jobId} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
            <span className="text-sm" style={{ color: TEXT_MUTED }}>{s.jobName}</span>
            <span className="text-sm font-medium">{s.resturlaub} Tage übrig</span>
          </div>
        ))}
      </div>

      {(totals.montageTage > 0 || totals.uebernachtungen > 0) && (
        <>
          <div className="mb-2 text-sm font-semibold">Montage</div>
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard label="Montage-Tage" value={totals.montageTage} />
            <StatCard label="Übernachtungen" value={totals.uebernachtungen} />
            <StatCard label="Zulagen" value={totals.montageZulageSumme.toFixed(2).replace(".", ",") + " €"} />
          </div>
        </>
      )}
    </div>
  );
}
