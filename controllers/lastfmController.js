const lastFmApi = require('../config/lastfm');
const supabase = require('../db');

const getArtistBio = async (artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'artist.getinfo',
        artist: artistName
      }
    });
    return response.data.artist.bio.content;
  } catch (error) {
    console.error(`❌ Error al obtener la biografía de ${artistName}:`, error);
    return null;
  }
};

const getArtistGenres = async (artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'artist.gettoptags',
        artist: artistName
      }
    });
    return response.data.toptags.tag.map(tag => tag.name);
  } catch (error) {
    console.error(`❌ Error al obtener los géneros de ${artistName}:`, error);
    return [];
  }
};

const getAlbumInfo = async (albumName, artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'album.getinfo',
        artist: artistName,
        album: albumName
      }
    });
    return response.data.album;
  } catch (error) {
    console.error(`❌ Error al obtener la información del álbum ${albumName} de ${artistName}:`, error);
    return null;
  }
};

const getTrackInfo = async (trackName, artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'track.getInfo',
        artist: artistName,
        track: trackName
      }
    });
    return response.data.track;
  } catch (error) {
    console.error(`❌ Error al obtener la información de la canción ${trackName} de ${artistName}:`, error);
    return null;
  }
};

const updateArtistInfo = async (req, res) => {
  try {
    const { data: artists, error } = await supabase
      .from('artistas')
      .select('*')
      .or('foto_artista.not.is.null,popularidad_artista.not.is.null');

    if (error) {
      console.error(`❌ Error al obtener artistas:`, error);
      return res.status(500).json({ error: 'Error al obtener artistas' });
    }

    for (const artist of artists) {
      let updatedData = {};
      if (!artist.biografia) {
        const bio = await getArtistBio(artist.nombre_artista);
        if (bio) {
          updatedData.biografia = bio;
        }
      }

      const genres = await getArtistGenres(artist.nombre_artista);
      if (genres.length > 0) {
        for (const genre of genres) {
          let { data: existingGenre, error: genreError } = await supabase
            .from('generos')
            .select('id_genero')
            .eq('nombre', genre)
            .maybeSingle(); // Change to maybeSingle

          if (genreError) {
            console.error(`❌ Error al buscar el género ${genre}:`, genreError);
            continue;
          }

          if (!existingGenre) {
            const { data: newGenre, error: insertGenreError } = await supabase
              .from('generos')
              .insert({ nombre: genre })
              .select()
              .single(); // Ensure we get a single genre

            if (insertGenreError) {
              console.error(`❌ Error al insertar el género ${genre}:`, insertGenreError);
              continue;
            }

            existingGenre = newGenre;
          }

          await supabase
            .from('artista_generos')
            .upsert({ artista_id: artist.id_artista, genero_id: existingGenre.id_genero });
        }
      }

      if (Object.keys(updatedData).length > 0) {
        const { data: updatedArtist, error: updateError } = await supabase
          .from('artistas')
          .update(updatedData)
          .eq('id_artista', artist.id_artista)
          .select();

        if (updateError) {
          console.error(`❌ Error al actualizar el artista ${artist.nombre_artista}:`, updateError);
          continue;
        }
      }

      // Actualizar álbumes y canciones del artista
      const { data: albums } = await supabase
        .from('albumes')
        .select('*')
        .eq('artista_id', artist.id_artista);

      if (albums && albums.length > 0) {
        for (const album of albums) {
          const albumInfo = await getAlbumInfo(album.titulo, artist.nombre_artista);
          if (albumInfo) {
            await supabase
              .from('albumes')
              .update({ popularidad_album: albumInfo.playcount })
              .eq('id_album', album.id_album);

            if (albumInfo.tags.tag.length > 0) {
              for (const tag of albumInfo.tags.tag) {
                let { data: existingGenre, error: genreError } = await supabase
                  .from('generos')
                  .select('id_genero')
                  .eq('nombre', tag.name)
                  .maybeSingle();

                if (genreError) {
                  console.error(`❌ Error al buscar el género ${tag.name}:`, genreError);
                  continue;
                }

                if (!existingGenre) {
                  const { data: newGenre, error: insertGenreError } = await supabase
                    .from('generos')
                    .insert({ nombre: tag.name })
                    .select()
                    .single();

                  if (insertGenreError) {
                    console.error(`❌ Error al insertar el género ${tag.name}:`, insertGenreError);
                    continue;
                  }

                  existingGenre = newGenre;
                }

                await supabase
                  .from('album_generos')
                  .upsert({ album_id: album.id_album, genero_id: existingGenre.id_genero });
              }
            }
          }

          const { data: tracks } = await supabase
            .from('canciones')
            .select('*')
            .eq('album', album.id_album);

          if (tracks && tracks.length > 0) {
            for (const track of tracks) {
              const trackInfo = await getTrackInfo(track.titulo, artist.nombre_artista);
              if (trackInfo) {
                await supabase
                  .from('canciones')
                  .update({ popularidad: trackInfo.playcount })
                  .eq('id_cancion', track.id_cancion);

                if (trackInfo.toptags.tag.length > 0) {
                  for (const tag of trackInfo.toptags.tag) {
                    let { data: existingGenre, error: genreError } = await supabase
                      .from('generos')
                      .select('id_genero')
                      .eq('nombre', tag.name)
                      .maybeSingle();

                    if (genreError) {
                      console.error(`❌ Error al buscar el género ${tag.name}:`, genreError);
                      continue;
                    }

                    if (!existingGenre) {
                      const { data: newGenre, error: insertGenreError } = await supabase
                        .from('generos')
                        .insert({ nombre: tag.name })
                        .select()
                        .single();

                      if (insertGenreError) {
                        console.error(`❌ Error al insertar el género ${tag.name}:`, insertGenreError);
                        continue;
                      }

                      existingGenre = newGenre;
                    }

                    await supabase
                      .from('cancion_generos')
                      .upsert({ cancion_id: track.id_cancion, genero_id: existingGenre.id_genero });
                  }
                }
              }
            }
          }
        }
      }
    }

    res.json({ message: '🎶 Información actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar la información:', error);
    res.status(500).json({ error: 'Error al actualizar la información' });
  }
};

const deleteLowMentionGenres = async (minMentions) => {
    try {
      // Obtener géneros con menos menciones
      const { data: genres, error } = await supabase
        .rpc('get_low_mention_genres', { min_mentions: minMentions });
  
      if (error) {
        console.error(`❌ Error al obtener géneros con menos menciones:`, error);
        return;
      }
  
      // Eliminar géneros en cascada
      for (const genre of genres) {
        await supabase
          .from('artista_generos')
          .delete()
          .eq('genero_id', genre.id_genero);
  
        await supabase
          .from('album_generos')
          .delete()
          .eq('genero_id', genre.id_genero);
  
        await supabase
          .from('cancion_generos')
          .delete()
          .eq('genero_id', genre.id_genero);
  
        await supabase
          .from('generos')
          .delete()
          .eq('id_genero', genre.id_genero);
      }
  
      console.log('✅ Géneros con menos menciones eliminados en cascada');
    } catch (error) {
      console.error('❌ Error al eliminar géneros con menos menciones:', error);
    }
  };

const getArtistName = async (artistId) => {
  try {
    const { data: artist, error } = await supabase
      .from('artistas')
      .select('nombre_artista')
      .eq('id_artista', artistId)
      .single();

    if (error) {
      console.error(`❌ Error al obtener el nombre del artista ${artistId}:`, error);
      return null;
    }

    return artist.nombre_artista;
  } catch (error) {
    console.error(`❌ Error al obtener el nombre del artista ${artistId}:`, error);
    return null;
  }
};

const getAlbumGenres = async (albumName, artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'album.gettoptags',
        artist: artistName,
        album: albumName
      }
    });
    return response.data.toptags.tag.map(tag => tag.name);
  } catch (error) {
    console.error(`❌ Error al obtener los géneros del álbum ${albumName} de ${artistName}:`, error);
    return [];
  }
};

