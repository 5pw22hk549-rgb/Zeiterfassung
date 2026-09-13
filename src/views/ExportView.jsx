import { useState } from "react";
import { Share, Download, FileText, FileSpreadsheet, Table } from "lucide-react";
import { BG_SURFACE, BORDER, TEXT, TEXT_MUTED, ACCENT, MONTH_NAMES } from "../lib/model";
import { buildMonthRows, subjectFor, fileExtFor, runExport } from "../lib/export";

const FORMATS = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", icon: Table },
];

export default function ExportView({ settings, entries, year, month, onChangeMonth, activeJobId }) {
  const [format, setFormat] = useState("pdf");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const monthOptions = [];
  for (let y = year - 1; y <= year + 1; y++) {
    for (let m = 0; m < 12; m++) monthOptions.push({ y, m });
  }

  const doExport = async (mode) => {
    setBusy(true);
    setStatus("");
    try {
      const rows = buildMonthRows(settings, entries, year, month, activeJobId);
      if (rows.length === 0) {
        setStatus("Für diesen Monat gibt es noch keine Einträge.");
        return;
      }
      const subject = subjectFor(settings.name, year, month);
      const filename = `Stundenzettel_${MONTH_NAMES[month]}_${year}.${fileExtFor(format)}`;
      const res = await runExport(rows, subject, format, filename, mode);
      if (res.method === "share") setStatus("Geteilt.");
      else if (res.method === "download") setStatus("Heruntergeladen.");
      else if (res.method === "download+mailto") setStatus("Heruntergeladen – bitte in der geöffneten Mail manuell anhängen.");
      else if (res.method === "print-dialog") setStatus('Druckdialog geöffnet – dort "Teilen" oder "Als PDF sichern" wählen.');
      else if (res.method === "blocked") setStatus("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups erlauben und erneut versuchen.");
    } catch (e) {
      setStatus("Fehler beim Erzeugen der Datei: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 pb-4 pt-4" style={{ color: TEXT }}>
      <div className="text-sm font-semibold mb-2">Monat</div>
      <select
        value={`${year}-${month}`}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-").map(Number);
          onChangeMonth(y, m);
        }}
        className="w-full rounded-xl px-3 py-2.5 text-sm mb-4"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
      >
        {monthOptions.map(({ y, m }) => (
          <option key={`${y}-${m}`} value={`${y}-${m}`}>
            {MONTH_NAMES[m]} {y}
          </option>
        ))}
      </select>

      <div className="text-sm font-semibold mb-2">Format</div>
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {FORMATS.map((f) => {
          const Icon = f.icon;
          const active = format === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className="rounded-xl py-3 flex flex-col items-center gap-1.5"
              style={{
                background: active ? ACCENT : BG_SURFACE,
                border: `1px solid ${active ? ACCENT : BORDER}`,
                color: active ? "#fff" : TEXT,
              }}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{f.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => doExport("share")}
        disabled={busy}
        className="w-full rounded-xl py-3 flex items-center justify-center gap-2 font-semibold text-sm mb-2.5"
        style={{ background: ACCENT, color: "#fff", opacity: busy ? 0.6 : 1 }}
      >
        <Share size={18} />
        Teilen (Mail, AirDrop, …)
      </button>
      <button
        onClick={() => doExport("download")}
        disabled={busy}
        className="w-full rounded-xl py-3 flex items-center justify-center gap-2 font-medium text-sm"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, color: TEXT, opacity: busy ? 0.6 : 1 }}
      >
        <Download size={18} />
        Nur herunterladen
      </button>

      {status && (
        <div className="text-xs text-center mt-3" style={{ color: TEXT_MUTED }}>
          {status}
        </div>
      )}

      {!settings.name && (
        <div className="text-xs text-center mt-4" style={{ color: TEXT_MUTED }}>
          Tipp: Trage deinen Namen unter „Mehr" ein, damit der Betreff automatisch
          „Stundenzettel {MONTH_NAMES[month]} {year} Dein Name" lautet.
        </div>
      )}
    </div>
  );
}
