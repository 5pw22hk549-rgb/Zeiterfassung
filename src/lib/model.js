// Zentrales Datenmodell: Konstanten, Zeit-/Datumshelfer, Migration, Berechnungen.
// Vereinfachtes Modell: ein Job, ein Eintrag pro Tag, vier Typen (Arbeiten,
// Urlaub, Krank, Schule). Feiertage (NRW) werden automatisch erkannt, nicht
// manuell eingetragen.

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
export const HOLIDAY = "#BF5AF2";
export const MONTAGE = "#64D2FF";
export const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Eintragstypen (nur noch vier – Feiertage werden automatisch erkannt, kein manueller Typ)
export const TYPE_META = {
  arbeit: { label: "Arbeiten", short: "Arbeit", color: "#0A84FF" },
  urlaub: { label: "Urlaub", short: "Urlaub", color: "#32D74A" },
  krank: { label: "Krank", short: "Krank", color: "#FF453A" },
  schule: { label: "Schule", short: "Schule", color: "#6E8CA0" },
};
export const TYPE_ORDER = ["arbeit", "urlaub", "krank", "schule"];
// Typen mit Start-/Endzeit (arbeit MIT Pause(n), schule OHNE Pause)
export const TIME_TYPES = ["arbeit", "schule"];
export const BREAK_TYPES = ["arbeit"];
// Urlaub/Krank zählen immer pauschal mit dieser Stundenzahl
export const FIXED_DAY_HOURS = 8;

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

export function defaultSettings() {
  return {
    name: "",
    weeklyHours: 40,
    workDaysPerWeek: 5,
    vacationDaysPerYear: 30,
    defaults: {
      arbeit: { start: "07:00", end: "15:45", pause: 45 },
      schule: { start: "07:00", end: "15:00", pause: 0 },
    },
    activities: DEFAULT_ACTIVITIES.map((a) => ({ ...a })),
    // Montage mit Übernachtung: [{ id, from: "YYYY-MM-DD", to: "YYYY-MM-DD", place }]
    montagen: [],
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

export function sumBreaks(breaks) {
  if (!Array.isArray(breaks)) return 0;
  return breaks.reduce((s, b) => s + (Number(b) || 0), 0);
}

// Stunden für einen einzelnen Tageseintrag.
// Urlaub/Krank = immer pauschal 8 Std. – aber nur an Soll-Arbeitstagen
// (an Wochenende/Feiertag 0 Std., sonst entstehen falsche Überstunden).
export function calcHours(entry, date, settings) {
  if (!entry) return 0;
  if (entry.type === "urlaub" || entry.type === "krank") {
    if (date && !isWorkday(date, settings?.workDaysPerWeek ?? 5)) return 0;
    return FIXED_DAY_HOURS;
  }
  if (!TIME_TYPES.includes(entry.type)) return 0;
  const start = timeToMinutes(entry.start);
  let end = timeToMinutes(entry.end);
  if (end < start) end += 24 * 60; // über Mitternacht
  const pause = BREAK_TYPES.includes(entry.type) ? sumBreaks(entry.breaks) : 0;
  const mins = Math.max(0, end - start - pause);
  return mins / 60;
}

// Stunden immer im Viertelstunden-tauglichen Format: 8,0 · 7,5 · 7,75 · 7,25
export function formatHours(h) {
  if (h === undefined || h === null || Number.isNaN(h)) return "0,0";
  const rounded = Math.round(h * 100) / 100;
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const twoDecimals = Math.round(abs * 100) % 10 !== 0;
  return sign + abs.toFixed(twoDecimals ? 2 : 1).replace(".", ",");
}

// ---------- Viertelstunden-Raster ----------

export const QUARTER_MINUTES = 15;

// Alle Uhrzeiten im 15-Minuten-Raster: "00:00", "00:15", … "23:45"
export const QUARTER_TIMES = Array.from({ length: 96 }, (_, i) => `${pad2(Math.floor(i / 4))}:${pad2((i % 4) * 15)}`);

// Pausenlängen im 15-Minuten-Raster (Minuten)
export const PAUSE_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120];

export function isQuarterTime(t) {
  return typeof t === "string" && /^\d{2}:\d{2}$/.test(t) && timeToMinutes(t) % QUARTER_MINUTES === 0;
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

export function getYearDays(year) {
  const days = [];
  for (let m = 0; m < 12; m++) days.push(...getMonthDays(year, m));
  return days;
}

// ---------- Feiertage (Nordrhein-Westfalen), automatisch berechnet ----------

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Gauß'sche Osterformel
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map();

// Liefert { "YYYY-MM-DD": "Name des Feiertags" } für NRW
export function getHolidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const ostern = easterSunday(year);
  const map = {};
  const add = (date, name) => {
    map[keyOf(date)] = name;
  };
  add(new Date(year, 0, 1), "Neujahr");
  add(addDays(ostern, -2), "Karfreitag");
  add(addDays(ostern, 1), "Ostermontag");
  add(new Date(year, 4, 1), "Tag der Arbeit");
  add(addDays(ostern, 39), "Christi Himmelfahrt");
  add(addDays(ostern, 50), "Pfingstmontag");
  add(addDays(ostern, 60), "Fronleichnam");
  add(new Date(year, 9, 3), "Tag der Deutschen Einheit");
  add(new Date(year, 10, 1), "Allerheiligen");
  add(new Date(year, 11, 25), "1. Weihnachtstag");
  add(new Date(year, 11, 26), "2. Weihnachtstag");
  holidayCache.set(year, map);
  return map;
}

export function holidayName(date) {
  return getHolidays(date.getFullYear())[keyOf(date)] || null;
}

export function isHoliday(date) {
  return !!holidayName(date);
}

// ---------- Montage mit Übernachtung ----------
// Reine Dokumentation (von wann bis wann, wo) – hat keinen Einfluss auf die Stunden.

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(key) {
  if (typeof key !== "string" || !DATE_KEY_RE.test(key)) return false;
  return keyOf(parseKey(key)) === key; // fängt z. B. 2026-02-31 ab
}

// "2026-11-03" -> "03.11.2026"
export function formatDateKey(key) {
  if (!isDateKey(key)) return "";
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

// Anzahl Nächte zwischen zwei Datums-Keys (to - from in Tagen)
export function nightsBetween(fromKey, toKey) {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

export function tripNights(trip) {
  return Math.max(0, nightsBetween(trip.from, trip.to));
}

// Unbekannte/kaputte Einträge raus, sortiert nach Beginn
export function sanitizeTrips(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    if (!isDateKey(t.from) || !isDateKey(t.to) || t.to <= t.from) continue;
    const id = typeof t.id === "string" && t.id ? t.id : newId();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, from: t.from, to: t.to, place: String(t.place ?? "").trim() });
  }
  return sortTrips(out);
}

export function sortTrips(trips) {
  return [...trips].sort((a, b) => (a.from === b.from ? (a.to < b.to ? -1 : a.to > b.to ? 1 : 0) : a.from < b.from ? -1 : 1));
}

// Montagen, die einen Tag berühren (An- und Abreisetag zählen dazu)
export function tripsForDay(trips, key) {
  return (trips || []).filter((t) => t.from <= key && key <= t.to);
}

// Überschneidet sich eine Montage mit einer anderen? (Rückkehr und neue Abfahrt am selben Tag ist erlaubt)
export function findOverlappingTrip(trips, candidate) {
  return (trips || []).find((t) => t.id !== candidate.id && t.from < candidate.to && candidate.from < t.to) || null;
}

// Montagen, die den Monat berühren – mit Nächten, die in diesen Monat fallen.
// Eine Nacht zählt zu dem Monat, in dem sie beginnt (Nacht vom 30.11. auf 01.12. = November).
export function tripsInMonth(trips, year, month) {
  const first = dateKey(year, month, 1);
  const last = dateKey(year, month, new Date(year, month + 1, 0).getDate());
  const nextFirst = keyOf(new Date(year, month + 1, 1));
  const out = [];
  for (const t of sortTrips(trips || [])) {
    if (t.to < first || t.from > last) continue;
    const start = t.from < first ? first : t.from;
    const end = t.to > nextFirst ? nextFirst : t.to;
    out.push({ ...t, nights: tripNights(t), nightsInMonth: Math.max(0, nightsBetween(start, end)) });
  }
  return out;
}

// ---------- Migration (ältere Datenformate -> aktuelles einfaches Modell) ----------

const ALLOWED_TYPES = new Set(TYPE_ORDER);

// Bringt einen Eintrag auf genau die Felder, die sein Typ braucht.
export function stripEntry(e) {
  if (!e || !ALLOWED_TYPES.has(e.type)) return null;
  const out = { type: e.type };
  if (TIME_TYPES.includes(e.type)) {
    out.start = e.start || "";
    out.end = e.end || "";
    if (BREAK_TYPES.includes(e.type)) out.breaks = Array.isArray(e.breaks) ? e.breaks : [];
    if (e.type === "arbeit") {
      out.activityId = e.activityId || "";
      out.activityNote = e.activityNote || "";
    }
  }
  return out;
}

