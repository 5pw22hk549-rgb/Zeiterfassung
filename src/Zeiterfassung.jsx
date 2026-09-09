import { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarDays,
  LayoutList,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Hammer,
  X,
  Printer,
  Trash2,
  Moon,
  Utensils,
  CalendarRange,
  LogOut,
} from "lucide-react";

// ---------- Farben (Apple-Look: Schwarz/Weiss + Systemblau) ----------

const BG_PAGE = "#000000";
const BG_CARD = "#000000";
const BG_SURFACE = "#1C1C1E"; // Karten, Eingaben, Kalender-Zellen
const BORDER = "#2C2C2E";
const TEXT = "#FFFFFF";
const TEXT_MUTED = "#8E8E93";
const ACCENT = "#0A84FF"; // System-Blau (Dark Mode)
const ACCENT_WASH = "rgba(10,132,255,0.15)";
const SUCCESS = "#32D74A";
const DANGER = "#FF453A";
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Typ-Farben werden NUR noch als kleine Punkte (Kalender-Tag, Legende) verwendet —
// nicht mehr für Chips, Buttons oder Flächen.
const TYPE_META = {
  arbeit: { label: "Arbeit", color: "#B7935C" },
  schule: { label: "Schule", color: "#6E8CA0" },
  montage: { label: "Montage", color: "#C1502E" },
  urlaub: { label: "Urlaub", color: "#7A9B6E" },
  krank: { label: "Krank", color: "#9C5A46" },
};
const TYPE_ORDER = ["arbeit", "schule", "montage", "urlaub", "krank"];
const TIME_TYPES = ["arbeit", "schule", "montage"];

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const DEFAULT_SETTINGS = {
  weeklyHours: 40,
  workDaysPerWeek: 5,
  vacationDaysPerYear: 30,
  montageRates: { unter8: 0, mittel: 14, hoch: 28 },
  defaults: {
    arbeit: { start: "07:00", end: "15:45", pause: 45 },
    schule: { start: "07:00", end: "15:00", pause: 0 },
    montage: { start: "07:00", end: "15:45", pause: 45 },
  },
};

const MONTAGE_LEVELS = [
  { id: "unter8", label: "unter 8h" },
  { id: "mittel", label: "8–24h" },
  { id: "hoch", label: "ab 24h" },
];

