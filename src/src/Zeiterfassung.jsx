import { useEffect, useRef, useState } from "react";
import { Calendar, BarChart3, Share2, Settings as SettingsIcon } from "lucide-react";
import { BG_PAGE, TEXT, TEXT_MUTED, ACCENT, BORDER, SYSTEM_FONT, migrateData, defaultSettings } from "./lib/model";
import CalendarView from "./views/CalendarView";
import YearView from "./views/YearView";
import OverviewView from "./views/OverviewView";
import ExportView from "./views/ExportView";
import SettingsView from "./views/SettingsView";
import EntrySheet from "./components/EntrySheet";

const TABS = [
  { id: "kalender", label: "Kalender", icon: Calendar },
  { id: "uebersicht", label: "Übersicht", icon: BarChart3 },
  { id: "export", label: "Export", icon: Share2 },
  { id: "mehr", label: "Mehr", icon: SettingsIcon },
];

export default function Zeiterfassung({ session, supabase, onLogout }) {
  const userId = session.user.id;
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState({});
  const [settings, setSettings] = useState(defaultSettings());
  const [activeTab, setActiveTab] = useState("kalender");
  const [calMode, setCalMode] = useState("month"); // "month" | "year"
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sheetDate, setSheetDate] = useState(null);

  const skipFirstEntriesSave = useRef(true);
  const skipFirstSettingsSave = useRef(true);

  // Laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_data")
        .select("entries, settings")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const { entries: mEntries, settings: mSettings, changed } = migrateData(data?.entries, data?.settings);

      setEntries(mEntries);
      setSettings(mSettings);

      if (!data) {
        await supabase.from("user_data").insert({ user_id: userId, entries: mEntries, settings: mSettings });
      } else if (changed) {
        await supabase.from("user_data").update({ entries: mEntries, settings: mSettings }).eq("user_id", userId);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  // Speichern: entries
  useEffect(() => {
    if (loading) return;
    if (skipFirstEntriesSave.current) {
      skipFirstEntriesSave.current = false;
      return;
    }
    supabase.from("user_data").update({ entries }).eq("user_id", userId).then(({ error }) => {
      if (error) console.error(error);
    });
  }, [entries, loading, userId, supabase]);

  // Speichern: settings
  useEffect(() => {
    if (loading) return;
    if (skipFirstSettingsSave.current) {
      skipFirstSettingsSave.current = false;
      return;
    }
    supabase.from("user_data").update({ settings }).eq("user_id", userId).then(({ error }) => {
      if (error) console.error(error);
    });
  }, [settings, loading, userId, supabase]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: BG_PAGE, color: TEXT_MUTED, fontFamily: SYSTEM_FONT }}>
        Lädt …
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
    setEntries((prev) => ({ ...prev, [sheetDate]: entry }));
  };
  const deleteEntry = () => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[sheetDate];
      return next;
    });
  };

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-1 shrink-0">
        <span className="text-xl font-bold">Zeiterfassung</span>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "kalender" && calMode === "month" && (
          <CalendarView
            year={year}
            month={month}
            entries={entries}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onOpenYear={() => setCalMode("year")}
            onSelectDay={(key) => setSheetDate(key)}
          />
        )}
        {activeTab === "kalender" && calMode === "year" && (
          <YearView
            year={year}
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

      <div className="flex shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
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
          dateKey={sheetDate}
          entry={entries[sheetDate] || null}
          settings={settings}
          onClose={() => setSheetDate(null)}
          onSave={saveEntry}
          onDelete={deleteEntry}
        />
      )}
    </div>
  );
}
