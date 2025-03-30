const supabase = require('../db');

const obtenerArtistasDeAlbum = async (req, res) => {
    const { id } = req.params; // ID del álbum

    try {
        const { data, error } = await supabase
            .from('album_artistas')
            .select('artistas(id_artista, nombre_artista, foto_artista)')
            .eq('album_id', id);

        if (error) throw error;
        if (!data || data.length === 0) return res.status(404).json({ error: "Artistas no encontrados" });

        res.status(200).json({ artists: data.map(item => item.artistas) });
    } catch (error) {
        console.error("❌ Error al obtener artistas del álbum:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
};

module.exports = { obtenerArtistasDeAlbum };