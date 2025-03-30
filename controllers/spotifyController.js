const axios = require("axios");
const supabase = require("../db");
require("dotenv").config();

const getArtistAlbums = async (artistId, token) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { include_groups: 'album,single,compilation,ep,appears_on', limit: 50 },
    });
    return response.data.items;
  } catch (error) {
    console.error(`❌ Error al obtener álbumes del artista ${artistId}:`, error);
    return [];
  }
};

const getAlbumTracks = async (albumId, token) => {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 50 },
    });
    return response.data.items;
  } catch (error) {
    console.error(`❌ Error al obtener pistas del álbum ${albumId}:`, error);
    return [];
  }
};

// Ejemplo de colaboración entre dos artistas principales
const updateCollaboratorToMainArtist = async (collaboratorSpotifyId) => {
  const { data: collaborator } = await supabase
    .from('artistas')
    .select('*')
    .eq('spotify_id', collaboratorSpotifyId)
    .single();

  if (collaborator && collaborator.id_artista >= 1000) {
    // Si el colaborador es mayor a 1000, lo actualizamos a un ID de artista principal
    await supabase
      .from('artistas')
      .update({ id_artista: collaborator.id_artista - 1000 })
      .eq('spotify_id', collaboratorSpotifyId);
    console.log(`Artista colaborador con Spotify ID ${collaboratorSpotifyId} promovido a principal.`);
  }
};

// Lógica para la asociación de artistas en una canción
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

const saveAlbum = async (album, artistId) => {
  if (!album || !album.id || !album.name) {
    console.error("⚠️ Álbum no válido:", album);
    return null;
  }

  const albumData = {
    spotify_id: album.id,
    titulo: album.name,
    anio: new Date(album.release_date).getFullYear(),
    foto_album: album.images?.[0]?.url || null,
    numero_canciones: album.total_tracks,
    tipo_album: album.album_type,
    popularidad_album: album.popularity || null,
  };

  const { data: insertedAlbum, error: albumError } = await supabase
    .from('albumes')
    .upsert(albumData)
    .select();

  if (albumError) {
    console.error('❌ Error al insertar álbum:', albumError);
    return null;
  }

  await supabase
    .from('album_artistas')
    .upsert({ album_id: insertedAlbum[0].id_album, artista_id: artistId });

  return insertedAlbum[0];
};

const saveTrack = async (track, albumId) => {
  if (!track || !track.id || !track.name) {
    console.error("⚠️ Canción no válida:", track);
    return null;
  }

  const trackData = {
    spotify_id: track.id,
    titulo: track.name,
    album: albumId,
    orden: track.track_number,
    duracion_ms: track.duration_ms,
    popularidad: track.popularity || null,
    categoria: track.type || 'normal',
  };

  const { data: insertedTrack, error: trackError } = await supabase
    .from('canciones')
    .upsert(trackData)
    .select();

  if (trackError) {
    console.error('❌ Error al insertar canción:', trackError);
    return null;
  }

  return insertedTrack[0];
};

const searchArtists = async (req, res) => {
  const { query } = req.query;
  try {
    const token = await getSpotifyToken();
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { q: query, type: 'artist', limit: 50 },
    });

    const artists = response.data.artists.items.filter(artist => artist.followers.total > 100000);

    for (const artist of artists) {
      const savedArtist = await saveArtist(artist);
      if (!savedArtist) continue;

      console.log(`📀 Guardando catálogo de: ${artist.name}`);
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

    res.json({ message: '🎶 Datos almacenados correctamente' });
  } catch (error) {
    console.error('❌ Error al buscar artistas en Spotify:', error.message);
    res.status(500).json({ error: 'Error al buscar artistas en Spotify' });
  }
};

const insertArtist = async (artistData) => {
  if (!artistData.id_artista) {
    console.error('❌ El id_artista es nulo o vacío, no se puede insertar');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('artistas')
      .insert([
        {
          id_artista: artistData.id_artista,
          nombre_artista: artistData.nombre,
          foto_artista: artistData.foto,
          popularidad_artista: artistData.popularidad,
        }
      ]);
      insertArtist(artistData);

    if (error) {
      console.error('❌ Error al insertar artista:', error);
    } else {
      console.log('✅ Artista insertado con éxito:', data);
    }
  } catch (err) {
    console.error('❌ Error al insertar artista:', err);
  }
};

