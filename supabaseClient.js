const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://klpqgnuhcricvrwcieqq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscHFnbnVoY3JpY3Zyd2NpZXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTE3ODQsImV4cCI6MjA1MTg2Nzc4NH0.90jlfGfr74anxNYx5mMjwXOl_y2vDaTD8uJK1q6EN_U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;