const supabase = require('../db');

async function getGeneroIdByNombre(nombre) {
  const { data, error } = await supabase
    .from('generos')
    .select('id_genero')
    .eq('nombre', nombre)
    .single();
  if (error) return null;
  return data?.id_genero || null;
}

const filtrarEntidades = async (req, res) => {
  const { artista, genero, entidad, anio, orden, termino, pagina = 1 } = req.query;
  const LIMITE_PAGINA = 1000;
  const paginaNum = parseInt(pagina) || 1;
  const desde = (paginaNum - 1) * LIMITE_PAGINA;
  const hasta = desde + LIMITE_PAGINA;

  try {
    // Selecciona la vista según la ordenación
    let vista = 'vista_orden_intercalada';
    if (orden === 'popularidad') vista = 'vista_popularidad';
    else if (orden === 'valoracion') vista = 'vista_valoracion_promedio_ordenada';
    // Si tienes una vista para ranking comunitario, ponla aquí
    // else if (orden === 'ranking_comunitario') vista = 'vista_ranking_comunitario';

    let query = supabase.from(vista).select('*');

    if (termino) query = query.ilike('nombre', `%${termino}%`);
    if (artista) query = query.eq('artista_id', parseInt(artista));
    if (genero) query = query.ilike('generos', `%${genero}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (entidad) query = query.eq('tipo', entidad);

    // Si la vista no está ordenada por defecto, no ordenes aquí
    if (orden === 'predeterminado') {
      query = query.order('rn', { ascending: true }).order('entidad_orden', { ascending: true });
    }

    // Agrega paginación
    query = query.range(desde, hasta);

    const { data, error } = await query;
    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error al filtrar entidades:', error);
    res.status(500).json({ error: error.message });
  }
};

const contarEntidades = async (req, res) => {
  const { artista, genero, entidad, anio, orden, termino } = req.query;
  try {
    let query = supabase.from('vista_orden_intercalada').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('nombre', `%${termino}%`);
    if (artista) query = query.eq('artista_id', parseInt(artista));
    if (genero) query = query.ilike('generos', `%${genero}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (entidad) query = query.eq('tipo', entidad);
    const { count, error } = await query;
    if (error) throw error;
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Contar artistas
const contarArtistas = async (req, res) => {
  const { artista, genero, termino, anio, entidad } = req.query;
  try {
    // Si recibe año, siempre retornar 0
    if (anio) return res.json({ count: 0 });
    if (['album', 'song', 'video'].includes(entidad)) {
      return res.json({ count: 0 });
    }

    let ids = null;
    let generoId = null;

    if (genero) {
      generoId = await getGeneroIdByNombre(genero);
      if (!generoId) return res.json({ count: 0 });
    }

    if (artista) {
      ids = [parseInt(artista)];
    }

    if (generoId) {
      const { data: artistasGenero, error: errorGenero } = await supabase
        .from('artista_generos')
        .select('artista_id')
        .eq('genero_id', generoId);
      if (errorGenero) throw errorGenero;
      const idsGenero = (artistasGenero || []).map(a => a.artista_id);
      if (idsGenero.length === 0) return res.json({ count: 0 });
      ids = ids ? ids.filter(id => idsGenero.includes(id)) : idsGenero;
      if (ids.length === 0) return res.json({ count: 0 });
    }

    let query = supabase.from('artistas').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('nombre_artista', `%${termino}%`);
    if (ids) query = query.in('id_artista', ids);

    const { count, error } = await query;
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Contar videos
const contarVideos = async (req, res) => {
  const { artista, genero, anio, termino, entidad } = req.query;
  if (['album', 'song', 'artist'].includes(entidad)) {
      return res.json({ count: 0 });
    }
  try {
    let ids = null;
    let generoId = null;

    if (genero) {
      generoId = await getGeneroIdByNombre(genero);
      if (!generoId) return res.json({ count: 0 });
    }

    if (artista) {
      const { data: videosArtista, error: errorArtista } = await supabase
        .from('video_artistas')
        .select('video_id')
        .eq('artista_id', artista);
      if (errorArtista) throw errorArtista;
      ids = (videosArtista || []).map(a => a.video_id);
      if (ids.length === 0) return res.json({ count: 0 });
    }

    if (generoId) {
      const { data: videosGenero, error: errorGenero } = await supabase
        .from('video_generos')
        .select('video_id')
        .eq('genero_id', generoId);
      if (errorGenero) throw errorGenero;
      const idsGenero = (videosGenero || []).map(a => a.video_id);
      if (idsGenero.length === 0) return res.json({ count: 0 });
      ids = ids ? ids.filter(id => idsGenero.includes(id)) : idsGenero;
      if (ids.length === 0) return res.json({ count: 0 });
    }

    let query = supabase.from('videos_musicales').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (ids) query = query.in('id_video', ids);

    const { count, error } = await query;
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Contar álbumes
const contarAlbumes = async (req, res) => {
  const { artista, genero, anio, termino, entidad } = req.query;
  if (['artist', 'song', 'video'].includes(entidad)) {
      return res.json({ count: 0 });
    }
  try {
    let ids = null;
    let generoId = null;
    if (genero) {
      generoId = await getGeneroIdByNombre(genero);
      if (!generoId) return res.json({ count: 0 });
    }
    if (artista) {
      const { data: albumesArtista, error: errorArtista } = await supabase
        .from('album_artistas')
        .select('album_id')
        .eq('artista_id', artista);
      if (errorArtista) throw errorArtista;
      ids = (albumesArtista || []).map(a => a.album_id);
      if (ids.length === 0) return res.json({ count: 0 });
    }
    if (generoId) {
      const { data: albumesGenero, error: errorGenero } = await supabase
        .from('album_generos')
        .select('album_id')
        .eq('genero_id', generoId);
      if (errorGenero) throw errorGenero;
      const idsGenero = (albumesGenero || []).map(a => a.album_id);
      if (idsGenero.length === 0) return res.json({ count: 0 });
      ids = ids ? ids.filter(id => idsGenero.includes(id)) : idsGenero;
      if (ids.length === 0) return res.json({ count: 0 });
    }
    let query = supabase.from('albumes').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    if (anio) query = query.eq('anio', parseInt(anio));
    if (ids) query = query.in('id_album', ids);
    const { count, error } = await query;
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const contarCanciones = async (req, res) => {
  const { artista, genero, anio, termino, entidad } = req.query;
  if (['album', 'artist', 'video'].includes(entidad)) {
      return res.json({ count: 0 });
    }
  try {
    let ids = null;
    let generoId = null;

    if (genero) {
      generoId = await getGeneroIdByNombre(genero);
      if (!generoId) return res.json({ count: 0 });
    }

    if (artista) {
      const { data: cancionesArtista, error: errorArtista } = await supabase
        .from('cancion_artistas')
        .select('cancion_id')
        .eq('artista_id', artista);
      if (errorArtista) throw errorArtista;
      ids = (cancionesArtista || []).map(a => a.cancion_id);
      if (ids.length === 0) return res.json({ count: 0 });
    }

    if (generoId) {
      const { data: cancionesGenero, error: errorGenero } = await supabase
        .from('cancion_generos')
        .select('cancion_id')
        .eq('genero_id', generoId);
      if (errorGenero) throw errorGenero;
      const idsGenero = (cancionesGenero || []).map(a => a.cancion_id);
      if (idsGenero.length === 0) return res.json({ count: 0 });
      ids = ids ? ids.filter(id => idsGenero.includes(id)) : idsGenero;
      if (ids.length === 0) return res.json({ count: 0 });
    }

    let query = supabase.from('canciones').select('*', { count: 'exact', head: true });
    if (termino) query = query.ilike('titulo', `%${termino}%`);
    if (anio) {
      const { data: albumes, error: errorAlbum } = await supabase
        .from('albumes')
        .select('id_album')
        .eq('anio', parseInt(anio));
      if (errorAlbum) throw errorAlbum;
      const albumIds = (albumes || []).map(a => a.id_album);
      if (albumIds.length === 0) return res.json({ count: 0 });
      query = query.in('album', albumIds);
    }
    if (ids) query = query.in('id_cancion', ids);

    const { count, error } = await query;
    if (error) throw error;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Nuevo endpoint de búsqueda global
const buscarGlobal = async (req, res) => {
  const { termino } = req.query;
  if (!termino || termino.length < 2) {
    return res.status(400).json({ error: "Proporcione un término de búsqueda de al menos 2 caracteres." });
  }
  try {
    // Busca en artistas
    const { data: artistas, error: errorArtistas } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista, foto_artista')
      .ilike('nombre_artista', `%${termino}%`)
      .limit(20);
    if (errorArtistas) throw errorArtistas;

    // Busca en álbumes
    const { data: albumes, error: errorAlbumes } = await supabase
      .from('albumes')
      .select('id_album, titulo, foto_album')
      .ilike('titulo', `%${termino}%`)
      .limit(20);
    if (errorAlbumes) throw errorAlbumes;

    // Busca en canciones
    const { data: canciones, error: errorCanciones } = await supabase
      .from('canciones')
      .select('id_cancion, titulo, album')
      .ilike('titulo', `%${termino}%`)
      .limit(20);
    if (errorCanciones) throw errorCanciones;

    // Busca los álbumes de esas canciones para obtener la imagen
    let cancionesConImagen = [];
    if (canciones && canciones.length > 0) {
      const albumIds = canciones.map(c => c.album).filter(Boolean);
      let albumesMap = {};
      if (albumIds.length > 0) {
        const { data: albumes } = await supabase
          .from('albumes')
          .select('id_album, foto_album')
          .in('id_album', albumIds);
        albumesMap = Object.fromEntries((albumes || []).map(a => [a.id_album, a.foto_album]));
      }
      cancionesConImagen = canciones.map(c => ({
        ...c,
        foto_album: albumesMap[c.album] || null
      }));
    }

    // Busca en videos
    const { data: videos, error: errorVideos } = await supabase
      .from('videos_musicales')
      .select('id_video, titulo, miniatura')
      .ilike('titulo', `%${termino}%`)
      .limit(20);
    if (errorVideos) throw errorVideos;

    res.json({
      artistas: artistas || [],
      albumes: albumes || [],
      canciones: cancionesConImagen || [],
      videos: videos || [],
    });
  } catch (error) {
    console.error('Error en búsqueda global:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  filtrarEntidades,
  contarEntidades,
  contarArtistas,
  contarAlbumes,
  contarCanciones,
  contarVideos,
  buscarGlobal, // <-- exporta el nuevo controlador
};