const supabase = require('../../supabaseClient');
const { buscarGenerosDeArtista, buscarGenerosDeAlbumOCancion } = require('../utils/genreHelpers');
const { updateArtistPopularity, insertOrUpdateArtist } = require('../utils/supabaseHelpers');
const { buscarArtistaEnSpotify } = require('../utils/spotifyApiHelpers');
const { almacenarGenerosYRelacionar, obtenerGeneroPrincipalYSubgeneros, obtenerGenerosDeLastFM } = require('../utils/genreHelpers');
const { getCheckpoint, setCheckpoint, clearCheckpoint } = require('../utils/checkpoint');

// Helper para obtener géneros de canciones relacionadas y si no, buscar en LastFM
async function obtenerGenerosParaVideo(video, artistasBD) {
  // 1. Buscar géneros por coincidencia de canciones
  const { data: cancionesSimilares } = await supabase
    .from('canciones')
    .select('id_cancion')
    .ilike('titulo', video.titulo_limpio);

  let generosSet = new Set();

  for (const cancion of cancionesSimilares || []) {
    const { data: generosCancion } = await supabase
      .from('cancion_generos')
      .select('genero_id')
      .eq('cancion_id', cancion.id_cancion);

    generosCancion?.forEach(g => generosSet.add(g.genero_id));
  }

  // 2. Si no hay géneros, buscar en LastFM usando título y artistas
  if (generosSet.size === 0) {
    // Obtén nombres de artistas del video (principal y colaboradores)
    const nombresArtistas = [
      video.artista_principal,
      video.artista_colaborador1,
      video.artista_colaborador2,
      video.artista_colaborador3,
      video.artista_colaborador4,
      video.artista_colaborador5,
    ].filter(Boolean);

    let tags = [];
    for (const nombreArtista of nombresArtistas) {
      try {
        // Busca tags en LastFM para la canción (track.gettoptags)
        const params = { method: 'track.gettoptags', artist: nombreArtista, track: video.titulo_limpio };
        const lastFmResponse = await obtenerGenerosDeLastFM(video.titulo_limpio, nombreArtista);
        tags = tags.concat(lastFmResponse);
      } catch (err) {
        // Si falla, ignora ese artista
      }
    }
    // Normaliza y filtra duplicados
    tags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
    // Si hay tags, almacena relación con subgéneros
    if (tags.length > 0) {
      await almacenarGenerosYRelacionar('video', video.id_video, tags);
      return true;
    }
  } else {
    // Si hay géneros por coincidencia, almacena relación principal
    for (const genero_id of generosSet) {
      await supabase
        .from('video_generos')
        .upsert({
          video_id: video.id_video,
          genero_id,
          subgeneros: null
        }, { onConflict: ['video_id', 'genero_id'] });
    }
    return true;
  }
  return false;
}

// Debes tener un helper para llamar a la YouTube Data API v3
const { 
  fetchYoutubeChannelVideos, 
  fetchYoutubePlaylistVideos, 
  isoDurationToSeconds, 
  calcularPopularidadCruda,
  fetchYoutubeVideosDetails,
  calcularPopularidadAbsoluta,
  escalarA100Absoluto
} = require('../utils/youtubeApiHelpers'); // <-- Asegúrate de importar helpers

// Helper: Inserta video en videos_musicales y retorna id_video (robusto, sin duplicados)
async function insertVideoMusical(video) {
  // 1. Verifica si ya existe por youtube_id
  const { data: existente } = await supabase
    .from('videos_musicales')
    .select('id_video')
    .eq('youtube_id', video.video_id)
    .maybeSingle();

  if (existente && existente.id_video) {
    return existente.id_video;
  }

  // 2. Inserta si no existe
  const { data, error } = await supabase
    .from('videos_musicales')
    .insert({
      titulo: video.titulo_limpio,
      url_video: `https://www.youtube.com/watch?v=${video.video_id}`,
      duracion: video.duracion_segundos,
      popularidad: video.popularidad,
      miniatura: video.miniatura,
      anio: video.anio,
      youtube_id: video.video_id,
    })
    .select('id_video')
    .single();

  if (error) {
    console.error('Error al insertar video musical:', error);
    throw new Error('Error al insertar video musical: ' + error.message);
  }
  if (!data || !data.id_video) {
    throw new Error('No se pudo insertar ni obtener el id_video para el video: ' + video.titulo_limpio);
  }
  return data.id_video;
}

// Helper: Relaciona video con artistas
async function relateVideoArtists(id_video, artistas_ids) {
  for (const artista_id of artistas_ids) {
    await supabase.from('video_artistas').upsert({
      video_id: id_video,
      artista_id
    }, { onConflict: ['video_id', 'artista_id'] });
  }
}

// Helper: Relaciona géneros (puedes expandir para usar Last.fm si quieres)
async function relateVideoGenres(id_video, titulo, artistas_ids) {
  // Busca géneros igual que para canciones
  await buscarGenerosDeAlbumOCancion('video', id_video, titulo);
}

async function obtenerArtistaId(nombre) {
  const { data } = await supabase
    .from('artistas')
    .select('id_artista')
    .ilike('nombre_artista', nombre)
    .limit(1).single()
  return data?.id_artista || null;
}

// Helper: Verifica si un video ya existe en videos_musicales por youtube_id
async function videoExistsInDB(youtube_id) {
  const { data, error } = await supabase
    .from('videos_musicales')
    .select('id_video')
    .eq('youtube_id', youtube_id)
    .maybeSingle();
  return !!data;
}

// Helper: Verifica si un video ya está en una colección
async function videoInCollection(video_id, coleccion_id) {
  const { data, error } = await supabase
    .from('colecciones_elementos')
    .select('id_elemento')
    .eq('coleccion_id', coleccion_id)
    .eq('entidad_tipo', 'video')
    .eq('entidad_id', video_id)
    .maybeSingle();
  return !!data;
}

// Helper: Limpia el título (puedes mejorar la lógica)
function limpiarTitulo(titulo, artistaPrincipal, colaboradores = []) {
  let limpio = titulo;

  // Elimina artista principal y colaboradores
  if (artistaPrincipal) {
    limpio = limpio.replace(new RegExp(escapeRegExp(artistaPrincipal), 'gi'), '');
  }
  for (const colab of colaboradores) {
    limpio = limpio.replace(new RegExp(escapeRegExp(colab), 'gi'), '');
  }

  // Elimina palabras basura y separadores
  limpio = limpio
    .replace(/[-–—|,]/g, ' ')
    .replace(/\(.*?(official|video|lyrical|lyric|audio|visualizer|edit|exclusive|m\/v|oficial|music|songs|full|bhojpuri|punjabi|movie|film|track|feat|version|studio|live|hd|new|latest).*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\.|feat\.|featuring/gi, '')
    .replace(/official|video|lyrical|lyric|audio|visualizer|edit|exclusive|m\/v|oficial|music|songs|full|bhojpuri|punjabi|movie|film|track|feat|version|studio|live|hd|new|latest/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-:|]\s*/, '')
    .replace(/^\s*,/, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\bT[-\s]?Series\b/gi, '')
    .trim();

  return limpio;
}

