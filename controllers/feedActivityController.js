const supabase = require('../supabaseClient');

// Obtener el feed de actividades
const getFeedActivity = async (req, res) => {
  const { usuarioId, limit = 20 } = req.query;

  try {
    // 1. Obtener usuarios seguidos
    const { data: seguidos, error: seguidoresError } = await supabase
      .from('seguidores')
      .select('usuario_seguido')
      .eq('usuario_seguidor', usuarioId);

    if (seguidoresError) throw seguidoresError;
    const idsSeguidos = seguidos.map((s) => s.usuario_seguido);
    if (idsSeguidos.length === 0) return res.json([]); // Si no sigue a nadie

    // 2. Consultar actividades en actividad_usuario (valoraciones, emociones, etc.)
    const { data: actividades, error: actividadesError } = await supabase
      .from('actividad_usuario')
      .select('*')
      .in('usuario', idsSeguidos);

    if (actividadesError) throw actividadesError;

    // 3. Consultar completaciones de colecciones e insignias
    const { data: colecciones, error: colError } = await supabase
      .from('colecciones_usuario')
      .select('usuario, coleccion_id, obtenido_en');

    const { data: insignias, error: insError } = await supabase
      .from('insignias_usuario')
      .select('usuario, insignia_id, fecha');

    if (colError) throw colError;
    if (insError) throw insError;

    // Filtrar solo las de los seguidos
    const completacionesColecciones = colecciones.filter((c) => idsSeguidos.includes(c.usuario));
    const completacionesInsignias = insignias.filter((i) => idsSeguidos.includes(i.usuario));

    // 4. Mapear todo a un solo arreglo uniforme
    const mappedActividades = actividades.map((a) => ({
      usuario: a.usuario,
      tipo: a.tipo_actividad,
      referencia_id: a.referencia_id,
      referencia_entidad: a.referencia_entidad, // Agregar tipo de entidad
      fecha: a.fecha
    }));

    const mappedColecciones = completacionesColecciones.map((c) => ({
      usuario: c.usuario,
      tipo: 'coleccion_completada',
      referencia_id: c.coleccion_id,
      referencia_entidad: 'coleccion', // Indicar que es una colección
      fecha: c.obtenido_en
    }));

    const mappedInsignias = completacionesInsignias.map((i) => ({
      usuario: i.usuario,
      tipo: 'insignia_obtenida',
      referencia_id: i.insignia_id,
      referencia_entidad: 'insignia', // Indicar que es una insignia
      fecha: i.fecha
    }));

    const feed = [...mappedActividades, ...mappedColecciones, ...mappedInsignias];

    // 5. Obtener info de los usuarios que realizaron las actividades
    const uniqueUserIds = [...new Set(feed.flatMap(item => [item.usuario, item.referencia_id]))];

    const { data: usuariosInfo, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id_usuario, username, foto_perfil')
      .in('id_usuario', uniqueUserIds);

    if (usuariosError) throw usuariosError;

    const usuariosMap = Object.fromEntries(usuariosInfo.map(u => [u.id_usuario, u]));

    // NUEVO - 5.1 Obtener info de entidades (artistas, albums, canciones, videos)
    const referenciaPorEntidad = {
      artista: [],
      album: [],
      cancion: [],
      video: [],
      coleccion: [],
      insignia: []
    };

    feed.forEach(item => {
      if (item.referencia_entidad && item.referencia_id) {
        referenciaPorEntidad[item.referencia_entidad]?.push(item.referencia_id);
      }
    });

    // Quitar duplicados
    for (const key in referenciaPorEntidad) {
      referenciaPorEntidad[key] = [...new Set(referenciaPorEntidad[key])];
    }

    // Consultar cada tabla solo si hay ids
    const [artistasRes, albumsRes, cancionesRes, videosRes] = await Promise.all([
      referenciaPorEntidad.artista.length > 0
        ? supabase.from('artistas').select('id_artista, nombre, imagen').in('id_artista', referenciaPorEntidad.artista)
        : Promise.resolve({ data: [] }),
      referenciaPorEntidad.album.length > 0
        ? supabase.from('albumes').select('id_album, titulo, portada').in('id_album', referenciaPorEntidad.album)
        : Promise.resolve({ data: [] }),
      referenciaPorEntidad.cancion.length > 0
        ? supabase.from('canciones').select('id_cancion, titulo, portada').in('id_cancion', referenciaPorEntidad.cancion)
        : Promise.resolve({ data: [] }),
      referenciaPorEntidad.video.length > 0
        ? supabase.from('videos').select('id_video, titulo, thumbnail').in('id_video', referenciaPorEntidad.video)
        : Promise.resolve({ data: [] })
    ]);

    const artistasMap = Object.fromEntries((artistasRes.data || []).map(a => [a.id_artista, a]));
    const albumsMap = Object.fromEntries((albumsRes.data || []).map(a => [a.id_album, a]));
    const cancionesMap = Object.fromEntries((cancionesRes.data || []).map(c => [c.id_cancion, c]));
    const videosMap = Object.fromEntries((videosRes.data || []).map(v => [v.id_video, v]));

    // 6. Enriquecer el feed con los detalles de los usuarios y las referencias
    const enrichedFeed = feed.map(item => {
      let referencia_info = null;
      if (item.referencia_entidad === 'artista') referencia_info = artistasMap[item.referencia_id] || null;
      if (item.referencia_entidad === 'album') referencia_info = albumsMap[item.referencia_id] || null;
      if (item.referencia_entidad === 'cancion') referencia_info = cancionesMap[item.referencia_id] || null;
      if (item.referencia_entidad === 'video') referencia_info = videosMap[item.referencia_id] || null;
      if (item.referencia_entidad === 'coleccion') referencia_info = { nombre: 'Colección', descripcion: 'Colección completada' }; // ejemplo de colecciones
      if (item.referencia_entidad === 'insignia') referencia_info = { nombre: 'Insignia', descripcion: 'Insignia obtenida' }; // ejemplo de insignias

      return {
        ...item,
        usuario_info: usuariosMap[item.usuario] || null,
        referencia_info
      };
    });

    // 7. Ordenar por fecha descendente
    const sortedFeed = enrichedFeed.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // 8. Limitar resultados
    const limitedFeed = sortedFeed.slice(0, limit);

    res.json(limitedFeed);
  } catch (error) {
    console.error('Error en getFeedActivity:', error);
    res.status(500).json({ error: 'Error al obtener el feed de actividad' });
  }
};

module.exports = { getFeedActivity };