// ---------- Hilfsfunktionen ----------

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateKey(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function keyOf(date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcHours(entry) {
  if (!entry || !TIME_TYPES.includes(entry.type)) return 0;
  const start = timeToMinutes(entry.start);
  const end = timeToMinutes(entry.end);
  const pause = Number(entry.pause) || 0;
  let mins = end - start - pause;
  if (mins < 0) mins = 0;
  return mins / 60;
}

function formatHours(h) {
  const sign = h < 0 ? "-" : "";
  const abs = Math.abs(h);
  return `${sign}${abs.toFixed(2).replace(".", ",")}`;
}

function montageAmount(entry, settings) {
  if (!entry || entry.type !== "montage") return 0;
  const rate = settings.montageRates[entry.montageLevel] || 0;
  return rate;
}

function getMonthMatrix(year, month) {
  // Montag-basierte Wochen, gibt Array von Wochen (je 7 Tage oder null) zurück
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstWeekday = firstOfMonth.getDay(); // 0=So,1=Mo,...
  firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1; // Mo=0 ... So=6

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function generateDateRange(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(dateKey(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// ---------- Hauptkomponente ----------

export default function Zeiterfassung({ session, supabase, onLogout }) {
  const userId = session.user.id;
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [entries, setEntries] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("kalender");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [sheetDate, setSheetDate] = useState(null); // Date | null
  const [draft, setDraft] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState(null);
  const skipFirstSave = useRef(true);
  const skipFirstSettingsSave = useRef(true);

  // ---- Laden: eine Zeile pro Nutzer in der Tabelle "user_data" ----
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("entries, settings")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          setLoadError(error.message);
        } else if (data) {
          if (data.entries) setEntries(data.entries);
          if (data.settings && Object.keys(data.settings).length) {
            const parsed = data.settings;
            setSettings({
              ...DEFAULT_SETTINGS,
              ...parsed,
              montageRates: { ...DEFAULT_SETTINGS.montageRates, ...(parsed.montageRates || {}) },
              defaults: {
                arbeit: { ...DEFAULT_SETTINGS.defaults.arbeit, ...(parsed.defaults?.arbeit || {}) },
                schule: { ...DEFAULT_SETTINGS.defaults.schule, ...(parsed.defaults?.schule || {}) },
                montage: { ...DEFAULT_SETTINGS.defaults.montage, ...(parsed.defaults?.montage || {}) },
              },
            });
          }
        } else {
          // Erster Login dieses Nutzers — Zeile anlegen
          const { error: insertError } = await supabase
            .from("user_data")
            .insert({ user_id: userId, entries: {}, settings: DEFAULT_SETTINGS });
          if (insertError) setLoadError(insertError.message);
        }
      } catch (err) {
        setLoadError(err.message || "Unbekannter Fehler beim Laden.");
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId]);

  // ---- Speichern (nach Laden) ----
  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    supabase
      .from("user_data")
      .update({ entries, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) setLoadError(error.message);
      });
  }, [entries, loaded, userId]);

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSettingsSave.current) {
      skipFirstSettingsSave.current = false;
      return;
    }
    supabase
      .from("user_data")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) setLoadError(error.message);
      });
  }, [settings, loaded, userId]);

  // ---- Kalender-Navigation ----
  const goMonth = (delta) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const weeks = useMemo(
    () => getMonthMatrix(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const today = new Date();

  // ---- Sheet öffnen ----
  const openSheet = (day) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const key = keyOf(d);
    const existing = entries[key];
    setSheetDate(d);
    setDraft(existing ? { ...existing } : null);
  };

  const closeSheet = () => {
    setSheetDate(null);
    setDraft(null);
  };

  const selectType = (type) => {
    setDraft((prev) => {
      if (TIME_TYPES.includes(type)) {
        const base =
          prev && prev.type === type
            ? prev
            : settings.defaults[type];
        const next = {
          type,
          start: base.start || settings.defaults[type].start,
          end: base.end || settings.defaults[type].end,
          pause: base.pause ?? settings.defaults[type].pause,
        };
        if (type === "montage") {
          next.montageLevel = prev && prev.type === "montage" ? prev.montageLevel : "unter8";
          next.nights = prev && prev.type === "montage" ? prev.nights : 0;
        }
        return next;
      }
      return { type };
    });
  };

  const updateDraft = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const saveDraft = () => {
    if (!sheetDate || !draft || !draft.type) return;
    const key = keyOf(sheetDate);
    setEntries((prev) => ({ ...prev, [key]: draft }));
    closeSheet();
  };

  const deleteDraft = () => {
    if (!sheetDate) return;
    const key = keyOf(sheetDate);
    setEntries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    closeSheet();
  };

  // ---- Montage-Zeitraum (mehrere Tage auf einmal) ----
  const openBulk = () => {
    const startKey = keyOf(sheetDate || today);
    setBulkDraft({
      start: startKey,
      end: startKey,
      start_time: settings.defaults.montage.start,
      end_time: settings.defaults.montage.end,
      pause: settings.defaults.montage.pause,
      montageLevel: "hoch",
      nights: 0,
    });
    setBulkOpen(true);
  };

  const closeBulk = () => {
    setBulkOpen(false);
    setBulkDraft(null);
  };

  const updateBulk = (patch) => setBulkDraft((prev) => ({ ...prev, ...patch }));

  const saveBulk = () => {
    if (!bulkDraft) return;
    const dates = generateDateRange(bulkDraft.start, bulkDraft.end);
    if (dates.length === 0) return;
    setEntries((prev) => {
      const next = { ...prev };
      dates.forEach((key, idx) => {
        next[key] = {
          type: "montage",
          start: bulkDraft.start_time,
          end: bulkDraft.end_time,
          pause: Number(bulkDraft.pause) || 0,
          montageLevel: bulkDraft.montageLevel,
          nights: idx === dates.length - 1 ? Number(bulkDraft.nights) || 0 : 0,
        };
      });
      return next;
    });
    closeBulk();
  };

  // ---- Übersicht Berechnungen ----
  const overview = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const monthPrefix = `${y}-${pad2(m + 1)}-`;
    const yearPrefix = `${y}-`;

    let istStunden = 0;
    let workDays = 0;
    let krankTage = 0;
    let montageCount = 0;
    let montageStunden = 0;
    let montageNaechte = 0;
    let montagePauschale = 0;

    Object.entries(entries).forEach(([k, e]) => {
      if (!k.startsWith(monthPrefix)) return;
      if (TIME_TYPES.includes(e.type)) {
        istStunden += calcHours(e);
        workDays += 1;
      }
      if (e.type === "krank") krankTage += 1;
      if (e.type === "montage") {
        montageCount += 1;
        montageStunden += calcHours(e);
        montageNaechte += Number(e.nights) || 0;
        montagePauschale += montageAmount(e, settings);
      }
    });

    let urlaubJahr = 0;
    Object.entries(entries).forEach(([k, e]) => {
      if (k.startsWith(yearPrefix) && e.type === "urlaub") urlaubJahr += 1;
    });

    const tagessoll =
      settings.workDaysPerWeek > 0 ? settings.weeklyHours / settings.workDaysPerWeek : 0;
    const sollStunden = tagessoll * workDays;
    const ueberstunden = istStunden - sollStunden;
    const restUrlaub = settings.vacationDaysPerYear - urlaubJahr;

    return {
      istStunden,
      sollStunden,
      ueberstunden,
      restUrlaub,
      krankTage,
      montageCount,
      montageStunden,
      montageNaechte,
      montagePauschale,
    };
  }, [entries, settings, currentMonth]);

  // ---- Druck-Tabelle ----
  const printRows = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const monthPrefix = `${y}-${pad2(m + 1)}-`;
    return Object.entries(entries)
      .filter(([k]) => k.startsWith(monthPrefix))
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, e]) => ({ key: k, ...e }));
  }, [entries, currentMonth]);

  // ---- PDF senden ----
  // Öffnet die Monatstabelle in einem echten neuen Browser-Tab (nicht im
  // eingebetteten Artefakt-Frame) und startet dort den Druckdialog. So
  // funktioniert "Als PDF sichern" / "Teilen" zuverlässig — unabhängig davon,
  // wie viele Tage im Monat eingetragen sind, auch bei nur einem einzigen.
  const sendPdf = () => {
    const rowsHtml = printRows.length
      ? printRows
          .map((row) => {
            const isTime = TIME_TYPES.includes(row.type);
            const montageInfo =
              row.type === "montage"
                ? `${MONTAGE_LEVELS.find((l) => l.id === row.montageLevel)?.label || "-"}, ${
                    row.nights || 0
                  } Nächte`
                : "-";
            return `<tr>
              <td>${row.key}</td>
              <td>${TYPE_META[row.type]?.label || ""}</td>
              <td>${isTime ? `${row.start}–${row.end}` : "-"}</td>
              <td>${isTime ? `${row.pause} min` : "-"}</td>
              <td>${isTime ? formatHours(calcHours(row)) : "0,00"}</td>
              <td>${montageInfo}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="6">Keine Einträge in diesem Monat.</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Zeiterfassung – ${monthLabel}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ${SYSTEM_FONT}; color: #111; padding: 24px; }
  h2 { margin: 0 0 4px; }
  p { color: #444; font-size: 13px; margin: 2px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; }
  th { background: #f2f2f2; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h2>Zeiterfassung — ${monthLabel}</h2>
  <p>
    Ist-Stunden: ${formatHours(overview.istStunden)} h &nbsp;·&nbsp;
    Soll-Stunden: ${formatHours(overview.sollStunden)} h &nbsp;·&nbsp;
    Überstunden: ${formatHours(overview.ueberstunden)} h<br />
    Resturlaub: ${overview.restUrlaub} Tage &nbsp;·&nbsp;
    Kranktage: ${overview.krankTage} &nbsp;·&nbsp;
    Montagetage: ${overview.montageCount}
  </p>
  <table>
    <thead>
      <tr>${["Datum", "Typ", "Zeit", "Pause", "Stunden", "Montage-Info"].map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      // Popup blockiert — letzter Versuch direkt im Frame
      window.print();
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (_) {}
    }, 250);
  };

  if (!loaded) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[500px]"
        style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}
      >
        Lade Daten …
      </div>
    );
  }

  return (
    <div
      className="w-full h-full min-h-[640px] flex flex-col relative md:items-center md:justify-center md:p-6 md:overflow-y-auto"
      style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}
    >
      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .zte-scroll::-webkit-scrollbar { width: 6px; }
        .zte-scroll::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 4px; }
      `}</style>

      <div
        className="no-print flex flex-col w-full h-full min-h-[640px] md:max-w-3xl md:h-auto md:max-h-[90vh] md:rounded-2xl md:border md:shadow-2xl md:overflow-hidden"
        style={{ background: BG_CARD, borderColor: BORDER }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0"
          style={{ background: BG_CARD, borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2">
            <Hammer size={20} style={{ color: TEXT_MUTED }} />
            <span className="text-base tracking-tight">Zeiterfassung</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={openBulk}
              className="p-2 rounded-md"
              style={{ color: ACCENT }}
              aria-label="Montage-Zeitraum eintragen"
              title="Montage-Zeitraum eintragen"
            >
              <CalendarRange size={18} />
            </button>
            <button
              onClick={() => {
                setSettingsDraft(JSON.parse(JSON.stringify(settings)));
                setSettingsOpen(true);
              }}
              className="p-2 rounded-md"
              style={{ color: TEXT }}
              aria-label="Einstellungen"
            >
              <SettingsIcon size={18} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-md"
              style={{ color: TEXT_MUTED }}
              aria-label="Abmelden"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Monatsnavigation */}
        <div
          className="flex items-center justify-between px-4 md:px-6 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <button onClick={() => goMonth(-1)} className="p-2 rounded-md" style={{ color: ACCENT }}>
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm tabular-nums tracking-wide">{monthLabel}</span>
          <button onClick={() => goMonth(1)} className="p-2 rounded-md" style={{ color: ACCENT }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Tabs als Segmented Control ab Tablet-Breite */}
        <div
          className="hidden md:flex items-center gap-2 px-6 py-2 shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <SegTab
            active={activeTab === "kalender"}
            onClick={() => setActiveTab("kalender")}
            icon={CalendarDays}
            label="Kalender"
          />
          <SegTab
            active={activeTab === "uebersicht"}
            onClick={() => setActiveTab("uebersicht")}
            icon={LayoutList}
            label="Übersicht"
          />
        </div>

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto zte-scroll px-3 md:px-6 py-3 md:py-5">
          {loadError && (
            <div
              className="text-xs rounded-md px-3 py-2 mb-3"
              style={{ background: BG_SURFACE, border: `1px solid ${DANGER}`, color: DANGER }}
            >
              Speichern/Laden ist gerade fehlgeschlagen: {loadError}
            </div>
          )}
          {activeTab === "kalender" ? (
            <KalenderView
              weeks={weeks}
              currentMonth={currentMonth}
              entries={entries}
              today={today}
              openSheet={openSheet}
            />
          ) : (
            <UebersichtView overview={overview} settings={settings} onSend={sendPdf} />
          )}
        </div>

        {/* Tab-Leiste (mobil) */}
        <div
          className="grid grid-cols-2 shrink-0 md:hidden"
          style={{ background: BG_CARD, borderTop: `1px solid ${BORDER}` }}
        >
          <button
            onClick={() => setActiveTab("kalender")}
            className="flex flex-col items-center gap-1 py-2.5"
            style={{ color: activeTab === "kalender" ? ACCENT : TEXT_MUTED }}
          >
            <CalendarDays size={20} />
            <span className="text-xs">Kalender</span>
          </button>
          <button
            onClick={() => setActiveTab("uebersicht")}
            className="flex flex-col items-center gap-1 py-2.5"
            style={{ color: activeTab === "uebersicht" ? ACCENT : TEXT_MUTED }}
          >
            <LayoutList size={20} />
            <span className="text-xs">Übersicht</span>
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      {sheetDate && (
        <EntrySheet
          date={sheetDate}
          draft={draft}
          onSelectType={selectType}
          onUpdate={updateDraft}
          onSave={saveDraft}
          onDelete={deleteDraft}
          onClose={closeSheet}
          hasExisting={!!entries[keyOf(sheetDate)]}
        />
      )}

      {/* Einstellungen */}
      {settingsOpen && settingsDraft && (
        <SettingsModal
          draft={settingsDraft}
          setDraft={setSettingsDraft}
          onCancel={() => setSettingsOpen(false)}
          onSave={() => {
            setSettings(settingsDraft);
            setSettingsOpen(false);
          }}
        />
      )}

      {/* Montage-Zeitraum */}
      {bulkOpen && bulkDraft && (
        <BulkMontageModal
          draft={bulkDraft}
          onUpdate={updateBulk}
          onSave={saveBulk}
          onClose={closeBulk}
        />
      )}

      {/* Druckansicht */}
      <div className="print-only" style={{ color: "#000", background: "#fff", padding: "16px", fontFamily: SYSTEM_FONT }}>
        <h2 style={{ marginBottom: 8 }}>
          Zeiterfassung — {monthLabel}
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Datum", "Typ", "Zeit", "Pause", "Stunden", "Montage-Info"].map((h) => (
                <th
                  key={h}
                  style={{ border: "1px solid #999", padding: "4px 6px", textAlign: "left" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {printRows.map((row) => {
              const isTime = TIME_TYPES.includes(row.type);
              const montageInfo =
                row.type === "montage"
                  ? `${MONTAGE_LEVELS.find((l) => l.id === row.montageLevel)?.label || "-"}, ${
                      row.nights || 0
                    } Nächte`
                  : "-";
              return (
                <tr key={row.key}>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>{row.key}</td>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>
                    {TYPE_META[row.type]?.label}
                  </td>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>
                    {isTime ? `${row.start}–${row.end}` : "-"}
                  </td>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>
                    {isTime ? `${row.pause} min` : "-"}
                  </td>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>
                    {isTime ? formatHours(calcHours(row)) : "0,00"}
                  </td>
                  <td style={{ border: "1px solid #999", padding: "4px 6px" }}>{montageInfo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SegTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm"
      style={{
        background: active ? BG_SURFACE : "transparent",
        border: `1px solid ${active ? ACCENT : BORDER}`,
        color: active ? ACCENT : TEXT_MUTED,
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// ---------- Kalender-Ansicht ----------

function KalenderView({ weeks, currentMonth, entries, today, openSheet }) {
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs py-1" style={{ color: TEXT_MUTED }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const key = keyOf(d);
          const entry = entries[key];
          const isToday = isSameDate(d, today);
          return (
            <button
              key={i}
              onClick={() => openSheet(day)}
              className="aspect-square rounded-md md:rounded-lg flex flex-col items-center justify-center relative"
              style={{
                background: BG_SURFACE,
                border: isToday ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
              }}
            >
              <span className="text-sm md:text-base tabular-nums" style={{ color: TEXT }}>{day}</span>
              {entry && (
                <span
                  className="absolute bottom-1.5 md:bottom-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                  style={{ background: TYPE_META[entry.type]?.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 px-1">
        {TYPE_ORDER.map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: TYPE_META[t].color }} />
            <span className="text-xs" style={{ color: TEXT_MUTED }}>{TYPE_META[t].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Übersicht-Ansicht ----------

function StatCard({ label, value, unit }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
    >
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      <span className="text-lg tabular-nums" style={{ color: TEXT }}>
        {value}
        {unit ? <span className="text-xs ml-1" style={{ color: TEXT_MUTED }}>{unit}</span> : null}
      </span>
    </div>
  );
}

function UebersichtView({ overview, settings, onSend }) {
  const ueberColor = overview.ueberstunden >= 0 ? SUCCESS : DANGER;
  return (
    <div className="flex flex-col gap-3 md:max-w-2xl">
      {/* Große Kennzahl */}
      <div
        className="rounded-lg p-4 md:p-6 flex flex-col items-center justify-center gap-1"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <span className="text-xs" style={{ color: TEXT_MUTED }}>Überstunden</span>
        <span className="text-4xl md:text-6xl tabular-nums" style={{ color: ueberColor }}>
          {formatHours(overview.ueberstunden)}
          <span className="text-lg ml-1" style={{ color: TEXT_MUTED }}>h</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Ist-Stunden" value={formatHours(overview.istStunden)} unit="h" />
        <StatCard label="Soll-Stunden" value={formatHours(overview.sollStunden)} unit="h" />
        <StatCard label="Resturlaub" value={overview.restUrlaub} unit="Tage" />
        <StatCard label="Kranktage (Monat)" value={overview.krankTage} unit="Tage" />
      </div>

      {/* Montage-Block */}
      <div
        className="rounded-lg p-3 md:p-4 flex flex-col gap-2"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: TYPE_META.montage.color }} />
          <span className="text-sm">Montage</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Montagetage</span>
            <span className="tabular-nums">{overview.montageCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Stunden</span>
            <span className="tabular-nums">{formatHours(overview.montageStunden)} h</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs flex items-center gap-1" style={{ color: TEXT_MUTED }}>
              <Moon size={12} /> Übernachtungen
            </span>
            <span className="tabular-nums">{overview.montageNaechte}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs flex items-center gap-1" style={{ color: TEXT_MUTED }}>
              <Utensils size={12} /> Verpflegungspauschale
            </span>
            <span className="tabular-nums">
              {overview.montagePauschale.toFixed(2).replace(".", ",")} €
            </span>
          </div>
        </div>
      </div>

      {/* PDF senden — öffnet einen echten neuen Tab und startet dort den Druckdialog */}
      <button
        onClick={onSend}
        className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold"
        style={{ background: ACCENT, color: "#FFFFFF" }}
      >
        <Printer size={16} />
        Überblick senden (PDF)
      </button>
    </div>
  );
}

// ---------- Bottom Sheet ----------

function TypeChip({ active, color, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
      style={{
        background: active ? ACCENT_WASH : "transparent",
        border: `1px solid ${active ? ACCENT : BORDER}`,
        color: active ? ACCENT : TEXT,
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </button>
  );
}

function PlainChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm"
      style={{
        background: active ? ACCENT_WASH : "transparent",
        border: `1px solid ${active ? ACCENT : BORDER}`,
        color: active ? ACCENT : TEXT,
      }}
    >
      {label}
    </button>
  );
}

function EntrySheet({ date, draft, onSelectType, onUpdate, onSave, onDelete, onClose, hasExisting }) {
  const dateLabel = `${WEEKDAYS[(date.getDay() + 6) % 7]}, ${date.getDate()}. ${
    MONTHS[date.getMonth()]
  } ${date.getFullYear()}`;
  const isTimeType = draft && TIME_TYPES.includes(draft.type);
  const isMontage = draft && draft.type === "montage";

  return (
    <div className="no-print fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div
        className="relative w-full rounded-t-2xl md:rounded-2xl p-4 md:p-6 flex flex-col gap-4 max-h-[85%] md:max-h-[85vh] md:max-w-md overflow-y-auto zte-scroll"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: TEXT_MUTED }}>{dateLabel}</span>
          <button onClick={onClose} style={{ color: TEXT }}>
            <X size={20} />
          </button>
        </div>

        {/* Typ-Chips */}
        <div className="flex flex-wrap gap-2">
          {TYPE_ORDER.map((t) => (
            <TypeChip
              key={t}
              active={draft && draft.type === t}
              color={TYPE_META[t].color}
              label={TYPE_META[t].label}
              onClick={() => onSelectType(t)}
            />
          ))}
        </div>

        {/* Zeitfelder */}
        {isTimeType && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input
                  type="time"
                  value={draft.start}
                  onChange={(e) => onUpdate({ start: e.target.value })}
                  className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </Field>
              <Field label="Ende">
                <input
                  type="time"
                  value={draft.end}
                  onChange={(e) => onUpdate({ end: e.target.value })}
                  className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </Field>
            </div>
            <Field label="Pause (Minuten)">
              <input
                type="number"
                min="0"
                value={draft.pause}
                onChange={(e) => onUpdate({ pause: Number(e.target.value) })}
                className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
                style={{ border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </Field>
            <div className="text-xs tabular-nums" style={{ color: TEXT_MUTED }}>
              Berechnete Stunden: {formatHours(calcHours(draft))} h
            </div>
          </div>
        )}

        {/* Montage-Zusatzfelder */}
        {isMontage && (
          <div className="flex flex-col gap-3">
            <Field label="Abwesenheits-Stufe">
              <div className="flex gap-2 flex-wrap">
                {MONTAGE_LEVELS.map((l) => (
                  <PlainChip
                    key={l.id}
                    active={draft.montageLevel === l.id}
                    label={l.label}
                    onClick={() => onUpdate({ montageLevel: l.id })}
                  />
                ))}
              </div>
            </Field>
            <Field label="Übernachtungen">
              <input
                type="number"
                min="0"
                value={draft.nights ?? 0}
                onChange={(e) => onUpdate({ nights: Number(e.target.value) })}
                className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
                style={{ border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </Field>
          </div>
        )}

        {(draft?.type === "urlaub" || draft?.type === "krank") && (
          <div className="text-xs" style={{ color: TEXT_MUTED }}>
            Zählt als Tag, keine Zeitfelder, 0 Stunden in Ist und Soll.
          </div>
        )}

        {/* Aktionen */}
        <div className="flex items-center gap-2 pt-1">
          {hasExisting && (
            <button
              onClick={onDelete}
              className="p-2.5 rounded-md flex items-center justify-center"
              style={{ border: `1px solid ${DANGER}`, color: DANGER }}
              aria-label="Eintrag löschen"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={!draft || !draft.type}
            className="flex-1 py-2.5 rounded-md text-sm font-semibold"
            style={{
              background: draft && draft.type ? ACCENT : BORDER,
              color: draft && draft.type ? "#FFFFFF" : TEXT_MUTED,
            }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: TEXT_MUTED }}>{label}</span>
      {children}
    </div>
  );
}

// ---------- Einstellungen ----------

function SettingsModal({ draft, setDraft, onCancel, onSave }) {
  const setField = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const setDefault = (type, patch) =>
    setDraft((prev) => ({
      ...prev,
      defaults: { ...prev.defaults, [type]: { ...prev.defaults[type], ...patch } },
    }));
  const setRate = (level, val) =>
    setDraft((prev) => ({ ...prev, montageRates: { ...prev.montageRates, [level]: val } }));

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onCancel} />
      <div
        className="relative w-full max-w-sm md:max-w-lg rounded-xl p-4 md:p-6 flex flex-col gap-4 max-h-[90%] overflow-y-auto zte-scroll"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-base">Einstellungen</span>
          <button onClick={onCancel} style={{ color: TEXT }}>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Soll-Stunden / Woche">
            <NumberInput
              value={draft.weeklyHours}
              onChange={(v) => setField({ weeklyHours: v })}
            />
          </Field>
          <Field label="Arbeitstage / Woche">
            <NumberInput
              value={draft.workDaysPerWeek}
              onChange={(v) => setField({ workDaysPerWeek: v })}
            />
          </Field>
        </div>

        <Field label="Urlaubstage pro Jahr">
          <NumberInput
            value={draft.vacationDaysPerYear}
            onChange={(v) => setField({ vacationDaysPerYear: v })}
          />
        </Field>

        <div className="pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-sm block mt-3 mb-2">Verpflegungspauschale Montage</span>
          <div className="grid grid-cols-3 gap-2">
            {MONTAGE_LEVELS.map((l) => (
              <Field key={l.id} label={l.label}>
                <NumberInput
                  value={draft.montageRates[l.id]}
                  onChange={(v) => setRate(l.id, v)}
                  suffix="€"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span className="text-sm block mt-3 mb-2">Standard-Zeiten</span>
          {["arbeit", "schule", "montage"].map((t) => (
            <div key={t} className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: TYPE_META[t].color }} />
                <span className="text-xs" style={{ color: TEXT_MUTED }}>{TYPE_META[t].label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Start">
                  <input
                    type="time"
                    value={draft.defaults[t].start}
                    onChange={(e) => setDefault(t, { start: e.target.value })}
                    className="w-full bg-transparent tabular-nums text-xs px-2 py-1.5 rounded-md"
                    style={{ border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </Field>
                <Field label="Ende">
                  <input
                    type="time"
                    value={draft.defaults[t].end}
                    onChange={(e) => setDefault(t, { end: e.target.value })}
                    className="w-full bg-transparent tabular-nums text-xs px-2 py-1.5 rounded-md"
                    style={{ border: `1px solid ${BORDER}`, color: TEXT }}
                  />
                </Field>
                <Field label="Pause (min)">
                  <NumberInput
                    value={draft.defaults[t].pause}
                    onChange={(v) => setDefault(t, { pause: v })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onSave}
          className="py-2.5 rounded-md text-sm font-semibold mt-1"
          style={{ background: ACCENT, color: "#FFFFFF" }}
        >
          Einstellungen speichern
        </button>
      </div>
    </div>
  );
}

// ---------- Montage-Zeitraum ----------

function BulkMontageModal({ draft, onUpdate, onSave, onClose }) {
  const dayCount = useMemo(
    () => generateDateRange(draft.start, draft.end).length,
    [draft.start, draft.end]
  );

  const onRangeChange = (patch) => {
    const next = { ...draft, ...patch };
    const count = generateDateRange(next.start, next.end).length;
    onUpdate({ ...patch, nights: Math.max(0, count - 1) });
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div
        className="relative w-full rounded-t-2xl md:rounded-2xl p-4 md:p-6 flex flex-col gap-4 max-h-[90%] md:max-w-md overflow-y-auto zte-scroll"
        style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange size={18} style={{ color: ACCENT }} />
            <span className="text-base">Montage-Zeitraum</span>
          </div>
          <button onClick={onClose} style={{ color: TEXT }}>
            <X size={20} />
          </button>
        </div>
        <p className="text-xs -mt-2" style={{ color: TEXT_MUTED }}>
          Trägt Montage für jeden Tag im Zeitraum ein — praktisch bei mehrtägigen Einsätzen mit
          Übernachtung. Einzelne Tage lassen sich danach im Kalender weiter anpassen.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Von">
            <input
              type="date"
              value={draft.start}
              onChange={(e) => onRangeChange({ start: e.target.value })}
              className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </Field>
          <Field label="Bis">
            <input
              type="date"
              value={draft.end}
              onChange={(e) => onRangeChange({ end: e.target.value })}
              className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start (täglich)">
            <input
              type="time"
              value={draft.start_time}
              onChange={(e) => onUpdate({ start_time: e.target.value })}
              className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </Field>
          <Field label="Ende (täglich)">
            <input
              type="time"
              value={draft.end_time}
              onChange={(e) => onUpdate({ end_time: e.target.value })}
              className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </Field>
        </div>

        <Field label="Pause pro Tag (Minuten)">
          <input
            type="number"
            min="0"
            value={draft.pause}
            onChange={(e) => onUpdate({ pause: Number(e.target.value) })}
            className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
            style={{ border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </Field>

        <Field label="Abwesenheits-Stufe (für jeden Tag)">
          <div className="flex gap-2 flex-wrap">
            {MONTAGE_LEVELS.map((l) => (
              <PlainChip
                key={l.id}
                active={draft.montageLevel === l.id}
                label={l.label}
                onClick={() => onUpdate({ montageLevel: l.id })}
              />
            ))}
          </div>
        </Field>

        <Field label="Übernachtungen (automatisch aus Zeitraum, anpassbar)">
          <input
            type="number"
            min="0"
            value={draft.nights}
            onChange={(e) => onUpdate({ nights: Number(e.target.value) })}
            className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
            style={{ border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </Field>

        <div
          className="text-xs tabular-nums rounded-md px-3 py-2"
          style={{ border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
        >
          {dayCount > 0
            ? `${dayCount} Montage-Tag${dayCount === 1 ? "" : "e"} werden eingetragen.`
            : "Ungültiger Zeitraum — Bis darf nicht vor Von liegen."}
        </div>

        <button
          onClick={onSave}
          disabled={dayCount === 0}
          className="py-2.5 rounded-md text-sm font-semibold"
          style={{
            background: dayCount > 0 ? ACCENT : BORDER,
            color: dayCount > 0 ? "#FFFFFF" : TEXT_MUTED,
          }}
        >
          Zeitraum eintragen
        </button>
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, suffix }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent tabular-nums text-sm px-2 py-1.5 rounded-md"
        style={{ border: `1px solid ${BORDER}`, color: TEXT }}
      />
      {suffix && (
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: TEXT_MUTED }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
