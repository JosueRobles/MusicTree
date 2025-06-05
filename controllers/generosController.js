const supabase = require('../db');
const { 
  obtenerGenerosDeSpotify, 
  obtenerGenerosDeLastFM, 
  normalizarGenero, 
  almacenarGenerosYRelacionar, 
  obtenerNombreArtista,
  insertarGenerosPrincipales, buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion
} = require('./utils/genreHelpers');

// Actualizar géneros de artistas
const updateArtistGenres = async (req, res) => {
  try {
    const { data: artists, error } = await supabase.from('artistas').select('id_artista, nombre_artista');
    if (error) throw error;

    for (const artist of artists) {
      await buscarGenerosDeArtista(artist.id_artista, artist.nombre_artista);
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
    const { data: albums, error } = await supabase
      .from('album_artistas')
      .select(`
        album_id,
        artista_id,
        albumes(titulo)
      `); // Relación explícita con la tabla albumes

    if (error) throw error;

    for (const album of albums) {
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', album.artista_id)
        .single();

      if (!album.albumes || !album.albumes.titulo) {
        console.warn(`⚠️ Álbum sin título: ID=${album.album_id}`);
        continue;
      }

      await buscarGenerosDeAlbumOCancion(
        'album',
        album.album_id,
        album.albumes.titulo,
        artist.nombre_artista
      );
    }

    res.status(200).json({ message: 'Géneros de álbumes actualizados correctamente.' });
  } catch (error) {
    console.error('Error al actualizar géneros de álbumes:', error);
    res.status(500).json({ error: 'Error al actualizar géneros de álbumes.' });
  }
};

// Actualizar géneros de canciones
const updateSongGenres = async (req, res) => {
  try {
    const { data: songs, error } = await supabase
      .from('cancion_artistas')
      .select(`
        cancion_id,
        artista_id,
        canciones(titulo)
      `); // Relación explícita con la tabla canciones

    if (error) throw error;

    for (const song of songs) {
      const { data: artist } = await supabase
        .from('artistas')
        .select('nombre_artista')
        .eq('id_artista', song.artista_id)
        .single();

      if (!song.canciones || !song.canciones.titulo) {
        console.warn(`⚠️ Canción sin título: ID=${song.cancion_id}`);
        continue;
      }

      await buscarGenerosDeAlbumOCancion(
        'cancion',
        song.cancion_id,
        song.canciones.titulo,
        artist.nombre_artista
      );
    }

    res.status(200).json({ message: 'Géneros de canciones actualizados correctamente.' });
  } catch (error) {
    console.error('Error al actualizar géneros de canciones:', error);
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

  // Validación del parámetro id
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'El ID del género debe ser un número entero.' });
  }

  try {
    // Seleccionamos los artistas relacionados desde la tabla artista_generos
    const { data, error } = await supabase
      .from('artista_generos')
      .select('artista_id, artistas(nombre_artista, foto_artista, popularidad_artista)')
      .eq('genero_id', id);

    if (error) throw error;

    // Retornamos los artistas relacionados con el género
    const artistas = data.map((item) => item.artistas);
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
      .select('album_id, albumes(titulo, foto_album, anio)')
      .eq('genero_id', id);

    if (error) throw error;

    // Retornamos los álbumes relacionados con el género
    const albumes = data.map((item) => item.albumes);
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
      .select('cancion_id, canciones(titulo, duracion_ms, popularidad)')
      .eq('genero_id', id);

    if (error) throw error;

    // Retornamos las canciones relacionadas con el género
    const canciones = data.map((item) => item.canciones);
    res.status(200).json(canciones);
  } catch (error) {
    console.error('Error fetching songs for genre:', error);
    res.status(500).json({ error: 'Error fetching songs for genre' });
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
};