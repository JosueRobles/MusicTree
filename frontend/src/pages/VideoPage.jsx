import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';
import ValoracionComentario from '../components/ValoracionComentario';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const VideoPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [artists, setArtists] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [valoracionesUsuarios, setValoracionesUsuarios] = useState([]); // Valoraciones globales
  const [emocion, setEmocion] = useState('');
  const [valoradas, setValoradas] = useState([]);
  const [posicionRanking, setPosicionRanking] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [genres, setGenres] = useState([]);
  const [listasDestacadas, setListasDestacadas] = useState([]);
  const [sugerencias, setSugerencias] = useState({ duplicados: [] });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCancionId, setFeedbackCancionId] = useState(null);
  const [feedbackComentario, setFeedbackComentario] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [grupoUniversal, setGrupoUniversal] = useState(null);
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const videoResponse = await axios.get(`${API_URL}/videos/${id}`);
        setVideo(videoResponse.data);

        const artistsResponse = await axios.get(`${API_URL}/relaciones/videos/${id}/artistas`);
        setArtists(artistsResponse.data || []);

        const genresResponse = await axios.get(`${API_URL}/relaciones/videos/${id}/generos`);
        setGenres(Array.isArray(genresResponse.data) ? genresResponse.data : []);
        
        // Obtener valoración promedio
          const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'video',
              entidad_id: parseInt(id, 10), // Convertir id a número
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);
          
        if (usuario) {
          // Obtener listas personalizadas de tipo "video"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/colaborativas-o-propias/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(
            lista =>
              lista.tipo_lista === 'video' &&
              (
                lista.usuario_id === usuario.id_usuario ||
                (lista.privacidad === 'colaborativa' && ['agregar', 'admin', 'eliminar'].includes(lista.rol_colaborador))
              )
          );
          setListas(listasFiltradas);

          // Verificar si el video ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10), // Convertir id a número
            entidad_tipo: 'video',
          });
          setAlreadyInList(existsResponse.data.exists);

          // Obtener valoraciones globales
          const valoracionesResponse = await axios.get(`${API_URL}/valoraciones/globales`, {
            params: {
              entidad_tipo: 'video',
              entidad_id: parseInt(id, 10),
            },
          });
          setValoracionesUsuarios(Array.isArray(valoracionesResponse.data) ? valoracionesResponse.data : []);
        }
      } catch (error) {
        console.error('Error al cargar los datos del video:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id, usuario]);

  useEffect(() => {
  axios.get(`${API_URL}/listas-personalizadas/destacadas-por-entidad`, {
    params: { entidad_id: id, entidad_tipo: 'video' }
  }).then(res => setListasDestacadas(res.data));
}, [id]);

  useEffect(() => {
  if (usuario) {
    axios.get(`${API_URL}/valoraciones/historial`, {
      params: { usuario: usuario.id_usuario, entidad_tipo: 'video', entidad_id: id }
    }).then(res => setHistorial(res.data));
  }
}, [usuario, id]);

  useEffect(() => {
  axios.get(`${API_URL}/rankings/posicion-global`, {
    params: { tipo_entidad: 'video', entidad_id: id }
  }).then(res => setPosicionRanking(res.data.posicion));
}, [id, usuario]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'video',
          entidad_id: parseInt(id, 10), // Convertir id a número
          calificacion: newRating,
          emocion,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error al guardar la valoración:', error);
      }
    }
  };

const handleAddToList = async () => {
  if (selectedLista) {
    try {
      await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
        userId: usuario.id_usuario,
        listaId: selectedLista,
        entidad_id: parseInt(id, 10),
        entidad_tipo: 'video',
      });
      alert('Video añadido a la lista');
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data &&
        error.response.data.error &&
        error.response.data.error.includes('ya existe')
      ) {
        alert('Este video ya está en la lista seleccionada.');
      } else {
        alert('Error al añadir el video a la lista.');
      }
      console.error('Error adding video to list:', error);
    }
  } else {
    alert('Seleccione una lista o cree una nueva');
  }
};

const fetchSugerencias = async () => {
  try {
    const res = await axios.get(`${API_URL}/ml/sugerencias/video/${id}`);
    setSugerencias(res.data);
  } catch (err) {
    setSugerencias({ duplicados: [] });
  }
};

useEffect(() => {
  fetchSugerencias();
}, [id]);

const openFeedbackModal = (cancionId) => {
  setFeedbackCancionId(cancionId);
  setShowFeedbackModal(true);
  setFeedbackComentario('');
  setFeedbackSuccess(false);
};

const closeFeedbackModal = () => {
  setShowFeedbackModal(false);
  setFeedbackCancionId(null);
  setFeedbackComentario('');
  setFeedbackSuccess(false);
};

const sendFeedback = async () => {
  setFeedbackLoading(true);
  try {
    await axios.post(`${API_URL}/ml/feedback`, {
      usuario_id: usuario.id_usuario,
      entidad_tipo: 'video',
      entidad_id_1: id, // id_video
      entidad_id_2: feedbackCancionId,
      es_duplicado: false,
      confianza_modelo: 0,
      comentario: feedbackComentario
    });
    setFeedbackSuccess(true);
  } catch (err) {
    alert('Error al enviar feedback');
  } finally {
    setFeedbackLoading(false);
  }
};