function limpiarTituloAvanzado(titulo) {
  if (!titulo) return titulo;

  // 1) Quitar comillas tipográficas y dobles (pero conservar apóstrofo dentro de palabras)
  titulo = String(titulo).replace(/[“”«»"]/g, '');

  // 2) Quitar comillas que queden EXACTAMENTE en bordes (ej: "Where Are Ü Now")
  titulo = titulo.replace(/^[\s"'`]+|[\s"'`]+$/g, '');

  // 3) Quitar hashtags sueltos y palabras basura puntuales (sin tocar puntos ni apostrofes)
  titulo = titulo.replace(/#/g, '');

  // 4) Quitar palabras tipo "official", "officiel", "officiel", "oficial" (cuando no forman parte del nombre)
  titulo = titulo.replace(/\bofficial\b/gi, '');
  titulo = titulo.replace(/\bofficiel\b/gi, '');
  titulo = titulo.replace(/\bofficiel\b/gi, '');
  titulo = titulo.replace(/\boficial\b/gi, '');

  // 5) Quitar "clip" solo como palabra independiente (para casos "Clip Officiel")
  titulo = titulo.replace(/\bclip\b/gi, '');

  // 6) Normalizar ft/feat/featuring (solo palabra completa)
  titulo = titulo.replace(/\b(ft\.?|feat\.?|featuring)\b/gi, '');

  // 7) Quitar paréntesis vacíos y arreglar espacios en paréntesis
  titulo = titulo.replace(/\(\s*\)/g, '');
  titulo = titulo.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  // 8) Quitar "MV" SOLO si está al final como token aislado
  titulo = titulo.replace(/\bMV\b$/i, '');

  // 9) Quitar "4K" suelto (pero no 24K)
  titulo = titulo.replace(/(^|[^\d])4K\b/gi, '$1');

  // 10) Quitar frases compuestas como "DANCE PERFORMANCE" o "DANCE PERFORMANCE VIDEO" (no quitar "DANCE" aislado)
  titulo = titulo.replace(/\bDANCE PERFORMANCE VIDEO\b/gi, '');
  titulo = titulo.replace(/\bDANCE PERFORMANCE\b/gi, '');
  titulo = titulo.replace(/\bPERFORMANCE\b/gi, '');

  // 11) Quitar "performance", "lyric" y variantes si están como tokens sueltos
  titulo = titulo.replace(/\b(performance|lyric(al)?|visualizer|audio|studio)\b/gi, '');

  // 12) Eliminar ":" o ":" colgando al final (caso "Vaaste :")
  titulo = titulo.replace(/:\s*$/g, '');

  // 13) Remover conectores sobrantes al inicio o final (ampersand, x, guiones, pipes)
  titulo = titulo.replace(/^[\s&xX\-\–\—|:]+/, '');
  // Solo borra si termina en separadores o & | : (no borra "Rolex")
  titulo = titulo.replace(/[\s&\-\–\—|:]+$/g, '');


  // 14) Eliminar conectores aislados en medio (si quedaron solos)
  titulo = titulo.replace(/(?<=\s)(x|X)(?=\s)/g, ' ');

  // 14.5) Quitar conectores huérfanos al final (ej: "y")
  titulo = titulo.replace(/(\s+(y))$/gi, '');
  // 14) Eliminar conectores aislados solo en bordes
  titulo = titulo.replace(/^(\s*(and|with)\s+)/gi, '');
  titulo = titulo.replace(/(\s+(and|with)\s*)$/gi, '');

  // 15) Normalizar espacios y trim final
  titulo = titulo.replace(/\s{2,}/g, ' ').trim();

  // 16) Quitar frases de BASURA_EXTRA
  for (const basura of BASURA_EXTRA) {
    const regex = new RegExp(`\\b${escapeRegExp(basura)}\\b`, 'gi');
    titulo = titulo.replace(regex, '');
  }

  // 17) Eliminar "Song" solo si está precedida por palabras basura
  // Ejemplo: "Official Song", "New Song", "Lyric Song", pero NO "Earth Song", "Immigrant Song"
  titulo = titulo.replace(/\b(official|new|lyric|audio|video|latest|bhojpuri|punjabi|movie|film|track|studio|live|edit|exclusive|m\/v|oficial|music|songs)\s+song\b/gi, '');
  // NO eliminar "Song" si está sola o como parte del nombre


  return titulo;
}

function detectarArtistasEnTitulo(titulo, artistasBD) {
  // Aplica alias antes de buscar
  titulo = aplicarAliasArtistas(titulo);

  // Extrae posibles nombres
  let posibles = extraerNombresArtistasTitulo(titulo);

  // Evitar duplicados de grupo y solista
  const grupos = [
    { grupo: 'Zion & Lennox', miembros: ['Zion', 'Lennox'] },
    { grupo: 'Chino & Nacho', miembros: ['Chino', 'Nacho'] }
  ];
  let detectados = [];
  for (const { grupo, miembros } of grupos) {
    if (titulo.includes(grupo)) {
      const grupoObj = artistasBD.find(a => a.nombre_artista === grupo);
      if (grupoObj) detectados.push(grupoObj);
      // Excluye miembros individuales
      posibles = posibles.filter(n => !miembros.includes(n));
    }
  }

  // Detecta artistas individuales
  for (const nombre of posibles) {
    const artista = artistasBD.find(a => a.nombre_artista.toLowerCase() === nombre.toLowerCase());
    if (artista && !detectados.some(d => d.id_artista === artista.id_artista)) {
      detectados.push(artista);
    }
  }

  // Elimina falsos positivos ("and", "with" al inicio/final)
  detectados = detectados.filter(a => !['and', 'with'].includes(a.nombre_artista.toLowerCase()));

  // Elimina duplicados por id
  detectados = detectados.filter((a, idx, arr) => arr.findIndex(b => b.id_artista === a.id_artista) === idx);

  return detectados;
}

// Helper para extraer posibles nombres de artistas del título usando patrones comunes
function extraerNombresArtistasTitulo(titulo) {
  let posibles = [];

  // 0. Antes de dos puntos o punto al inicio
  const matchColon = titulo.match(/^([^:]+):/);
  if (matchColon) {
    posibles.push(matchColon[1]);
  }
  const matchDot = titulo.match(/^([^\.]+)\./);
  if (matchDot) {
    posibles.push(matchDot[1]);
  }

  // 1. Si hay guion, toma todo lo de la izquierda y sepáralo por , & y x
  if (titulo.includes(' - ')) {
    const ladoIzquierdo = titulo.split(' - ')[0];
    posibles.push(...ladoIzquierdo.split(/,|&| y | x /i));
  } else {
    // Si no hay guion, toma lo antes de "ft." o "feat." o la primera coma
    const match = titulo.match(/^(.*?)(?:\s*(ft\.|feat\.|featuring|,|&| y | x )|$)/i);
    if (match && match[1]) {
      posibles.push(...match[1].split(/,|&| y | x /i));
    }
  }

  // 2. Busca dentro de paréntesis (feat/ft)
  const paren = titulo.match(/\(([^)]*?(ft\.|feat\.|featuring)[^)]*)\)/i);
  if (paren) {
    posibles.push(...paren[1].split(/,|&| y | x /i));
  }

  // 3. ft. fuera de paréntesis
  const feat = titulo.match(/(ft\.|feat\.|featuring)\s+([^\[\]()\-]+)/i);
  if (feat) {
    posibles.push(...feat[2].split(/,|&| y | x /i));
  }

  // 4. Si hay "with" o "con" (ej: "with Justin Bieber")
  const withMatch = titulo.match(/with ([^\[\]()\-]+)/i);
  if (withMatch) {
    posibles.push(...withMatch[1].split(/,|&| y | x /i));
  }

  // Extra: busca nombres dentro de cualquier paréntesis
  const parenAll = titulo.match(/\(([^)]*)\)/g);
  if (parenAll) {
    parenAll.forEach(p => {
      posibles.push(...p.replace(/[()|]/g, '').split(/,|&| y | x |ft\.|feat\.|featuring/i));
    });
  }

  // 5. Limpia y elimina duplicados
  return [...new Set(posibles.map(n => n.trim()).filter(n => n.length > 1))];
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const ARTIST_ALIASES = {
  'HA-ASH': 'Ha*Ash',
  'Endshpil': 'Эндшпиль',
  '|Arijit Singh Singh': 'Arijit Singh',
  'Arijit Singh Singh': 'Arijit Singh',
  'Arijit': 'Arijit Singh',
  'Aastha': 'Aastha Gill',
  'Amitabh B': 'Amitabh Bhattacharya',
  'Amitabh Bhattacharya|': 'Amitabh Bhattacharya ',
  'ROSÉ': 'ROSÉ',
  'Ke$ha': 'Kesha',
  'Gael García Bernal': 'Gael Garcia Bernal',
  'BPraak': 'B Praak',
  'Juhn "El All Star"': 'Juhn',
  'La Adictiva Banda San José de Mesillas': 'La Adictiva',
  'ft.VASSY': 'VASSY',
  'Vishal & Sheykhar': 'Vishal-Shekhar',
  'Meet Bros.,': 'Meet Bros',
  'Meet Bros': 'Meet Bros.',
  'MTZ Manuel Turizo' : 'Manuel Turizo',
  'The Black Eyed Peas' : 'Black Eyed Peas',
  'BIA, Sky': 'BIA, Sky Rompiendo',
  'Sukriti': 'Sukriti Kakar',
  'Roop Kumar': 'Roop Kumar Rathod',
  'Tanishk Bagchiagchi': 'Tanishk Bagchi',
  'Dhvani': 'Dhvani Bhanushali',
  '#Ritesh Pandey': 'Ritesh Pandey',
  'سعد لمجرد': 'Saad Lamjarred',
  'Neha': 'Neha Kakkar',
  'Indeep': 'Indeep Bakshi',
  'Prem, Hardeep': 'Prem & Hardeep',
  'Kam': 'Kam Dhillon',
  '|Jubin Nautiyal,': 'Jubin Nautiyal ',
  '|Jubin Nautiyal|': 'Jubin Nautiyal ',
  'Jubin N': 'Jubin Nautiyal',
  'Kunaal V': 'Kunaal Vermaa',
  'Manoj M': 'Manoj Muntashir',
  'Monali Thakur|' : 'Monali Thakur ',
  'Amit |': 'Amit Mishra',
  'Neha Kakkar Kakkar': 'Neha Kakkar',

  'Mark Ronson:': 'Mark Ronson',

  'Anne Marie': 'Anne-Marie',
  'JHAY CORTEZ': 'JHAYCO',
  'Gigi D’Agostino': "Gigi D'Agostino",
  'Arcangel': 'Arcángel',
  'Mike WiLL Made It': 'Mike WiLL Made-It',
  'Lenny Tavarez': 'Lenny Tavárez',
  'Casper': 'Casper Magico',
  'Nio García': 'Nio Garcia',
  'Tanishk B,': 'Tanishk Bagchi,',
  'Kumar S': 'Kumar Sanu',
  'Chino y Nacho': 'Chino & Nacho',
  'Juan Magan': 'Juan Magán',
  'Sebastián Yatra': 'Sebastian Yatra',
  'J. Balvin': 'J Balvin',
  'Gummy Bear': 'Gummibär',
  'Israel "IZ" Kamakawiwoʻole': "Israel Kamakawiwo'ole",
  'Osito Gominola': 'Gummibär',
  'Zé Neto e Cristiano': 'Zé Neto & Cristiano',
  // ...agrega más alias según tu lista...
};

const DESCARTES = [
  'Maddie Ziegler', 'Shia LaBeouf', 'Shraddha Kapoor', 'Shraddha K', 'Shraddha', 'Ranbir', 'Katrina K', 'Katrina', 
  'Amit Dolawat', 'Shah Rukh Khan', 'Deepika', 'Kumaar', 'Sidharth M', 'Siddharth', 'Emraan Hashmi', 'Yukti', 'Sai Pallavi',
  'Balaji Mohan', 'Arjun K', 'Ranveer Singh', 'Sara Ali Khan', 'Tiger Shroff', 'Sabbir Khan', 'Akshay Kumar', 'Nupur Sanon',
  'Arvindr Khaira', 'Neeru Bajwa', 'Amberdeep', 'Radhika Rao', 'Vinay Sapru', 'Anushka Sharma', 'Bhushan Kumar', 'Bhushan K',
  'SAHIL SANDHU', 'Aamir Khan', 'Preity Zinta', 'DirectorGifty', 'Drisha More', 'Jacqueline Fernandez', 'John Abraham', 
  'Nora Fatehi', 'Satti Dhillon', 'Salman Khan', 'Sonam Kapoor', 'Kapoor', 'Roop Kumar', 'Radhika R', 'Vinay S',
  'Sushant', 'Riteish D', 'Tara S', 'Radhika-Vinay', 'Radhika Vinay', 'Gaurav Jang',
  
  'Khoobsurat', 'Sonu Ke Titu Ki Sweety', 'Taare Zameen Par', 'Dil Hai Tumhaara', 'FROZEN', 'Maheruh', 'Satyameva Jayate', 'BAAGHI', 
  'Jagga Jasoos', 'Rab Ne Bana Di Jodi', 'CHHICHHORE', 'SIMMBA', 'Maari 2', 'Baar Baar Dekho', 'Marjaavaan',
  
  'Ishtar', 'Pratik', 'Prod. Afro Bros & Jeon', 'Fever',
  
  'Haryanvi', 'DESI MELODIES', 'Haryanavi',

  'Bhanushali'
];

const BASURA_EXTRA = [
  'Sing along', 'UK', 'T Series', 'T-Series', 'Hit Anthem of the Year 2021', "India's Most Viewed Hit", 'Title', 'Acústico'
];

// reemplazar/aplicar aliases (escapando metacaracteres para arreglar Ke$ha, etc.)
function aplicarAliasArtistas(titulo) {
  if (!titulo) return titulo;
  for (const [alias, real] of Object.entries(ARTIST_ALIASES)) {
    const aliasEsc = escapeRegExp(String(alias));
    // heurística: si alias empieza/termina con letra/dígito usamos \b, si no (ej: "#Ritesh") no usamos \b
    const startsWithWord = /^\w/u.test(alias);
    const endsWithWord = /\w$/u.test(alias);
    const regex = (startsWithWord && endsWithWord)
      ? new RegExp(`\\b${aliasEsc}\\b`, 'gi')
      : new RegExp(aliasEsc, 'gi');

    // Sustituimos alias por el nombre "real"
    titulo = titulo.replace(regex, String(real));
  }
  return titulo;
}

// Dado el nombre real de un artista (ej "Kesha"), devuelve aliases que apuntan a él.
// Útil para, al eliminar artistas del título original, también borrar las variantes alias que aparezcan.
function obtenerAliasesDeArtista(artistaNombre) {
  const res = [];
  if (!artistaNombre) return res;
  const target = removeAccents(String(artistaNombre).toLowerCase());
  for (const [alias, real] of Object.entries(ARTIST_ALIASES)) {
    if (!real) continue;
    const realNorm = removeAccents(String(real).toLowerCase());
    if (realNorm === target) res.push(alias);
  }
  return res;
}


// Lista blanca de artistas cortos válidos
const ARTISTAS_CORTOS_VALIDOS = ['L.V.', 'T.I.', 'LP'];

// Helper: Detección estricta de artistas especiales antes de normalizar
function detectarArtistasEspeciales(titulo, artistasBD) {
  const encontrados = [];
  for (const especial of ARTISTAS_CORTOS_VALIDOS) {
    const regex = new RegExp(`\\b${especial.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(titulo)) {
      const artista = artistasBD.find(a => a.nombre_artista.toLowerCase() === especial.toLowerCase());
      if (artista) {
        encontrados.push({ id: artista.id_artista, nombre: artista.nombre_artista });
      }
    }
  }
  return encontrados;
}

// 6. Crear artistas faltantes en la BD desde Spotify (debe ir antes de playlistToCollection)
async function crearArtistasFaltantesEnBD(listaFaltantes) {
  for (const valor of listaFaltantes) {
    let artistaSpotify = null;
    if (/^[a-zA-Z0-9]{22}$/.test(valor)) {
      // Es un spotify_id
      artistaSpotify = await require('../utils/spotifyApiHelpers').getArtistDetails(valor);
    } else {
      // Es un nombre
      artistaSpotify = await buscarArtistaEnSpotify(valor);
    }
    if (artistaSpotify && artistaSpotify.name) {
      await insertOrUpdateArtist({
        id: artistaSpotify.id,
        name: artistaSpotify.name,
        images: artistaSpotify.images,
        popularity: artistaSpotify.popularity
      });
      console.log(`✅ Artista creado: ${artistaSpotify.name} (${artistaSpotify.id})`);
    } else {
      console.warn(`❌ No se encontró en Spotify: ${valor}`);
    }
  }
}

async function procesarVideoCrudo(v, artista_principal, artista_id, nombre_artista_principal, artistasBD) {
  // Soporta estructura de playlist y de catálogo (id directo o id.videoId)
  const videoId = v.id?.videoId || v.id || v.contentDetails?.videoId || v.snippet?.resourceId?.videoId || v.videoId;
  const snippet = v.snippet || {};
  let title = snippet.title || v.title;
  title = aplicarAliasArtistas(title); // aplica alias al original también
  const titleForDetection = aplicarAliasArtistas(title);

  const publishedAt = snippet.publishedAt || v.publishedAt;

  const thumbnail = snippet.thumbnails?.high?.url || v.thumbnail;
  const duration = v.contentDetails?.duration || v.duration || 'PT0S';
  const viewCount = v.statistics?.viewCount || v.viewCount || 0;
  const duracion_segundos = isoDurationToSeconds(duration);
  const anio = publishedAt ? new Date(publishedAt).getFullYear() : null;

  // 1. Extraer artistas reales de la BD y ordenar por longitud de nombre descendente
  const artistasArray = artistasBD || [];

  const artistasMap = {};
  for (const artista of artistasArray) {
    const norm = removeAccents(artista.nombre_artista.toLowerCase().replace(/[-.]/g, ' '));
    artistasMap[norm] = artista.id_artista;
  }

  const artistasOrdenados = artistasArray
    .map(a => ({
      id: a.id_artista,
      nombre: a.nombre_artista,
      norm: removeAccents(a.nombre_artista.toLowerCase().replace(/[-.]/g, ' '))
    }))
    .sort((a, b) => b.nombre.length - a.nombre.length);

  // 2. Extraer posibles nombres de artistas del título usando patrones
  const palabrasBasura = ['feat', ' ft', 'official', 'video', 'lyrical', 'lyric', 'audio'];

  // Detección inicial con tu lógica actual
  const posiblesNombres = extraerNombresArtistasTitulo(titleForDetection)
    .filter(nombre => !palabrasBasura.some(p => nombre.toLowerCase().includes(p)));

  let artistasDetectados = [];

  // EXTRA: buscar artistas dentro de paréntesis ANTES de borrarlos
  const regexParentesis = /\((.*?)\)/g;
  let match;
  while ((match = regexParentesis.exec(titleForDetection)) !== null) {
    const contenido = match[1]; // lo que está dentro del paréntesis
    for (const artista of artistasOrdenados) {
      const regex = new RegExp(`(^|[\\s,\\-x&])${escapeRegExp(artista.nombre)}([\\s,\\-x&]|$)`, 'i');
      if (regex.test(contenido)) {
        if (!artistasDetectados.some(a => a.id === artista.id)) {
          artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
        }
      }
    }
  }

  for (const nombre of posiblesNombres) {
    // Normaliza el nombre
    const nombreNorm = removeAccents(nombre.trim().toLowerCase());
    
    // Busca en la BD
    //let artista = artistasArray.find(a => removeAccents(a.nombre_artista.toLowerCase()) === nombreNorm);
    let artista = artistasOrdenados.find(a => a.norm === nombreNorm);
    // NO crear artista automáticamente en catálogo
    if (!artista) {
      artista = null;
    }
    if (artista) artistasDetectados.push(artista);
  }
  // Elimina descartes
  artistasDetectados = artistasDetectados.filter(a => !DESCARTES.includes(a.nombre));
  // Complemento: refuerzo con detectarArtistasEnTitulo
  const detectadosExtra = detectarArtistasEnTitulo(title, artistasBD);
  for (const art of detectadosExtra) {
    if (!artistasDetectados.some(a => a.id === art.id)) {
      artistasDetectados.push(art);
    }
  }
  // El primero es principal, los demás colaboradores
  let artistaPrincipalId = null;
  let artistaPrincipalDetectado = null;

  // Purge grupo/solista: si está el grupo, saca a los miembros
  function purgeGrupoSolista() {
    const reglas = [
      { grupo: /^Zion\s*&\s*Lennox$/i, miembros: [/^\s*Zion\s*$/i, /^\s*Lennox\s*$/i] },
      { grupo: /^Chino\s*&\s*Nacho$/i, miembros: [/^\s*Chino\s*$/i, /^\s*Nacho\s*$/i] },
    ];
    const nombres = artistasDetectados.map(a => a.nombre);
    for (const r of reglas) {
      const hayGrupo = nombres.some(n => r.grupo.test(n));
      if (hayGrupo) {
        artistasDetectados = artistasDetectados.filter(a => !r.miembros.some(m => m.test(a.nombre)));
      }
    }
  }

  // primera pasada
  purgeGrupoSolista();

  if (artistasDetectados.length > 0) {
    artistaPrincipalId = artistasDetectados[0].id;
    artistaPrincipalDetectado = artistasDetectados[0].nombre;
  }

  // 3. Buscar artistas especiales (L.V., T.I.) solo si aparecen exactamente así
  let artistasDetectadosEspeciales = detectarArtistasEspeciales(title, artistasBD);

  // 4. Buscar artistas en el título (sin normalizar primero)
  let tituloRestante = titleForDetection;
  for (const artista of artistasOrdenados) {
    if (artista.nombre.length < 3 && !ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) continue;
    if (artistasDetectadosEspeciales.some(a => a.id === artista.id)) continue;
    // Solo detecta T.I. y L.V. si aparecen exactamente
    if (ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) {
      const regex = new RegExp(`\\b${artista.nombre.replace('.', '\\.')}\\b`, 'i');
      if (!regex.test(title)) continue;
    }
    // Si el nombre está en los posibles extraídos, lo acepta
    if (posiblesNombres.some(n => n.toLowerCase() === artista.nombre.toLowerCase())) {
      artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
      continue;
    }
    // Si el nombre aparece en el título, lo acepta
    const regex = new RegExp(`(^|[\\s,\\-x&])${escapeRegExp(artista.nombre)}([\\s,\\-x&]|$)`, 'i');
    if (regex.test(tituloRestante)) {
      artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
      tituloRestante = tituloRestante.replace(new RegExp(escapeRegExp(artista.nombre), 'gi'), '');
    }
  }
  // Ejecutar purgeGrupoSolista otra vez para limpiar duplicados
  purgeGrupoSolista();

  // 5. Si no se detecta ninguno, buscar en el título normalizado (sin puntos)
  if (artistasDetectados.length === 0) {
    let tituloNorm = removeAccents(titleForDetection.toLowerCase().replace(/[-.]/g, ' '));
    for (const artista of artistasOrdenados) {
      if (artista.nombre.length < 3 && !ARTISTAS_CORTOS_VALIDOS.includes(artista.nombre)) continue;
      const regex = new RegExp(`(^|[\\s,\\-x&])${artista.norm}([\\s,\\-x&]|$)`, 'i');
      if (regex.test(tituloNorm)) {
        artistasDetectados.push({ id: artista.id, nombre: artista.nombre });
        tituloNorm = tituloNorm.replace(new RegExp(artista.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      }
    }
  }

  // 6. Si hay ambigüedad (más de un artista con el mismo nombre), elige el que más compatibilidad tenga
  // (por ahora, el que más largo sea, puedes mejorar con más heurística)
  artistaPrincipalDetectado = null;
  artistaPrincipalId = null;
  if (artista_id && nombre_artista_principal) {
  artistaPrincipalDetectado = nombre_artista_principal;
  artistaPrincipalId = artista_id;

  // Agrega a artistasDetectados si no está aún
  if (!artistasDetectados.some(a => a.id === artistaPrincipalId)) {
    artistasDetectados.push({ id: artistaPrincipalId, nombre: artistaPrincipalDetectado });
  }
} else if (artistasDetectados.length > 0) {
    // Elige el artista cuyo nombre aparece primero en el título
    let mejor = artistasDetectados[0];
    let mejorIdx = titleForDetection.indexOf(mejor.nombre);
    for (const a of artistasDetectados) {
      const idx = titleForDetection.indexOf(a.nombre);
      if (idx !== -1 && (mejorIdx === -1 || idx < mejorIdx)) {
        mejor = a;
        mejorIdx = idx;
      }
    }
    artistaPrincipalDetectado = mejor.nombre;
    artistaPrincipalId = mejor.id;
  }

  // 7. Colaboradores: todos los demás artistas detectados en el título, que no sean el principal
  // Elimina duplicados por nombre y por id
  colaboradores = artistasDetectados
    .filter(a => a.id !== artistaPrincipalId && a.id !== undefined)
    .filter((a, idx, arr) => arr.findIndex(b => b.id === a.id || b.nombre === a.nombre) === idx)
    .slice(0, 5);

  // 8. Limpiar el título eliminando artistas detectados
  let limpio = title;

  // Normaliza para evitar problemas de mayúsculas y acentos
  const titleNorm = removeAccents(title.toLowerCase().trim());

  // 🔹 Regla especial 1: Dancing Queen (falso positivo)
  if (artistaPrincipalDetectado === 'ABBA' && titleNorm.includes('dancing queen')) {
    colaboradores = colaboradores.filter(c => c.nombre !== 'Queen');
  }

  // Asegura que se elimine el nombre del artista principal y también sus alias
  function eliminarArtistaYAliases(nombre, limpio) {
    if (!nombre) return limpio;
    // Borra el nombre principal
    limpio = limpio.replace(new RegExp(escapeRegExp(nombre), 'gi'), '');
    // Borra también sus alias
    const aliases = obtenerAliasesDeArtista(nombre);
    for (const alias of aliases) {
      limpio = limpio.replace(new RegExp(escapeRegExp(alias), 'gi'), '');
    }
    return limpio;
  }

  if (nombre_artista_principal) {
    limpio = eliminarArtistaYAliases(nombre_artista_principal, limpio);
  }
  if (artistaPrincipalDetectado && artistaPrincipalDetectado.toLowerCase() !== 'gummibär') {
    limpio = eliminarArtistaYAliases(artistaPrincipalDetectado, limpio);
  }
  for (const colab of colaboradores) {
    limpio = eliminarArtistaYAliases(colab.nombre, limpio);
  }


  for (const descarte of DESCARTES) {
    limpio = limpio.replace(new RegExp(escapeRegExp(descarte), 'gi'), '');
  }

  // Aplica reglas de limpieza completas (fusionadas con la versión anterior)
  limpio = limpio
    .replace(/[-–—|,]/g, ' ')
    .replace(/\(.*?(official|video|lyrical|lyric|audio|visualizer|edit|exclusive|m\/v|oficial|music|songs|full|bhojpuri|punjabi|movie|film|track|feat|version|studio|live|hd|new|latest).*?\)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ft\.|feat\.|featuring/gi, '')
    .replace(/official|video|lyrical|lyric|audio|visualizer|edit|exclusive|m\/v|oficial|music|songs|full|bhojpuri|punjabi|movie|film|track|feat|version|studio|live|hd|new|latest/gi, '')
    .replace(/❌|#[\w-]+/g, '')
    .replace(/^\s*[-:|]\s*/, '')
    .replace(/^\s*,/, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  if (!limpio) limpio = title;

// 9. Popularidad ajustada
const popularidad = calcularPopularidadAbsoluta(viewCount, publishedAt);

// 10. Solo asigna artista principal y colaboradores si existen en la BD
let titulo_limpio_base = limpiarTitulo(limpio, artistaPrincipalDetectado, colaboradores.map(c => c.nombre));
let titulo_limpio = limpiarTituloAvanzado(titulo_limpio_base);

if (!titulo_limpio) titulo_limpio = title;

// Si no se detectó artista, usa el canal como referencia
      if (!artistaPrincipalId && v.snippet?.channelTitle) {
        // Busca el artista en la BD por nombre normalizado del canal
        const canalNorm = removeAccents(v.snippet.channelTitle.toLowerCase());
        const artistaCanal = artistasArray.find(a => removeAccents(a.nombre_artista.toLowerCase()) === canalNorm);
        if (artistaCanal) {
          artistaPrincipalId = artistaCanal.id_artista;
          artistaPrincipalDetectado = artistaCanal.nombre_artista;
        }
      }

    // 🔹 Regla especial 2: Waka Waka (forzar Shakira)
    if (/waka waka/i.test(titleForDetection)) {
      const shakiraId = await obtenerArtistaId('Shakira');
      if (shakiraId) {
        artistaPrincipalDetectado = 'Shakira';
        artistaPrincipalId = shakiraId;
        // Elimina duplicados en colaboradores
        colaboradores = colaboradores.filter(c => c.nombre !== 'Shakira');
      }
    }

    // Mantener variante correcta si el principal es Gummibär
    if ((artistaPrincipalDetectado || '').toLowerCase() === 'gummibär') {
      const variante = /english/i.test(title) ? 'Gummy Bear'
                    : /spanish/i.test(title) ? 'Osito Gominola'
                    : 'Gummibär';

      // Fuerza la variante en el título ANTES de limpiar
      limpio = limpio.replace(/\b(Gummibär|Gummy Bear|Osito Gominola)\b/gi, variante);
      titulo_limpio = titulo_limpio.replace(/\b(Gummibär|Gummy Bear|Osito Gominola)\b/gi, variante);
    }

  let videoObj = {
    video_id: videoId,
    artista_id: artistaPrincipalId || null,
    artista_principal: artistaPrincipalDetectado || null,
    titulo_original: title,
    titulo_limpio: titulo_limpio,
    duracion_iso: duration,
    duracion_segundos,
    published_at: publishedAt,
    view_count: Number(viewCount),
    popularidad,
    miniatura: thumbnail,
    anio,
    extraccion_batch_id: null,
    es_nueva_extraccion: true,
    artista_colaborador1: colaboradores[0]?.nombre || null,
    artista_colaborador1_id: colaboradores[0]?.id || null,
    artista_colaborador2: colaboradores[1]?.nombre || null,
    artista_colaborador2_id: colaboradores[1]?.id || null,
    artista_colaborador3: colaboradores[2]?.nombre || null,
    artista_colaborador3_id: colaboradores[2]?.id || null,
    artista_colaborador4: colaboradores[3]?.nombre || null,
    artista_colaborador4_id: colaboradores[3]?.id || null,
    artista_colaborador5: colaboradores[4]?.nombre || null,
    artista_colaborador5_id: colaboradores[4]?.id || null,
    youtube_channel_id: snippet.channelId || null,
    youtube_channel_nombre: snippet.channelTitle || null,
    canal_verificado: null // Se asigna abajo
  };

  // Normaliza nombre del canal
  function normalizarNombreCanal(nombre) {
    if (!nombre) return '';
    return nombre
      .replace(/vevo|tv|oficial|official|music|hq/gi, '')
      .replace(/\s+e\s+/gi, ' & ')
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9&]/g, '') // quita caracteres especiales
      .trim()
      .toLowerCase();
  }

  function normalizarNombreArtista(nombre) {
    if (!nombre) return '';
    return nombre
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9&]/g, '')
      .trim()
      .toLowerCase();
  }

  const nombreCanalNorm = normalizarNombreCanal(videoObj.youtube_channel_nombre);
  const principalNorm = normalizarNombreArtista(videoObj.artista_principal);
  const colaboradoresNorm = [
    normalizarNombreArtista(videoObj.artista_colaborador1),
    normalizarNombreArtista(videoObj.artista_colaborador2),
    normalizarNombreArtista(videoObj.artista_colaborador3),
    normalizarNombreArtista(videoObj.artista_colaborador4),
    normalizarNombreArtista(videoObj.artista_colaborador5),
  ].filter(Boolean);

  // Evita disqueras genéricas
  const disqueras = ['warner', 'universal', 'sony', 'records', 'record', 'label'];
  const nombreCanalRaw = (videoObj.youtube_channel_nombre || '').toLowerCase();

  let canalEsArtista = false;
  if (principalNorm && nombreCanalNorm.includes(principalNorm)) {
    canalEsArtista = true;
  } else if (colaboradoresNorm.some(colab => colab && nombreCanalNorm.includes(colab))) {
    canalEsArtista = true;
  }

  if (
    canalEsArtista &&
    !disqueras.some(d => nombreCanalRaw.includes(d))
  ) {
    videoObj.canal_verificado = true;
  } else {
    videoObj.canal_verificado = false;
  }

  return videoObj;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  // 1. Importar catálogo de un artista (nuevo)
  importYoutubeCatalog: async (artistId) => {
  // 1. Obtener artista y canal
  const { data: artist } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista, channel_id_youtube')
    .eq('id_artista', artistId)
    .single();

  if (!artist || !artist.channel_id_youtube) {
    throw new Error('Artista o channel_id_youtube no encontrado');
  }

  // 2. Obtener todos los artistas de la BD para detección
  const { data: artistasBD, error: artistasError } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista');
  if (artistasError) {
    console.error('Error obteniendo artistas de la BD:', artistasError);
    return;
  }

  // 3. Extraer videos crudos del canal
  const videosCrudos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);
  const videoIds = videosCrudos.map(v =>
    v.id?.videoId || v.id || v.snippet?.resourceId?.videoId || v.contentDetails?.videoId
  ).filter(id => !!id);

  if (videoIds.length === 0) {
    console.warn('No se encontraron videos válidos en el canal');
    return;
  }

  // 4. Obtener detalles completos de los videos
  const videosDetalles = await fetchYoutubeVideosDetails(videoIds);

  // 5. Procesar y limpiar cada video
  const batchId = Date.now().toString();
  const fechaExtraccion = new Date().toISOString();

  let videosProcesados = await Promise.all(
    videosDetalles.map(async v => {
      const video = await procesarVideoCrudo(
        v,
        artist.nombre_artista,
        artist.id_artista,
        artist.nombre_artista,
        artistasBD
      );

      if (!video || !video.video_id) return null;

      // Puedes implementar lógica para marcar musicales
      const tituloOriginal = video.titulo_original || '';
      const esVideo = /\b(video|m\/v|mv)\b/i.test(tituloOriginal);
      const esAudio = /\baudio\b/i.test(tituloOriginal);
      
      if (esVideo && !esAudio) {
        video.is_musical = true;
      } else if (esAudio && !esVideo) {
        video.is_musical = false;
      } else {
        video.is_musical = null;
      }

      // Completa todos los campos requeridos
      video.extraccion_batch_id = batchId;
      video.popularidad = calcularPopularidadAbsoluta(video.view_count, video.published_at);
      video.fecha_extraccion = fechaExtraccion;
      video.playlist_id = null; // Es catálogo, no playlist

      return video;
    })
  );

  videosProcesados = videosProcesados.filter(v => v);

  // 6. Insertar en staging_videos_youtube
  for (const video of videosProcesados) {
    await supabase
      .from('staging_videos_youtube')
      .upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
  }
},

  // 2. Actualizar catálogo de un artista ya validado
  updateYoutubeCatalog: async (artistId) => {
  console.log(`📹 Iniciando actualización de catálogo YouTube para artista ID: ${artistId}`);

  const { data: artist } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista, channel_id_youtube')
    .eq('id_artista', artistId)
    .single();
  if (!artist || !artist.channel_id_youtube) throw new Error('Artista o channel_id_youtube no encontrado');

  console.log(`👤 Artista: ${artist.nombre_artista}, Channel: ${artist.channel_id_youtube}`);

  const videos = await fetchYoutubeChannelVideos(artist.channel_id_youtube);
  console.log(`📊 Videos encontrados en canal: ${videos.length}`);

  const batchId = Date.now().toString();

  console.log(`\n🎬 Procesando videos...`);

  let videosProcesados = await Promise.all(
    videos.map(async v => {
      const video = await procesarVideoCrudo(v, artist.nombre_artista, artist.id_artista, artist.nombre_artista);

      // Solo si artista_id válido
      if (!video.artista_id || !video.titulo_limpio || !video.video_id) return null;

      video.extraccion_batch_id = batchId;
      video.is_musical = null;
      video.popularidad = calcularPopularidadAbsoluta(video.view_count, video.published_at);

      return video;
    })
  );

  videosProcesados = videosProcesados.filter(v => v); // elimina nulos
  console.log(`✓ Videos procesados: ${videosProcesados.length}`);

  const checkpointKey = `youtube_channel_${artist.id_artista}_catalog`;
  const checkpoint = await getCheckpoint(checkpointKey);
  let startIndex = 0;
  if (checkpoint && typeof checkpoint.index === 'number') {
    startIndex = checkpoint.index + 1;
    console.log(`🔄 Reanudando desde índice ${startIndex}`);
  }

  for (let idx = startIndex; idx < videosProcesados.length; idx++) {
    const video = videosProcesados[idx];
    console.log(`  [${idx + 1}/${videosProcesados.length}] Guardando: ${video.titulo_limpio}`);
    
    await supabase.from('staging_videos_youtube').upsert(video, { onConflict: ['video_id', 'extraccion_batch_id'] });
    
    // checkpoint per video
    try {
      await setCheckpoint(checkpointKey, { index: idx, videoId: video.video_id, updated_at: Date.now() });
      console.log(`    💾 Checkpoint guardado`);
    } catch (e) {
      console.warn('⚠️ Error escribiendo checkpoint youtube catalog', e.message || e);
    }
  }

  console.log(`\n🔍 Buscando videos musicales en batch ${batchId}...`);
  const { data: musicales } = await supabase
    .from('staging_videos_youtube')
    .select('*')
    .eq('extraccion_batch_id', batchId)
    .eq('is_musical', true);

  console.log(`🎵 Videos marcados como musicales: ${(musicales || []).length}`);

  for (const video of musicales || []) {
    if (!video.titulo_limpio || !video.video_id) continue;

    console.log(`  ✓ Insertando video musical: ${video.titulo_limpio}`);
    const id_video = await insertVideoMusical(video);
    await relateVideoArtists(id_video, [artist.id_artista]);

    for (let i = 1; i <= 5; i++) {
      const colabId = video[`artista_colaborador${i}_id`];
      if (colabId) {
        await relateVideoArtists(id_video, [colabId]);
      }
    }

    await relateVideoGenres(id_video, video.titulo_limpio, [artist.id_artista]);
  }

  console.log(`\n✅ Catálogo completado. Limpiando checkpoint...`);
  // cleanup checkpoint
  try { await clearCheckpoint(checkpointKey); } catch (e) {}
  console.log(`✅ Checkpoint limpiado.`);

  await updateArtistPopularity(artist.id_artista, null);
  console.log(`✅ Popularidad de artista actualizada.`);
},

  // 3. Crear/actualizar colección desde playlist de YouTube
  playlistToCollection: async (playlistId) => {
  const videosCrudos = await fetchYoutubePlaylistVideos(playlistId);
  const videoIds = videosCrudos.map(v => v.snippet?.resourceId?.videoId).filter(id => !!id);

  if (videoIds.length === 0) {
    console.warn('No se encontraron videos válidos en la playlist');
    return;
  }

  const artistasFaltantes = [
  /*'6ix9ine', //Revisar que no se crea al artista 'Chusi'
  'Alex Rose', 'Aloe Blacc', 'Any Gabrielly', 'Aqua', 'Arijit Singh',
  'AronChupa', 'Audioslave', "Auli'i Cravalho", 'Aya Nakamura', 'Ayo & Teo', 'Badshah', 'BIA', 'Bonnie Tyler',
  'BPraak', 'Bryant Myers', 'Cali Y El Dandee', 'Camilo', 'Carlos Vives', 'Carlinhos Brown',
  'Cazzu', 'Cham Cham', 'Chino', 'Chino & Nacho', 'Chris Jedi', 'Christian Nodal', 'Crazy Frog', 'Cristiano',
  'Cutty Ranks', 'Dalex', 'Dancing Green Alien', 'Dhanush',
  'Disturbed', 'Dwayne Johnson', 'El Chombo', 'El Guincho', 'Europe', 'Gael García Bernal', 'Gaby Moreno',
  'GoonRock', 'Grupo Firme', 'Gummibär', 'Guru Randhawa', 'Ha*Ash', 'HA-ASH', 'Hippie Sabotage', 'Ikka', 'Indila',
  "Israel Kamakawiwo'ole", 'JESSE & JOY', 'Joey Montana', 'JoJo Siwa', 'Juan Magán', 'Juhn',
  'Zack Knight', 'Kid Ink', 'Kika Edgar', 'La Adictiva Banda San José de Mesillas',
  'La Oreja de Van Gogh', 'La Sonora Dinamita', 'Lauren Bennett', 'Lenny Tavárez', 'Lil Pump',
  'Little Mix', 'Little Sis Nora', 'LMFAO', 'Los Ángeles Azules', 'Luis Ángel Gómez Jaramillo', 'Lyanno',
  'Marc Anthony', 'Mariah Angeliq', 'Mau y Ricky', 'MC Fioti', 'MC Kevinho', 'Melendi', 'Michel Teló',
  'Mike WiLL Made It', 'MiyaGi', 'Nacho', 'Natalia Lafourcade', 'Natti Natasha', 'Naughty Boy',
  'Neha Kakkar', 'Nego do Borel', 'No Doubt', 'Noriel', 'Piso 21', 'Prince Royce',
  'Pritam', 'PSY', 'PULCINO PIO', 'Rahat Fateh Ali Khan', 'Reik', 'Rem Digga', 'Ricardo Arjona', 'Ricky Martin',
  'Rod Stewart', 'Romeo Santos', 'Saad Lamjarred', 'Scorpions', 'Sebastian Yatra', 'Sech', 'Sean Kingston', 'Showtek',
  'Silentó', 'Sky Rompiendo', 'Sneh Upadhya', 'Sushant Singh Rajput', 'Stromae', 'Tanishk Bagchi',
  'Thalia', 'Tomatito', 'Trap Capos', 'Vassy', 'Wolfine', 'Ximena Sariñana', 'Yandel',
  'Ylvis', 'Yotuel', 'Yuridia', 'Zé Neto & Cristiano',
  'Murda Beatz', 'Marco Antonio Solis', 'Jaden', 'Ángela Aguilar', 'Aastha Gill', 'Jasmin Walia', 'Dhvani Bhanushali',
  'Amitabh Bhattacharya', 'Vishal & Sheykhar', 'Prem & Hardeep',  'Indeep Bakshi',  'Jubin Nautiyal',
  'Tony Kakkar', 'Mithoon', 'Monali Thakur', 'Meet Bros', 'Palak Muchhal', 'Roop Kumar Rathod', 'Mika Singh',
  'Kumar Sanu', 'Nikhil D’Souza', 'Pranjal Dahiya', 'Aman Jaji', 'Renuka Panwar', 'Mukesh Jaji',
  'Baani Sandhu', 'Gur Sidhu', 'Kamal Kahlon', 'Param Singh', 'Alka Yagnik', 'Udit Narayan', 'Jass Manak', 'Mannat Noor',
  'Altamash Faridi', 'Kalyan Bhardhan',
  'Эндшпиль', 'Payal Dev', 'Shaan', 'Ammy Virk', 'Jaani', 'Sapna Choudhary', 'Gurneet Dosanjh',
  'Manoj Muntashir', 'Rashmi Virag', 'CNCO',
  '3E6xrwgnVfYCrCs0ePERDz', '1pgDilWYDWLoOgGjf1iHNu', //Wisin y Zion
  'Yuvan Shankar Raja', 'Kunaal Vermaa',
  'Rocky - Shiv', 'Nora Fatehi', 'Sukriti Kakar', 'Roop Kumar Rathod',
  'Рем Дигга',
  'Kam Dhillon', 'Ritesh Pandey',
  'Amit Mishra',*/
];

await crearArtistasFaltantesEnBD(artistasFaltantes);

  const { data: artistasBD, error: artistasError } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista');
  if (artistasError) {
    console.error('Error obteniendo artistas de la BD:', artistasError);
    return;
  }

  const videosDetalles = await fetchYoutubeVideosDetails(videoIds);
  const batchId = Date.now().toString();

  let videosProcesados = await Promise.all(
    videosDetalles.map(async v => {
      const videoTemp = await procesarVideoCrudo(v, null, null, null, artistasBD);
      if (videoTemp) {
        videoTemp.extraccion_batch_id = batchId;
        videoTemp.playlist_id = playlistId;
        videoTemp.is_musical = true;
        videoTemp.popularidad = calcularPopularidadAbsoluta(videoTemp.view_count, videoTemp.published_at);
      }
      return videoTemp;
    })
  );

  videosProcesados = videosProcesados.filter(v => v);

  console.log('Videos procesados para staging:', videosProcesados.length);

  for (const videoTemp of videosProcesados) {
    try {
      const { error } = await supabase
        .from('staging_videos_youtube')
        .upsert(videoTemp, { onConflict: ['video_id', 'extraccion_batch_id', 'playlist_id'] });
      if (error) {
        console.error('Error al insertar en staging_videos_youtube:', error, videoTemp);
      }
    } catch (err) {
      console.error('Excepción al insertar en staging_videos_youtube:', err, videoTemp);
    }
  }
},

  // 4. Actualizar colección existente desde playlist de YouTube
  updateCollectionFromYoutubePlaylist: async (playlistId, coleccionId) => {
  console.log(`📹 Iniciando actualización de colección YouTube: playlistId=${playlistId}, coleccionId=${coleccionId}`);

  // 1. Extraer videos crudos de la playlist
  const videosCrudos = await fetchYoutubePlaylistVideos(playlistId);
  console.log(`📊 Videos encontrados en playlist: ${videosCrudos.length}`);

  // 2. Obtener artistas de la BD
  const { data: artistasBD, error: artistasError } = await supabase
    .from('artistas')
    .select('id_artista, nombre_artista');
  if (artistasError) {
    console.error('❌ Error obteniendo artistas de la BD:', artistasError);
    return;
  }
  console.log(`👥 Artistas en BD: ${(artistasBD || []).length}`);

  // 3. Obtener videos ya existentes en la colección
  const { data: elementos } = await supabase
    .from('colecciones_elementos')
    .select('entidad_id')
    .eq('coleccion_id', coleccionId)
    .eq('entidad_tipo', 'video');
  const existentes = new Set((elementos || []).map(e => e.entidad_id));
  console.log(`🔍 Videos existentes en colección: ${existentes.size}`);

  const batchId = Date.now().toString();

  const checkpointKey = `youtube_playlist_${playlistId}_collection_${coleccionId}`;
  const checkpoint = await getCheckpoint(checkpointKey);
  let startIndex = 0;
  if (checkpoint && typeof checkpoint.index === 'number') {
    startIndex = checkpoint.index + 1;
    console.log(`🔄 Reanudando desde índice ${startIndex}`);
  }

  console.log(`\n🎬 Procesando videos (${startIndex} - ${videosCrudos.length})...`);

  for (let i = startIndex; i < videosCrudos.length; i++) {
    const v = videosCrudos[i];
    console.log(`\n[${i + 1}/${videosCrudos.length}] Procesando video: ${v.title || 'sin título'}`);

    const videoTemp = await procesarVideoCrudo(v, null, null, null, artistasBD);
    if (!videoTemp || !videoTemp.video_id) {
      console.log(`  ⚠️ Video descartado (no se pudo procesar)`);
      continue;
    }

    videoTemp.extraccion_batch_id = batchId;
    videoTemp.playlist_id = playlistId;
    videoTemp.is_musical = null;
    videoTemp.popularidad = calcularPopularidadAbsoluta(videoTemp.view_count, videoTemp.published_at);

    // Verificar si el video ya está en la colección
    let id_video;
    const { data: existente } = await supabase
      .from('videos_musicales')
      .select('id_video')
      .eq('youtube_id', videoTemp.video_id)
      .maybeSingle();

    if (existente && existente.id_video) {
      id_video = existente.id_video;
      console.log(`  🔁 Video existente (ID interno: ${id_video})`);
    } else {
      id_video = await insertVideoMusical(videoTemp);
      console.log(`  ✓ Video insertado (ID interno: ${id_video})`);
    }

    // Actualizar popularidad SIEMPRE
    await supabase
      .from('videos_musicales')
      .update({ popularidad: videoTemp.popularidad })
      .eq('id_video', id_video);
    console.log(`  ✓ Popularidad actualizada`);

    // Si ya existe en la colección, marcar como no nueva extracción
    if (existentes.has(id_video)) {
      videoTemp.es_nueva_extraccion = false;
      console.log(`  ⏭️ Ya estaba en colección (sin duplicar)`);
    } else {
      videoTemp.es_nueva_extraccion = true;
      // Insertar en colecciones_elementos
      await supabase.from('colecciones_elementos').upsert({
        coleccion_id: coleccionId,
        entidad_tipo: 'video',
        entidad_id: id_video
      }, { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] });
      console.log(`  ✓ Añadido a colección`);

      // Relacionar artistas
      if (videoTemp.artista_id) {
        await relateVideoArtists(id_video, [videoTemp.artista_id]);
        console.log(`    ✓ Artista principal relacionado`);
      }
      for (let i = 1; i <= 5; i++) {
        const colabId = videoTemp[`artista_colaborador${i}_id`];
        if (colabId) {
          await relateVideoArtists(id_video, [colabId]);
        }
      }
      // Relacionar géneros solo si es nuevo
      await relateVideoGenres(id_video, videoTemp.titulo_limpio, [videoTemp.artista_id]);
      console.log(`    ✓ Géneros relacionados`);
    }

    // Actualizar en staging
    await supabase
      .from('staging_videos_youtube')
      .upsert(videoTemp, { onConflict: ['video_id', 'extraccion_batch_id', 'playlist_id'] });

    // checkpoint
    try {
      await setCheckpoint(checkpointKey, { index: i, videoId: videoTemp.video_id, updated_at: Date.now() });
      console.log(`  💾 Checkpoint guardado`);
    } catch (e) {
      console.warn('⚠️ Error escribiendo checkpoint youtube playlist', playlistId, e.message || e);
    }
  }

  console.log(`\n✅ Procesamiento completado. Limpiando checkpoint...`);
  // clear checkpoint when done
  try { await clearCheckpoint(checkpointKey); } catch (e) {}
  console.log(`✅ Checkpoint limpiado.`);
},

  // 5. Finalizar importación de videos desde YouTube (nuevo)
  finalizarImportacionYoutube: async (batchId) => {
    // 1. Obtener videos musicales del batch, ordenados por view_count DESC
    const { data: musicales } = await supabase
      .from('staging_videos_youtube')
      .select('*')
      .eq('extraccion_batch_id', batchId)
      .eq('is_musical', true)
      .order('view_count', { ascending: false });

    if (!musicales || musicales.length === 0) return;

    // 2. Obtener artistas de la BD para detección de géneros
    const { data: artistasBD } = await supabase
      .from('artistas')
      .select('id_artista, nombre_artista');

    // 3. Si playlist_id existe, crear colección y colecciones_elementos
    const playlistId = musicales[0]?.playlist_id || null;
    let coleccionId = null;
    if (playlistId) {
      const nombreColeccion = `Colección de playlist YouTube ${playlistId}`;
      let { data: coleccion } = await supabase
        .from('colecciones')
        .select('id_coleccion')
        .eq('nombre', nombreColeccion)
        .maybeSingle();

      if (!coleccion) {
        const { data: nuevaColeccion } = await supabase
          .from('colecciones')
          .insert({
            nombre: nombreColeccion,
            descripcion: `Colección creada desde la playlist YouTube ${playlistId}`,
            tipo_coleccion: 'videos',
            playlist_id: playlistId,
            criterios: JSON.stringify({ batchId, playlistId }),
            icono: null,
          })
          .select('id_coleccion')
          .single();
        coleccionId = nuevaColeccion.id_coleccion;
      } else {
        coleccionId = coleccion.id_coleccion;
      }
    }

    // 4. Procesar cada video musical
  for (const video of musicales) {
    if (!video.titulo_limpio || !video.video_id) continue;

    // --- NUEVO: Verificar existencia en videos_musicales ---
    const { data: existente } = await supabase
      .from('videos_musicales')
      .select('id_video')
      .eq('youtube_id', video.video_id)
      .maybeSingle();

    if (existente && existente.id_video) {
      // Ya existe, no lo insertes de nuevo y marca como no nueva extracción
      await supabase
        .from('staging_videos_youtube')
        .update({ es_nueva_extraccion: false })
        .eq('video_id', video.video_id)
        .eq('extraccion_batch_id', batchId);
      continue;
    } else {
      // Es nuevo, marca como nueva extracción
      await supabase
        .from('staging_videos_youtube')
        .update({ es_nueva_extraccion: true })
        .eq('video_id', video.video_id)
        .eq('extraccion_batch_id', batchId);
    }
    // --- FIN DE LA VERIFICACIÓN ---

    // Insertar en videos_musicales
    const id_video = await insertVideoMusical(video);
    video.id_video = id_video; // Para usar en géneros

    // Relacionar artista principal
    if (video.artista_id) {
      await relateVideoArtists(id_video, [video.artista_id]);
    }

    // Relacionar colaboradores
    for (let i = 1; i <= 5; i++) {
      const colabId = video[`artista_colaborador${i}_id`];
      if (colabId) {
        await relateVideoArtists(id_video, [colabId]);
      }
    }

    // Relacionar géneros
    await obtenerGenerosParaVideo(video, artistasBD);

    // Solo si es playlist, insertar en colecciones_elementos
    if (coleccionId) {
      await supabase.from('colecciones_elementos').upsert(
        {
          coleccion_id: coleccionId,
          entidad_tipo: 'video',
          entidad_id: id_video,
        },
        { onConflict: ['coleccion_id', 'entidad_tipo', 'entidad_id'] }
      );
    }
  }

    // 5. Mapear canales únicos y asignar a artistas
    const canalesPorArtista = {};
    for (const video of musicales) {
      if (video.canal_verificado && video.artista_id && video.youtube_channel_id) {
        if (!canalesPorArtista[video.artista_id]) canalesPorArtista[video.artista_id] = new Set();
        canalesPorArtista[video.artista_id].add(video.youtube_channel_id);
      }
    }

    // Solo asigna el canal si el artista tiene un solo canal verificado en el batch
    for (const [artista_id, canalesSet] of Object.entries(canalesPorArtista)) {
      if (canalesSet.size === 1) {
        const canalId = Array.from(canalesSet)[0];
        await supabase
          .from('artistas')
          .update({ channel_id_youtube: canalId })
          .eq('id_artista', artista_id);
        // Opcional: puedes guardar canal_verificado = true en artista si tienes ese campo
      }
      // Si hay más de uno, no asignar (requiere revisión manual)
    }
  },
};