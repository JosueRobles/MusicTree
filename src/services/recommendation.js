const cosineSimilarity = require('compute-cosine-similarity');  // Instalar un paquete de similitud como compute-cosine-similarity

// Función para obtener la similitud de coseno entre los objetos
function calculateSimilarity(userRatings, allItems) {
    let similarityScores = [];
    allItems.forEach(item => {
        let similarity = cosineSimilarity(userRatings, item.ratings);  // Asumiendo que 'ratings' es un array de valoraciones
        similarityScores.push({ id: item.id, score: similarity });
    });

    return similarityScores.sort((a, b) => b.score - a.score);  // Ordenar de mayor a menor similitud
}

// Función para obtener las recomendaciones
async function getRecommendations(userId) {
    // Paso 1: Obtener las valoraciones del usuario
    const userRatings = await getUserRatings(userId);

    // Paso 2: Obtener todas las canciones, álbumes y artistas (puedes filtrarlas dependiendo del tipo de recomendación)
    const allSongs = await getSongData();
    const allAlbums = await getAlbumData();
    const allArtists = await getArtistData();

    // Paso 3: Calcular las similitudes para cada tipo de objeto (canciones, álbumes, artistas)
    const songRecommendations = calculateSimilarity(userRatings.songs, allSongs);
    const albumRecommendations = calculateSimilarity(userRatings.albums, allAlbums);
    const artistRecommendations = calculateSimilarity(userRatings.artists, allArtists);

    // Paso 4: Filtrar canciones ya valoradas (esto es importante para no recomendar lo mismo)
    const recommendedSongs = songRecommendations.filter(item => !userRatings.songs.includes(item.id));
    const recommendedAlbums = albumRecommendations.filter(item => !userRatings.albums.includes(item.id));
    const recommendedArtists = artistRecommendations.filter(item => !userRatings.artists.includes(item.id));

    // Paso 5: Devolver las recomendaciones con el porcentaje de similitud
    return {
        songs: recommendedSongs.slice(0, 5),  // Puedes limitar la cantidad de recomendaciones
        albums: recommendedAlbums.slice(0, 5),
        artists: recommendedArtists.slice(0, 5)
    };
}

module.exports = { getRecommendations };
