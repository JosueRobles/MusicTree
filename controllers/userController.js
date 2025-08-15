const supabase = require("../db");

// NUEVO: Estadísticas musicales del usuario
const estadisticasMusicales = async (req, res) => {
  const { id } = req.params;
  try {
    // Valoraciones por tipo de entidad
    const [artistas, albumes, canciones, videos] = await Promise.all([
      supabase.from('valoraciones_artistas').select('calificacion, artista, registrado').eq('usuario', id),
      supabase.from('valoraciones_albumes').select('calificacion, album, registrado').eq('usuario', id),
      supabase.from('valoraciones_canciones').select('calificacion, cancion, registrado').eq('usuario', id),
      supabase.from('valoraciones_videos_musicales').select('calificacion, video, registrado').eq('usuario', id),
    ]);

    // Distribución de estrellas (0, 0.5, 1, ..., 5)
    const estrellasPosibles = Array.from({length: 11}, (_, i) => (i * 0.5).toFixed(1));
    const distribucionEstrellas = {};
    estrellasPosibles.forEach(e => distribucionEstrellas[e] = 0);
    [...artistas.data, ...albumes.data, ...canciones.data, ...videos.data].forEach(v => {
      let val = Number(v.calificacion);
      if (isNaN(val)) val = 0;
      // Redondea a la media estrella más cercana
      val = Math.round(val * 2) / 2;
      if (val >= 0 && val <= 5) distribucionEstrellas[val.toFixed(1)]++;
    });

    // Valoraciones por tipo de entidad
    const porTipo = {
      artista: artistas.data.length,
      album: albumes.data.length,
      cancion: canciones.data.length,
      video: videos.data.length,
    };

    // Valoraciones por año (de álbum/canción/video)
    const albumIds = albumes.data.map(a => a.album);
    const cancionIds = canciones.data.map(c => c.cancion);
    const videoIds = videos.data.map(v => v.video);

    // Trae info de álbumes para canciones
    let cancionesInfo = [];
    if (cancionIds.length) {
      const { data: cancionesData } = await supabase.from('canciones').select('id_cancion, album').in('id_cancion', cancionIds);
      const albumesCancionesIds = cancionesData.map(c => c.album).filter(Boolean);
      const { data: albumesCanciones } = albumesCancionesIds.length
        ? await supabase.from('albumes').select('id_album, anio').in('id_album', albumesCancionesIds)
        : { data: [] };
      const albumAnioMap = Object.fromEntries((albumesCanciones || []).map(a => [a.id_album, a.anio]));
      cancionesInfo = cancionesData.map(c => ({
        ...c,
        anio: albumAnioMap[c.album] || null
      }));
    }

    // Info de álbumes y videos
    const [albumesInfo, videosInfo] = await Promise.all([
      albumIds.length ? supabase.from('albumes').select('id_album, anio').in('id_album', albumIds) : { data: [] },
      videoIds.length ? supabase.from('videos_musicales').select('id_video, anio').in('id_video', videoIds) : { data: [] },
    ]);
    const porAnio = {};
    (albumesInfo.data || []).forEach(a => { if (a.anio) porAnio[a.anio] = (porAnio[a.anio] || 0) + 1; });
    (cancionesInfo || []).forEach(c => { if (c.anio) porAnio[c.anio] = (porAnio[c.anio] || 0) + 1; });
    (videosInfo.data || []).forEach(v => { if (v.anio) porAnio[v.anio] = (porAnio[v.anio] || 0) + 1; });

    // Valoraciones por género (solo para álbumes y canciones)
    const [cancionGeneros, albumGeneros, generos] = await Promise.all([
      cancionIds.length ? supabase.from('cancion_generos').select('cancion_id, genero_id').in('cancion_id', cancionIds) : { data: [] },
      albumIds.length ? supabase.from('album_generos').select('album_id, genero_id').in('album_id', albumIds) : { data: [] },
      supabase.from('generos').select('id_genero, nombre'),
    ]);
    const generoCount = {};
    (cancionGeneros.data || []).forEach(g => { generoCount[g.genero_id] = (generoCount[g.genero_id] || 0) + 1; });
    (albumGeneros.data || []).forEach(g => { generoCount[g.genero_id] = (generoCount[g.genero_id] || 0) + 1; });
    const generosMap = Object.fromEntries((generos.data || []).map(g => [g.id_genero, g.nombre]));
    const porGenero = Object.entries(generoCount).map(([id, count]) => ({
      genero_id: id,
      nombre: generosMap[id] || 'Desconocido',
      count,
    }));

    // Familiaridad
    const { data: familiaridades } = await supabase.from('familiaridad').select('nivel').eq('usuario', id);
    const familiaridadCount = {};
    (familiaridades || []).forEach(f => {
      familiaridadCount[f.nivel] = (familiaridadCount[f.nivel] || 0) + 1;
    });

    // Emociones
    const { data: emociones } = await supabase.from('emociones').select('emocion').eq('usuario', id);
    const emocionCount = {};
    (emociones || []).forEach(e => {
      emocionCount[e.emocion] = (emocionCount[e.emocion] || 0) + 1;
    });

    res.json({
      distribucionEstrellas,
      porTipo,
      porAnio,
      porGenero,
      familiaridadCount,
      emocionCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener estadísticas musicales" });
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*");
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

const obtenerPerfil = async (req, res) => {
  const userId = req.user.id; // Obtén el ID del usuario autenticado desde el token

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario") // Asegúrate de incluir todos los campos necesarios
      .eq("id_usuario", userId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, metodologia_valoracion, configuracion")
      .eq("id_usuario", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerUsuarioActual = async (req, res) => {
  // Permitir visitantes sin token
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || !auth.split(' ')[1]) {
    // Visitante: no hay token, responde 200 y null
    return res.status(200).json(null);
  }

  // Si hay token, sigue con la lógica actual
  const token = auth.split(' ')[1];
  let userId;
  try {
    // Decodifica el token para obtener el id (ajusta según tu JWT)
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    return res.status(200).json(null); // Token inválido, tratar como visitante
  }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario")
      .eq("id_usuario", userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(data);
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const panelAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id_usuario, nombre, email, username, tipo_usuario");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error en el panel de administración:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id_usuario", id);

    if (error) throw error;

    res.status(200).json({ mensaje: "Usuario eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar usuario." });
  }
};

// NUEVO: Guardar/actualizar preferencias de usuario
const actualizarPreferencias = async (req, res) => {
  const { id } = req.params;
  const { metodologia_valoracion, configuracion } = req.body;
  console.log("Preferencias recibidas:", req.body); // <-- Para depuración
  try {
    const { error } = await supabase
      .from("usuarios")
      .update({
        metodologia_valoracion: metodologia_valoracion || null,
        configuracion: configuracion || null,
      })
      .eq("id_usuario", id);
    if (error) throw error;
    res.status(200).json({ message: "Preferencias actualizadas" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar preferencias" });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerPerfil,
  obtenerUsuarioActual,
  panelAdmin,
  obtenerUsuarioPorId,
  eliminarUsuario,
  actualizarPreferencias,
  estadisticasMusicales,
};