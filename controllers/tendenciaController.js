const supabase = require("../db");

const registrarTendencia = async ({ usuario, entidad_tipo, entidad_id, calificacion }) => {
  try {
    let tableName;
    let columnId;

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

    const { data: entidadData, error: entidadError } = await supabase
      .from(tableName)
      .select(columnId)
      .eq(columnId, entidad_id);

    if (entidadError || entidadData.length === 0) {
      throw new Error(`La entidad especificada no existe en la tabla ${tableName}`);
    }

    const { error } = await supabase
      .from('tendencias')
      .upsert(
        { usuario, entidad_tipo, entidad_id, calificacion, registrado: new Date() },
        { onConflict: ['usuario', 'entidad_tipo', 'entidad_id'] }
      );

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

    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Listas populares por número de guardados
const obtenerListasPopulares = async (req, res) => {
  try {
    const { usuario } = req.query;

    let { data, error } = await supabase
      .from('listas_populares')
      .select('*')
      .order('saved_count', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Si hay usuario, filtra las listas propias en JS
    if (usuario) {
      data = data.filter(lista => String(lista.usuario_id) !== String(usuario));
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener listas populares:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { obtenerListasPopulares, registrarTendencia, obtenerTendenciasRecientes, obtenerFeedTendencias };