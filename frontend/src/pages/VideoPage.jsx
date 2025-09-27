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
  const [showHistorial, setShowHistorial] = useState(false);

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
        <>
        <StarRating
          valoracionInicial={rating}
          onRatingChange={handleRatingChange}
          entidadTipo="video"
          entidadId={parseInt(id, 10)} // Convertir id a número
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
    </div>
  );
};

VideoPage.propTypes = {
  usuario: PropTypes.object,
};

export default VideoPage;