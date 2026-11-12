// Export eines Monats als einfache Liste: Tag · Art (Arbeit/Schule/Krank/Urlaub) · Stunden,
// darunter die Übernachtungen (Montage). Als echte PDF-Datei, Excel (.xls) oder CSV –
// alles ohne externe Bibliotheken und synchron erzeugt, damit "Teilen" direkt funktioniert.
import {
  MONTH_NAMES,
  WEEKDAYS_SHORT,
  TYPE_META,
  TYPE_ORDER,
  calcHours,
  formatHours,
  formatDateKey,
  getMonthDays,
  keyOf,
  holidayName,
  isWeekend,
  tripsInMonth,
} from "./model";
import { PdfDoc, fitText } from "./pdf";

export function subjectFor(name, year, month) {
  const monat = MONTH_NAMES[month];
  return `Stundenzettel ${monat} ${year}${name ? " " + name : ""}`;
}

// Alle Daten für den Export eines Monats – unabhängig vom Dateiformat.
export function buildMonthExport(settings, entries, year, month) {
  const rows = [];
  const hoursByType = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
  const daysByType = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0]));
  let totalHours = 0;

  for (const day of getMonthDays(year, month)) {
    const key = keyOf(day);
    const entry = entries[key];
    const meta = entry ? TYPE_META[entry.type] : null;
    const holiday = holidayName(day);
    const hours = entry && meta ? calcHours(entry, day, settings) : null;
    if (entry && meta) {
      hoursByType[entry.type] += hours;
      daysByType[entry.type] += 1;
      totalHours += hours;
    }
    let art = meta ? meta.short : "";
    if (holiday) art = meta ? `${meta.short} (Feiertag)` : "Feiertag";
    rows.push({
      datum: formatDateKey(key),
      tag: WEEKDAYS_SHORT[(day.getDay() + 6) % 7],
      art,
      stunden: hours === null ? "" : formatHours(hours),
      frei: isWeekend(day) || !!holiday, // Wochenende/Feiertag (nur für die Optik)
    });
  }

  const trips = tripsInMonth(settings.montagen, year, month).map((t) => ({
    von: formatDateKey(t.from),
    bis: formatDateKey(t.to),
    ort: t.place || "",
    // Nächte, die in diesen Monat fallen; bei Montagen über den Monatswechsel mit Gesamtzahl
    naechte: t.nightsInMonth === t.nights ? String(t.nights) : `${t.nightsInMonth} (von ${t.nights})`,
    naechteImMonat: t.nightsInMonth,
  }));

  const summary = TYPE_ORDER.filter((t) => daysByType[t] > 0).map((t) => ({
    label: TYPE_META[t].short,
    stunden: formatHours(hoursByType[t]),
    tage: daysByType[t],
  }));

  return {
    title: `Stundenzettel ${MONTH_NAMES[month]} ${year}`,
    name: settings.name || "",
    rows,
    total: formatHours(totalHours),
    summary,
    trips,
    totalNights: trips.reduce((s, t) => s + t.naechteImMonat, 0),
    createdAt: formatDateKey(keyOf(new Date())),
  };
}

function summaryText(data) {
  return data.summary.map((s) => `${s.label} ${s.stunden} Std. (${s.tage} ${s.tage === 1 ? "Tag" : "Tage"})`).join("  ·  ");
}

const NO_TRIPS = "Keine Übernachtungen in diesem Monat.";

// ---------- PDF (echte Datei, A4) ----------

