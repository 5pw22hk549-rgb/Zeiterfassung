import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Erscheint in der Browser-Konsole, falls die .env-Datei fehlt oder falsch benannt ist.
  console.warn(
    "Supabase-Umgebungsvariablen fehlen. Lege eine .env-Datei an (siehe .env.example) " +
      "und starte den Dev-Server neu."
  );
}

export const supabase = createClient(url, anonKey);
