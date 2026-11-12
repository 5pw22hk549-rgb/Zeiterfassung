// Winziger PDF-Schreiber (A4, Text + Linien + Flächen, Helvetica/Helvetica-Bold).
// Bewusst ohne Bibliothek: Die Datei entsteht sofort und synchron – nur so darf der Browser
// direkt im Tipp auf "Teilen" das Teilen-Menü öffnen (nachgeladene Bibliotheken würden das
// auf dem iPhone blockieren). Reicht für eine einfache Stundenliste vollkommen aus.

const PAGE_W = 595.28;
const PAGE_H = 841.89;

// Zeichenbreiten (1/1000 Schriftgröße) der Standardschriften für WinAnsi-Codes 32–255
const W_REGULAR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

// Unicode -> WinAnsi (cp1252) für die Zeichen außerhalb von Latin-1
const CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x201e: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
};

function toWinAnsi(str) {
  const out = [];
  for (const ch of String(str ?? "").normalize("NFC")) {
    const cp = ch.codePointAt(0);
    if (cp >= 32 && cp <= 126) out.push(cp);
    else if (cp >= 160 && cp <= 255) out.push(cp);
    else if (CP1252[cp]) out.push(CP1252[cp]);
    else if (cp === 9 || cp === 10 || cp === 13) out.push(32);
    else out.push(63); // "?"
  }
  return out;
}

export function textWidth(str, size, bold = false) {
  const table = bold ? W_BOLD : W_REGULAR;
  let w = 0;
  for (const code of toWinAnsi(str)) w += table[code - 32] ?? 556;
  return (w * size) / 1000;
}

// Kürzt Text mit "…", bis er in die Breite passt
export function fitText(str, maxWidth, size, bold = false) {
  let s = String(str ?? "");
  if (textWidth(s, size, bold) <= maxWidth) return s;
  while (s.length > 1 && textWidth(s + "…", size, bold) > maxWidth) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

const num = (n) => (Math.round(n * 100) / 100).toString();
const hex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

export class PdfDoc {
  constructor({ title = "" } = {}) {
    this.title = title;
    this.pages = [];
    this.addPage();
  }

  get width() {
    return PAGE_W;
  }

  get height() {
    return PAGE_H;
  }

  addPage() {
    this.ops = [];
    this.pages.push(this.ops);
  }

  // y wird von OBEN gemessen (wie auf dem Bildschirm); bei Text ist y die Grundlinie.
  text(str, x, y, { size = 10, bold = false, align = "left", gray = 0 } = {}) {
    const bytes = toWinAnsi(str);
    if (!bytes.length) return;
    let tx = x;
    if (align === "right") tx = x - textWidth(str, size, bold);
    else if (align === "center") tx = x - textWidth(str, size, bold) / 2;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${num(size)} Tf ${num(gray)} g ${num(tx)} ${num(PAGE_H - y)} Td <${hex(bytes)}> Tj ET`);
  }

  rect(x, y, w, h, gray) {
    this.ops.push(`${num(gray)} g ${num(x)} ${num(PAGE_H - y - h)} ${num(w)} ${num(h)} re f`);
  }

  line(x1, y1, x2, y2, { gray = 0.6, width = 0.5 } = {}) {
    this.ops.push(`${num(gray)} G ${num(width)} w ${num(x1)} ${num(PAGE_H - y1)} m ${num(x2)} ${num(PAGE_H - y2)} l S`);
  }

  // Baut die fertige Datei (nur ASCII-Inhalt, daher Zeichen = Bytes)
  toString() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length; // Objektnummer
    };
    const n = this.pages.length;
    // 1 Katalog, 2 Seitenbaum, 3/4 Schriften, 5 Info, danach je Seite: Seite + Inhalt
    const pageObjNum = (i) => 6 + i * 2;
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(`<< /Type /Pages /Count ${n} /Kids [${this.pages.map((_, i) => `${pageObjNum(i)} 0 R`).join(" ")}] >>`);
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    let titleHex = "feff"; // UTF-16BE mit BOM
    for (let i = 0; i < this.title.length; i++) titleHex += this.title.charCodeAt(i).toString(16).padStart(4, "0");
    add(`<< /Title <${titleHex}> /Producer (Zeiterfassung) >>`);
    this.pages.forEach((ops, i) => {
      const content = ops.join("\n");
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_W)} ${num(PAGE_H)}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObjNum(i) + 1} 0 R >>`
      );
      add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    let out = "%PDF-1.4\n";
    const offsets = [];
    objects.forEach((body, i) => {
      offsets.push(out.length);
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return out;
  }

  toBlob() {
    const str = this.toString();
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }
}