const getTrackGenres = async (trackName, artistName) => {
  try {
    const response = await lastFmApi.get('', {
      params: {
        method: 'track.gettoptags',
        artist: artistName,
        track: trackName
      }
    });
    return response.data.toptags.tag.map(tag => tag.name);
  } catch (error) {
    console.error(`❌ Error al obtener los géneros de la canción ${trackName} de ${artistName}:`, error);
    return [];
  }
};

const updateAlbumAndTrackGenres = async (req, res) => {
  const lastAlbumId = 1769; // Start from album ID
  const lastTrackId = 2829; // Start from track ID
  try {
    // Get albums starting from the last processed ID
    const { data: albums, error: albumsError } = await supabase
      .from('albumes')
      .select('id_album, titulo')
      .gt('id_album', lastAlbumId);

    if (albumsError) {
      console.error('❌ Error al obtener álbumes:', albumsError);
      return res.status(500).json({ error: 'Error al obtener álbumes' });
    }

    for (const album of albums) {
      const { data: albumArtists, error: albumArtistsError } = await supabase
        .from('album_artistas')
        .select('artista_id')
        .eq('album_id', album.id_album);

      if (albumArtistsError) {
        console.error(`❌ Error al obtener artistas del álbum ${album.titulo}:`, albumArtistsError);
        continue;
      }

      for (const albumArtist of albumArtists) {
        const artistName = await getArtistName(albumArtist.artista_id);
        if (!artistName) continue;

        const genres = await getAlbumGenres(album.titulo, artistName);
        for (const genre of genres) {
          let { data: existingGenre, error: genreError } = await supabase
            .from('generos')
            .select('id_genero')
            .eq('nombre', genre)
            .maybeSingle();

          if (genreError) {
            console.error(`❌ Error al buscar el género ${genre}:`, genreError);
            continue;
          }

          if (!existingGenre) {
            const { data: newGenre, error: insertGenreError } = await supabase
              .from('generos')
              .insert({ nombre: genre })
              .select()
              .single();

            if (insertGenreError) {
              console.error(`❌ Error al insertar el género ${genre}:`, insertGenreError);
              continue;
            }

            existingGenre = newGenre;
          }

          await supabase
            .from('album_generos')
            .upsert({ album_id: album.id_album, genero_id: existingGenre.id_genero });
        }
      }
    }

    // Get tracks starting from the last processed ID
    const { data: tracks, error: tracksError } = await supabase
      .from('canciones')
      .select('id_cancion, titulo, album')
      .gt('id_cancion', lastTrackId);

    if (tracksError) {
      console.error('❌ Error al obtener canciones:', tracksError);
      return res.status(500).json({ error: 'Error al obtener canciones' });
    }

    for (const track of tracks) {
      const { data: trackArtists, error: trackArtistsError } = await supabase
        .from('cancion_artistas')
        .select('artista_id')
        .eq('cancion_id', track.id_cancion);

      if (trackArtistsError) {
        console.error(`❌ Error al obtener artistas de la canción ${track.titulo}:`, trackArtistsError);
        continue;
      }

      for (const trackArtist of trackArtists) {
        const artistName = await getArtistName(trackArtist.artista_id);
        if (!artistName) continue;

        const genres = await getTrackGenres(track.titulo, artistName);
        for (const genre of genres) {
          let { data: existingGenre, error: genreError } = await supabase
            .from('generos')
            .select('id_genero')
            .eq('nombre', genre)
            .maybeSingle();

          if (genreError) {
            console.error(`❌ Error al buscar el género ${genre}:`, genreError);
            continue;
          }

          if (!existingGenre) {
            const { data: newGenre, error: insertGenreError } = await supabase
              .from('generos')
              .insert({ nombre: genre })
              .select()
              .single();

            if (insertGenreError) {
              console.error(`❌ Error al insertar el género ${genre}:`, insertGenreError);
              continue;
            }

            existingGenre = newGenre;
          }

          await supabase
            .from('cancion_generos')
            .upsert({ cancion_id: track.id_cancion, genero_id: existingGenre.id_genero });
        }
      }
    }

    console.log('✅ Géneros de álbumes y canciones actualizados correctamente');
    res.json({ message: '✅ Géneros de álbumes y canciones actualizados correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar los géneros de álbumes y canciones:', error);
    res.status(500).json({ error: 'Error al actualizar los géneros de álbumes y canciones' });
  }
};

module.exports = { updateArtistInfo, deleteLowMentionGenres, updateAlbumAndTrackGenres };