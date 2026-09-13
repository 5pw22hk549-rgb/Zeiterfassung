// Zentrales Datenmodell: Konstanten, Zeit-/Datumshelfer, Migration, Berechnungen.

export const ACCENT = "#0A84FF";
export const BG_PAGE = "#000000";
export const BG_SURFACE = "#1C1C1E";
export const BG_SURFACE_2 = "#2C2C2E";
export const BORDER = "#38383A";
export const TEXT = "#FFFFFF";
export const TEXT_MUTED = "#8E8E93";
export const SUCCESS = "#32D74A";
export const DANGER = "#FF453A";
export const WARNING = "#FF9F0A";
export const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Eintragstypen
export const TYPE_META = {
  arbeit: { label: "Arbeiten", short: "Arbeit", color: "#0A84FF", hasBreaks: true, hasTimes: true },
  fahrtzeit: { label: "Fahrtzeit", short: "Fahrt", color: "#5E9CD3", hasBreaks: true, hasTimes: true },
  schule: { label: "Schule", short: "Schule", color: "#6E8CA0", hasBreaks: false, hasTimes: true },
  urlaub: { label: "Urlaub", short: "Urlaub", color: "#32D74A", hasBreaks: false, hasTimes: false },
  feiertag: { label: "Feiertag", short: "Feiertag", color: "#BF5AF2", hasBreaks: false, hasTimes: false },
  krank: { label: "Krank", short: "Krank", color: "#FF453A", hasBreaks: false, hasTimes: false },
};
export const TYPE_ORDER = ["arbeit", "fahrtzeit", "urlaub", "feiertag", "schule", "krank"];
// Zeittypen mit Stunden-Berechnung (arbeit/fahrtzeit MIT Pause, schule OHNE Pause)
export const TIME_TYPES = ["arbeit", "fahrtzeit", "schule"];
export const BREAK_TYPES = ["arbeit", "fahrtzeit"];
export const FREE_DAY_TYPES = ["urlaub", "feiertag", "krank"];

export const MONTAGE_LEVELS = [
  { id: "unter8", label: "unter 8 Std." },
  { id: "mittel", label: "8–24 Std." },
  { id: "hoch", label: "ab 24 Std." },
];

export const DEFAULT_ACTIVITIES = [
  { id: "platten", label: "Platten zuschnitt" },
  { id: "kanten", label: "Kanten anfahren" },
  { id: "cnc", label: "CNC" },
  { id: "zusammenbau", label: "Zusammenbau / Vorbereitung" },
  { id: "sonstige", label: "Sonstige" },
];

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createDefaultJob(name = "Job 1") {
  return {
    id: newId(),
    name,
    weeklyHours: 40,
    workDaysPerWeek: 5,
    vacationDaysPerYear: 30,
    montageRates: { unter8: 0, mittel: 14, hoch: 28 },
    overnightRate: 35,
    defaults: {
      arbeit: { start: "07:00", end: "15:45", pause: 45 },
      fahrtzeit: { start: "07:00", end: "08:00", pause: 0 },
      schule: { start: "07:00", end: "15:00", pause: 0 },
    },
    activities: DEFAULT_ACTIVITIES.map((a) => ({ ...a })),
  };
}

export function defaultSettings() {
  return {
    name: "",
    jobs: [createDefaultJob("Tischlerei")],
  };
}

// ---------- Zeit-/Datumshelfer ----------

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function dateKey(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function keyOf(date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function sumBreaks(breaks) {
  if (!Array.isArray(breaks)) return 0;
  return breaks.reduce((s, b) => s + (Number(b) || 0), 0);
}

// Stunden für einen einzelnen Eintrag (nur arbeit/fahrtzeit haben Zeiten)
export function calcHours(entry) {
  if (!entry || !TIME_TYPES.includes(entry.type)) return 0;
  const start = timeToMinutes(entry.start);
  let end = timeToMinutes(entry.end);
  if (end < start) end += 24 * 60; // über Mitternacht
  const pause = sumBreaks(entry.breaks);
  const mins = Math.max(0, end - start - pause);
  return mins / 60;
}

export function formatHours(h) {
  if (h === undefined || h === null || Number.isNaN(h)) return "0,0";
  const sign = h < 0 ? "-" : "";
  const abs = Math.abs(h);
  return sign + abs.toFixed(1).replace(".", ",");
}

export function montageAmount(entry, job) {
  if (!entry || !entry.montage || !entry.montage.on || !job) return 0;
  const rate = job.montageRates?.[entry.montage.level] || 0;
  return rate;
}

export function overnightAmount(entry, job) {
  if (!entry || entry.type !== "uebernachtung" || !job) return 0;
  return job.overnightRate || 0;
}

export const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Liste aller Tage im Monat
export function getMonthDays(year, month) {
  const days = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d++) days.push(new Date(year, month, d));
  return days;
}

// Monats-Matrix (Montag-first) für die Jahresansicht (Mini-Kalender)
export function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Montag = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function generateDateRange(startStr, endStr) {
  const out = [];
  let cur = parseKey(startStr);
  const end = parseKey(endStr);
  while (cur <= end) {
    out.push(keyOf(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

// ---------- Migration Alt -> Neu ----------

function isOldSettings(settings) {
  return settings && !Array.isArray(settings.jobs);
}

function isOldEntry(entry) {
  return entry && !Array.isArray(entry) && typeof entry === "object";
}

export function migrateData(rawEntries, rawSettings) {
  let settings = rawSettings && Object.keys(rawSettings).length ? rawSettings : null;
  let migratedSettings = false;
  let job;

  if (!settings) {
    settings = defaultSettings();
    migratedSettings = true;
    job = settings.jobs[0];
  } else if (isOldSettings(settings)) {
    job = createDefaultJob("Job 1");
    job.weeklyHours = settings.weeklyHours ?? job.weeklyHours;
    job.workDaysPerWeek = settings.workDaysPerWeek ?? job.workDaysPerWeek;
    job.vacationDaysPerYear = settings.vacationDaysPerYear ?? job.vacationDaysPerYear;
    if (settings.montageRates) job.montageRates = { ...job.montageRates, ...settings.montageRates };
    if (settings.defaults) {
      job.defaults.arbeit = settings.defaults.arbeit || job.defaults.arbeit;
      job.defaults.schule = settings.defaults.schule || job.defaults.schule;
    }
    settings = { name: "", jobs: [job] };
    migratedSettings = true;
  } else {
    job = settings.jobs[0];
    // Fehlende Felder je Job auffüllen (Vorwärtskompatibilität)
    settings = {
      ...settings,
      jobs: settings.jobs.map((j) => ({
        ...createDefaultJob(j.name),
        ...j,
        montageRates: { ...createDefaultJob().montageRates, ...(j.montageRates || {}) },
        defaults: { ...createDefaultJob().defaults, ...(j.defaults || {}) },
        activities: j.activities?.length ? j.activities : DEFAULT_ACTIVITIES.map((a) => ({ ...a })),
      })),
    };
    job = settings.jobs[0];
  }

  const fallbackJobId = settings.jobs[0]?.id;
  let migratedEntries = false;
  const entries = {};
  const raw = rawEntries || {};
  for (const key of Object.keys(raw)) {
    const val = raw[key];
    if (Array.isArray(val)) {
      entries[key] = val.map((e) => ({ jobId: fallbackJobId, breaks: [], ...e }));
    } else if (isOldEntry(val)) {
      migratedEntries = true;
      const type = val.type === "montage" ? "arbeit" : val.type;
      const migrated = {
        id: newId(),
        jobId: fallbackJobId,
        type,
        start: val.start,
        end: val.end,
        breaks: type !== "schule" && val.pause ? [val.pause] : [],
        project: "",
        activityId: "",
        activityNote: "",
      };
      if (val.type === "montage") {
        migrated.montage = { on: true, level: val.montageLevel || "unter8", overnight: false, nights: val.nights || 0 };
      }
      entries[key] = [migrated];
    }
  }

  return { entries, settings, changed: migratedSettings || migratedEntries };
}

// ---------- Übersicht-Berechnungen ----------

function countWorkdaysInRange(days, workDaysPerWeek) {
  // Vereinfachte Annahme: Mo-Fr sind Arbeitstage bei 5-Tage-Woche, sonst Mo-Sa bei 6.
  return days.filter((d) => {
    const dow = d.getDay(); // 0=So .. 6=Sa
    if (workDaysPerWeek >= 6) return dow !== 0;
    return dow !== 0 && dow !== 6;
  }).length;
}

// Berechnet Kennzahlen für einen Job über eine Liste von Tagen (Monat oder Jahr)
export function calcJobStats(job, entries, days, yearDays) {
  const dailyHours = job.workDaysPerWeek > 0 ? job.weeklyHours / job.workDaysPerWeek : 0;
  let istStunden = 0;
  let sollTage = 0;
  let urlaubTageGenommen = 0;
  let krankTage = 0;
  let schulTage = 0;
  let feiertagTage = 0;
  let montageTageSet = new Set();
  let montageZulageSumme = 0;
  let uebernachtungen = 0;

  for (const day of days) {
    const key = keyOf(day);
    const dayEntries = (entries[key] || []).filter((e) => e.jobId === job.id);
    if (!dayEntries.length) continue;
    const isWorkday = countWorkdaysInRange([day], job.workDaysPerWeek) > 0;
    if (isWorkday) sollTage += 1;

    for (const e of dayEntries) {
      if (TIME_TYPES.includes(e.type)) {
        istStunden += calcHours(e);
        if (e.type === "arbeit") {
          montageZulageSumme += montageAmount(e, job);
          if (e.montage?.on) montageTageSet.add(key);
        }
        if (e.type === "schule") schulTage += 1;
      } else if (e.type === "urlaub") {
        urlaubTageGenommen += 1;
      } else if (e.type === "krank") {
        krankTage += 1;
      } else if (e.type === "feiertag") {
        feiertagTage += 1;
      } else if (e.type === "uebernachtung") {
        uebernachtungen += (e.nights || 1);
        montageZulageSumme += overnightAmount(e, job) * (e.nights || 1);
      }
    }
  }

  const sollStunden = sollTage * dailyHours;
  const ueberstunden = istStunden - sollStunden;
  const urlaubJahr = yearDays ? calcVacationTaken(job, entries, yearDays) : urlaubTageGenommen;
  const resturlaub = job.vacationDaysPerYear - urlaubJahr;

  return {
    jobId: job.id,
    jobName: job.name,
    istStunden,
    sollStunden,
    ueberstunden,
    urlaubTageGenommen,
    resturlaub,
    krankTage,
    schulTage,
    feiertagTage,
    montageTage: montageTageSet.size,
    montageZulageSumme,
    uebernachtungen,
  };
}

function calcVacationTaken(job, entries, yearDays) {
  let n = 0;
  for (const day of yearDays) {
    const key = keyOf(day);
    const dayEntries = (entries[key] || []).filter((e) => e.jobId === job.id && e.type === "urlaub");
    if (dayEntries.length) n += 1;
  }
  return n;
}

export function calcOverview(settings, entries, year, month /* 0-11 oder null für Jahr */) {
  const days = month === null || month === undefined ? getYearDays(year) : getMonthDays(year, month);
  const yearDays = getYearDays(year);
  return settings.jobs.map((job) => calcJobStats(job, entries, days, yearDays));
}

export function getYearDays(year) {
  const days = [];
  for (let m = 0; m < 12; m++) days.push(...getMonthDays(year, m));
  return days;
}

export function jobById(settings, id) {
  return settings.jobs.find((j) => j.id === id);
}
