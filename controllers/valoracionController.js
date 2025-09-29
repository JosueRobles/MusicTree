const supabase = require("../db");
const { registrarTendencia } = require("./tendenciaController");
const { registrarActividad } = require("./utils/actividadUtils");
const { sugerirSimilares } = require('./mlController');

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

    if (!usuario) {
      return res.status(400).json({ error: "Parámetros faltantes" });
    }

    // Si NO se pasa entidad_id, devuelve todas las valoraciones del usuario para ese tipo
    if (!entidad_id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('usuario', usuario);

      if (error) throw error;
      return res.status(200).json(data);
    }

    // Si se pasa entidad_id, devuelve solo esa valoración
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id);

    if (error) throw error;

    if (data.length === 1) {
      res.status(200).json(data[0]);
    } else {
      res.status(200).json({ calificacion: 0, comentario: '', emocion: '' });
    }
  } catch (error) {
    console.error("❌ Error al obtener la valoración:", error);
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
    // Realiza la consulta para obtener el conteo de emociones agrupadas
    const { data, error } = await supabase
      .from('emociones')
      .select('emocion, count:emocion')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (error) throw error;

    res.status(200).json({ emociones: data });
  } catch (error) {
    console.error("❌ Error al contar las emociones:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const registrarCambioEnHistorial = async (valoracion) => {
  const entidad_tipo = valoracion.entidad_tipo || (
    valoracion.album ? 'album' :
    valoracion.artista ? 'artista' :
    valoracion.cancion ? 'cancion' :
    valoracion.video ? 'video' : null
  );

  const entidad_id = valoracion.album || valoracion.artista || valoracion.cancion || valoracion.video || valoracion.entidad_id;

  // Evitar duplicados si ya se registró en el mismo segundo (ahora 2 segundos)
  const { data: existente } = await supabase
    .from('historial_valoraciones')
    .select('*')
    .eq('id_valoracion', valoracion.id_valoracion)
    .order('fecha', { ascending: false })
    .limit(1);

  if (existente.length > 0) {
    const diferencia = Math.abs(new Date() - new Date(existente[0].fecha));
    if (diferencia < 2000) { // 2 segundos de margen
      console.warn("⛔ Historial ya registrado recientemente, omitiendo...");
      return;
    }
  }

  await supabase
    .from('historial_valoraciones')
    .insert([{
      id_valoracion: valoracion.id_valoracion,
      usuario: valoracion.usuario,
      entidad_tipo,
      entidad_id,
      calificacion: valoracion.calificacion,
      comentario: valoracion.comentario,
      fecha: new Date()
    }]);
};

const haPasadoUnDia = (ultimaFecha) => {
  const ahora = new Date();
  const diferenciaTiempo = ahora - new Date(ultimaFecha);
  return diferenciaTiempo >= 24 * 60 * 60 * 1000; // 24 horas en milisegundos
};

const obtenerValoracionesGlobales = async (req, res) => {
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

    // Valoraciones con datos de usuario
    const { data: valoraciones, error: valoracionesError } = await supabase
      .from(tableName)
      .select(`
        usuario,
        calificacion,
        comentario,
        usuarios:usuario (
          nombre,
          username,
          foto_perfil
        )
      `)
      .eq(referenciaId, entidad_id);

    if (valoracionesError) throw valoracionesError;

    // Emociones asociadas
    const { data: emociones, error: emocionesError } = await supabase
      .from('emociones')
      .select('usuario, emocion')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (emocionesError) throw emocionesError;

    // Familiaridad asociada
    const { data: familiaridades, error: famError } = await supabase
      .from('familiaridad')
      .select('usuario, nivel')
      .eq('entidad_tipo', entidad_tipo)
      .eq('entidad_id', entidad_id);

    if (famError) throw famError;

    // Combina todo
    const valoracionesCompletas = valoraciones.map((valoracion) => {
      const emocionUsuario = emociones.find((e) => e.usuario === valoracion.usuario);
      const familiaridadUsuario = familiaridades.find((f) => f.usuario === valoracion.usuario);
      return {
        ...valoracion,
        emocion: emocionUsuario ? emocionUsuario.emocion : null,
        familiaridad: familiaridadUsuario ? familiaridadUsuario.nivel : null,
      };
    });

    // Filtra solo valoraciones reales (con calificación > 0)
    const soloReales = valoracionesCompletas.filter(v => v.calificacion && v.calificacion > 0);

    res.status(200).json(soloReales);
  } catch (error) {
    console.error("❌ Error al obtener las valoraciones globales:", error);
    res.status(500).json({ error: "Error en el servidor", detalle: error.message });
  }
};

