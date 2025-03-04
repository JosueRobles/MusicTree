const supabase = require('../db');

const obtenerArtistasDeCancion = async (req, res) => {
  const { id } = req.params; // ID de la canción

  try {
    const { data, error } = await supabase
      .from('cancion_artistas')
      .select(`
        artistas:artistas(id_artista, nombre_artista, foto_artista)
      `)
      .eq('cancion_id', id);

    if (error) throw error;

    res.status(200).json({ artists: data.map(item => item.artistas) });
  } catch (error) {
    console.error("❌ Error al obtener artistas de la canción:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerArtistasDeCancion };