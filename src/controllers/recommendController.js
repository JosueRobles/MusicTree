const { getRecommendations } = require('../services/recommendation');  // Si esto sigue siendo necesario

async function getRecomendaciones(req, res) {
    const { id_usuario } = req.query;  // Obtener el id del usuario de la URL

    if (!id_usuario) {
        return res.status(400).json({ error: "Falta el parámetro id_usuario" });
    }

    try {
        // Obtener las recomendaciones basadas en el id_usuario
        const recomendaciones = await getRecommendations(id_usuario);  // Obtener las recomendaciones

        // Obtener los detalles de las recomendaciones (canciones, albums, artistas, etc.)
        const detalles = await Promise.all(
            recomendaciones.songs.map(async (song) => {
                const { data, error } = await supabase
                    .from('canciones')  // Tabla 'canciones'
                    .select('*')
                    .eq('id_cancion', song.cancion)  // Usar el nombre correcto de la columna
                    .single();

                if (error) {
                    console.error('Error al obtener canción:', error);
                    return null;
                }
                return { ...song, nombre: data.titulo };  // Aquí puedes agregar más detalles si es necesario
            })
        );

        const detallesAlbums = await Promise.all(
            recomendaciones.albums.map(async (album) => {
                const { data, error } = await supabase
                    .from('albumes')  // Tabla 'albumes'
                    .select('*')
                    .eq('id_album', album.album)  // Usar el nombre correcto de la columna
                    .single();

                if (error) {
                    console.error('Error al obtener álbum:', error);
                    return null;
                }
                return { ...album, nombre: data.titulo };  // Agregar más detalles si es necesario
            })
        );

        const detallesArtistas = await Promise.all(
            recomendaciones.artists.map(async (artist) => {
                const { data, error } = await supabase
                    .from('artistas')  // Tabla 'artistas'
                    .select('*')
                    .eq('id_artista', artist.artista)  // Usar el nombre correcto de la columna
                    .single();

                if (error) {
                    console.error('Error al obtener artista:', error);
                    return null;
                }
                return { ...artist, nombre: data.nombre_artista };  // Agregar más detalles si es necesario
            })
        );

        // Devolver las recomendaciones con detalles
        return res.json({
            recomendaciones: {
                canciones: detalles.filter(Boolean),  // Filtrar elementos nulos
                albums: detallesAlbums.filter(Boolean),
                artistas: detallesArtistas.filter(Boolean),
            }
        });

    } catch (error) {
        console.error('Error al obtener recomendaciones:', error);
        res.status(500).send('Error interno del servidor');
    }
}

module.exports = { getRecomendaciones };
