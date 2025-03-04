const supabase = require("../db");
const { registrarTendencia } = require("./tendenciaController");

const crearValoracion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, calificacion, comentario } = req.body;

  try {
    let tableName;
    let referenciaId;

    switch (entidad_tipo) {
      case 'artista':
        tableName = 'valoraciones_artistas';
        referenciaId = 'artista';
        break;
      case 'album':
        tableName = 'valoraciones_albumes';
        referenciaId = 'album';
        break;
      case 'cancion':
        tableName = 'valoraciones_canciones';
        referenciaId = 'cancion';
        break;
      case 'video':
        tableName = 'valoraciones_videos_musicales';
        referenciaId = 'video';
        break;
      default:
        return res.status(400).json({ error: "Tipo de entidad no válido" });
    }

    if (!usuario || !entidad_id || !calificacion) {
      return res.status(400).json({ error: "Parámetros faltantes" });
    }

    // Verificar si ya existe una valoración para esta entidad y usuario
    const { data: valoracionExistente, error: errorExistente } = await supabase
      .from(tableName)
      .select('*')
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id);

    if (errorExistente && errorExistente.details !== "Results contain 0 rows") {
      throw errorExistente;
    }

    let data;
    if (valoracionExistente.length > 0) {
      // Actualizar la valoración existente
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ calificacion, comentario })
        .eq('usuario', usuario)
        .eq(referenciaId, entidad_id)
        .single();

      if (error) throw error;
      data = updatedData;
    } else {
      // Crear una nueva valoración
      const { data: newData, error } = await supabase
        .from(tableName)
        .insert([{ usuario, [referenciaId]: entidad_id, calificacion, comentario }])
        .single();

      if (error) throw error;
      data = newData;
    }

    // Registrar tendencia
    await registrarTendencia(req.body);

    // Devolver la respuesta con la valoración guardada
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al crear la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerValoracion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.query;

  try {
    let tableName;
    let referenciaId;

    switch (entidad_tipo) {
      case 'artista':
        tableName = 'valoraciones_artistas';
        referenciaId = 'artista';
        break;
      case 'album':
        tableName = 'valoraciones_albumes';
        referenciaId = 'album';
        break;
      case 'cancion':
        tableName = 'valoraciones_canciones';
        referenciaId = 'cancion';
        break;
      case 'video':
        tableName = 'valoraciones_videos_musicales';
        referenciaId = 'video';
        break;
      default:
        return res.status(400).json({ error: "Tipo de entidad no válido" });
    }

    if (!usuario || !entidad_id) {
      return res.status(400).json({ error: "Parámetros faltantes" });
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id);

    if (error) throw error;

    if (data.length === 1) {
      res.status(200).json(data[0]);
    } else {
      res.status(200).json({ calificacion: 0 }); // Devuelve un valor predeterminado
    }
  } catch (error) {
    console.error("❌ Error al obtener la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { crearValoracion, obtenerValoracion };