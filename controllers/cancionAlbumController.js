const supabase = require('../db');

const obtenerAlbumDeCancion = async (req, res) => {
  const { id } = req.params; // ID de la canción

  try {
    const { data, error } = await supabase
      .from('canciones')
      .select('albumes (id_album, titulo, anio, foto_album)')
      .eq('id_cancion', id)
      .single();

    if (error) throw error;

    res.status(200).json({ album: data.albumes });
  } catch (error) {
    console.error("❌ Error al obtener álbum de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerAlbumDeCancion };