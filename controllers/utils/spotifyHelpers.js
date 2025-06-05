const axios = require('axios');
const { insertOrUpdateAlbum, insertOrUpdateArtist } = require('./supabaseHelpers');
const { getSpotifyApi } = require('../config/spotifyAuth'); // ← ESTA LÍNEA FALTABA

async function getPlaylistTracks(spotifyApi, playlistId) {
  try {
    const data = await spotifyApi.getPlaylist(playlistId);
    const totalTracks = data.body.tracks.total;
    const tracks = [];

    let offset = 0;
    const limit = 100;

    while (offset < totalTracks) {
      const response = await spotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit
      });
      tracks.push(...response.body.items);
      offset += limit;
    }

    return tracks;
  } catch (error) {
    console.error("Error al procesar playlist:", error);
    throw error;
  }
}

async function getArtistFromSpotify(name) {
  const data = await spotifyApi.searchArtists(name);
  return data.body.artists.items[0];
}

async function getAlbumsFromArtist(artistId) {
  const data = await spotifyApi.getArtistAlbums(artistId, { limit: 50 });
  return data.body.items;
}

async function getTracksFromAlbum(albumId) {
  const data = await spotifyApi.getAlbumTracks(albumId);
  return data.body.items;
}

async function getArtistsFromPlaylist(playlistId) {
  const data = await spotifyApi.getPlaylistTracks(playlistId);
  const tracks = data.body.items;
  const artists = [];

  for (const item of tracks) {
    if (item.track && item.track.artists.length > 0) {
      artists.push(...item.track.artists);
    }
  }

  return [...new Map(artists.map(a => [a.id, a])).values()];
}

// Obtener la foto y popularidad de un artista desde Spotify
async function getArtistDetails(spotifyId, spotifyApi) {
  try {
    const data = await spotifyApi.getArtist(spotifyId);

    if (!data.body.name) {
      throw new Error(`El artista con ID ${spotifyId} no tiene un nombre válido.`);
    }

    return {
      name: data.body.name,
      popularity: data.body.popularity || 0,
      images: data.body.images || [],
    };
  } catch (err) {
    console.error(`Error al obtener detalles del artista ${spotifyId}:`, err.message || err);
    return null; // Devolver null si no se encuentran datos
  }
}

async function getAlbumPopularity(albumId) {
  try {
    const data = await spotifyApi.getAlbum(albumId);
    return data.body.popularity || 0;
  } catch (err) {
    console.error(`Error al obtener popularidad del álbum ${albumId}:`, err);
    throw err;
  }
}

async function getArtistPopularity(artistId) {
  try {
    const data = await spotifyApi.getArtist(artistId);
    return data.body.popularity || 0;
  } catch (err) {
    console.error(`Error al obtener popularidad del artista ${artistId}:`, err);
    throw err;
  }
}

async function syncAlbumArtists(albumSpotifyId) {
  try {
    const spotifyApi = getSpotifyApi();

    // Obtener detalles del álbum desde la API de Spotify
    const album = await spotifyApi.getAlbum(albumSpotifyId);

    // Validar si album.artists es un array
    if (!Array.isArray(album.artists) || album.artists.length === 0) {
      console.warn(`⚠️ El álbum ${album.name} no tiene artistas asociados.`);
      return;
    }

    // Procesar los artistas del álbum
    const artistIds = [];
    for (const artist of album.artists) {
      const artistId = await insertOrUpdateArtist(artist);
      artistIds.push(artistId);
    }

    // Actualizar las relaciones álbum-artista en la base de datos
    await supabase.from('album_artistas').upsert(
      artistIds.map(artistId => ({
        album_id: album.id_album, // ID interno del álbum (relación interna)
        artista_id: artistId,
      })),
      { onConflict: ['album_id', 'artista_id'] } // Evitar duplicados
    );

    console.log(`✅ Relaciones álbum-artistas sincronizadas para el álbum: ${album.name}`);
  } catch (error) {
    console.error(`❌ Error al sincronizar álbum-artistas para el álbum ${albumSpotifyId}:`, error.message || error);
  }
}

// Obtener los artistas de un álbum desde la API de Spotify
async function getAlbumArtistsFromAPI(albumSpotifyId) {
  try {
    // Obtener detalles del álbum desde la API de Spotify
    const albumData = await spotifyApi.getAlbum(albumSpotifyId);

    // Validar si albumData.artists es un array
    if (!Array.isArray(albumData.body.artists) || albumData.body.artists.length === 0) {
      console.warn(`⚠️ El álbum ${albumData.body.name} no tiene artistas asociados.`);
      return [];
    }

    return albumData.body.artists; // Devuelve la lista de artistas
  } catch (error) {
    console.error(`❌ Error al obtener artistas del álbum ${albumSpotifyId}:`, error.message || error);
    throw error;
  }
}

(async () => {
  const artistEntries = [
  ];

  const failedArtists = await processArtistList(artistEntries);

  if (failedArtists.length > 0) {
    console.log("🔄 Reprocesando artistas fallidos...");
    await processArtistList(failedArtists);
  }
})();

async function processArtistList(artistEntries) {
  const spotifyApi = getSpotifyApi(); // ← ESTA LÍNEA FUNCIONA GRACIAS A LA IMPORTACIÓN
  const failedArtists = [];

  for (const entry of artistEntries) {
    try {
      const isSpotifyId = /^[a-zA-Z0-9]{22}$/.test(entry);
      let artist;

      if (isSpotifyId) {
        console.log(`🔍 Buscando detalles para Spotify ID: ${entry}`);
        artist = await getArtistDetails(entry, spotifyApi); // Pásalo como argumento
        if (!artist) {
          throw new Error(`No se encontró un nombre válido para el ID: ${entry}`);
        }
      } else {
        console.log(`🔍 Buscando artista por nombre: ${entry}`);
        const result = await spotifyApi.searchArtists(entry);
        artist = result.body.artists.items[0];
        if (!artist || !artist.name) {
          throw new Error(`No se encontró un artista válido para el nombre: ${entry}`);
        }
      }

      console.log(`🎤 Artista encontrado: ${artist.name} (${entry})`);
      const artistId = await insertOrUpdateArtist({
        id: entry,
        name: artist.name,
        popularity: artist.popularity,
        images: artist.images,
      });

      if (!artistId) {
        throw new Error(`Fallo al insertar o actualizar el artista ${entry}`);
      }

      console.log(`✅ Artista procesado: ${artist.name} - ID en BD: ${artistId}`);
    } catch (err) {
      console.error(`❌ Error al procesar al artista ${entry}:`, err.message || err);
      failedArtists.push(entry);
    }
  }

  console.log(`📋 Lista de IDs fallidos: ${failedArtists.join(', ')}`);
  return failedArtists;
}

module.exports = {
  processArtistList,
  getAlbumArtistsFromAPI, // Nuevo helper exportado
  getAlbumPopularity,
  getArtistPopularity,
  getArtistFromSpotify,
  getAlbumsFromArtist,
  getTracksFromAlbum,
  getArtistsFromPlaylist,
  getPlaylistTracks,
  getArtistDetails, syncAlbumArtists
};
