const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://klpqgnuhcricvrwcieqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscHFnbnVoY3JpY3Zyd2NpZXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTE3ODQsImV4cCI6MjA1MTg2Nzc4NH0.90jlfGfr74anxNYx5mMjwXOl_y2vDaTD8uJK1q6EN_U';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;