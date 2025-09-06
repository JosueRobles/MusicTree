const supabase = require('../db');
const { 
  obtenerGenerosDeSpotify, 
  obtenerGenerosDeLastFM, 
  normalizarGenero, 
  almacenarGenerosYRelacionar, 
  obtenerNombreArtista,
  insertarGenerosPrincipales, buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion
} = require('./utils/genreHelpers');
const { safeSpotifyCall } = require('./utils/spotifySafeCall');

// Actualizar géneros de artistas
const updateArtistGenres = async (req, res) => {
  try {
    // 1. Artistas sin género
    const { data: allArtists, error: error1 } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista');
    if (error1) throw error1;

    const { data: artistGenres, error: error2 } = await supabase
      .from('artista_generos')
      .select('artista_id');
    if (error2) throw error2;

    const artistIdsWithGenre = new Set((artistGenres || []).map(a => a.artista_id));
    const artistsNoGenre = (allArtists || []).filter(a => !artistIdsWithGenre.has(a.id_artista));

    for (const artist of artistsNoGenre) {
      await buscarGenerosDeArtista(artist.id_artista, artist.nombre_artista);
    }
    console.log("Extraccion de valores nulos completada");

    // 2. Artistas con género pero subgéneros nulos o vacíos
    const { data: artistasSinSubgenero, error: error3 } = await supabase
      .from('artista_generos')
      .select('artista_id, subgeneros');
    if (error3) throw error3;

    for (const rel of (artistasSinSubgenero || []).filter(r => !r.subgeneros || r.subgeneros.length === 0)) {
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', rel.artista_id)
        .single();
      if (artist) await buscarGenerosDeArtista(rel.artista_id, artist.nombre_artista);
    }

    res.status(200).json({ message: 'Géneros de artistas actualizados correctamente.' });
  } catch (error) {
    console.error('Error al actualizar géneros de artistas:', error);
    res.status(500).json({ error: 'Error al actualizar géneros de artistas.' });
  }
};

// Actualizar géneros de álbumes
const updateAlbumGenres = async (req, res) => {
  try {
    const { data: allAlbums, error: error1 } = await supabase
      .from('albumes')
      .select('id_album, titulo');
    if (error1) throw error1;

    const { data: albumGenres, error: error2 } = await supabase
      .from('album_generos')
      .select('album_id');
    if (error2) throw error2;

    const albumIdsWithGenre = new Set((albumGenres || []).map(a => a.album_id));
    const albumsNoGenre = (allAlbums || []).filter(a => !albumIdsWithGenre.has(a.id_album));

    for (const album of albumsNoGenre) {
      console.log(`🎧 (NULO) Álbum sin género: ${album.titulo}`);
      const { data: rel } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', album.id_album)
        .single();
      if (!rel) continue;

      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', rel.artista_id)
        .single();
      if (!artist) continue;

      await buscarGenerosDeAlbumOCancion('album', album.id_album, album.titulo, artist.nombre_artista);
    }

    console.log("Extraccion de valores nulos completada");

    const { data: albumsSinSubgenero, error: error3 } = await supabase
      .from('album_generos')
      .select('album_id, subgeneros');
    if (error3) throw error3;

    for (const rel of (albumsSinSubgenero || []).filter(r => !r.subgeneros || r.subgeneros.length === 0)) {
      const { data: album } = await supabase
        .from('albumes')
        .select('titulo')
        .eq('id_album', rel.album_id)
        .single();
      const { data: relArtista } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', rel.album_id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();

      if (album && artist) {
        await buscarGenerosDeAlbumOCancion('album', rel.album_id, album.titulo, artist.nombre_artista);
      }
    }

    res.status(200).json({ message: 'Géneros de álbumes actualizados correctamente.' });
  } catch (error) {
    console.error('❌ Error al actualizar géneros de álbumes:', error);
    res.status(500).json({ error: 'Error al actualizar géneros de álbumes.' });
  }
};

// Actualizar géneros de canciones
const updateSongGenres = async (req, res) => {
  try {
    const { data: allSongs, error: error1 } = await supabase
      .from('canciones')
      .select('id_cancion, titulo');
    if (error1) throw error1;

    const { data: songGenres, error: error2 } = await supabase
      .from('cancion_generos')
      .select('cancion_id');
    if (error2) throw error2;

    const songIdsWithGenre = new Set((songGenres || []).map(a => a.cancion_id));
    const songsNoGenre = (allSongs || []).filter(a => !songIdsWithGenre.has(a.id_cancion));

    for (const song of songsNoGenre) {
      console.log(`🎵 (NULO) Canción sin género: ${song.titulo}`);
      const { data: rel } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', song.id_cancion)
        .single();
      if (!rel) continue;

      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', rel.artista_id)
        .single();
      if (!artist) continue;

      await buscarGenerosDeAlbumOCancion('cancion', song.id_cancion, song.titulo, artist.nombre_artista);
    }

    console.log("Extraccion de valores nulos completada");

    const { data: songsSinSubgenero, error: error3 } = await supabase
      .from('cancion_generos')
      .select('cancion_id, subgeneros');
    if (error3) throw error3;

    for (const rel of (songsSinSubgenero || []).filter(r => !r.subgeneros || r.subgeneros.length === 0)) {
      const { data: song } = await supabase
        .from('canciones')
        .select('titulo')
        .eq('id_cancion', rel.cancion_id)
        .single();
      const { data: relArtista } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', rel.cancion_id)
        .single();
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', relArtista?.artista_id)
        .single();
      if (song && artist) {
        await buscarGenerosDeAlbumOCancion('cancion', rel.cancion_id, song.titulo, artist.nombre_artista);
      }
    }

    res.status(200).json({ message: 'Géneros de canciones actualizados correctamente.' });
  } catch (error) {
    console.error('❌ Error al actualizar géneros de canciones:', error);
    res.status(500).json({ error: 'Error al actualizar géneros de canciones.' });
  }
};

