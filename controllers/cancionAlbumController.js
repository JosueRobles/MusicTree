const supabase = require('../db');

const obtenerAlbumDeCancion = async (req, res) => {
  const { id } = req.params;
  try {
    // Primero obtenemos el ID del álbum de la canción
    const { data: cancion, error: cancionError } = await supabase
      .from('canciones')
      .select('album')
      .eq('id_cancion', id)
      .single();
    
    if (cancionError || !cancion) {
      console.error("Error al obtener canción:", cancionError);
      return res.status(404).json({ error: "Canción no encontrada" });
    }
    
    // Ahora obtenemos los detalles del álbum
    const { data: album, error: albumError } = await supabase
      .from('albumes')
      .select('id_album, titulo, anio, foto_album')
      .eq('id_album', cancion.album)
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

module.exports = { obtenerAlbumDeCancion };