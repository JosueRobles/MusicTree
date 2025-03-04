const supabase = require("../db");

const obtenerArtistasDeVideo = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('video_artistas')
      .select('artistas (id_artista, nombre_artista, foto_artista)')
      .eq('video_id', id);

    if (error) throw error;

    res.status(200).json({ artists: data.map(item => item.artistas) });
  } catch (error) {
    console.error("❌ Error al obtener artistas del video:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerArtistasDeVideo };