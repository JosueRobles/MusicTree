import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("supabaseUrl and supabaseAnonKey are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  headers: {
    apikey: supabaseAnonKey, // Incluye la API key en los encabezados
  },
});

export default supabase;