useEffect(() => {
  // Consulta el grupo universal y sus miembros
  axios.get(`${API_URL}/ml/cluster/video/${id}`).then(res => {
    if (res.data && res.data.grupo) {
      setGrupoUniversal(res.data.grupo);
      axios.get(`${API_URL}/ml/cluster/video/grupo/${res.data.grupo}`).then(res2 => {
        setMiembrosGrupo(res2.data.filter(mid => mid !== parseInt(id)));
      });
    }
  });
}, [id, 'video']);

  if (loading) return <p>Cargando...</p>;
  if (!video) return <p>Error: Video no encontrado.</p>;

  return (
    <div className="pt-16 p-4">
      <h2 className="text-4xl font-bold my-4 text-center">
            {video.titulo}
          </h2>
          {posicionRanking && (
            <div className="text-center mt-2">
              <span className="ranking-global">
                #{posicionRanking} en Ranking Global de Videos Musicales
              </span>
            </div>
          )}
      <div className="flex justify-center">
        <a href={video.url_video} target="_blank" rel="noopener noreferrer">
          <img
            src={video.miniatura}
            alt={video.titulo}
            className="w-full max-w-md object-cover rounded-lg"
          />
        </a>
      </div>
      <p className="text-center mt-4">Duración: {Math.floor(video.duracion / 60)}:{(video.duracion % 60).toString().padStart(2, '0')} minutos</p>
      <p className="text-center">Popularidad: {video.popularidad}</p>

      <div className="flex items-center">
        <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
        <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
      </div>

      {usuario ? (
        <StarRating
          valoracionInicial={rating}
          onRatingChange={handleRatingChange}
          entidadTipo="video"
          entidadId={parseInt(id, 10)} // Convertir id a número
          usuario={usuario}
        />
      ) : (
        <p>Inicia sesión para valorar este video.</p>
      )}

      <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
      {valoracionesUsuarios.length === 0 ? (
        <div>No hay valoraciones aún.</div>
      ) : (
        valoracionesUsuarios.map((valoracion, idx) => (
          <ValoracionComentario key={idx} valoracion={valoracion} />
        ))
      )}
      {usuario && (
        <div className="mt-4">
          {listas.filter(
            lista => Array.isArray(lista.entidades) && lista.entidades.some(entidad => String(entidad.id) === String(id))
          ).length > 0 ? (
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
      <h3 className="text-2xl font-bold mt-8">Géneros</h3>
                <ul className="text-center">
                  {genres.map((genre) => (
                  <li key={genre.id_genero}>
                    <Link to={`/genre/${genre.id_genero}`}>{genre.nombre}</Link>
                  </li>
                ))}
                </ul>
      <h3 className="text-2xl font-bold mt-8">Artistas</h3>
      <ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
        {artists.map((artist) => (
          <li key={artist.id_artista}>
            <Link to={`/artist/${artist.id_artista}`}>
              <img
                src={artist.foto_artista}
                alt={artist.nombre_artista}
                style={{ width: '255px', height: '255px', objectFit: 'cover' }}
                className={`rounded-md ${valoradas.includes(`artista-${artist.id_artista}`) ? 'valorada-img' : ''}`}
              />
              <p className={`text-center mt-2 text-xs font-semibold ${valoradas.includes(`artista-${artist.id_artista}`) ? 'valorada' : ''}`}>
                {artist.nombre_artista}
                {valoradas.includes(`artista-${artist.id_artista}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
              </p>
            </Link>
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
    <h4 className="font-bold">Listas destacadas con este video musical</h4>
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
          </li>
        ))}
      </ul>
      {/* SUGERENCIAS DE VIDEOS SIMILARES */}
      {sugerencias.duplicados && sugerencias.duplicados.length > 0 && (
  <div className="mt-8">
    <h3 className="text-xl font-bold text-blue-600">Videos similares/alternativos</h3>
    <ul>
      {sugerencias.duplicados.map((dup) => (
        <li key={dup.id}>
          <Link to={`/video/${dup.id}`}>Video similar (similitud: {(dup.similaridad * 100).toFixed(1)}%)</Link>
        </li>
      ))}
    </ul>
  </div>
)}
{sugerencias.canciones && sugerencias.canciones.length > 0 && (
  <ul>
    {sugerencias.canciones.map(song => (
      <li key={song.id}>
        <Link to={`/song/${song.id}`}>Canción relacionada (similitud: {(song.similaridad * 100).toFixed(1)}%)</Link>
        <button
          className="ml-2 text-xs text-blue-700 underline"
          onClick={() => openFeedbackModal(song.id)}
        >Reportar diferencia</button>
      </li>
    ))}
  </ul>
)}
{showFeedbackModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
      <h3 className="text-lg font-bold mb-2">Reportar diferencia</h3>
      <p className="mb-2">¿Por qué consideras que <strong>no</strong> son versiones similares?</p>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={3}
        value={feedbackComentario}
        onChange={e => setFeedbackComentario(e.target.value)}
        placeholder="Explica la diferencia (ej: letra distinta, duración, demo, etc.)"
      />
      <div className="flex gap-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={sendFeedback}
          disabled={feedbackLoading || !feedbackComentario}
        >
          {feedbackLoading ? 'Enviando...' : 'Enviar'}
        </button>
        <button
          className="bg-gray-300 px-4 py-2 rounded"
          onClick={closeFeedbackModal}
        >Cancelar</button>
      </div>
      {feedbackSuccess && (
        <p className="mt-2 text-green-600 font-bold">¡Gracias por tu feedback!</p>
      )}
    </div>
  </div>
)}
{miembrosGrupo.length > 0 && (
  <div className="mt-8">
    <h3 className="text-xl font-bold text-purple-600">Otras versiones (agrupadas por similitud)</h3>
    <ul>
      {miembrosGrupo.map(mid => (
        <li key={mid}>
          <Link to={`/video/${mid}`}>
            Video #{mid}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)}
    </div>
  );
};

VideoPage.propTypes = {
  usuario: PropTypes.object,
};

export default VideoPage;