import { useState } from "react";
import { Calendar, BarChart3, Share2, Settings as SettingsIcon } from "lucide-react";
import { BG_PAGE, TEXT, TEXT_MUTED, ACCENT, DANGER, BORDER, SYSTEM_FONT, sortTrips } from "./lib/model";
import { useUserData } from "./lib/useUserData";
import CalendarView from "./views/CalendarView";
import YearView from "./views/YearView";
import OverviewView from "./views/OverviewView";
import ExportView from "./views/ExportView";
import SettingsView from "./views/SettingsView";
import EntrySheet from "./components/EntrySheet";
import MontageSheet from "./components/MontageSheet";

const TABS = [
  { id: "kalender", label: "Kalender", icon: Calendar },
  { id: "uebersicht", label: "Übersicht", icon: BarChart3 },
  { id: "export", label: "Export", icon: Share2 },
  { id: "mehr", label: "Mehr", icon: SettingsIcon },
];

export default function Zeiterfassung({ session, supabase, onLogout }) {
  const userId = session.user.id;
  const { status, entries, settings, saveState, setEntries, setSettings, retry } = useUserData(supabase, userId);
  const [activeTab, setActiveTab] = useState("kalender");
  const [calMode, setCalMode] = useState("month"); // "month" | "year"
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [sheetDate, setSheetDate] = useState(null);
  const [montageSheet, setMontageSheet] = useState(null); // { trip } | { startKey } | null

  if (status === "loading") {
    return (
      <div className="app-shell w-full flex items-center justify-center" style={{ background: BG_PAGE, color: TEXT_MUTED, fontFamily: SYSTEM_FONT }}>
        Lädt …
      </div>
    );
  }

  // Laden fehlgeschlagen: bewusst KEINE leere App zeigen – sonst würde der nächste Eintrag
  // die gespeicherten Daten überschreiben.
  if (status === "error") {
    return (
      <div className="app-shell w-full flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}>
        <span className="text-base font-semibold">Daten konnten nicht geladen werden</span>
        <span className="text-sm" style={{ color: TEXT_MUTED }}>
          Bitte Internetverbindung prüfen. Deine gespeicherten Einträge sind sicher.
        </span>
        <button onClick={retry} className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: ACCENT, color: "#fff" }}>
          Erneut versuchen
        </button>
        <button onClick={onLogout} className="text-xs" style={{ color: TEXT_MUTED }}>
          Abmelden
        </button>
      </div>
    );
  }

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const saveEntry = (entry) => {
    const key = sheetDate;
    setEntries((prev) => ({ ...prev, [key]: entry }));
  };
  const deleteEntry = () => {
    const key = sheetDate;
    setEntries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveTrip = (trip) =>
    setSettings((s) => ({ ...s, montagen: sortTrips([...(s.montagen || []).filter((t) => t.id !== trip.id), trip]) }));
  const deleteTrip = (id) => setSettings((s) => ({ ...s, montagen: (s.montagen || []).filter((t) => t.id !== id) }));

  return (
    <div className="app-shell w-full flex flex-col" style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1 shrink-0">
        <span className="text-xl font-bold">Zeiterfassung</span>
        {saveState === "error" && (
          <button onClick={retry} aria-label="Nicht gespeichert – erneut versuchen" className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap" style={{ background: DANGER + "26", color: DANGER }}>
            Nicht gespeichert
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "kalender" && calMode === "month" && (
          <CalendarView
            year={year}
            month={month}
            entries={entries}
            settings={settings}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onOpenYear={() => setCalMode("year")}
            onSelectDay={(key) => setSheetDate(key)}
            onAddTrip={(startKey) => setMontageSheet({ startKey })}
            onEditTrip={(trip) => setMontageSheet({ trip })}
          />
        )}
        {activeTab === "kalender" && calMode === "year" && (
          <YearView
            year={year}
            entries={entries}
            onPrevYear={() => setYear((y) => y - 1)}
            onNextYear={() => setYear((y) => y + 1)}
            onSelectMonth={(m) => { setMonth(m); setCalMode("month"); }}
          />
        )}
        {activeTab === "uebersicht" && <OverviewView settings={settings} entries={entries} year={year} month={month} />}
        {activeTab === "export" && (
          <ExportView
            settings={settings}
            entries={entries}
            year={year}
            month={month}
            onChangeMonth={(y, m) => { setYear(y); setMonth(m); }}
          />
        )}
        {activeTab === "mehr" && (
          <SettingsView settings={settings} setSettings={setSettings} supabase={supabase} session={session} onLogout={onLogout} />
        )}
      </div>

      <div className="tab-bar flex shrink-0" style={{ borderTop: `1px solid ${BORDER}`, background: BG_PAGE }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); if (t.id === "kalender") setCalMode("month"); }}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
              style={{ color: active ? ACCENT : TEXT_MUTED }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {sheetDate && (
        <EntrySheet
          key={sheetDate}
          dateKey={sheetDate}
          entry={entries[sheetDate] || null}
          settings={settings}
          onClose={() => setSheetDate(null)}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onAddTrip={(startKey) => setMontageSheet({ startKey })}
          onEditTrip={(trip) => setMontageSheet({ trip })}
        />
      )}

      {montageSheet && (
        <MontageSheet
          key={montageSheet.trip?.id || montageSheet.startKey}
          trip={montageSheet.trip || null}
          startKey={montageSheet.startKey}
          trips={settings.montagen || []}
          onClose={() => setMontageSheet(null)}
          onSave={saveTrip}
          onDelete={deleteTrip}
        />
      )}
    </div>
  );
}