export function buildPdfBlob(data) {
  const doc = new PdfDoc({ title: data.name ? `${data.title} ${data.name}` : data.title });
  const left = 48;
  const right = doc.width - 48;
  const bottom = doc.height - 56;
  const rowH = 16.5;
  const col = { tag: left + 8, datum: left + 44, art: left + 130, stunden: right - 8 };
  let y = 0;

  const footer = () => doc.text(`Erstellt am ${data.createdAt}`, left, doc.height - 32, { size: 8, gray: 0.5 });
  const newPage = () => {
    doc.addPage();
    footer();
    y = 56;
  };
  const need = (h) => {
    if (y + h > bottom) newPage();
  };

  footer();
  doc.text(data.title, left, 66, { size: 17, bold: true });
  y = 78;
  if (data.name) {
    doc.text(data.name, left, 84, { size: 11, gray: 0.3 });
    y = 96;
  }

  // Tabellenkopf
  const header = (cells) => {
    doc.rect(left, y, right - left, 18, 0.88);
    for (const c of cells) doc.text(c.text, c.x, y + 12.5, { size: 9, bold: true, align: c.align });
    y += 18;
  };
  header([
    { text: "Tag", x: col.tag },
    { text: "Datum", x: col.datum },
    { text: "Art", x: col.art },
    { text: "Stunden", x: col.stunden, align: "right" },
  ]);

  for (const r of data.rows) {
    need(rowH);
    if (r.frei) doc.rect(left, y, right - left, rowH, 0.955);
    const base = y + 11.5;
    const gray = r.frei && !r.stunden ? 0.45 : 0;
    doc.text(r.tag, col.tag, base, { size: 9.5, gray });
    doc.text(r.datum, col.datum, base, { size: 9.5, gray });
    doc.text(r.art, col.art, base, { size: 9.5, gray });
    doc.text(r.stunden, col.stunden, base, { size: 9.5, align: "right" });
    y += rowH;
    doc.line(left, y, right, y, { gray: 0.85 });
  }

  // Summe
  need(20 + 16);
  doc.line(left, y, right, y, { gray: 0.2, width: 0.8 });
  doc.text("Gesamt", col.tag, y + 14, { size: 10.5, bold: true });
  doc.text(`${data.total} Std.`, col.stunden, y + 14, { size: 10.5, bold: true, align: "right" });
  y += 20;
  if (data.summary.length) {
    doc.text(fitText(summaryText(data), right - left - 16, 8.5), col.tag, y + 10, { size: 8.5, gray: 0.35 });
    y += 16;
  }

  // Übernachtungen
  y += 14;
  need(20 + 18 + rowH);
  doc.text("Übernachtungen (Montage)", left, y + 12, { size: 12, bold: true });
  y += 20;
  if (!data.trips.length) {
    doc.text(NO_TRIPS, left, y + 11, { size: 9.5, gray: 0.35 });
    y += rowH;
  } else {
    const tc = { von: left + 8, bis: left + 84, ort: left + 160, naechte: right - 8 };
    const tripHeader = () =>
      header([
        { text: "Von", x: tc.von },
        { text: "Bis", x: tc.bis },
        { text: "Ort", x: tc.ort },
        { text: "Nächte", x: tc.naechte, align: "right" },
      ]);
    tripHeader();
    for (const t of data.trips) {
      if (y + rowH > bottom) {
        newPage();
        tripHeader();
      }
      const base = y + 11.5;
      doc.text(t.von, tc.von, base, { size: 9.5 });
      doc.text(t.bis, tc.bis, base, { size: 9.5 });
      doc.text(fitText(t.ort, tc.naechte - tc.ort - 70, 9.5), tc.ort, base, { size: 9.5 });
      doc.text(t.naechte, tc.naechte, base, { size: 9.5, align: "right" });
      y += rowH;
      doc.line(left, y, right, y, { gray: 0.85 });
    }
    need(20);
    doc.line(left, y, right, y, { gray: 0.2, width: 0.8 });
    doc.text("Übernachtungen gesamt", tc.von, y + 14, { size: 10.5, bold: true });
    doc.text(String(data.totalNights), tc.naechte, y + 14, { size: 10.5, bold: true, align: "right" });
    y += 20;
  }

  return doc.toBlob();
}

