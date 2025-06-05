const supabase = require('../db');

// Álbum -> Canciones
const obtenerCancionesDeAlbum = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('*')
      .eq('album', id); // Cambié "album" para que coincida con la columna en tu tabla

    if (error) throw error;

    res.status(200).json({ canciones: data });
  } catch (error) {
    console.error("❌ Error al obtener canciones del álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Canción -> Álbum
const obtenerAlbumDeCancion = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: cancion, error: cancionError } = await supabase
      .from('canciones')
      .select('album')
      .eq('id_cancion', id) // Cambié "id_cancion" para que coincida con tu tabla
      .single();

    if (cancionError || !cancion) {
      console.error("Error al obtener canción:", cancionError);
      return res.status(404).json({ error: "Canción no encontrada" });
    }

    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('id_album, titulo, anio, foto_album')
      .eq('id_album', cancion.album) // Cambié "id_album" para que coincida con tu tabla
      .single();

    if (albumError || !album) {
      console.error("Error al obtener álbum:", albumError);
      return res.status(404).json({ error: "Álbum no encontrado" });
    }

    res.status(200).json({ album });
  } catch (error) {
    console.error("❌ Error al obtener álbum de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerCancionesDeAlbum, obtenerAlbumDeCancion };