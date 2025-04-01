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

const calcularPromedio = async (tableName, referenciaId, entidad_id) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('calificacion')
    .eq(referenciaId, entidad_id);

  if (error) {
    console.error("❌ Error al calcular el promedio:", error);
    throw error;
  }

  const total = data.reduce((sum, valoracion) => sum + valoracion.calificacion, 0);
  const promedio = total / data.length || 0;

  const { error: updateError } = await supabase
    .from(tableName)
    .update({ promedio })
    .eq(referenciaId, entidad_id);

  if (updateError) {
    console.error("❌ Error al actualizar el promedio:", updateError);
    throw updateError;
  }
};

const obtenerPromedio = async (req, res) => {
  const { entidad_tipo, entidad_id } = req.query;

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

    const { data, error } = await supabase
      .from(tableName)
      .select('promedio')
      .eq(referenciaId, entidad_id);

    if (error) throw error;

    if (data.length === 0) {
      return res.status(200).json({ promedio: 0 });
    }

    const promedio = data[0].promedio;

    res.status(200).json({ promedio });
  } catch (error) {
    console.error("❌ Error al obtener el promedio:", error);
    res.status(500).json({ error: "Error en el servidor" });
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

    // Calcular y actualizar el promedio
    await calcularPromedio(tableName, referenciaId, entidad_id);

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
      res.status(200).json({ calificacion: 0, comentario: '', emocion: '' }); // Devuelve valores predeterminados
    }
  } catch (error) {
    console.error("❌ Error al obtener la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarValoracion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.body;

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

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id);

    if (error) throw error;

    // Calcular y actualizar el promedio
    await calcularPromedio(tableName, referenciaId, entidad_id);

    // Eliminar emociones asociadas
    const { error: errorEmocion } = await supabase
      .from('emociones')
      .delete()
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (errorEmocion) throw errorEmocion;

    res.status(200).json({ mensaje: "Valoración eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const agregarComentario = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, comentario } = req.body;

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

    if (!usuario || !entidad_id || !comentario) {
      return res.status(400).json({ error: "Parámetros faltantes" });
    }

    const { data, error } = await supabase
      .from(tableName)
      .update({ comentario })
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ mensaje: "Comentario agregado correctamente", data });
  } catch (error) {
    console.error("❌ Error al agregar el comentario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const agregarEmocion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, emocion } = req.body;

  try {
    // Verificar si ya existe una emoción para el usuario y la entidad
    const { data: emocionExistente, error: errorExistente } = await supabase
      .from('emociones')
      .select('id_emocion')
      .eq('usuario', usuario)
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id)
      .single();

    if (errorExistente && errorExistente.code !== 'PGRST116') {
      throw errorExistente;
    }

    if (emocionExistente) {
      // Actualizar emoción existente
      const { data: updatedData, error } = await supabase
        .from('emociones')
        .update({ emocion })
        .eq('id_emocion', emocionExistente.id_emocion)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ mensaje: "Emoción actualizada correctamente", data: updatedData });
    } else {
      // Crear nueva emoción
      const { data: newData, error } = await supabase
        .from('emociones')
        .insert([{ usuario, entidad_tipo, entidad_id, emocion }])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ mensaje: "Emoción agregada correctamente", data: newData });
    }
  } catch (error) {
    console.error("❌ Error al agregar la emoción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const contarEmociones = async (req, res) => {
  const { entidad_tipo, entidad_id } = req.query;

  try {
    const { data, error } = await supabase
      .from('emociones')
      .select('emocion, count(*)')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id)
      .group('emocion');

    if (error) throw error;

    res.status(200).json({ emociones: data });
  } catch (error) {
    console.error("❌ Error al contar las emociones:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { crearValoracion, obtenerValoracion, eliminarValoracion, agregarComentario, obtenerPromedio, agregarEmocion, contarEmociones };