// Función para recalcular el ranking personal
const recalcularRankingPersonal = async (usuario, tipo_entidad) => {
  try {
    // Obtener elementos del ranking personal ordenados por calificación
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
  } catch (error) {
    console.error("❌ Error al recalcular el ranking personal:", error);
  }
};

// Función para calcular y actualizar el promedio
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

// Modificación en crearValoracion para llamar a recalcularRankingPersonal
const crearValoracion = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id, calificacion, comentario, automatica } = req.body;
  if (
    usuario == null ||
    !entidad_tipo ||
    entidad_id == null ||
    calificacion == null
  ) {
    console.error("🚨 Parámetros faltantes:", { usuario, entidad_tipo, entidad_id, calificacion });
    return res.status(400).json({ error: "Parámetros faltantes" });
  }
  if (
    (entidad_tipo === "album" || entidad_tipo === "artista") &&
    usuario != null
  ) {
    // Consulta preferencias
    const { data: userData } = await supabase
      .from("usuarios")
      .select("metodologia_valoracion")
      .eq("id_usuario", usuario)
      .single();
    const prefs = userData?.metodologia_valoracion || {};
    if (prefs.modo_valoracion === "semiautomatico") {
      return res.status(403).json({ error: "No puedes valorar manualmente álbumes o artistas en modo semiautomático." });
    }
  }
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

    // Verificar si ya existe una valoración
    const { data: valoracionExistente, error: errorExistente } = await supabase
      .from(tableName)
      .select('*')
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id)
      .single();

    let valoracionId;

    if (errorExistente && errorExistente.code !== 'PGRST116') {
      throw errorExistente;
    }

    if (valoracionExistente) {
      // Solo guarda en historial si cambió la calificación o comentario
      const cambioCalificacion = valoracionExistente.calificacion !== calificacion;
      const cambioComentario = valoracionExistente.comentario !== comentario;

      if (haPasadoUnDia(valoracionExistente.registrado) && (cambioCalificacion || cambioComentario)) {
        // Verifica si ya existe un historial igual
        const { data: historialExistente } = await supabase
          .from('historial_valoraciones')
          .select('id_historial')
          .eq('usuario', usuario)
          .eq('entidad_tipo', entidad_tipo)
          .eq('entidad_id', entidad_id)
          .eq('fecha', valoracionExistente.registrado)
          .maybeSingle();

        if (!historialExistente) {
          await supabase
            .from('historial_valoraciones')
            .insert([{
              id_valoracion: valoracionExistente.id_valoracion,
              usuario,
              entidad_tipo,
              entidad_id,
              calificacion: valoracionExistente.calificacion,
              comentario: valoracionExistente.comentario,
              fecha: valoracionExistente.registrado // Usa la fecha original
            }]);
        }
      }

      // Actualizar valoración existente
      const { data: updatedData, error } = await supabase
        .from(tableName)
        .update({ calificacion, comentario, registrado: new Date() })
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
          comentario,
          registrado: new Date()
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

    // Recalcular el ranking personal del usuario
    await recalcularRankingPersonal(usuario, entidad_tipo);

    // REGISTRAR ACTIVIDAD DE VALORACIÓN EN EL FEED
    await registrarActividad(usuario, 'valoracion', entidad_tipo, entidad_id); // <-- AGREGA ESTA LÍNEA

    if (entidad_tipo === 'artista' || entidad_tipo === 'album' || entidad_tipo === 'cancion' || entidad_tipo === 'video') {
      // Verifica progreso de catálogo para cada artista relacionado
      let artistasIds = [];
      if (entidad_tipo === 'artista') {
        artistasIds = [entidad_id];
      } else if (entidad_tipo === 'album') {
        // Busca artistas del álbum
        const { data: albumArtistas } = await supabase.from('album_artistas').select('artista_id').eq('album_id', entidad_id);
        artistasIds = (albumArtistas || []).map(a => a.artista_id);
      } else if (entidad_tipo === 'cancion') {
        // Busca artistas de la canción
        const { data: cancionArtistas } = await supabase.from('cancion_artistas').select('artista_id').eq('cancion_id', entidad_id);
        artistasIds = (cancionArtistas || []).map(a => a.artista_id);
      } else if (entidad_tipo === 'video') {
        // Busca artistas del video
        const { data: videoArtistas } = await supabase.from('video_artistas').select('artista_id').eq('video_id', entidad_id);
        artistasIds = (videoArtistas || []).map(a => a.artista_id);
      }

      for (const artista_id of artistasIds) {
        // Trae progreso actual
        const { data: progresoData } = await supabase
          .from('vista_progreso_catalogos')
          .select('progreso')
          .eq('usuario_id', usuario)
          .eq('id_artista', artista_id)
          .single();

        if (progresoData && progresoData.progreso >= 100) {
          // Busca si ya notificó antes (opcional, para no duplicar)
          const { data: yaNotificada } = await supabase
            .from('notificaciones')
            .select('id_notificacion')
            .eq('usuario_id', usuario)
            .eq('entidad_tipo', 'artista')
            .eq('entidad_id', artista_id)
            .eq('tipo_notificacion', 'catalogo_completado')
            .maybeSingle();

          if (!yaNotificada) {
            await notificarCatalogoCompletado(usuario, artista_id);
          }
        }
      }
    }

    // NUEVO: Sugerir canciones duplicadas/similares
    if (entidad_tipo === 'cancion') {
      // Sugerir canciones duplicadas/similares
      const similares = await sugerirSimilares({ params: { entidad: 'cancion', id: entidad_id } }, { json: () => {} });
      const duplicados = (similares && similares.similares) ? similares.similares : [];

      // Obtener artista principal de la canción
      const { data: artistasRelacionados, error: artistasError } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', entidad_id);

      let artista_id = null;
      if (artistasRelacionados && artistasRelacionados.length > 0) {
        artista_id = artistasRelacionados[0].artista_id;
      }

      // Sugerir videos musicales relacionados
      let videosRelacionados = [];
      if (artista_id) {
        const { data: videosData } = await supabase
          .from('video_artistas')
          .select('video_id')
          .eq('artista_id', artista_id);
        videosRelacionados = videosData || [];
      }

      res.locals.sugerencias = { duplicados, videos: videosRelacionados };
    }

    res.status(200).json({ 
      success: true, 
      id_valoracion: valoracionId,
      mensaje: "Valoración registrada correctamente",
      sugerencias: res.locals.sugerencias || {}
    });

    // Asegura que el elemento esté en ranking_elementos
    const { data: rankingExistente, error: rankingError } = await supabase
      .from('ranking_elementos')
      .select('*')
      .eq('ranking_id', usuario)
      .eq('entidad_id', entidad_id)
      .eq('tipo_entidad', entidad_tipo)
      .single();

    if (rankingError && rankingError.code !== 'PGRST116') throw rankingError;

    if (!rankingExistente) {
      // Busca la última posición actual
      const { data: maxPos } = await supabase
        .from('ranking_elementos')
        .select('posicion')
        .eq('ranking_id', usuario)
        .eq('tipo_entidad', referenciaId === "album" ? "album" : "artista")
        .order('posicion', { ascending: false })
        .limit(1);
      const nuevaPos = (maxPos && maxPos[0]?.posicion ? maxPos[0].posicion + 1 : 1);
      await supabase
        .from('ranking_elementos')
        .insert([{
          ranking_id: usuario,
          entidad_id,
          tipo_entidad: referenciaId === "album" ? "album" : "artista",
          valoracion: calificacion,
          posicion: nuevaPos
        }]);
    } else {
      await supabase
        .from('ranking_elementos')
        .update({ valoracion: calificacion })
        .eq('id', rankingExistente.id);
    }

    // Ahora sí, recalcula el ranking personal
    await recalcularRankingPersonal(usuario, entidad_tipo);
}   catch (error) {
    console.error("❌ Error al crear valoración:", error);
    res.status(500).json({ error: "Error al crear la valoración", detalle: error.message });
  }
};