// Eliminar géneros con pocas menciones
const deleteLowMentionGenres = async (req, res) => {
  const { minMentions } = req.body;
  try {
    const { data: genresToDelete } = await supabase.rpc('get_low_mention_genres', { min_mentions: minMentions });
    for (const genre of genresToDelete) {
      await supabase.from('artista_generos').delete().eq('genero_id', genre.id_genero);
      await supabase.from('album_generos').delete().eq('genero_id', genre.id_genero);
      await supabase.from('cancion_generos').delete().eq('genero_id', genre.id_genero);
      await supabase.from('generos').delete().eq('id_genero', genre.id_genero);
    }
    res.json({ message: 'Géneros irrelevantes eliminados correctamente.' });
  } catch (error) {
    console.error('❌ Error al eliminar géneros irrelevantes:', error);
    res.status(500).json({ error: 'Error al eliminar géneros irrelevantes.' });
  }
};

// Ruta para cargar géneros principales
const loadMainGenres = async (req, res) => {
  const mainGenres = [
    'Pop',
    'Rock',
    'Metal',
    'Hip Hop',
    'Rap',
    'Folk',
    'Jazz',
    'Classical',
    'Electronic',
    'Country',
    'Reggae',
    'Blues',
    'Punk',
  ];

  try {
    await insertarGenerosPrincipales(mainGenres);
    res.status(200).json({ message: 'Géneros principales cargados correctamente.' });
  } catch (error) {
    console.error('Error al cargar géneros principales:', error);
    res.status(500).json({ error: 'Error al cargar géneros principales' });
  }
};

const getGeneros = async (req, res) => {
  try {
    const { data, error } = await supabase.from('generos').select('*');

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Error fetching genres' });
  }
};

// Obtener artistas relacionados con un género
const getArtistasPorGenero = async (req, res) => {
  const { id } = req.params;
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'El ID del género debe ser un número entero.' });
  }
  try {
    const { data, error } = await supabase
      .from('artista_generos')
      .select('artista_id, subgeneros, artistas(nombre_artista, foto_artista, popularidad_artista)')
      .eq('genero_id', id);

    if (error) throw error;

    // Devuelve los artistas con subgéneros de la relación
    const artistas = data.map((item) => ({
      ...item.artistas,
      id_artista: item.artista_id,
      subgeneros: item.subgeneros // <-- aquí
    }));
    res.status(200).json(artistas);
  } catch (error) {
    console.error('Error fetching artists for genre:', error);
    res.status(500).json({ error: 'Error fetching artists for genre' });
  }
};

// Obtener álbumes relacionados con un género
const getAlbumesPorGenero = async (req, res) => {
  const { id } = req.params;

  // Validación del parámetro id
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'El ID del género debe ser un número entero.' });
  }

  try {
    // Seleccionamos los álbumes relacionados desde la tabla album_generos
    const { data, error } = await supabase
      .from('album_generos')
      .select('album_id, subgeneros, albumes(titulo, foto_album, anio)')
      .eq('genero_id', id);

    if (error) throw error;

    // Retornamos los álbumes relacionados con el género
    const albumes = data.map((item) => ({
      ...item.albumes,
      id_album: item.album_id,
      subgeneros: item.subgeneros
    }));
    res.status(200).json(albumes);
  } catch (error) {
    console.error('Error fetching albums for genre:', error);
    res.status(500).json({ error: 'Error fetching albums for genre' });
  }
};

// Obtener canciones relacionadas con un género
const getCancionesPorGenero = async (req, res) => {
  const { id } = req.params;

  // Validación del parámetro id
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'El ID del género debe ser un número entero.' });
  }

  try {
    // Seleccionamos las canciones relacionadas desde la tabla cancion_generos
    const { data, error } = await supabase
      .from('cancion_generos')
      .select('cancion_id, subgeneros, canciones(titulo, duracion_ms, popularidad)')
      .eq('genero_id', id);

    if (error) throw error;

    // Retornamos las canciones relacionadas con el género
    const canciones = data.map((item) => ({
      ...item.canciones,
      id_cancion: item.cancion_id,
      subgeneros: item.subgeneros
    }));
    res.status(200).json(canciones);
  } catch (error) {
    console.error('Error fetching songs for genre:', error);
    res.status(500).json({ error: 'Error fetching songs for genre' });
  }
};

// Obtener un género por ID
const getGeneroPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('generos')
      .select('*')
      .eq('id_genero', id)
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ error: 'Género no encontrado.' });
  }
};

const getVideosPorGenero = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'El ID del género debe ser un número entero.' });
  }

  try {
    const { data, error } = await supabase
      .from('video_generos')
      .select('video_id, subgeneros, videos_musicales(titulo, url_video, duracion, popularidad, miniatura)')
      .eq('genero_id', id);

    if (error) throw error;

    const videos = data.map((item) => ({
      ...item.videos_musicales,
      id_video: item.video_id,
      subgeneros: item.subgeneros
    }));

    res.status(200).json(videos);
  } catch (error) {
    console.error('❌ Error al obtener videos por género:', error);
    res.status(500).json({ error: 'Error al obtener videos por género' });
  }
};

const updateVideoGenres = async (req, res) => {
  try {
    // Traer todos los videos musicales
    const { data: videos, error } = await supabase
      .from('videos_musicales')
      .select('id_video, titulo');

    if (error) throw error;

    for (const video of videos) {
      // 1. Buscar canciones con el mismo título
      const { data: cancionesSimilares } = await supabase
        .from('canciones')
        .select('id_cancion')
        .ilike('titulo', video.titulo);

      let generosSet = new Set();

      for (const cancion of cancionesSimilares || []) {
        const { data: generosCancion } = await supabase
          .from('cancion_generos')
          .select('genero_id')
          .eq('cancion_id', cancion.id_cancion);

        generosCancion?.forEach(g => generosSet.add(g.genero_id));
      }

      // 2. Buscar artistas del video
      const { data: artistasVideo } = await supabase
        .from('video_artistas')
        .select('artista_id')
        .eq('video_id', video.id_video);

      for (const artista of artistasVideo || []) {
        const { data: generosArtista } = await supabase
          .from('artista_generos')
          .select('genero_id')
          .eq('artista_id', artista.artista_id);

        generosArtista?.forEach(g => generosSet.add(g.genero_id));
      }

      // Limpiar géneros existentes
      await supabase
        .from('video_generos')
        .delete()
        .eq('video_id', video.id_video);

      // Insertar nuevos géneros
      const nuevos = Array.from(generosSet).map((genero_id) => ({
        video_id: video.id_video,
        genero_id
      }));

      if (nuevos.length > 0) {
        await supabase.from('video_generos').insert(nuevos);
        console.log(`✅ Video ID ${video.id_video}: géneros actualizados`);
      } else {
        console.log(`⚠️ Video ID ${video.id_video} sin géneros detectados`);
      }
    }

    res.status(200).json({ message: 'Géneros de videos actualizados correctamente.' });
  } catch (error) {
    console.error('❌ Error al actualizar géneros de videos:', error);
    res.status(500).json({ error: 'Error al actualizar géneros de videos' });
  }
};

// Devuelve subgéneros presentes en entidades de un género y su conteo
const getSubgenerosConPresencia = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Junta todos los subgéneros de artista_generos, album_generos y cancion_generos para este género
    const tablas = [
      { tabla: 'artista_generos', campo: 'subgeneros' },
      { tabla: 'album_generos', campo: 'subgeneros' },
      { tabla: 'cancion_generos', campo: 'subgeneros' }
    ];
    let conteo = {};
    for (const t of tablas) {
      const { data, error } = await supabase
        .from(t.tabla)
        .select(t.campo)
        .eq('genero_id', id);
      if (error) continue;
      for (const fila of data) {
        let subs = [];
        if (Array.isArray(fila.subgeneros)) subs = fila.subgeneros;
        else if (typeof fila.subgeneros === 'string' && fila.subgeneros.startsWith('[')) {
          try { subs = JSON.parse(fila.subgeneros); } catch {}
        } else if (typeof fila.subgeneros === 'string' && fila.subgeneros.length > 0) {
          subs = [fila.subgeneros];
        }
        for (const sub of subs) {
          if (!sub) continue;
          conteo[sub] = (conteo[sub] || 0) + 1;
        }
      }
    }
    // Devuelve array [{subgenero, count}]
    const resultado = Object.entries(conteo)
      .map(([subgenero, count]) => ({ subgenero, count }))
      .sort((a, b) => b.count - a.count);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener subgéneros con presencia' });
  }
};

module.exports = {
  loadMainGenres,
  getGeneros,
  getArtistasPorGenero,
  getAlbumesPorGenero,
  getCancionesPorGenero,
  updateArtistGenres,
  updateAlbumGenres,
  updateSongGenres,
  deleteLowMentionGenres,
  getGeneroPorId,
  getVideosPorGenero,
  updateVideoGenres,
  getSubgenerosConPresencia
};