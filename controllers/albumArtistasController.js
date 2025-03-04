const supabase = require('../db');

const obtenerArtistasDeAlbum = async (req, res) => {
  const { id } = req.params; // ID del álbum

  try {
    const { data, error } = await supabase
      .from('album_artistas')
      .select(`
        artistas:artistas(id_artista, nombre_artista, foto_artista)
      `)
      .eq('album_id', id); // Ajustado el nombre de la columna

    if (error) throw error;

    res.status(200).json({ artists: data.map(item => item.artistas) });
  } catch (error) {
    console.error("❌ Error al obtener artistas del álbum:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const obtenerTodosLosArtistas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista, foto_artista');

    if (error) throw error;

    res.status(200).json({ artists: data });
  } catch (error) {
    console.error("❌ Error al obtener todos los artistas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { obtenerArtistasDeAlbum, obtenerTodosLosArtistas };