function minutesToTime(m) {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(x / 60))}:${pad2(x % 60)}`;
}

// Mehrere Alt-Einträge eines Tages -> genau ein Eintrag.
// Mehrere Arbeitsblöcke werden ZUSAMMENGEFÜHRT (frühester Start, spätestes Ende,
// Lücken werden zur Pause), damit keine Stunden verloren gehen.
function pickEntry(list) {
  const mapped = list
    .map((e) => {
      if (e && e.type === "montage") return { ...e, type: "arbeit" }; // alte Montage-Buchung -> normale Arbeitszeit
      return e;
    })
    .filter((e) => e && ALLOWED_TYPES.has(e.type));
  if (!mapped.length) return null;
  const work = mapped.filter((e) => e.type === "arbeit" && e.start && e.end);
  if (work.length > 1) {
    const totalMin = work.reduce((s, e) => s + calcHours(e) * 60, 0);
    const starts = work.map((e) => timeToMinutes(e.start));
    const ends = work.map((e) => {
      const st = timeToMinutes(e.start);
      let en = timeToMinutes(e.end);
      if (en < st) en += 1440;
      return en;
    });
    const minS = Math.min(...starts);
    const maxE = Math.max(...ends);
    const pause = Math.max(0, Math.round(maxE - minS - totalMin));
    const withAct = work.find((e) => e.activityId) || work[0];
    return {
      type: "arbeit",
      start: minutesToTime(minS),
      end: minutesToTime(maxE),
      breaks: pause ? [pause] : [],
      activityId: withAct.activityId || "",
      activityNote: withAct.activityNote || "",
    };
  }
  return mapped.find((e) => e.type === "arbeit") || mapped[0];
}

export function migrateData(rawEntries, rawSettings) {
  let changed = false;
  let settings;

  if (!rawSettings || !Object.keys(rawSettings).length) {
    settings = defaultSettings();
    changed = true;
  } else if (Array.isArray(rawSettings.jobs)) {
    // Mehrjob-Format (Feinschliff v1) -> ersten Job als flache Einstellungen übernehmen
    const job = rawSettings.jobs[0] || {};
    const base = defaultSettings();
    settings = {
      name: rawSettings.name || "",
      weeklyHours: job.weeklyHours ?? base.weeklyHours,
      workDaysPerWeek: job.workDaysPerWeek ?? base.workDaysPerWeek,
      vacationDaysPerYear: job.vacationDaysPerYear ?? base.vacationDaysPerYear,
      defaults: {
        arbeit: job.defaults?.arbeit || base.defaults.arbeit,
        schule: job.defaults?.schule || base.defaults.schule,
      },
      activities: job.activities?.length ? job.activities : base.activities,
      montagen: [],
    };
    changed = true;
  } else {
    // Bereits flaches Format (sehr alt oder schon aktuell)
    const base = defaultSettings();
    settings = {
      name: rawSettings.name || "",
      weeklyHours: rawSettings.weeklyHours ?? base.weeklyHours,
      workDaysPerWeek: rawSettings.workDaysPerWeek ?? base.workDaysPerWeek,
      vacationDaysPerYear: rawSettings.vacationDaysPerYear ?? base.vacationDaysPerYear,
      defaults: {
        arbeit: rawSettings.defaults?.arbeit || base.defaults.arbeit,
        schule: rawSettings.defaults?.schule || base.defaults.schule,
      },
      activities: rawSettings.activities?.length ? rawSettings.activities : base.activities,
      montagen: sanitizeTrips(rawSettings.montagen),
    };
    if (!rawSettings.activities?.length) changed = true;
    if (JSON.stringify(settings.montagen) !== JSON.stringify(rawSettings.montagen)) changed = true;
    // Altlasten (Übernachtung, Zulagen, Kunden, Projekte, Jobs …) fliegen raus
    if (Object.keys(rawSettings).some((k) => !(k in settings))) changed = true;
  }

  const entries = {};
  const raw = rawEntries || {};
  for (const key of Object.keys(raw)) {
    const val = raw[key];
    let entry = null;
    if (Array.isArray(val)) {
      entry = stripEntry(pickEntry(val));
      changed = true;
    } else if (val && typeof val === "object") {
      const stripped = stripEntry(val.type === "montage" ? { ...val, type: "arbeit" } : val);
      entry = stripped;
      if (JSON.stringify(stripped) !== JSON.stringify(val)) changed = true;
    }
    if (entry) entries[key] = entry;
    else if (val) changed = true;
  }

  return { entries, settings, changed };
}

// ---------- Übersicht-Berechnungen ----------

export function isWorkday(date, workDaysPerWeek = 5) {
  const dow = date.getDay(); // 0=So .. 6=Sa
  if (isHoliday(date)) return false;
  if (workDaysPerWeek >= 6) return dow !== 0;
  return dow !== 0 && dow !== 6;
}

// Frühester und spätester Tag mit Eintrag ("YYYY-MM-DD") – für die Gesamt-Übersicht.
export function entryRange(entries) {
  let min = null;
  let max = null;
  for (const key of Object.keys(entries || {})) {
    if (!isDateKey(key)) continue;
    if (min === null || key < min) min = key;
    if (max === null || key > max) max = key;
  }
  return min === null ? null : { first: min, last: max };
}

// Alle Tage von/bis (einschließlich) als Date-Liste
export function getDaysBetween(fromKey, toKey) {
  const days = [];
  const end = parseKey(toKey);
  for (let d = parseKey(fromKey); d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function calcStats(settings, entries, days, yearDays) {
  // (Urlaub/Krank an Wochenende/Feiertag zählen weder Stunden noch Tage)
  const dailyHours = settings.workDaysPerWeek > 0 ? settings.weeklyHours / settings.workDaysPerWeek : 0;
  let istStunden = 0;
  let sollTage = 0;
  let urlaubTageGenommen = 0;
  let krankTage = 0;
  let schulTage = 0;
  let feiertagTage = 0;

  for (const day of days) {
    if (isHoliday(day)) feiertagTage += 1;
    const entry = entries[keyOf(day)];
    if (!entry) continue; // Tage ohne Eintrag zählen NICHT als Minusstunden

    // Soll gibt es nur für Arbeitstage, an denen etwas eingetragen ist. So entstehen
    // Über-/Minusstunden ausschließlich aus dem, was wirklich erfasst wurde – und nicht
    // daraus, dass Tage noch nicht eingetragen sind oder in der Zukunft liegen.
    const workday = isWorkday(day, settings.workDaysPerWeek);
    if (workday) sollTage += 1;

    if (entry.type === "arbeit" || entry.type === "schule") {
      istStunden += calcHours(entry);
      if (entry.type === "schule") schulTage += 1;
    } else if (entry.type === "urlaub") {
      if (workday) urlaubTageGenommen += 1;
      istStunden += calcHours(entry, day, settings);
    } else if (entry.type === "krank") {
      if (workday) krankTage += 1;
      istStunden += calcHours(entry, day, settings);
    }
  }

  const sollStunden = sollTage * dailyHours;
  // auf 2 Stellen runden, damit aus Rechenungenauigkeit kein "-0,0" wird
  const ueberstunden = Math.round((istStunden - sollStunden) * 100) / 100 || 0;
  const urlaubJahr = yearDays ? calcVacationTaken(entries, yearDays, settings.workDaysPerWeek) : urlaubTageGenommen;
  const resturlaub = settings.vacationDaysPerYear - urlaubJahr;

  return {
    istStunden,
    sollStunden,
    ueberstunden,
    urlaubTageGenommen,
    resturlaub,
    krankTage,
    schulTage,
    feiertagTage,
  };
}

function calcVacationTaken(entries, yearDays, workDaysPerWeek) {
  let n = 0;
  for (const day of yearDays) {
    const entry = entries[keyOf(day)];
    if (entry && entry.type === "urlaub" && isWorkday(day, workDaysPerWeek)) n += 1;
  }
  return n;
}

// month: 0–11 = dieser Monat · null = ganzes Jahr · "gesamt" = alles, was je eingetragen wurde.
// Resturlaub bezieht sich immer auf das angezeigte Jahr.
export function calcOverview(settings, entries, year, month) {
  let days;
  if (month === "gesamt") {
    const range = entryRange(entries);
    days = range ? getDaysBetween(range.first, range.last) : [];
  } else if (month === null || month === undefined) {
    days = getYearDays(year);
  } else {
    days = getMonthDays(year, month);
  }
  return calcStats(settings, entries, days, getYearDays(year));
}