// ---------- Excel (HTML-Tabelle mit .xls-Endung – öffnet in Excel/Numbers/Sheets) ----------

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function buildExcelBlob(data) {
  const font = "font-family:-apple-system,Arial,sans-serif";
  const th = (t) => `<th style="background:#0A84FF;color:#fff;text-align:left">${escapeHtml(t)}</th>`;
  const dayRows = data.rows
    .map(
      (r) =>
        `<tr${r.frei ? ' style="background:#F2F2F2"' : ""}><td>${escapeHtml(r.datum)}</td><td>${escapeHtml(r.tag)}</td><td>${escapeHtml(r.art)}</td><td style="text-align:right">${escapeHtml(r.stunden)}</td></tr>`
    )
    .join("");
  const tripRows = data.trips.length
    ? data.trips
        .map((t) => `<tr><td>${escapeHtml(t.von)}</td><td>${escapeHtml(t.bis)}</td><td>${escapeHtml(t.ort)}</td><td style="text-align:right">${escapeHtml(t.naechte)}</td></tr>`)
        .join("") + `<tr><td colspan="3"><b>Übernachtungen gesamt</b></td><td style="text-align:right"><b>${data.totalNights}</b></td></tr>`
    : `<tr><td colspan="4">${escapeHtml(NO_TRIPS)}</td></tr>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2 style="${font};margin:0 0 4px">${escapeHtml(data.title)}</h2>
      ${data.name ? `<p style="${font};margin:0 0 12px;color:#555">${escapeHtml(data.name)}</p>` : ""}
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;${font};font-size:12px">
        <thead><tr>${th("Datum")}${th("Tag")}${th("Art")}${th("Stunden")}</tr></thead>
        <tbody>${dayRows}
          <tr><td colspan="3"><b>Gesamt</b></td><td style="text-align:right"><b>${escapeHtml(data.total)}</b></td></tr>
        </tbody>
      </table>
      <h3 style="${font};margin:16px 0 4px">Übernachtungen (Montage)</h3>
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;${font};font-size:12px">
        <thead><tr>${th("Von")}${th("Bis")}${th("Ort")}${th("Nächte")}</tr></thead>
        <tbody>${tripRows}</tbody>
      </table>
    </body></html>`;
  return new Blob([html], { type: "application/vnd.ms-excel" });
}

// ---------- CSV ----------

function csvCell(value) {
  let s = String(value ?? "");
  // Freitext, der wie eine Formel beginnt, entschärfen (Excel würde ihn sonst ausführen)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsvBlob(data) {
  const line = (...cells) => cells.map(csvCell).join(";");
  const lines = [line("Datum", "Tag", "Art", "Stunden")];
  for (const r of data.rows) lines.push(line(r.datum, r.tag, r.art, r.stunden));
  lines.push(line("Gesamt", "", "", data.total));
  lines.push("");
  lines.push(line("Übernachtungen (Montage)"));
  if (data.trips.length) {
    lines.push(line("Von", "Bis", "Ort", "Nächte"));
    for (const t of data.trips) lines.push(line(t.von, t.bis, t.ort, t.naechte));
    lines.push(line("Übernachtungen gesamt", "", "", data.totalNights));
  } else {
    lines.push(line(NO_TRIPS));
  }
  // BOM vorneweg, damit Excel die Umlaute richtig liest
  return new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

// ---------- Ausführen ----------

export function fileExtFor(format) {
  return format === "excel" ? "xls" : format === "csv" ? "csv" : "pdf";
}

export function buildBlob(data, format) {
  if (format === "excel") return buildExcelBlob(data);
  if (format === "csv") return buildCsvBlob(data);
  return buildPdfBlob(data);
}

// Führt den gewählten Export aus. mode: "share" | "download".
// Wichtig: bis zum Aufruf von navigator.share läuft alles synchron (kein await davor),
// sonst verweigert Safari das Teilen-Menü.
export function runExport(data, subject, format, filename, mode) {
  const blob = buildBlob(data, format);
  if (mode === "share") return shareOrDownload(blob, filename, subject);
  downloadBlob(blob, filename);
  return Promise.resolve({ method: "download" });
}

// Teilen (natives Share-Sheet) mit Fallback: Download + vorausgefüllte Mail (ohne Auto-Anhang)
export async function shareOrDownload(blob, filename, subject) {
  let file = null;
  try {
    file = new File([blob], filename, { type: blob.type });
  } catch {
    file = null;
  }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject });
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
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