const searchFamousArtists = async (req, res) => {
  const famousArtists = ["Bruno Mars","The Weeknd","Lady Gaga","Ariana Grande","Taylor Swift","Kendrick Lamar","Billie Eilish",
    "Justin Bieber","Post Malone","Coldplay","Bad Bunny","Ed Sheeran","Sia","Rihanna","Drake","Eminem","Miley Cyrus","Shakira",
    "David Guetta","Dua Lipa","Beyoncé","Travis Scott","Sam Smith","Calvin Harris","Marshmello","Harry Styles","Maroon 5",
    "Nicki Minaj","Katy Perry","J Balvin","OneRepublic","Queen","KAROL G","Imagine Dragons","Adele","One Direction","Michael Jackson"];

  try {
    const token = await getSpotifyToken();

    for (const artistName of famousArtists) {
      console.log(`🔍 Buscando artista: ${artistName}...`);

      const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: artistName, type: "artist", limit: 1 },
      });

      if (!response.data.artists.items.length) {
        console.warn(`⚠️ No se encontró en Spotify: ${artistName}`);
        continue;
      }

      const artist = response.data.artists.items[0];
      if (artist.followers.total < 5000) {
        console.warn(`⚠️ ${artist.name} tiene menos de 5000 de seguidores, no se guarda.`);
        continue;
      }

      const savedArtist = await saveArtist(artist, true);
      if (!savedArtist) continue;

      console.log(`✅ Guardado en BD: ${artist.name} (Seguidores: ${artist.followers.total})`);

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

    res.json({ message: "🎶 Datos de los artistas almacenados correctamente." });
  } catch (error) {
    console.error("❌ Error al buscar artistas famosos en Spotify:", error);
    res.status(500).json({ error: "Error al buscar artistas famosos en Spotify" });
  }
};

const getSpotifyToken = async () => {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error al obtener el token de Spotify:", error);
    throw new Error("No se pudo obtener el token de Spotify");
  }
};

const saveArtist = async (artist, isMainArtist = false) => {
  if (!artist || !artist.id || !artist.name) {
    console.error("⚠️ Artista no válido:", artist);
    return null;
  }

  console.log(`🔍 Buscando artista: ${artist.name}`);
  const imageUrl = artist.images?.[0]?.url || null;
  const popularity = artist.popularity || null;
  console.log(`📸 Foto: ${imageUrl}, 🎵 Popularidad: ${popularity}`);

  // Buscar si el artista ya existe en la BD
  const { data: existingArtist, error: searchError } = await supabase
    .from('artistas')
    .select('id_artista')
    .eq('spotify_id', artist.id)
    .single();

  if (searchError && searchError.code !== 'PGRST116') {
    console.error(`❌ Error al buscar el artista en la BD:`, searchError);
    return null;
  }

  let artistId;

  if (existingArtist) {
    artistId = existingArtist.id_artista; // Reutilizar ID existente
  } else {
    let maxIdData, maxId;
    
    if (isMainArtist) {
      // Buscar el mayor ID de artistas principales (< 1000)
      ({ data: maxIdData } = await supabase
        .from('artistas')
        .select('id_artista')
        .lt('id_artista', 1000)
        .order('id_artista', { ascending: false })
        .limit(1));

      maxId = maxIdData?.[0]?.id_artista || 0;  
      artistId = maxId ? maxId + 1 : 1; // Si no hay artistas, empieza en 1
    } else {
      // Buscar el mayor ID de colaboradores (≥ 1000)
      ({ data: maxIdData } = await supabase
        .from('artistas')
        .select('id_artista')
        .gte('id_artista', 1000)
        .order('id_artista', { ascending: false })
        .limit(1));

      maxId = maxIdData?.[0]?.id_artista || 999;
      artistId = maxId ? maxId + 1 : 1000; // Si no hay colaboradores, empieza en 1000
    }
  }

  const artistData = {
    id_artista: artistId,
    spotify_id: artist.id,
    nombre_artista: artist.name,
    biografia: null,
    foto_artista: imageUrl,
    popularidad_artista: popularity,
    numero_albumes: null,
    numero_canciones: null,
  };

  const { data: insertedArtist, error: artistError } = await supabase
    .from('artistas')
    .upsert(artistData, { onConflict: 'spotify_id' })
    .select();

  if (artistError) {
    console.error('❌ Error al insertar artista:', artistError);
    return null;
  }

  console.log(`✅ Artista guardado: ${artist.name} (ID: ${artistId})`);
  return insertedArtist[0];
};

const searchArtistsFromList = async (req, res) => {
  const mainArtistNames = ["Bruno Mars","The Weeknd","Lady Gaga","Ariana Grande","Taylor Swift","Kendrick Lamar","Billie Eilish",
    "Justin Bieber","Post Malone","Coldplay","Bad Bunny","Ed Sheeran","Sia","Rihanna","Drake","Eminem","Miley Cyrus","Shakira",
    "David Guetta","Dua Lipa","Beyoncé","Travis Scott","Sam Smith","Calvin Harris","Marshmello","21 Savage","Harry Styles","Maroon 5",
    "Nicki Minaj","Future","Katy Perry","J Balvin","OneRepublic","Queen","KAROL G","Imagine Dragons","Adele","One Direction","Pitbull",
    "Linkin Park","Selena Gomez","Daddy Yankee","Arctic Monkeys","Rauw Alejandro","Michael Jackson","Khalid","Britney Spears","Chris Brown",
    "Lil Wayne","Ty Dolla $ign","Ozuna","Kesha","The Chainsmokers","Bebe Rexha","Shawn Mendes","Halsey","Camila Cabello","Swae Lee",
    "Myke Towers","Maluma","Justin Timberlake","ROSALÍA","Charli xcx","Ellie Goulding","Black Eyed Peas","Avicii","XXXTENTACION",
    "Charlie Puth","Aqua","Meghan Trainor","Anne-Marie","Ne-Yo","BTS","AC/DC","James Arthur","50 Cent","Red Hot Chili Peppers",
    "Manuel Turizo","Lil Uzi Vert","Farruko","Jason Derulo","Sean Paul","Don Omar","P!nk","DJ Snake","Lil Nas X","Wiz Khalifa",
    "Pharrell Williams","Romeo Santos","John Legend","Becky G","Macklemore","Cardi B","Anuel AA","Tainy","Whitney Houston","Diplo",
    "Twenty One Pilots","Snoop Dogg","The Police","Young Thug","Demi Lovato","Alan Walker","Nirvana","Akon","Mark Ronson",
    "Guns N' Roses","Major Lazer","Nicky Jam","Bon Jovi","Arcángel","Vishal-Shekhar","Enrique Iglesias","DJ Khaled","Clean Bandit",
    "Zara Larsson","Tanishk Bagchi","ZAYN","Bryson Tiller","Sebastian Yatra","a-ha","Dr. Dre","Yandel","Idina Menzel","Danny Ocean",
    "Metallica","Jennifer Lopez","Ryan Lewis","Quavo","The Cranberries","Backstreet Boys","Bastille","Cyndi Lauper","Stromae",
    "French Montana","Macklemore & Ryan Lewis","Irshad Kamil","Offset","Tyga","BLACKPINK","AFROJACK","Christian Nodal","Felix Jaehn",
    "System Of A Down","Martin Garrix","Skrillex","Sech","Jessie J","Daft Punk","Luis Fonsi","Badshah","Lorde","Lenny Tavárez",
    "Jubin Nautiyal","Darell","Zion & Lennox","Ñengo Flow","Ray Dalton","Reik","Steve Aoki","Daya","Piso 21","Migos","Nelly","Little Mix",
    "Los Ángeles Azules","Coolio","B Praak","R.E.M.","DJ Luian","Mambo Kingz","Vishal Dadlani","Carly Rae Jepsen","Gotye","Bryant Myers",
    "Prince Royce","Neha Kakkar","Evanescence","Carlos Vives","Sean Kingston","Rahat Fateh Ali Khan","Lukas Graham","Mike Posner","Kimbra",
    "NATTI NATASHA","Manoj Muntashir","Naughty Boy","Marc Anthony","Zedd","Christina Perri","Passenger","Paulo Londra","Tove Lo",
    "Gucci Mane","Rag'n'Bone Man","Gigi D'Agostino","Jesse & Joy","Ricky Martin","Wisin","John Newman","Bradley Cooper","Lyanno",
    "Rae Sremmurd","Scorpions","Tones And I","MAGIC!","Nate Ruess","Noriel","Florida Georgia Line","Nio Garcia","Zé Neto & Cristiano",
    "Marco Antonio Solís","Rashmi Virag","Bonnie Tyler","Payal Dev","fun.","Seeb","Zion","Yuvan Shankar Raja","OMI","Cazzu","Mau y Ricky",
    "Natalia Lafourcade","will.i.am","Gente De Zona","Kumar Sanu","Fifth Harmony","No Doubt","6ix9ine","Disciples","Audioslave","Chris Jedi",
    "Dhvani Bhanushali","Pedro Capó","Hoobastank","Dynoro","Indila","Chance the Rapper","Guru Randhawa","LMFAO","Ha*Ash","Thalia",
    "Willy William","Mika Singh","Monali Thakur","Dhanush","Ricardo Arjona","Descemer Bueno","Melendi","Alex Rose","4 Non Blondes",
    "Rick Astley","Meet Bros.","R. City","Iggy Azalea","Cali Y El Dandee","Lil Jon","CNCO","Mike WiLL Made-It","Auli'i Cravalho","Ludacris",
    "Lil Pump","Europe","LP","PSY","Chino & Nacho","Ikka","Juhn","MC Kevinho","Dwayne Johnson","Nacho","Wyclef Jean","Trap Capos"];
  const collaboratorNames = ["Adam Levine","AronChupa","Arvindr Khaira","Ayo & Teo","BIA","Billy Ray Cyrus","CantaJuego","Carlinhos Brown",
    "Casper","Crazy Frog","Cutty Ranks","Dancing Green Alien","El Chombo","El Guincho","Gaby Moreno","GoonRock","Gulshan Kumar","Gummibär",
    "Israel Kamakawiwoʻole","Jaden","Janelle Monáe","Jasmin Walia","Jass Manak","Jhay Cortez","Joey Montana","JoJo Siwa","Juan Magan",
    "Juicy J","Julius Packiam (Tiger Theme)","Kamal Kahlon","Kid Ink","L.V.","Lauren Bennett","Lennox","Little Sis Nora","Lucenzo",
    "Maddie Ziegler","Mannat Noor","MC Fioti","Michel Teló","Mikky Ekko","MJ","MØ","MTZ Manuel Turizo","Murda Beatz","Nayer",
    "Nego do Borel","Neha Bhasin","Nikhil D'Souza","Nupur Sanon","Param Singh","Pratik Studio","RENUKA PANWAR","Ritesh Pandey",
    "Saad Lamjarred","Shia LaBeouf","Showtek","Silentó","Sirah","Sky","Sneh Upadhya","Snow","Tony Kakkar","Vassy","Wolfine",
    "Ximena Sariñana","Ylvis","Yotuel","Zack Knight"];
    
  if (!Array.isArray(mainArtistNames) || mainArtistNames.length === 0) {
    return res.status(400).json({ error: "Debe enviarse una lista de nombres de artistas principales." });
  }
  if (!Array.isArray(collaboratorNames) || collaboratorNames.length === 0) {
    return res.status(400).json({ error: "Debe enviarse una lista de nombres de colaboradores." });
  }

  try {
    const token = await getSpotifyToken();

    for (const artistName of mainArtistNames) {
      console.log(`🔍 Buscando datos de: ${artistName}...`);

      let { data: existingArtist, error: selectError } = await supabase
        .from("artistas")
        .select("id_artista, spotify_id, foto_artista, popularidad_artista")
        .eq("nombre_artista", artistName)
        .maybeSingle();

      if (selectError) {
        console.error(`❌ Error al buscar ${artistName}:`, selectError);
        continue;
      }

      // Si ya tiene todos los datos, continuar
      if (existingArtist?.foto_artista && existingArtist?.popularidad_artista) {
        console.log(`✔️ ${artistName} ya tiene foto y popularidad.`);
        continue;
      }

      // Buscar en Spotify solo si falta info
      if (!existingArtist?.spotify_id || !existingArtist?.foto_artista || !existingArtist?.popularidad_artista) {
        const response = await axios.get("https://api.spotify.com/v1/search", {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: artistName, type: "artist", limit: 1 },
        });

        if (!response.data.artists.items.length) {
          console.warn(`⚠️ No se encontró en Spotify: ${artistName}`);
          continue;
        }

        const artist = response.data.artists.items[0];
        const savedArtist = await saveArtist(artist, true);

        if (!savedArtist) continue;

        console.log(`✅ ${artistName} guardado correctamente.`);
      }
    }

    for (const artistName of collaboratorNames) {
      console.log(`🔍 Buscando datos de: ${artistName}...`);

      let { data: existingArtist, error: selectError } = await supabase
        .from("artistas")
        .select("id_artista, spotify_id, foto_artista, popularidad_artista")
        .eq("nombre_artista", artistName)
        .maybeSingle();

      if (selectError) {
        console.error(`❌ Error al buscar ${artistName}:`, selectError);
        continue;
      }

      // Si ya tiene todos los datos, continuar
      if (existingArtist?.foto_artista && existingArtist?.popularidad_artista) {
        console.log(`✔️ ${artistName} ya tiene foto y popularidad.`);
        continue;
      }

      // Buscar en Spotify solo si falta info
      if (!existingArtist?.spotify_id || !existingArtist?.foto_artista || !existingArtist?.popularidad_artista) {
        const response = await axios.get("https://api.spotify.com/v1/search", {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: artistName, type: "artist", limit: 1 },
        });

        if (!response.data.artists.items.length) {
          console.warn(`⚠️ No se encontró en Spotify: ${artistName}`);
          continue;
        }

        const artist = response.data.artists.items[0];
        const savedArtist = await saveArtist(artist, false);

        if (!savedArtist) continue;

        console.log(`✅ ${artistName} guardado correctamente.`);
      }
    }

    res.json({ message: "🎶 Datos de artistas actualizados correctamente." });
  } catch (error) {
    console.error("❌ Error al obtener datos de artistas:", error);
    res.status(500).json({ error: "Error al obtener datos de artistas" });
  }
};

module.exports = { searchFamousArtists, searchArtistsFromList };