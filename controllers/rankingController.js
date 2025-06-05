const supabase = require('../db');

// Obtener el ranking personal de un usuario
const obtenerRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.query;

  try {
    const { data: ranking, error } = await supabase
      .from('ranking_elementos')
      .select('*')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad)
      .order('posicion', { ascending: true });

    if (error) throw error;

    res.status(200).json(ranking);
  } catch (error) {
    console.error("❌ Error al obtener el ranking personal:", error);
    res.status(500).json({ error: "Error al obtener el ranking personal" });
  }
};

// Recalcular el ranking personal de un usuario
const recalcularRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.body;

  try {
    // Obtener los elementos del ranking personal ordenados por calificación
    const { data: elementos, error } = await supabase
      .from('ranking_elementos')
      .select('*')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad)
      .order('valoracion', { ascending: false }) // Ordenar por calificación descendente
      .order('posicion', { ascending: true }); // Mantener manual para empates

    if (error) throw error;

    // Recalcular las posiciones
    for (let i = 0; i < elementos.length; i++) {
      const { id } = elementos[i];
      const { error: updateError } = await supabase
        .from('ranking_elementos')
        .update({ posicion: i + 1 })
        .eq('id', id);

      if (updateError) throw updateError;
    }

    res.status(200).json({ mensaje: "Ranking personal recalculado correctamente" });
  } catch (error) {
    console.error("❌ Error al recalcular el ranking personal:", error);
    res.status(500).json({ error: "Error al recalcular el ranking personal" });
  }
};

// Obtener el ranking global para un tipo de entidad
const obtenerRankingGlobal = async (req, res) => {
  const { tipo_entidad } = req.query;

  try {
    const { data: rankingGlobal, error } = await supabase
      .from('ranking_elementos')
      .select('entidad_id, avg(posicion) AS posicion_promedio, count(ranking_id) AS num_usuarios')
      .eq('tipo_entidad', tipo_entidad)
      .order('posicion_promedio', { ascending: true });

    if (error) throw error;

    res.status(200).json(rankingGlobal);
  } catch (error) {
    console.error("❌ Error al obtener el ranking global:", error);
    res.status(500).json({ error: "Error al obtener el ranking global" });
  }
};

// Obtener elementos ordenados por ranking personal
const obtenerPorRankingPersonal = async (req, res) => {
  const { usuario, tipo_entidad } = req.query;

  try {
    const { data, error } = await supabase
      .from('ranking_elementos')
      .select('entidad_id, nombre, valoracion, posicion')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', tipo_entidad)
      .order('posicion', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener elementos por ranking personal:", error);
    res.status(500).json({ error: "Error al obtener elementos por ranking personal" });
  }
};

// Exporta la función
module.exports = {
  obtenerRankingPersonal,
  recalcularRankingPersonal,
  obtenerRankingGlobal,
  obtenerPorRankingPersonal,
};