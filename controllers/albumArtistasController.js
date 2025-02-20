const supabase = require('../db');

const obtenerAlbumArtistas = async (req, res) => {
  try {
    const { data, error } = await supabase.from('album_artistas').select('*');
    
    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error al obtener álbum_artistas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerAlbumArtistas };