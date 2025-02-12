const supabase = require("../db");

const registrarTendencia = async (req, res) => {
  const { usuario_id, accion, entidad_tipo, entidad_id } = req.body;
  try {
    const { data, error } = await supabase
      .from('tendencias')
      .insert([{ usuario_id, accion, entidad_tipo, entidad_id }]);

    if (error) throw error;

    res.status(201).json({ mensaje: 'Tendencia registrada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar la tendencia.' });
  }
};

const obtenerTendenciasRecientes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tendencias')
      .select('*')
      .order('registrado', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tendencias.' });
  }
};

const obtenerFeedTendencias = async (req, res) => {
  try {
    const { data: tendencias, error } = await supabase
      .from("tendencias")
      .select(`
        id_tendencia,
        accion,
        entidad_tipo,
        entidad_id,
        registrado,
        usuarios (nombre, username),
        album (titulo),
        cancion (titulo),
        artista (nombre)
      `)
      .order("registrado", { ascending: false })
      .limit(10);

    if (error) throw error;

    res.status(200).json(tendencias);
  } catch (error) {
    console.error("Error al obtener el feed de tendencias:", error);
    res.status(500).json({ error: "Error al obtener el feed de tendencias." });
  }
};

module.exports = { registrarTendencia, obtenerTendenciasRecientes, obtenerFeedTendencias };