// Modificación en eliminarValoracion para llamar a recalcularRankingPersonal
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

    // Recalcular el ranking personal del usuario
    await recalcularRankingPersonal(usuario, entidad_tipo);

    res.status(200).json({ mensaje: "Valoración eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar la valoración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarComentario = async (req, res) => {
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

    const { error } = await supabase
      .from(tableName)
      .update({ comentario: null }) // Establece el comentario como nulo
      .eq('usuario', usuario)
      .eq(referenciaId, entidad_id);

    if (error) throw error;

    res.status(200).json({ mensaje: "Comentario eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar el comentario:", error);
    res.status(500).json({ error: "Error al eliminar el comentario" });
  }
};

const segmentacionPersonal = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.query;
  if (!usuario || !entidad_tipo || !entidad_id) {
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  let tableName, refId, totalQuery, segmentacionQuery;
  switch (entidad_tipo) {
    case "artista":
      tableName = "valoraciones_albumes";
      refId = "album";
      // 1. Álbumes del artista
      const { data: albumes, error: albErr } = await supabase
        .from("album_artistas")
        .select("album_id")
        .eq("artista_id", entidad_id);
      if (albErr) return res.status(500).json({ error: albErr.message });
      const albumIds = albumes.map(a => a.album_id);
      // 2. Valoraciones del usuario sobre esos álbumes
      const { data: vals, error: valErr } = await supabase
        .from("valoraciones_albumes")
        .select("calificacion")
        .eq("usuario", usuario)
        .in("album", albumIds);
      if (valErr) return res.status(500).json({ error: valErr.message });
      // 3. Segmentación
      const seg = {};
      vals.forEach(v => {
        const key = v.calificacion.toFixed(1);
        seg[key] = (seg[key] || 0) + 1;
      });
      // 4. % completado
      const total = albumIds.length;
      const valorados = vals.length;
      const porcentaje = total ? Math.round((valorados / total) * 100) : 0;
      return res.json({
        total,
        valorados,
        porcentaje,
        segmentacion: seg
      });
    case "album":
      tableName = "valoraciones_canciones";
      refId = "cancion";
      // 1. Canciones del álbum
      const { data: canciones, error: canErr } = await supabase
        .from("canciones")
        .select("id_cancion")
        .eq("album", entidad_id);
      if (canErr) return res.status(500).json({ error: canErr.message });
      const canIds = canciones.map(c => c.id_cancion);
      // 2. Valoraciones del usuario sobre esas canciones
      const { data: valsA, error: valErrA } = await supabase
        .from("valoraciones_canciones")
        .select("calificacion")
        .eq("usuario", usuario)
        .in("cancion", canIds);
      if (valErrA) return res.status(500).json({ error: valErrA.message });
      // 3. Segmentación
      const segA = {};
      valsA.forEach(v => {
        const key = v.calificacion.toFixed(1);
        segA[key] = (segA[key] || 0) + 1;
      });
      // 4. % completado
      const totalA = canIds.length;
      const valoradosA = valsA.length;
      const porcentajeA = totalA ? Math.round((valoradosA / totalA) * 100) : 0;
      return res.json({
        total: totalA,
        valorados: valoradosA,
        porcentaje: porcentajeA,
        segmentacion: segA
      });
        case "cancion":
      // Puede ser un solo ID o varios separados por coma
      let cancionIds = entidad_id.split(",").map(Number);
      const { data: valC, error: valErrC } = await supabase
        .from("valoraciones_canciones")
        .select("calificacion")
        .eq("usuario", usuario)
        .in("cancion", cancionIds);
      if (valErrC) return res.status(500).json({ error: valErrC.message });
      const segC = {};
      valC.forEach(v => {
        const key = v.calificacion.toFixed(1);
        segC[key] = (segC[key] || 0) + 1;
      });
      return res.json({
        total: cancionIds.length,
        valorados: valC.length,
        porcentaje: cancionIds.length ? Math.round((valC.length / cancionIds.length) * 100) : 0,
        segmentacion: segC
      });
    case "video":
      // Puede ser un solo ID o varios separados por coma
      let videoIds = entidad_id.split(",").map(Number);
      const { data: valV, error: valErrV } = await supabase
        .from("valoraciones_videos_musicales")
        .select("calificacion")
        .eq("usuario", usuario)
        .in("video", videoIds);
      if (valErrV) return res.status(500).json({ error: valErrV.message });
      const segV = {};
      valV.forEach(v => {
        const key = v.calificacion.toFixed(1);
        segV[key] = (segV[key] || 0) + 1;
      });
      return res.json({
        total: videoIds.length,
        valorados: valV.length,
        porcentaje: videoIds.length ? Math.round((valV.length / videoIds.length) * 100) : 0,
        segmentacion: segV
      });
    default:
      return res.status(400).json({ error: "Tipo de entidad no válido" });
  }
};

const obtenerHistorialValoraciones = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.query;
  const { data, error } = await supabase
    .from('historial_valoraciones')
    .select('*')
    .eq('usuario', usuario)
    .eq('entidad_tipo', entidad_tipo)
    .eq('entidad_id', entidad_id)
    .order('fecha', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// Utilidad para calcular promedio, mediana, moda, ponderado
function calcularAgregado(valores, metodo, opciones = {}) {
  if (!valores || valores.length === 0) return 0;
  if (metodo === "promedio") {
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  }
  if (metodo === "mediana") {
    const sorted = [...valores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
  if (metodo === "moda") {
    const freq = {};
    valores.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const max = Math.max(...Object.values(freq));
    // Si empate, el valor más alto
    return Math.max(...Object.keys(freq).filter(k => freq[k] === max).map(Number));
  }
  if (metodo === "minimo") {
    return Math.min(...valores);
  }
  if (metodo === "maximo") {
    return Math.max(...valores);
  }
  if (metodo === "redondear_arriba") {
    return Math.ceil(valores.reduce((a, b) => a + b, 0) / valores.length * 2) / 2;
  }
  if (metodo === "redondear_abajo") {
    return Math.floor(valores.reduce((a, b) => a + b, 0) / valores.length * 2) / 2;
  }
  if (metodo === "redondear_cercano") {
    return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length * 2) / 2;
  }
  if (metodo === "ponderado" && opciones.ponderado) {
    let total = 0, pesoTotal = 0;
    for (const key of ["albumes", "canciones", "videos"]) {
      if (opciones.ponderado[key] && opciones[key] && opciones[key].length > 0) {
        const promedio = opciones[key].reduce((a, b) => a + b, 0) / opciones[key].length;
        total += promedio * (opciones.ponderado[key] / 100);
        pesoTotal += opciones.ponderado[key];
      }
    }
    return pesoTotal ? total : 0;
  }
  return 0;
}

// NUEVO: Obtener valoración agregada según preferencias del usuario
const obtenerValoracionAgregada = async (req, res) => {
  const { usuario, entidad_tipo, entidad_id } = req.query;
  if (!usuario || !entidad_tipo || !entidad_id) return res.status(400).json({ error: "Faltan parámetros" });

  // 1. Obtener preferencias del usuario
  const { data: userData } = await supabase
    .from("usuarios")
    .select("metodologia_valoracion")
    .eq("id_usuario", usuario)
    .single();
  const prefs = userData?.metodologia_valoracion || {};

  // 2. Si modo manual, busca la valoración directa
  if (prefs.modo_valoracion === "manual" || !prefs.modo_valoracion) {
    return obtenerValoracion(req, res);
  }

  // 3. Si modo semiautomático, calcula según método y opciones avanzadas
  let resultado = 0;
  let tableName, referenciaId;
  if (entidad_tipo === "album") {
    tableName = "valoraciones_albumes";
    referenciaId = "album";
    // 1. Obtener todas las canciones del álbum
    const { data: canciones } = await supabase
      .from("canciones")
      .select("id_cancion")
      .eq("album", entidad_id);
    const cancionIds = canciones.map(c => c.id_cancion);

    // 2. Obtener valoraciones del usuario sobre esas canciones
    const { data: vals } = await supabase
      .from("valoraciones_canciones")
      .select("cancion")
      .eq("usuario", usuario)
      .in("cancion", cancionIds);
    const valoradasIds = vals.map(v => v.cancion);

    // 3. Expandir valoradas por grupo (clusters)
    const valoradasUnicas = await filtrarUnicosPorGrupo('cancion', valoradasIds);
    const todasUnicas = await filtrarUnicosPorGrupo('cancion', cancionIds);

    // 4. Si NO ha valorado todas las canciones únicas, NO calcular
    if (valoradasUnicas.length < todasUnicas.length) {
      return res.json({ calificacion: null });
    }

    // 5. Si todas las canciones del álbum son duplicados de otras ya valoradas (ninguna nueva), NO calcular
    if (todasUnicas.length === 0) {
      return res.json({ calificacion: null });
    }

    // 6. Obtener calificaciones de las canciones únicas valoradas
    const { data: valsCalif } = await supabase
      .from("valoraciones_canciones")
      .select("calificacion, cancion")
      .eq("usuario", usuario)
      .in("cancion", valoradasUnicas);

    const califs = valsCalif.map(v => Number(v.calificacion));
    const metodo = prefs.metodo_album || "promedio";
    let resultado = calcularAgregado(califs, metodo);

    // Aplica redondeo
    if (prefs.redondeo === "arriba") resultado = Math.ceil(resultado * 2) / 2;
    if (prefs.redondeo === "abajo") resultado = Math.floor(resultado * 2) / 2;

    // Guarda o actualiza la valoración automática en la tabla
    await upsertValoracionAutomatica(usuario, tableName, referenciaId, entidad_id, resultado);

    return res.json({ calificacion: resultado });
  }
  if (entidad_tipo === "artista") {
    tableName = "valoraciones_artistas";
    referenciaId = "artista";
    // 1. Obtener álbumes, canciones y videos del artista
    const { data: albumes } = await supabase
      .from("album_artistas")
      .select("album_id")
      .eq("artista_id", entidad_id);
    const albumIds = albumes.map(a => a.album_id);

    const { data: canciones } = await supabase
      .from("cancion_artistas")
      .select("cancion_id")
      .eq("artista_id", entidad_id);
    const cancionIds = canciones.map(c => c.cancion_id);

    const { data: videos } = await supabase
      .from("video_artistas")
      .select("video_id")
      .eq("artista_id", entidad_id);
    const videoIds = videos.map(v => v.video_id);

    // 2. Obtener valoraciones del usuario
    const { data: valsAlbum } = await supabase
      .from("valoraciones_albumes")
      .select("album")
      .eq("usuario", usuario)
      .in("album", albumIds);
    const valoradasAlbumIds = valsAlbum.map(v => v.album);

    const { data: valsCancion } = await supabase
      .from("valoraciones_canciones")
      .select("cancion")
      .eq("usuario", usuario)
      .in("cancion", cancionIds);
    const valoradasCancionIds = valsCancion.map(v => v.cancion);

    const { data: valsVideo } = await supabase
      .from("valoraciones_videos_musicales")
      .select("video")
      .eq("usuario", usuario)
      .in("video", videoIds);
    const valoradasVideoIds = valsVideo.map(v => v.video);

    // 3. Expandir valoradas por grupo (clusters)
    const valoradasAlbumUnicas = await filtrarUnicosPorGrupo('album', valoradasAlbumIds);
    const todasAlbumUnicas = await filtrarUnicosPorGrupo('album', albumIds);

    const valoradasCancionUnicas = await filtrarUnicosPorGrupo('cancion', valoradasCancionIds);
    const todasCancionUnicas = await filtrarUnicosPorGrupo('cancion', cancionIds);

    const valoradasVideoUnicas = await filtrarUnicosPorGrupo('video', valoradasVideoIds);
    const todasVideoUnicas = await filtrarUnicosPorGrupo('video', videoIds);

    // 4. Si NO ha valorado todas las entidades únicas, NO calcular
    if (
      valoradasAlbumUnicas.length < todasAlbumUnicas.length ||
      valoradasCancionUnicas.length < todasCancionUnicas.length ||
      valoradasVideoUnicas.length < todasVideoUnicas.length
    ) {
      return res.json({ calificacion: null });
    }

    // 5. Si todas las entidades son duplicados de otras ya valoradas (ninguna nueva), NO calcular
    if (
      todasAlbumUnicas.length === 0 &&
      todasCancionUnicas.length === 0 &&
      todasVideoUnicas.length === 0
    ) {
      return res.json({ calificacion: null });
    }

    // 6. Obtener calificaciones de las entidades únicas valoradas
    const { data: valsAlbumCalif } = await supabase
      .from("valoraciones_albumes")
      .select("calificacion, album")
      .eq("usuario", usuario)
      .in("album", valoradasAlbumUnicas);

    const { data: valsCancionCalif } = await supabase
      .from("valoraciones_canciones")
      .select("calificacion, cancion")
      .eq("usuario", usuario)
      .in("cancion", valoradasCancionUnicas);

    const { data: valsVideoCalif } = await supabase
      .from("valoraciones_videos_musicales")
      .select("calificacion, video")
      .eq("usuario", usuario)
      .in("video", valoradasVideoUnicas);

    // 7. Aplica el método avanzado según prefs
    const metodo = prefs.metodo_artista || "promedio";
    let resultado = 0;
    // ...aquí tu lógica de métodos avanzados, usando solo los arrays *_Calif.map(v => Number(v.calificacion))...

    // Ejemplo para promedio simple:
    if (metodo === "promedio") {
      const arr = [
        ...valsAlbumCalif.map(v => Number(v.calificacion)),
        ...valsCancionCalif.map(v => Number(v.calificacion)),
        ...valsVideoCalif.map(v => Number(v.calificacion)),
      ];
      resultado = calcularAgregado(arr, "promedio");
    }
    // ...agrega aquí los otros métodos avanzados según tu lógica...

    // Aplica redondeo
    if (prefs.redondeo === "arriba") resultado = Math.ceil(resultado * 2) / 2;
    if (prefs.redondeo === "abajo") resultado = Math.floor(resultado * 2) / 2;

    // Guarda o actualiza la valoración automática en la tabla
    await upsertValoracionAutomatica(usuario, tableName, referenciaId, entidad_id, resultado);

    return res.json({ calificacion: resultado });
  }
  // Si no es album/artista, usa la directa
  return obtenerValoracion(req, res);
};

// Nueva función utilitaria para insertar o actualizar la valoración automática
async function upsertValoracionAutomatica(usuario, tableName, referenciaId, entidad_id, calificacion) {
  // Verifica existencia y cantidad de entidades
  if (referenciaId === "artista") {
    const { data: artista } = await supabase.from('artistas').select('id_artista').eq('id_artista', entidad_id).single();
    if (!artista) return; // No existe
    // Cuenta entidades
    const { data: albumes } = await supabase.from('album_artistas').select('album_id').eq('artista_id', entidad_id);
    const { data: canciones } = await supabase.from('cancion_artistas').select('cancion_id').eq('artista_id', entidad_id);
    const { data: videos } = await supabase .from('video_artistas').select('video_id').eq('artista_id', entidad_id);
    const total = (albumes?.length || 0) + (canciones?.length || 0) + (videos?.length || 0);
    if (total < 10) return; // No cumple mínimo
  }
  // Busca si ya existe
  const { data: existente, error: errorExistente } = await supabase
    .from(tableName)
    .select('*')
    .eq('usuario', usuario)
    .eq(referenciaId, entidad_id)
    .single();

  if (errorExistente && errorExistente.code !== 'PGRST116') throw errorExistente;

  let id_valoracion = null;

  if (existente) {
    // Solo actualiza si cambió la calificación o no es automática
    if (existente.calificacion !== calificacion || !existente.automatica) {
      const { data: updated } = await supabase
        .from(tableName)
        .update({ calificacion, automatica: true, registrado: new Date() })
        .eq('id_valoracion', existente.id_valoracion)
        .select()
        .single();
      id_valoracion = updated?.id_valoracion || existente.id_valoracion;
    } else {
      id_valoracion = existente.id_valoracion;
    }
  } else {
    const { data: inserted } = await supabase
      .from(tableName)
      .insert([{
        usuario,
        [referenciaId]: entidad_id,
        calificacion,
        comentario: "Valoración automática",
        registrado: new Date(),
        automatica: true
      }])
      .select()
      .single();
    id_valoracion = inserted?.id_valoracion;
  }

  // Actualiza ranking_elementos también
  const { data: rankingExistente } = await supabase
    .from('ranking_elementos')
    .select('*')
    .eq('ranking_id', usuario)
    .eq('entidad_id', entidad_id)
    .eq('tipo_entidad', referenciaId === "album" ? "album" : "artista")
    .single();

  if (!rankingExistente) {
    // Busca la última posición actual
    const { data: maxPos } = await supabase
      .from('ranking_elementos')
      .select('posicion')
      .eq('ranking_id', usuario)
      .eq('tipo_entidad', referenciaId === "album" ? "album" : "artista")
      .order('posicion', { ascending: false })
      .limit(1);
    const nuevaPos = (maxPos && maxPos[0]?.posicion ? maxPos[0].posicion + 1 : 1);
    await supabase
      .from('ranking_elementos')
      .insert([{
        ranking_id: usuario,
        entidad_id,
        tipo_entidad: referenciaId === "album" ? "album" : "artista",
        valoracion: calificacion,
        posicion: nuevaPos
      }]);
  } else {
    await supabase
      .from('ranking_elementos')
      .update({ valoracion: calificacion })
      .eq('id', rankingExistente.id);
  }

  // === NUEVO: Registrar tendencia y actividad ===
  // 1. Tendencia
  await registrarTendencia({
    usuario,
    entidad_tipo: referenciaId === "album" ? "album" : "artista",
    entidad_id,
    calificacion
  });

  // 2. Actividad (en ambas tablas)
  await registrarActividad(
    usuario,
    'valoracion',
    referenciaId === "album" ? "album" : "artista",
    entidad_id
  );
}

// NUEVO: Filtrar IDs únicos por grupo (canción, álbum, video)
async function filtrarUnicosPorGrupo(entidad, ids) {
  if (!ids.length) return [];
  // Si ya no hay clusters de canciones, solo devuelve los ids únicos
  if (entidad === 'cancion') return [...new Set(ids)];
  // Para álbum y video, puedes mantener la lógica de clusters si existen
  let tablaCluster = '';
  let idField = '';
  if (entidad === 'album') { tablaCluster = 'album_clusters'; idField = 'id_album'; }
  else if (entidad === 'video') { tablaCluster = 'video_clusters'; idField = 'id_video'; }
  else return [...new Set(ids)];
  const { data: clusters } = await supabase
    .from(tablaCluster)
    .select(`${idField}, grupo`)
    .in(idField, ids);
  const grupoMap = {};
  for (const c of clusters || []) {
    if (!grupoMap[c.grupo]) grupoMap[c.grupo] = c[idField];
  }
  return Object.values(grupoMap);
}

module.exports = {
  filtrarUnicosPorGrupo, obtenerHistorialValoraciones, eliminarComentario, crearValoracion, obtenerValoracion, eliminarValoracion, agregarComentario, obtenerPromedio, agregarEmocion, contarEmociones, obtenerValoracionesGlobales, segmentacionPersonal, obtenerValoracionAgregada
};