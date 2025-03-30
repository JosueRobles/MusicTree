const supabase = require('@supabase/supabase-js');

const supabaseUrl = 'https://klpqgnuhcricvrwcieqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscHFnbnVoY3JpY3Zyd2NpZXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTE3ODQsImV4cCI6MjA1MTg2Nzc4NH0.90jlfGfr74anxNYx5mMjwXOl_y2vDaTD8uJK1q6EN_U';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/**
 * Obtiene recomendaciones personalizadas para un usuario.
 * @param {number} usuarioId - ID del usuario al que se le harán recomendaciones.
 * @returns {Promise<Array>} - Lista de canciones recomendadas.
 */
async function obtenerRecomendaciones(usuarioId) {
    const { data, error } = await supabaseClient.rpc('obtener_recomendaciones', { usuario_id: usuarioId });

    if (error) {
        console.error("Error al obtener recomendaciones:", error);
        return [];
    }
    return data;
}

module.exports = { obtenerRecomendaciones };
