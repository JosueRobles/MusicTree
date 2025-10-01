import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';
import ValoracionComentario from '../components/ValoracionComentario';

const API_URL = import.meta.env.VITE_API_URL;

const PieChart = ({ porcentaje }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(porcentaje, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle
        cx="20" cy="20" r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="4"
      />
      <circle
        cx="20" cy="20" r={radius}
        fill="none"
        stroke="#22c55e"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s' }}
      />
      <text x="20" y="24" textAnchor="middle" fontSize="10" fill="#333">
        {progress.toFixed(0)}%
      </text>
    </svg>
  );
};

const ArtistPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [genres, setGenres] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [comentario, setComentario] = useState('');
  const [emocion, setEmocion] = useState('');
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [valoracionesUsuarios, setValoracionesUsuarios] = useState([]);
  const [catalogo, setCatalogo] = useState(null);
  const [siguiendo, setSiguiendo] = useState(false);
  const [valorados, setValorados] = useState([]);
  const [posicionRanking, setPosicionRanking] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [listasDestacadas, setListasDestacadas] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [albumClusters, setAlbumClusters] = useState({});
  const [votoEnviado, setVotoEnviado] = useState(false);
  const [valoradosClusters, setValoradosClusters] = useState({ album: new Set() });
  const [progresoCanciones, setProgresoCanciones] = useState(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const artistResponse = await axios.get(`${API_URL}/artistas/${id}`);
        setArtist(artistResponse.data.artista);

        const albumsResponse = await axios.get(`${API_URL}/relaciones/artistas/${id}/albumes`);
        setAlbums(Array.isArray(albumsResponse.data) ? albumsResponse.data : []);

        const songsResponse = await axios.get(`${API_URL}/relaciones/artistas/${id}/canciones`);
        setSongs(Array.isArray(songsResponse.data.canciones) ? songsResponse.data.canciones : []);

        const videosResponse = await axios.get(`${API_URL}/relaciones/artistas/${id}/videos`);
        setVideos(Array.isArray(videosResponse.data) ? videosResponse.data : []);

        const genresResponse = await axios.get(`${API_URL}/relaciones/artistas/${id}/generos`);
        setGenres(Array.isArray(genresResponse.data) ? genresResponse.data : []);

        const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'artista',
              entidad_id: parseInt(id, 10),
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);
          
        if (usuario) {
          const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
            params: {
              usuario: usuario.id_usuario,
              entidad_tipo: 'artista',
              entidad_id: parseInt(id, 10),
            },
          });
          setRating(valoracionResponse.data.calificacion || 0);
          setComentario(valoracionResponse.data.comentario || '');
          setEmocion(valoracionResponse.data.emocion || '');

          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/colaborativas-o-propias/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(
            lista =>
              lista.tipo_lista === 'artista' &&
              (
                lista.usuario_id === usuario.id_usuario ||
                (lista.privacidad === 'colaborativa' && ['agregar', 'admin', 'eliminar'].includes(lista.rol_colaborador))
              )
          );
          setListas(listasFiltradas);

          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10),
            entidad_tipo: 'artista',
          });
          setAlreadyInList(existsResponse.data.exists);
        }

        // Fetch valoraciones de todos los usuarios
        const valoracionesResponse = await axios.get(`${API_URL}/valoraciones/globales`, {
          params: {
            entidad_tipo: 'artista',
            entidad_id: parseInt(id, 10),
          },
        });
        setValoracionesUsuarios(Array.isArray(valoracionesResponse.data) ? valoracionesResponse.data : []);
      } catch (error) {
        console.error('Error fetching artist data:', error);
      } finally {
        setLoading(false);
      }
    };
      const fetchCatalogo = async () => {
      if (!usuario) return;
      try {
        const response = await axios.get(`${API_URL}/catalogos/usuario/${usuario.id_usuario}`);
        const found = response.data.find(c => c.id_artista === parseInt(id, 10));
        setCatalogo(found || null);
      } catch (e) {}
    };
    fetchCatalogo();
    fetchArtistData();
    if (usuario) {
    axios.get(`${API_URL}/catalogos/artistas-seguidos/${usuario.id_usuario}`)
      .then(res => setSiguiendo(res.data.some(a => a.id_artista === parseInt(id, 10))));
  }
  }, [catalogo, id, usuario]);

  useEffect(() => {
  axios.get(`${API_URL}/listas-personalizadas/destacadas-por-entidad`, {
    params: { entidad_id: id, entidad_tipo: 'artista' }
  }).then(res => setListasDestacadas(res.data));
}, [id]);

  useEffect(() => {
  if (usuario) {
    axios.get(`${API_URL}/valoraciones/historial`, {
      params: { usuario: usuario.id_usuario, entidad_tipo: 'artista', entidad_id: id }
    }).then(res => setHistorial(res.data));
  }
}, [usuario, id]);

  useEffect(() => {
  const fetchValorados = async () => {
    if (!usuario) {
      setValorados([]);
      return;
    }
    try {
      // Trae valoraciones de álbumes
      const alb = await axios.get(`${API_URL}/valoraciones`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: 'album' }
      });
      // Trae valoraciones de canciones
      const can = await axios.get(`${API_URL}/valoraciones`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: 'cancion' }
      });
      // Trae valoraciones de videos
      const vid = await axios.get(`${API_URL}/valoraciones`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: 'video' }
      });

      // Mapea a formato 'tipo-id'
      const valoradosArr = [];
      if (Array.isArray(alb.data)) valoradosArr.push(...alb.data.map(a => `album-${a.album}`));
      if (Array.isArray(can.data)) valoradosArr.push(...can.data.map(c => `cancion-${c.cancion}`));
      if (Array.isArray(vid.data)) valoradosArr.push(...vid.data.map(v => `video-${v.video}`));
      setValorados(valoradosArr);
    } catch (err) {
      setValorados([]);
    }
  };

  fetchValorados();
}, [usuario, id]);

  useEffect(() => {
  // Trae clusters de todas las entidades
  const fetchClusters = async () => {
    const [alb] = await Promise.all([
      axios.get(`${API_URL}/albumes/album_clusters`),
    ]);
    setAlbumClusters(Object.fromEntries(alb.data.map(a => [a.id_album, a.grupo])));
  };
  fetchClusters();
}, []);

  useEffect(() => {
  // Calcula los grupos valorados por el usuario
  const albGrupos = valorados
    .filter(v => v.startsWith('album-'))
    .map(v => albumClusters[parseInt(v.split('-')[1])])
    .filter(Boolean);
  setValoradosClusters({
    album: new Set(albGrupos),
  });
}, [valorados, albumClusters]);

