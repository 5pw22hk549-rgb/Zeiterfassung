// Laden & Speichern der Nutzerdaten – so gebaut, dass keine Einträge verloren gehen:
//
//  • Schlägt das Laden fehl, wird NIE gespeichert (früher konnte ein Ladefehler + ein neuer
//    Eintrag alle Server-Daten mit einem fast leeren Stand überschreiben).
//  • Vor jedem Speichern wird der aktuelle Server-Stand geholt und nur das übernommen, was
//    hier wirklich geändert wurde (3-Wege-Abgleich pro Tag / pro Montage / pro Einstellung).
//    Ein altes, noch offenes Tab auf einem anderen Gerät überschreibt so nichts mehr.
//  • Fehlgeschlagenes Speichern wird automatisch wiederholt; ungespeicherte Änderungen
//    liegen so lange zusätzlich im Gerätespeicher (localStorage) und überleben ein Neuladen.
//  • Kommt das Tab wieder in den Vordergrund, wird der Server-Stand neu geholt.
import { migrateData, sortTrips } from "./model";

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

// 3-Wege-Abgleich je Schlüssel: hat sich der Wert lokal gegenüber der gemeinsamen Basis
// geändert (auch: gelöscht), gewinnt lokal – sonst gilt der Server-Stand.
export function threeWayMap(base, local, remote) {
  const b = base || {};
  const l = local || {};
  const r = remote || {};
  const out = {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l), ...Object.keys(b)]);
  for (const k of keys) {
    const v = deepEqual(l[k], b[k]) ? r[k] : l[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function tripsToMap(trips) {
  const map = {};
  for (const t of Array.isArray(trips) ? trips : []) if (t && t.id) map[t.id] = t;
  return map;
}

export function mergeSettings(base, local, remote) {
  const { montagen: bm, ...bRest } = base || {};
  const { montagen: lm, ...lRest } = local || {};
  const { montagen: rm, ...rRest } = remote || {};
  const merged = threeWayMap(bRest, lRest, rRest);
  merged.montagen = sortTrips(Object.values(threeWayMap(tripsToMap(bm), tripsToMap(lm), tripsToMap(rm))));
  return merged;
}

export function mergeData(base, local, remote) {
  return {
    entries: threeWayMap(base.entries, local.entries, remote.entries),
    settings: mergeSettings(base.settings, local.settings, remote.settings),
  };
}

const EMPTY = { entries: {}, settings: {} };
const TABLE = "user_data";

function safeStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class DataSync {
  constructor({ supabase, userId, storage = safeStorage(), debounceMs = 400, retryMs = 5000 }) {
    this.supabase = supabase;
    this.userId = userId;
    this.storage = storage;
    this.debounceMs = debounceMs;
    this.retryMs = retryMs;

    this.base = EMPTY; // letzter bekannter Server-Stand
    this.local = EMPTY; // das, was die App anzeigt
    this.status = "loading"; // "loading" | "ready" | "error"
    this.saveError = false;
    this.listeners = new Set();
    this.running = false;
    this.rerun = false;
    this.timer = null;
    this.retryTimer = null;
    this.disposed = false;
    this.lastSyncAt = 0;
    this.snapshot = this._makeSnapshot();

    this._restorePending();
  }

  // ---------- Anbindung an React (useSyncExternalStore) ----------

  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  _makeSnapshot() {
    const dirty = this.isDirty();
    return {
      status: this.status,
      entries: this.local.entries,
      settings: this.local.settings,
      // "saved" | "pending" (wird gleich gespeichert) | "error" (Speichern fehlgeschlagen, wird wiederholt)
      saveState: !dirty ? "saved" : this.saveError ? "error" : "pending",
    };
  }

  _emit() {
    this.snapshot = this._makeSnapshot();
    for (const fn of this.listeners) fn();
  }

  isDirty() {
    return this.local !== this.base && !deepEqual(this.local, this.base);
  }

  // ---------- Änderungen aus der App ----------

  update(fn) {
    if (this.status !== "ready" || this.disposed) return; // ohne geladenen Stand wird nichts verändert
    const next = fn(this.local);
    if (!next || next === this.local) return;
    this.local = next;
    this._storePending();
    this._emit();
    this._schedule(this.debounceMs);
  }

  setEntries(fn) {
    this.update((l) => ({ ...l, entries: typeof fn === "function" ? fn(l.entries) : fn }));
  }

  setSettings(fn) {
    this.update((l) => ({ ...l, settings: typeof fn === "function" ? fn(l.settings) : fn }));
  }

  // ---------- Abgleich mit dem Server ----------

  // Sofort abgleichen (Start, "Erneut versuchen", Tab wieder sichtbar, wieder online).
  syncNow() {
    this._clearTimers();
    if (this.status === "error") {
      this.status = "loading";
      this._emit();
    }
    return this._run();
  }

  // Für "Tab wieder sichtbar": nur abgleichen, wenn nötig (ungespeichert) oder der letzte
  // Abgleich schon etwas her ist – damit nicht bei jedem Fensterwechsel neu geladen wird.
  refreshIfStale(maxAgeMs = 15000) {
    if (this.running) return; // läuft schon – der laufende Abgleich holt den Stand ohnehin
    if (this.isDirty() || this.status !== "ready" || Date.now() - this.lastSyncAt > maxAgeMs) this.syncNow();
  }

  _schedule(ms) {
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this._run();
    }, ms);
  }

  _clearTimers() {
    clearTimeout(this.timer);
    clearTimeout(this.retryTimer);
    this.timer = null;
    this.retryTimer = null;
  }

  async _run() {
    if (this.disposed) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.running = true;
    try {
      do {
        this.rerun = false;
        await this._syncOnce();
      } while ((this.rerun || (this.isDirty() && !this.timer)) && !this.disposed);
      if (this.saveError) {
        this.saveError = false;
        this._emit();
      }
    } catch (err) {
      console.error("Abgleich fehlgeschlagen:", err);
      if (this.disposed) return;
      if (this.status === "loading") this.status = "error";
      if (this.isDirty()) {
        this.saveError = true;
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this._run();
        }, this.retryMs);
      }
      this._emit();
    } finally {
      this.running = false;
    }
  }

  async _syncOnce() {
    // 1) Server-Stand holen
    const { data: row, error: readError } = await this.supabase
      .from(TABLE)
      .select("entries, settings")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (readError) throw readError;
    if (this.disposed) return;
    if (row) this._storeBackup(row);

    // 2) Lokale Änderungen auf den Server-Stand aufsetzen (kein await dazwischen -> nichts geht verloren).
    //    Ab hier ist die App benutzbar, auch wenn das Speichern gleich scheitern sollte.
    const migrated = migrateData(row?.entries, row?.settings);
    const remote = { entries: migrated.entries, settings: migrated.settings };
    this.local = this.isDirty() ? mergeData(this.base, this.local, remote) : remote;
    this.base = remote;
    if (this.status !== "ready") this.status = "ready";
    this.lastSyncAt = Date.now();
    this._storePending();
    this._emit();

    // 3) Schreiben, wenn sich etwas vom Server-Stand unterscheidet
    const sent = this.local;
    if (!row) {
      const { error } = await this.supabase
        .from(TABLE)
        .insert({ user_id: this.userId, entries: sent.entries, settings: sent.settings });
      if (error) throw error;
    } else {
      const patch = {};
      if (!deepEqual(sent.entries, row.entries)) patch.entries = sent.entries;
      if (!deepEqual(sent.settings, row.settings)) patch.settings = sent.settings;
      if (!Object.keys(patch).length) return;
      const { data, error } = await this.supabase.from(TABLE).update(patch).eq("user_id", this.userId).select("user_id");
      if (error) throw error;
      if (Array.isArray(data) && data.length === 0) throw new Error("Speichern hat keine Zeile getroffen.");
    }
    if (this.disposed) return;

    // 4) Server-Stand ist jetzt "sent". Was währenddessen getippt wurde, steht weiter in
    //    this.local und gilt damit als ungespeichert -> nächster Durchlauf.
    this.base = sent;
    this._storePending();
    this._emit();
  }

  // ---------- Ungespeicherte Änderungen im Gerätespeicher ----------

  _pendingKey() {
    return `zeiterfassung.pending.${this.userId}`;
  }

  _storePending() {
    if (!this.storage) return;
    try {
      if (this.isDirty()) this.storage.setItem(this._pendingKey(), JSON.stringify({ base: this.base, local: this.local }));
      else this.storage.removeItem(this._pendingKey());
    } catch {
      // Speicher voll/gesperrt – dann eben ohne Sicherheitsnetz
    }
  }

  _restorePending() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this._pendingKey());
      if (!raw) return;
      const p = JSON.parse(raw);
      const ok = (x) => x && typeof x === "object" && x.entries && typeof x.entries === "object" && x.settings && typeof x.settings === "object";
      if (ok(p?.base) && ok(p?.local)) {
        this.base = p.base;
        this.local = p.local;
      } else {
        this.storage.removeItem(this._pendingKey());
      }
    } catch {
      // unlesbar -> ignorieren
    }
  }

  // Sicherheitskopie des Server-Stands, wie er geladen wurde: höchstens eine pro Tag, die
  // letzten 5 Tage. Nur für den Notfall (liegt im Gerätespeicher des Browsers).
  _storeBackup(row) {
    if (!this.storage) return;
    try {
      const key = `zeiterfassung.backup.${this.userId}`;
      const day = new Date().toISOString().slice(0, 10);
      const list = JSON.parse(this.storage.getItem(key) || "[]");
      if (!Array.isArray(list) || list.some((b) => b?.day === day)) return;
      list.push({ day, entries: row.entries, settings: row.settings });
      this.storage.setItem(key, JSON.stringify(list.slice(-5)));
    } catch {
      // nicht kritisch
    }
  }

  dispose() {
    this.disposed = true;
    this._clearTimers();
    this.listeners.clear();
  }
}
