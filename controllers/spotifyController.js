const axios = require('axios');
const supabase = require('../db');
require('dotenv').config();

const getSpotifyToken = async () => {
  const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
  });
  return response.data.access_token;
};

const getArtistAlbums = async (artistId, token) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        include_groups: 'album,single',
        limit: 50,
      },
    });
    return response.data.items;
  } catch (error) {
    console.error('Error al obtener álbumes del artista:', error);
    return [];
  }
};

const getAlbumTracks = async (albumId, token) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        limit: 50,
      },
    });
    return response.data.items;
  } catch (error) {
    console.error('Error al obtener pistas del álbum:', error);
    return [];
  }
};

const saveArtist = async (artist) => {
  const artistData = {
    spotify_id: artist.id,
    nombre_artista: artist.name,
    biografia: '', // La API de Spotify no proporciona biografía directamente
    foto_artista: artist.images[0]?.url || '',
    popularidad_artista: artist.popularity,
    numero_albumes: 0,
    numero_canciones: 0,
  };

  const { data: insertedArtist, error: artistError } = await supabase
    .from('artistas')
    .upsert(artistData)
    .select();

  if (artistError) {
    console.error('Error al insertar artista:', artistError);
    return null;
  }

  return insertedArtist[0];
};

const saveAlbum = async (album, artistId) => {
  const albumData = {
    spotify_id: album.id,
    titulo: album.name,
    anio: new Date(album.release_date).getFullYear(),
    foto_album: album.images[0]?.url || '',
    numero_canciones: album.total_tracks,
    tipo_album: album.album_type,
    popularidad_album: album.popularity,
  };

  const { data: insertedAlbum, error: albumError } = await supabase
    .from('albumes')
    .upsert(albumData)
    .select();

  if (albumError) {
    console.error('Error al insertar álbum:', albumError);
    return null;
  }

  await supabase
    .from('album_artistas')
    .upsert({ album_id: insertedAlbum[0].id_album, artista_id: artistId });

  return insertedAlbum[0];
};

const saveTrack = async (track, albumId) => {
  const trackData = {
    spotify_id: track.id,
    titulo: track.name,
    album: albumId,
    orden: track.track_number,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity,
    preview_url: track.preview_url,
  };

  const { data: insertedTrack, error: trackError } = await supabase
    .from('canciones')
    .upsert(trackData)
    .select();

  if (trackError) {
    console.error('Error al insertar canción:', trackError);
    return null;
  }

  return insertedTrack[0];
};

const linkTrackArtists = async (trackId, artists) => {
  for (const artist of artists) {
    const savedArtist = await saveArtist(artist);
    if (savedArtist) {
      await supabase
        .from('cancion_artistas')
        .upsert({ cancion_id: trackId, artista_id: savedArtist.id_artista });
    }
  }
};

const searchArtists = async (req, res) => {
  const { query } = req.query;
  try {
    const token = await getSpotifyToken();
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        q: query,
        type: 'artist',
        limit: 50,
      },
    });

    const artists = response.data.artists.items.filter(artist => artist.followers.total > 10000000);

    for (const artist of artists) {
      const savedArtist = await saveArtist(artist);
      if (!savedArtist) continue;

      const albums = await getArtistAlbums(artist.id, token);

      for (const album of albums) {
        const savedAlbum = await saveAlbum(album, savedArtist.id_artista);
        if (!savedAlbum) continue;

        const tracks = await getAlbumTracks(album.id, token);

        for (const track of tracks) {
          const savedTrack = await saveTrack(track, savedAlbum.id_album);
          if (savedTrack) {
            await linkTrackArtists(savedTrack.id_cancion, track.artists);
          }
        }
      }
    }

    res.json({ message: 'Datos de artistas, álbumes y canciones almacenados correctamente' });
  } catch (error) {
    console.error('Error al buscar artistas en Spotify:', error);
    res.status(500).json({ error: 'Error al buscar artistas en Spotify' });
  }
};

const searchFamousArtists = async (req, res) => {
  const famousArtists = ['Drake', 'Taylor Swift', 'Ariana Grande', 'Ed Sheeran', 'Billie Eilish'];
  try {
    const token = await getSpotifyToken();
    for (const artist of famousArtists) {
      const response = await axios.get(`https://api.spotify.com/v1/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          q: artist,
          type: 'artist',
          limit: 50,
        },
      });

      const artists = response.data.artists.items.filter(artist => artist.followers.total > 10000000);

      for (const artist of artists) {
        const savedArtist = await saveArtist(artist);
        if (!savedArtist) continue;

        const albums = await getArtistAlbums(artist.id, token);

        for (const album of albums) {
          const savedAlbum = await saveAlbum(album, savedArtist.id_artista);
          if (!savedAlbum) continue;

          const tracks = await getAlbumTracks(album.id, token);

          for (const track of tracks) {
            const savedTrack = await saveTrack(track, savedAlbum.id_album);
            if (savedTrack) {
              await linkTrackArtists(savedTrack.id_cancion, track.artists);
            }
          }
        }
      }
    }

    res.json({ message: 'Datos de artistas, álbumes y canciones almacenados correctamente' });
  } catch (error) {
    console.error('Error al buscar artistas famosos en Spotify:', error);
    res.status(500).json({ error: 'Error al buscar artistas famosos en Spotify' });
  }
};

module.exports = { searchArtists, searchFamousArtists };