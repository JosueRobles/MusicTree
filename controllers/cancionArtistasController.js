const supabase = require('../db');

const obtenerArtistasDeCancion = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener los IDs de artistas relacionados con la canción
    const { data, error } = await supabase
      .from('cancion_artistas')
      .select('artista_id')
      .eq('cancion_id', id);
    
    if (error) {
      console.error("Error al obtener artistas IDs:", error);
      return res.status(500).json({ error: "Error en el servidor" });
    }
    
    if (!data || data.length === 0) {
      return res.status(200).json({ artists: [] });
    }
    
    // Obtener los detalles de los artistas
    const artistaIds = data.map(item => item.artista_id);
    const { data: artists, error: artistsError } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista, foto_artista')
      .in('id_artista', artistaIds);
    
    if (artistsError) {
      console.error("Error al obtener detalles de artistas:", artistsError);
      return res.status(500).json({ error: "Error en el servidor" });
    }
    
    res.status(200).json({ artists });
  } catch (error) {
    console.error("❌ Error al obtener artistas de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerArtistasDeCancion };