import { useEffect, useRef, useState } from "react";
import { Calendar, BarChart3, Share2, Settings as SettingsIcon, Moon, ChevronDown } from "lucide-react";
import {
  BG_PAGE,
  TEXT,
  TEXT_MUTED,
  ACCENT,
  BORDER,
  SYSTEM_FONT,
  migrateData,
  defaultSettings,
} from "./lib/model";
import CalendarView from "./views/CalendarView";
import YearView from "./views/YearView";
import OverviewView from "./views/OverviewView";
import ExportView from "./views/ExportView";
import SettingsView from "./views/SettingsView";
import EntrySheet from "./components/EntrySheet";
import MontageNightModal from "./components/MontageNightModal";

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
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobFilterOpen, setJobFilterOpen] = useState(false);
  const [montageNightOpen, setMontageNightOpen] = useState(false);

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

      const { entries: mEntries, settings: mSettings, changed } = migrateData(
        data?.entries,
        data?.settings
      );

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

  const saveEntry = (draft) => {
    setEntries((prev) => {
      const list = prev[sheetDate] || [];
      const exists = list.some((e) => e.id === draft.id);
      const nextList = exists ? list.map((e) => (e.id === draft.id ? draft : e)) : [...list, draft];
      return { ...prev, [sheetDate]: nextList };
    });
  };
  const deleteEntry = (id) => {
    setEntries((prev) => ({ ...prev, [sheetDate]: (prev[sheetDate] || []).filter((e) => e.id !== id) }));
  };

  const applyMontageNights = (list) => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const { key, entry } of list) {
        next[key] = [...(next[key] || []), entry];
      }
      return next;
    });
  };

  const activeJob = settings.jobs.find((j) => j.id === activeJobId);

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: BG_PAGE, color: TEXT, fontFamily: SYSTEM_FONT }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-1 shrink-0">
        <span className="text-xl font-bold">Zeiterfassung</span>
        <div className="flex items-center gap-2">
          {activeTab === "kalender" && (
            <button onClick={() => setMontageNightOpen(true)} className="p-1.5" style={{ color: ACCENT }} title="Montage mit Übernachtung">
              <Moon size={18} />
            </button>
          )}
          {settings.jobs.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setJobFilterOpen((o) => !o)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
                style={{ background: "#1C1C1E", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                {activeJob ? activeJob.name : "Alle Jobs"}
                <ChevronDown size={14} />
              </button>
              {jobFilterOpen && (
                <div className="absolute right-0 mt-1 rounded-xl overflow-hidden z-10" style={{ background: "#1C1C1E", border: `1px solid ${BORDER}` }}>
                  <button
                    onClick={() => { setActiveJobId(null); setJobFilterOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-xs whitespace-nowrap"
                    style={{ color: TEXT }}
                  >
                    Alle Jobs
                  </button>
                  {settings.jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => { setActiveJobId(j.id); setJobFilterOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-xs whitespace-nowrap"
                      style={{ color: TEXT }}
                    >
                      {j.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "kalender" && calMode === "month" && (
          <CalendarView
            year={year}
            month={month}
            entries={entries}
            settings={settings}
            activeJobId={activeJobId}
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
        {activeTab === "uebersicht" && (
          <OverviewView settings={settings} entries={entries} year={year} month={month} />
        )}
        {activeTab === "export" && (
          <ExportView
            settings={settings}
            entries={entries}
            year={year}
            month={month}
            activeJobId={activeJobId}
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
          dayEntries={entries[sheetDate] || []}
          settings={settings}
          onClose={() => setSheetDate(null)}
          onSaveEntry={saveEntry}
          onDeleteEntry={deleteEntry}
        />
      )}

      {montageNightOpen && (
        <MontageNightModal settings={settings} onClose={() => setMontageNightOpen(false)} onApply={applyMontageNights} />
      )}
    </div>
  );
}