useEffect(() => {
  if (usuario && id) {
    axios.get(`${API_URL}/catalogos/progreso-canciones`, {
      params: { usuario_id: usuario.id_usuario, artista_id: id }
    }).then(res => setProgresoCanciones(res.data));
  }
}, [usuario, id]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'artista',
          entidad_id: parseInt(id, 10),
          calificacion: newRating,
          comentario,
          emocion,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

  const handleSeguir = async () => {
  if (!usuario) return;
  await axios.post(`${API_URL}/catalogos/seguir`, {
    usuario_id: usuario.id_usuario,
    artista_id: parseInt(id, 10)
  });
  setSiguiendo(true);
  await axios.post(`${API_URL}/notificaciones`, {
    usuario_id: usuario.id_usuario,
    tipo_notificacion: 'seguimiento',
    entidad_tipo: 'artista',
    entidad_id: parseInt(id, 10),
    mensaje: `Ahora sigues a ${artist?.nombre_artista || 'este artista'}`
  });
};

const handleUnfollow = async () => {
  if (!usuario) return;
  await axios.post(`${API_URL}/catalogos/unfollow`, {
    usuario_id: usuario.id_usuario,
    artista_id: parseInt(id, 10)
  });
  setSiguiendo(false);
};

const handleAddToList = async () => {
  if (selectedLista) {
    try {
      await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
        userId: usuario.id_usuario,
        listaId: selectedLista,
        entidad_id: parseInt(id, 10),
        entidad_tipo: 'artista',
      });
      alert('Artista añadido a la lista');
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data &&
        error.response.data.error &&
        error.response.data.error.includes('ya existe')
      ) {
        alert('Este artista ya está en la lista seleccionada.');
      } else {
        alert('Error al añadir el artista a la lista.');
      }
      console.error('Error adding artist to list:', error);
    }
  } else {
    alert('Seleccione una lista o cree una nueva');
  }
};

  // Ordena canciones por popularidad
  const cancionesOrdenadas = [...songs].sort((a, b) => (b.popularidad || 0) - (a.popularidad || 0));

  useEffect(() => {
  axios.get(`${API_URL}/rankings/posicion-global`, {
    params: { tipo_entidad: 'artista', entidad_id: id }
  }).then(res => setPosicionRanking(res.data.posicion));
}, [id, usuario]);

  const albumesPorTipo = albums.reduce((acc, album) => {
    const tipo = (album.tipo_album || 'Otro').toLowerCase();
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(album);
    return acc;
  }, {});

  const handleVotarCatalogo = async () => {
    if (!usuario) return;
    try {
      await axios.post(`${API_URL}/catalogos/votar-pedido`, {
        usuario_id: usuario.id_usuario,
        artista_id: parseInt(id, 10)
      });
      setVotoEnviado(true);
      // Notificación y actividad
      await axios.post(`${API_URL}/notificaciones`, {
        usuario_id: usuario.id_usuario,
        tipo_notificacion: 'pedido_catalogo',
        entidad_tipo: 'artista',
        entidad_id: parseInt(id, 10),
        mensaje: `Solicitaste el catálogo completo de ${artist?.nombre_artista || 'este artista'}`
      });
      await axios.post(`${API_URL}/actividad`, {
        usuario: usuario.id_usuario,
        tipo_actividad: 'pedido_catalogo',
        referencia_id: parseInt(id, 10),
        referencia_entidad: 'artista'
      });
    } catch (e) {
      setVotoEnviado(false);
    }
  };

    function normalizarTituloCancion(titulo) {
  return (titulo || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|anniversary|expanded|complete|version|mix|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|karaoke|single|ep|lp|box set|disc \d+|cd\d+|vinyl|digital|special|reissue|commentary)\b/gi, "")
    .replace(/(\bfeat\.?.*|\bft\.?.*|\bwith .*)/gi, "")
    .replace(/\b\d{2,4}\b/g, "")
    .replace(/[^\w\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function esCancionSimilar(c1, c2) {
  const t1 = normalizarTituloCancion(c1.titulo);
  const t2 = normalizarTituloCancion(c2.titulo);
  const dur1 = c1.duracion_ms || 0;
  const dur2 = c2.duracion_ms || 0;
  const tokens1 = new Set(t1.split(" "));
  const tokens2 = new Set(t2.split(" "));
  const inter = [...tokens1].filter(x => tokens2.has(x)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  const jaccard = union ? inter / union : 0;
  const substring = t1 && t2 && (t1.includes(t2) || t2.includes(t1));
  const durOk = Math.abs(dur1 - dur2) < 7000;
  return (jaccard > 0.7 || substring) && durOk;
}

  // Modifica getEstadoEntidad para canciones:
  function getEstadoEntidad(tipo, id) {
    if (tipo === 'album') {
      if (valorados.includes(`album-${id}`)) return 'valorada';
      const grupo = albumClusters[id];
      if (grupo && Array.from(valoradosClusters.album).includes(grupo)) return 'similar';
      return '';
    }
    if (tipo === 'cancion') {
      if (valorados.includes(`cancion-${id}`)) return 'valorada';
      // Busca si hay una canción valorada similar
      const song = songs.find(s => s.id_cancion === id);
      if (!song) return '';
      for (const v of valorados) {
        if (!v.startsWith('cancion-')) continue;
        const vId = parseInt(v.split('-')[1]);
        const vSong = songs.find(s => s.id_cancion === vId);
        if (vSong && esCancionSimilar(song, vSong)) return 'similar';
      }
      return '';
    }
    if (tipo === 'video') {
      if (valorados.includes(`video-${id}`)) return 'valorada';
      return '';
    }
    return '';
  }

  return (
    <div className="pt-20 px-4">
      {loading ? (
        <p>Cargando...</p>
      ) : artist ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">
            {artist.nombre_artista}
          </h2>
          {artist.es_principal ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-3 my-4 rounded text-center font-semibold">
              Artista Principal: Puedes valorar la totalidad de su{' '}
              <Link to="/catalogs" style={{ color: '#2563eb', textDecoration: 'underline' }}>catálogo</Link>
              {' '}para ganarte una medalla especial.
            </div>
          ) : (
            <div className="bg-blue-100 border-l-4 border-blue-400 text-blue-800 p-3 my-4 rounded text-center font-semibold">
              Artista de <Link to="/collections" style={{ color: '#2563eb', textDecoration: 'underline' }}>colección</Link> o colaborador.
              Puedes solicitar la extracción de su catálogo completo haciendo{' '}
              <button
                style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={handleVotarCatalogo}
              >clic aquí</button>.
              {votoEnviado && <span className="ml-2 text-green-600">¡Voto registrado!</span>}
            </div>
          )}
          {posicionRanking && (
            <div className="text-center mt-2">
              <span className="ranking-global">
                #{posicionRanking} en Ranking Global de Artistas
              </span>
            </div>
          )}
          <img
            src={artist.foto_artista}
            alt={artist.nombre_artista}
            className="w-64 h-64 object-cover rounded-full mx-auto"
          />
          <p className="mt-4">{artist.biografia}</p>
          <p className="mt-2"><strong>Popularidad:</strong> {artist.popularidad_artista}</p>
          <h3 className="text-2xl font-bold mt-8">Géneros</h3>
          <ul>
            {genres.map((genre) => (
            <li key={genre.id_genero}>
              <Link to={`/genre/${genre.id_genero}`}>{genre.nombre}</Link>
                              {genre.subgeneros && (
                  <span className="block text-xs text-gray-600 mt-1">
                    {Array.isArray(genre.subgeneros)
                      ? genre.subgeneros.join(', ')
                      : (typeof genre.subgeneros === 'string' && genre.subgeneros.startsWith('[')
                          ? JSON.parse(genre.subgeneros).join(', ')
                          : genre.subgeneros)}
                  </span>
                )}
            </li>
          ))}
          </ul>
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
          </div>
          {catalogo && (
            <div className="my-4 flex items-center gap-4">
              <PieChart porcentaje={catalogo.progreso} />
              <span className="font-bold text-lg">
                Progreso del catálogo: {catalogo.progreso.toFixed(1)}%
                {catalogo.progreso >= 100 && <span title="Catálogo completado" style={{ marginLeft: 8 }}>🏅</span>}
              </span>
            </div>
          )}
          {usuario && (
            <>
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="artista"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
            {historial.length > 0 && (
          <div className="my-2">
            <button
              className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm"
              onClick={() => setShowHistorial(v => !v)}
            >
              {showHistorial ? 'Ocultar historial de valoraciones' : 'Ver historial de valoraciones'}
            </button>
            {showHistorial && (
            <div className="mt-2 historial-valoraciones-box">
              <h4 className="font-bold mb-2">Historial de valoraciones previas</h4>
              <ul className="space-y-2">
                {historial.map(h => (
                  <li key={h.id_historial} className="flex flex-col md:flex-row md:items-center gap-2">
                    <span className="text-xs text-gray-700">{new Date(h.fecha).toLocaleString()}</span>
                    <span className="font-semibold">{h.calificacion} ⭐</span>
                    {h.comentario && (
                      <span className="italic text-gray-800">“{h.comentario}”</span>
                    )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          )}
        </>
          )}
          {usuario && !siguiendo && (
            <button onClick={handleSeguir} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
              Seguir artista
            </button>
          )}
          {usuario && siguiendo && (
            <button onClick={handleUnfollow} className="bg-green-600 text-white px-4 py-2 rounded mt-2">
              Seguido (Dejar de seguir)
            </button>
          )}
          {usuario && (
            <div className="mt-4">
              {listas.filter(lista => Array.isArray(lista.entidades) && lista.entidades.some(entidad => entidad.id === id)).length > 0 ? (
                <p>Esta entidad ya está en una de tus listas.</p>
              ) : listas.length > 0 ? (
                <>
                  <select value={selectedLista} onChange={(e) => setSelectedLista(e.target.value)}>
                    <option value="">Selecciona una lista</option>
                    {listas.map(lista => (
                      <option key={lista.id_lista} value={lista.id_lista}>{lista.nombre_lista}</option>
                    ))}
                  </select>
                  <button onClick={handleAddToList}>Añadir a Lista</button>
                </>
              ) : (
                <button onClick={() => navigate('/lists')}>Crear una nueva lista</button>
              )}
            </div>
          )}
          {/* Álbumes */}
<h3 className="text-2xl font-bold mt-8">Álbumes</h3>
{Object.entries(albumesPorTipo).map(([tipo, lista]) => (
  <div key={tipo} className="mb-6">
    <h4 className="text-xl font-semibold mb-2 capitalize">
      {tipo === 'album' ? 'Álbumes' : tipo === 'compilation' ? 'Compilaciones' : tipo === 'single' ? 'Singles' : tipo}
    </h4>
    <ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
      {lista.map((album) => {
        const estado = getEstadoEntidad('album', album.id_album);
        return (
          <li key={album.id_album}>
            <Link to={`/album/${album.id_album}`}>
              <img
                src={album.foto_album}
                alt={album.titulo}
                style={{ width: '255px', height: '255px', objectFit: 'cover' }}
                className={`rounded-md ${estado === 'valorada' ? 'valorada-img' : estado === 'similar' ? 'similar-img' : ''}`}
              />
              <p className={`text-center mt-2 text-xs font-semibold ${estado === 'valorada' ? 'valorada' : estado === 'similar' ? 'similar' : ''}`}>
                {album.titulo}
                {estado === 'valorada' && <span style={{ marginLeft: 6 }}>⭐</span>}
                {estado === 'similar' && <span style={{ marginLeft: 6, color: '#f59e42' }}>🟧</span>}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  </div>
))}

<h3 className="text-2xl font-bold mt-8">Videos Musicales</h3>
<ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
  {videos.map((video) => {
    const estado = getEstadoEntidad('video', video.id_video);
    return (
      <li key={video.id_video}>
        <Link to={`/video/${video.id_video}`}>
          <img
            src={video.miniatura}
            alt={video.titulo}
            style={{ width: '256px', height: '144px', objectFit: 'cover' }}
            className={`rounded-md ${estado === 'valorada' ? 'valorada-img' : estado === 'similar' ? 'similar-img' : ''}`}
          />
          <p className={`text-center mt-2 text-xs font-semibold ${estado === 'valorada' ? 'valorada' : estado === 'similar' ? 'similar' : ''}`}>
            {video.titulo}
            {estado === 'valorada' && <span style={{ marginLeft: 6 }}>⭐</span>}
            {estado === 'similar' && <span style={{ marginLeft: 6, color: '#f59e42' }}>🟧</span>}
          </p>
        </Link>
      </li>
    );
  })}
</ul>

{/* Canciones */}
<h3 className="text-2xl font-bold mt-8">Canciones</h3>
<ul>
  {cancionesOrdenadas.map((song) => {
    const estado = getEstadoEntidad('cancion', song.id_cancion);
    return (
      <li key={song.id_cancion}>
        <Link
          to={`/song/${song.id_cancion}`}
          className={estado === 'valorada' ? 'valorada' : estado === 'similar' ? 'similar' : ''}
        >
          {song.titulo}
          {estado === 'valorada' && <span style={{ marginLeft: 6 }}>⭐</span>}
          {estado === 'similar' && <span style={{ marginLeft: 6, color: '#f59e42' }}>🟧</span>}
        </Link>
      </li>
    );
  })}
</ul>
{valoracionesUsuarios.length > 0 && (
  <div className="mt-6">
    <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
    {valoracionesUsuarios.map((valoracion, idx) => (
      <ValoracionComentario key={idx} valoracion={valoracion} />
    ))}
  </div>
)}

{listasDestacadas.length > 0 && (
  <div className="mt-6">
    <h4 className="font-bold">Listas destacadas con este artista</h4>
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
  {listasDestacadas.map(lista => (
    <div key={lista.id_lista} className="tendencia-card">
      <img src={lista.imagen || '/default_playlist.png'} alt={lista.nombre_lista} className="tendencia-imagen" />
      <Link to={`/list/${lista.id_lista}`} className="font-bold">{lista.nombre_lista}</Link>
    </div>
  ))}
</div>
  </div>
)}
        </>
      ) : (
        <p>Artista no encontrado.</p>
      )}
    </div>
  );
};

ArtistPage.propTypes = {
  usuario: PropTypes.object,
};

export default ArtistPage;