// Export: Zeilen für einen Monat aufbauen, PDF (Druckdialog)/Excel (.xls)/CSV erzeugen, Teilen/Download.
// Bewusst ohne externe Bibliotheken (jsPDF/xlsx) – im Sandbox-Build ohne npm-Registry-Zugriff
// nicht installierbar. Die Excel-Datei ist eine HTML-Tabelle mit .xls-Endung (öffnet in Excel,
// Numbers, Google Sheets zuverlässig, ganz ohne Bibliothek). PDF nutzt den nativen Druckdialog,
// wie schon in der Vorgängerversion – das funktioniert auf iOS/iPadOS zuverlässig fürs Teilen/
// Sichern als PDF.
import {
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  TYPE_META,
  TIME_TYPES,
  calcHours,
  montageAmount,
  overnightAmount,
  formatHours,
  getMonthDays,
  keyOf,
  jobById,
} from "./model";

export function buildMonthRows(settings, entries, year, month, jobFilterId) {
  const days = getMonthDays(year, month);
  const rows = [];
  for (const day of days) {
    const key = keyOf(day);
    const dayEntries = entries[key] || [];
    for (const e of dayEntries) {
      if (jobFilterId && e.jobId !== jobFilterId) continue;
      const job = jobById(settings, e.jobId);
      const meta = TYPE_META[e.type];
      const isTime = TIME_TYPES.includes(e.type);
      const stunden = isTime ? calcHours(e) : 0;
      const zulage = (montageAmount(e, job) || 0) + (overnightAmount(e, job) || 0) * (e.nights || 1);
      let taetigkeit = "";
      if (e.activityId === "sonstige") taetigkeit = e.activityNote || "Sonstige";
      else if (e.activityId && job) {
        const a = job.activities?.find((x) => x.id === e.activityId);
        taetigkeit = a?.label || "";
      }
      rows.push({
        datum: `${String(day.getDate()).padStart(2, "0")}.${String(day.getMonth() + 1).padStart(2, "0")}.${day.getFullYear()}`,
        wochentag: WEEKDAYS_SHORT[(day.getDay() + 6) % 7],
        job: job?.name || "",
        typ: meta?.label || e.type,
        von: isTime ? e.start || "" : "",
        bis: isTime ? e.end || "" : "",
        pause: isTime ? (e.breaks || []).reduce((s, b) => s + (Number(b) || 0), 0) : "",
        stunden: isTime ? formatHours(stunden) : "",
        projekt: e.project || "",
        taetigkeit,
        zulage: zulage ? zulage.toFixed(2).replace(".", ",") + " €" : "",
      });
    }
  }
  return rows;
}

export function subjectFor(name, year, month) {
  const monat = MONTH_NAMES[month];
  return `Stundenzettel ${monat} ${year}${name ? " " + name : ""}`;
}

function totalsFor(rows) {
  let hours = 0;
  for (const r of rows) {
    const h = parseFloat((r.stunden || "0").replace(",", "."));
    if (!Number.isNaN(h)) hours += h;
  }
  return hours;
}

const COLUMNS = [
  { key: "datum", header: "Datum" },
  { key: "wochentag", header: "Tag" },
  { key: "job", header: "Job" },
  { key: "typ", header: "Typ" },
  { key: "von", header: "Von" },
  { key: "bis", header: "Bis" },
  { key: "pause", header: "Pause (Min)" },
  { key: "stunden", header: "Stunden" },
  { key: "projekt", header: "Projekt" },
  { key: "taetigkeit", header: "Tätigkeit" },
  { key: "zulage", header: "Zulage" },
];

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildHtmlTable(rows, subject, totalHours) {
  const head = COLUMNS.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${COLUMNS.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  return `
    <h2 style="font-family:-apple-system,Arial,sans-serif;margin:0 0 4px">${escapeHtml(subject)}</h2>
    <p style="font-family:-apple-system,Arial,sans-serif;margin:0 0 12px;color:#555">Gesamtstunden: ${formatHours(totalHours)}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:-apple-system,Arial,sans-serif;font-size:12px">
      <thead style="background:#0A84FF;color:#fff"><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

// PDF: nativer Druckdialog (öffnet ein Fenster, ruft print() auf – von dort "Als PDF sichern"
// oder direkt "Teilen" wählen, funktioniert zuverlässig auf iPhone/iPad/Mac).
export function openPdfPrintDialog(rows, subject) {
  const totalHours = totalsFor(rows);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
    <body style="padding:24px">${buildHtmlTable(rows, subject, totalHours)}</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
  }, 300);
  return true;
}

// Excel: HTML-Tabelle mit .xls-Endung + Excel-MIME-Type – öffnet direkt in Excel/Numbers/Sheets.
export function buildExcelBlob(rows, subject) {
  const totalHours = totalsFor(rows);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>${buildHtmlTable(rows, subject, totalHours)}</body></html>`;
  return new Blob([html], { type: "application/vnd.ms-excel" });
}

export function buildCsvBlob(rows) {
  const lines = [COLUMNS.map((c) => c.header).join(";")];
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => String(r[c.key] ?? "").replace(/;/g, ",")).join(";"));
  }
  return new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
}

export function fileExtFor(format) {
  return format === "excel" ? "xls" : format === "csv" ? "csv" : "pdf";
}

// Führt den gewählten Export aus. mode: "share" | "download".
export async function runExport(rows, subject, format, filename, mode) {
  if (format === "pdf") {
    const ok = openPdfPrintDialog(rows, subject);
    return { method: ok ? "print-dialog" : "blocked" };
  }
  const blob = format === "excel" ? buildExcelBlob(rows, subject) : buildCsvBlob(rows);
  if (mode === "share") {
    return shareOrDownload(blob, filename, subject);
  }
  downloadBlob(blob, filename);
  return { method: "download" };
}

// Teilen (natives Share-Sheet) mit Fallback: Download + vorausgefüllte Mail (ohne Auto-Anhang)
export async function shareOrDownload(blob, filename, subject) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject, text: subject });
      return { method: "share" };
    } catch (err) {
      if (err?.name === "AbortError") return { method: "cancelled" };
      // fällt durch zu Download-Fallback
    }
  }
  downloadBlob(blob, filename);
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    "Anbei der Stundenzettel (Datei wurde separat heruntergeladen, bitte manuell anhängen)."
  )}`;
  window.open(mailto, "_blank");
  return { method: "download+mailto" };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
