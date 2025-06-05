const supabase = require('../db');

// Artista -> Videos
const obtenerVideosDeArtista = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('video_artistas')
      .select('videos_musicales (id_video, titulo, url_video, duracion, popularidad, miniatura)')
      .eq('artista_id', id);

    if (error) throw error;
    res.status(200).json(data.map(item => item.videos_musicales));
  } catch (error) {
    console.error("❌ Error al obtener videos del artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Video -> Artistas
const obtenerArtistasDeVideo = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('video_artistas')
      .select('artistas (id_artista, nombre_artista, foto_artista)')
      .eq('video_id', id);

    if (error) throw error;
    res.status(200).json(data.map(item => item.artistas));
  } catch (error) {
    console.error("❌ Error al obtener artistas del video:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Canción -> Artistas
const obtenerArtistasDeCancion = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('cancion_artistas')
      .select('artistas (id_artista, nombre_artista, foto_artista)')
      .eq('cancion_id', id); // Cambié "cancion_id" para que coincida con tu tabla

    if (error) throw error;
    res.status(200).json(data.map(item => item.artistas));
  } catch (error) {
    console.error("❌ Error al obtener artistas de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Álbum -> Artistas
const obtenerArtistasDeAlbum = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('album_artistas')
      .select('artistas (id_artista, nombre_artista, foto_artista)')
      .eq('album_id', id); // Cambié "album_id" para que coincida con tu tabla

    if (error) throw error;
    res.status(200).json(data.map(item => item.artistas));
  } catch (error) {
    console.error("❌ Error al obtener artistas del álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Artista -> Canciones
const obtenerCancionesDeArtista = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cancion_artistas')
      .select('cancion_id') // Cambié "cancion_id" para que coincida con tu tabla
      .eq('artista_id', id); // Cambié "artista_id" para que coincida con tu tabla

    if (error) {
      console.error('Error fetching songs for artist:', error);
      return res.status(500).json({ error: 'Error fetching songs for artist' });
    }

    const cancionesIds = data.map((item) => item.cancion_id);

    const { data: canciones, error: cancionesError } = await supabase
      .from('canciones')
      .select('*')
      .in('id_cancion', cancionesIds); // Cambié "id_cancion" para que coincida con tu tabla

    if (cancionesError) {
      console.error('Error fetching song details:', cancionesError);
      return res.status(500).json({ error: 'Error fetching song details' });
    }

    res.status(200).json({ canciones });
  } catch (error) {
    console.error('Unexpected error fetching songs for artist:', error);
    res.status(500).json({ error: 'Unexpected error fetching songs for artist' });
  }
};

// Artista -> Álbumes
const obtenerAlbumesDeArtista = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('album_artistas')
      .select('albumes (id_album, titulo, anio, foto_album, popularidad_album)')
      .eq('artista_id', id); // Cambié "artista_id" para que coincida con tu tabla

    if (error) throw error;

    res.status(200).json(data.map(item => item.albumes));
  } catch (error) {
    console.error("❌ Error al obtener álbumes del artista:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = {
  obtenerCancionesDeArtista,
  obtenerArtistasDeCancion,
  obtenerAlbumesDeArtista,
  obtenerArtistasDeAlbum,
  obtenerVideosDeArtista,
  obtenerArtistasDeVideo,
};