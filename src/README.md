# Zeiterfassung — eigene Web-App mit Login

Diese App läuft komplett unabhängig von Claude. Jede Person meldet sich mit ihrer eigenen
E-Mail-Adresse an (Magic Link, kein Passwort) und sieht danach nur ihre eigenen Einträge.
Hosting und Login sind in der kostenlosen Stufe von Supabase und Vercel abgedeckt.

## Was du brauchst (alles kostenlos)

- Einen [Supabase](https://supabase.com)-Account (Datenbank + Login)
- Einen [Vercel](https://vercel.com)-Account (Hosting der Seite)
- Einen [GitHub](https://github.com)-Account (damit Vercel den Code holen kann)
- [Node.js](https://nodejs.org) auf deinem Rechner, um das Projekt einmal lokal zu testen (optional, aber empfohlen)

---

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) registrieren/einloggen, **"New project"**.
2. Namen vergeben, Datenbank-Passwort setzen (merken, brauchst du selten), Region wählen (z.B. Frankfurt), **Create**.
3. Warten, bis das Projekt fertig eingerichtet ist (ca. 1–2 Minuten).

### Datenbank-Tabelle anlegen

1. Im Supabase-Dashboard links auf **SQL Editor** → **New query**.
2. Den Inhalt aus `supabase/schema.sql` (in diesem Projektordner) hineinkopieren.
3. **Run** klicken. Das legt die Tabelle `user_data` an — jede Person bekommt automatisch nur
   Zugriff auf ihre eigene Zeile (Row Level Security).

### API-Zugangsdaten holen

1. Links auf **Project Settings** (Zahnrad) → **API**.
2. Dort stehen **Project URL** und **anon public key** — beide gleich brauchen wir.

### E-Mail-Login (Magic Link) prüfen

1. Links auf **Authentication** → **Providers** → **Email**.
2. Sicherstellen, dass **Email** aktiviert ist (ist standardmäßig an).
3. Unter **Authentication** → **URL Configuration**:
   - **Site URL**: erstmal `http://localhost:5173` eintragen (später auf deine Vercel-Adresse ändern, siehe Schritt 4).
   - **Redirect URLs**: `http://localhost:5173/**` hinzufügen (später zusätzlich deine Vercel-Adresse).

---

## 2. Projekt lokal einrichten und testen

Im Terminal in diesen Projektordner wechseln, dann:

```bash
npm install
cp .env.example .env
```

Die `.env`-Datei öffnen und die beiden Werte aus Supabase eintragen:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

Dann starten:

```bash
npm run dev
```

Im Browser die angezeigte Adresse öffnen (meist `http://localhost:5173`). Mit deiner eigenen
E-Mail-Adresse anmelden — du bekommst einen Link per Mail, draufklicken, fertig.

---

## 3. Auf GitHub hochladen

```bash
git init
git add .
git commit -m "Erste Version"
```

Dann ein neues, leeres Repository auf [github.com/new](https://github.com/new) anlegen (ohne
README/License, die hast du schon) und den angezeigten Befehlen zum Verknüpfen und Hochladen
folgen (`git remote add origin ...`, `git push -u origin main`).

**Wichtig:** Die Datei `.env` wird durch `.gitignore` automatisch NICHT mit hochgeladen — deine
Zugangsdaten bleiben privat. Die trägst du gleich direkt bei Vercel ein.

---

## 4. Bei Vercel deployen

1. Auf [vercel.com](https://vercel.com) mit GitHub einloggen.
2. **Add New… → Project**, dein gerade hochgeladenes Repository auswählen, **Import**.
3. Vercel erkennt Vite automatisch. Vor dem Deploy bei **Environment Variables** die beiden
   Werte eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** klicken. Nach ein bis zwei Minuten bekommst du eine Adresse wie
   `https://dein-projekt.vercel.app`.

### Supabase auf die echte Adresse umstellen

Zurück in Supabase → **Authentication** → **URL Configuration**:
- **Site URL** auf `https://dein-projekt.vercel.app` ändern.
- Unter **Redirect URLs** zusätzlich `https://dein-projekt.vercel.app/**` eintragen.

Fertig — diesen Link kannst du jetzt mit jedem teilen. Jede Person meldet sich mit der eigenen
E-Mail an und sieht ausschließlich ihre eigenen Stunden.

---

## Eigene Domain (optional)

Bei Vercel unter **Settings → Domains** lässt sich kostenlos eine eigene Domain verbinden, falls
du eine besitzt (Vercel selbst verlangt dafür nichts, nur die Domain-Registrierung kostet je nach
Anbieter). Denk daran, die neue Domain danach auch bei Supabase unter **Site URL** /
**Redirect URLs** zu ergänzen.

## Wie die Daten gespeichert werden

- Eine Tabelle `user_data`, eine Zeile pro Person (`user_id`).
- Zwei Spalten `entries` und `settings` (JSON) — exakt die gleiche Struktur wie vorher, nur in
  einer echten Datenbank statt im Claude-Artefakt-Speicher.
- Row Level Security sorgt dafür, dass niemand die Zeile einer anderen Person lesen oder
  ändern kann — das passiert automatisch in der Datenbank, nicht im Frontend-Code.

## Kosten

Supabase Free Tier und Vercel Hobby-Plan reichen für den privaten/kleinen Gebrauch (wenige
Nutzer, moderate Nutzung) komplett aus und kosten nichts. Solltest du das Projekt stark
ausweiten (sehr viele Nutzer, sehr viel Traffic), verlinken beide Anbieter transparent ihre
bezahlten Stufen — für dieses Szenario ist das aber nicht relevant.
