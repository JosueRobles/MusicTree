import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';
import ValoracionComentario from '../components/ValoracionComentario';

const API_URL = "http://localhost:5000";

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

  return (
    <div className="pt-20 px-4">
      {loading ? (
        <p>Cargando...</p>
      ) : artist ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">
            {artist.nombre_artista}
            {posicionRanking && (
              <span className="ml-2 text-yellow-500 text-lg font-semibold"> - #{posicionRanking} en Ranking Global de Artistas</span>
            )}
          </h2>
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
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="artista"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
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
<ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
  {albums.map((album) => (
    <li key={album.id_album}>
      <Link to={`/album/${album.id_album}`}>
        <img
          src={album.foto_album}
          alt={album.titulo}
          style={{ width: '255px', height: '255px', objectFit: 'cover' }}
          className={`rounded-md ${valorados.includes(`album-${album.id_album}`) ? 'valorada-img' : ''}`}
        />
        <p className={`text-center mt-2 text-xs font-semibold ${valorados.includes(`album-${album.id_album}`) ? 'valorada' : ''}`}>
          {album.titulo}
          {valorados.includes(`album-${album.id_album}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
        </p>
      </Link>
    </li>
  ))}
</ul>

<h3 className="text-2xl font-bold mt-8">Videos Musicales</h3>
<ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
  {videos.map((video) => (
    <li key={video.id_video}>
      <Link to={`/video/${video.id_video}`}>
        <img
          src={video.miniatura}
          alt={video.titulo}
          style={{ width: '256px', height: '144px', objectFit: 'cover' }}
          className={`rounded-md ${valorados.includes(`video-${video.id_video}`) ? 'valorada-img' : ''}`}
        />
        <p className={`text-center mt-2 text-xs font-semibold ${valorados.includes(`video-${video.id_video}`) ? 'valorada' : ''}`}>
          {video.titulo}
          {valorados.includes(`video-${video.id_video}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
        </p>
      </Link>
    </li>
  ))}
</ul>

{/* Canciones */}
<h3 className="text-2xl font-bold mt-8">Canciones</h3>
<ul>
  {cancionesOrdenadas.map((song) => (
    <li key={song.id_cancion}>
      <Link
        to={`/song/${song.id_cancion}`}
        className={valorados.includes(`cancion-${song.id_cancion}`) ? 'valorada' : ''}
      >
        {song.titulo}
        {valorados.includes(`cancion-${song.id_cancion}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
      </Link>
    </li>
  ))}
</ul>
{valoracionesUsuarios.length > 0 && (
  <div className="mt-6">
    <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
    {valoracionesUsuarios.map((valoracion, idx) => (
      <ValoracionComentario key={idx} valoracion={valoracion} />
    ))}
  </div>
)}
{historial.length > 0 && (
  <div className="mt-6">
    <h4 className="font-bold">Historial de valoraciones</h4>
    <ul>
      {historial.map(h => (
        <li key={h.id_historial}>
          <span className="font-semibold">{new Date(h.fecha).toLocaleString()}:</span>
          <span> {h.calificacion} ⭐ {h.comentario && `- "${h.comentario}"`}</span>
        </li>
      ))}
    </ul>
  </div>
)}
{listasDestacadas.length > 0 && (
  <div className="mt-6">
    <h4 className="font-bold">Listas destacadas con este artista</h4>
    <div className="flex gap-4">
      {listasDestacadas.map(lista => (
        <div key={lista.id_lista} className="tendencia-card">
          <img src={lista.imagen ? `${API_URL}/uploads/${lista.imagen}?t=${Date.now()}` : '/default_playlist.png'} alt={lista.nombre_lista} className="tendencia-imagen" />
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