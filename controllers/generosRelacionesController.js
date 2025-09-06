const supabase = require('../db');

// Álbum -> Géneros
const obtenerGenerosDeAlbum = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('album_generos')
      .select(`
        generos (id_genero, nombre, descripcion), subgeneros
      `)
      .eq('album_id', id);

    if (error) throw error;

    // Combina subgéneros de la relación y del género principal
    const generos = data.map((item) => {
      let subgeneros = [];
      if (item.subgeneros) {
        if (Array.isArray(item.subgeneros)) subgeneros = item.subgeneros;
        else if (typeof item.subgeneros === 'string' && item.subgeneros.startsWith('[')) {
          try { subgeneros = JSON.parse(item.subgeneros); } catch {}
        } else if (typeof item.subgeneros === 'string') {
          subgeneros = [item.subgeneros];
        }
      }
      return {
        ...item.generos,
        subgeneros: subgeneros.filter(Boolean)
      };
    });
    res.status(200).json(generos);
  } catch (error) {
    console.error('❌ Error al obtener géneros del álbum:', error);
    res.status(500).json({ error: 'Error al obtener géneros del álbum' });
  }
};

// Canción -> Géneros
const obtenerGenerosDeCancion = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cancion_generos')
      .select('generos (id_genero, nombre, descripcion), subgeneros')
      .eq('cancion_id', id);

    if (error) throw error;

    // Devolver solo los géneros relacionados con la canción
    const generos = data.map((item) => {
      let subgeneros = [];
      if (item.subgeneros) {
        if (Array.isArray(item.subgeneros)) subgeneros = item.subgeneros;
        else if (typeof item.subgeneros === 'string' && item.subgeneros.startsWith('[')) {
          try { subgeneros = JSON.parse(item.subgeneros); } catch {}
        } else if (typeof item.subgeneros === 'string') {
          subgeneros = [item.subgeneros];
        }
      }
      return {
        ...item.generos,
        subgeneros: subgeneros.filter(Boolean)
      };
    });
    res.status(200).json(generos);
  } catch (error) {
    console.error('❌ Error al obtener géneros de la canción:', error);
    res.status(500).json({ error: 'Error al obtener géneros de la canción' });
  }
};

// Artista -> Géneros
const obtenerGenerosDeArtista = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('artista_generos')
      .select('generos (id_genero, nombre, descripcion), subgeneros')
      .eq('artista_id', id);

    if (error) throw error;

    // Solo los subgéneros de la relación
    const generos = data.map((item) => {
      let subgeneros = [];
      if (item.subgeneros) {
        if (Array.isArray(item.subgeneros)) subgeneros = item.subgeneros;
        else if (typeof item.subgeneros === 'string' && item.subgeneros.startsWith('[')) {
          try { subgeneros = JSON.parse(item.subgeneros); } catch {}
        } else if (typeof item.subgeneros === 'string') {
          subgeneros = [item.subgeneros];
        }
      }
      return {
        ...item.generos,
        subgeneros: subgeneros.filter(Boolean)
      };
    });
    res.status(200).json(generos);
  } catch (error) {
    console.error('❌ Error al obtener géneros del artista:', error);
    res.status(500).json({ error: 'Error al obtener géneros del artista' });
  }
};

// Video musical -> Géneros
const obtenerGenerosDeVideo = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('video_generos')
      .select('generos (id_genero, nombre, descripcion), subgeneros')
      .eq('video_id', id);

    if (error) throw error;

    const generos = data.map((item) => {
      let subgeneros = [];
      if (item.subgeneros) {
        if (Array.isArray(item.subgeneros)) subgeneros = item.subgeneros;
        else if (typeof item.subgeneros === 'string' && item.subgeneros.startsWith('[')) {
          try { subgeneros = JSON.parse(item.subgeneros); } catch {}
        } else if (typeof item.subgeneros === 'string') {
          subgeneros = [item.subgeneros];
        }
      }
      return {
        ...item.generos,
        subgeneros: subgeneros.filter(Boolean)
      };
    });
    res.status(200).json(generos);
  } catch (error) {
    console.error('❌ Error al obtener géneros del video:', error);
    res.status(500).json({ error: 'Error al obtener géneros del video musical' });
  }
};

module.exports = {
  obtenerGenerosDeAlbum,
  obtenerGenerosDeCancion,
  obtenerGenerosDeArtista,
  obtenerGenerosDeVideo,
};