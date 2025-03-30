const supabase = require("../db");
const { registrarTendencia } = require("./tendenciaController");

const registrarActividad = async (usuario, tipo_actividad, referencia_id) => {
  const { error } = await supabase
    .from('actividad_usuario')
    .insert([{ usuario, tipo_actividad, referencia_id }]);

  if (error) {
    console.error("❌ Error al registrar la actividad:", error);
  }
};

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

    // Verificar si ya existe una valoración
    const { data: valoracionExistente, error: errorExistente } = await supabase
      .from(tableName)
      .select('id_valoracion')
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id)
      .single();

    let valoracionId;

    if (errorExistente && errorExistente.code !== 'PGRST116') {
      throw errorExistente;
    }

    if (valoracionExistente) {
      // Actualizar valoración existente
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ calificacion, comentario })
        .eq('id_valoracion', valoracionExistente.id_valoracion)
        .select()
        .single();

      if (error) throw error;
      valoracionId = updatedData.id_valoracion;
    } else {
      // Crear nueva valoración
      const { data: newData, error } = await supabase
        .from(tableName)
        .insert([{
          usuario,
          [referenciaId]: entidad_id,
          calificacion,
          comentario
        }])
        .select()
        .single();

      if (error) throw error;
      valoracionId = newData.id_valoracion;
    }

    // Registrar tendencia
    await registrarTendencia(req.body);

    // Registrar actividad solo si tenemos un ID de valoración válido
    if (valoracionId) {
      await registrarActividad(usuario, 'valoracion', valoracionId);
    } else {
      throw new Error("No se pudo obtener el ID de la valoración");
    }

    res.status(200).json({ 
      success: true, 
      id_valoracion: valoracionId,
      mensaje: "Valoración registrada correctamente" 
    });

  } catch (error) {
    console.error("❌ Error al crear la valoración:", error);
    res.status(500).json({ 
      error: "Error en el servidor",
      detalle: error.message 
    });
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