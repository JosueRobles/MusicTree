const supabase = require("../db");

const registrarTendencia = async ({ usuario, entidad_tipo, entidad_id, calificacion }) => {
  try {
    let tableName;
    let columnId;

    // Determinar la tabla y columna correctas para verificar la existencia
    switch (entidad_tipo) {
      case 'artista':
        tableName = 'artistas';
        columnId = 'id_artista';
        break;
      case 'album':
        tableName = 'albumes';
        columnId = 'id_album';
        break;
      case 'cancion':
        tableName = 'canciones';
        columnId = 'id_cancion';
        break;
      case 'video':
        tableName = 'videos_musicales';
        columnId = 'id_video';
        break;
      default:
        throw new Error("Tipo de entidad no válido");
    }

    // Verificar si la entidad existe
    const { data: entidadData, error: entidadError } = await supabase
      .from(tableName)
      .select(columnId)
      .eq(columnId, entidad_id);

    if (entidadError || entidadData.length === 0) {
      throw new Error(`La entidad especificada no existe en la tabla ${tableName}`);
    }

    // Insertar la tendencia
    const { error } = await supabase
      .from('tendencias')
      .insert([{ usuario, entidad_tipo, entidad_id, calificacion, registrado: new Date() }]);

    if (error) throw error;
  } catch (error) {
    console.error("❌ Error al registrar la tendencia:", error);
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
    const { data, error } = await supabase.rpc('obtener_feed_tendencias');

    if (error) throw error;

    // Asegurar que siempre se devuelva un array
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registrarTendencia, obtenerTendenciasRecientes, obtenerFeedTendencias };