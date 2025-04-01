import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const ArtistPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [emocion, setEmocion] = useState('');
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [emocionesCount, setEmocionesCount] = useState({});

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const artistResponse = await axios.get(`${API_URL}/artistas/${id}`);
        setArtist(artistResponse.data.artista);
        setAlbums(artistResponse.data.albumes || []);
        setSongs(artistResponse.data.canciones || []);

        const videosResponse = await axios.get(`${API_URL}/videos/artista/${id}`);
        setVideos(videosResponse.data.videos || []);

        if (usuario) {
          // Obtener valoración (opcional)
          try {
            const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
              params: {
                usuario: usuario.id_usuario,
                entidad_tipo: 'artista',
                entidad_id: parseInt(id, 10)  // Convertir `id` a número
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
            setComentario(valoracionResponse.data.comentario || '');
            setEmocion(valoracionResponse.data.emocion || '');
          } catch (error) {
            console.error('Error al obtener valoración:', error);
            setRating(0); // Inicializa con 0 si hay un error
          }

          // Obtener solo las listas de tipo "artista"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'artista');
          console.log("Listas del usuario (filtradas):", listasFiltradas);
          setListas(listasFiltradas);

          // Verificar si la entidad ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10),  // Convertir `id` a número
            entidad_tipo: 'artista'
          });
          setAlreadyInList(existsResponse.data.exists);

          // Obtener recomendación para el artista
          const recommendationResponse = await axios.get(`${API_URL}/recommend`, {
            params: {
              id_usuario: usuario.id_usuario
            }
          });
          const artistRecommendation = recommendationResponse.data.find(rec => rec.entidad_id === parseInt(id, 10) && rec.tipo === 'artista');
          setRecommendation(artistRecommendation ? Math.round(artistRecommendation.estimacion) : null);
        }

        // Obtener la valoración promedio
        const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
          params: {
            entidad_tipo: 'artista',
            entidad_id: parseInt(id, 10)  // Convertir `id` a número
          }
        });
        setAverageRating(avgRatingResponse.data.promedio || 0);

        // Obtener conteo de emociones
        const emocionesResponse = await axios.get(`${API_URL}/emociones`, {
          params: {
            entidad_tipo: 'artista',
            entidad_id: parseInt(id, 10)  // Convertir `id` a número
          }
        });
        const emocionesData = emocionesResponse.data.emociones.reduce((acc, item) => {
          acc[item.emocion] = item.count;
          return acc;
        }, {});
        setEmocionesCount(emocionesData);
      } catch (error) {
        console.error('Error fetching artist data:', error);
      }
    };

    fetchArtistData();
  }, [id, usuario]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'artista',
          entidad_id: parseInt(id, 10),  // Convertir `id` a número
          calificacion: newRating,
          comentario,
          emocion
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "application/json"
          }
        });
        console.log('Rating saved:', newRating);
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };

  const handleAddToList = async () => {
    if (selectedLista) {
      try {
        await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
          userId: usuario.id_usuario,
          listaId: selectedLista,
          entidad_id: parseInt(id, 10),  // Convertir `id` a número
          entidad_tipo: 'artista',
        });
        alert('Artista añadido a la lista');
      } catch (error) {
        console.error('Error adding artist to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  const handleEliminarValoracion = async () => {
    if (usuario) {
      try {
        await axios.delete(`${API_URL}/valoraciones`, {
          data: {
            usuario: usuario.id_usuario,
            entidad_tipo: 'artista',
            entidad_id: parseInt(id, 10)
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "application/json"
          }
        });
        setRating(0);
        setComentario('');
        setEmocion('');
        alert('Valoración eliminada correctamente');
      } catch (error) {
        console.error('Error al eliminar la valoración:', error);
      }
    }
  };

  const handleAgregarComentario = async () => {
    if (usuario && comentario) {
      try {
        await axios.post(`${API_URL}/valoraciones/comentario`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'artista',
          entidad_id: parseInt(id, 10),
          comentario
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "application/json"
          }
        });
        alert('Comentario agregado correctamente');
      } catch (error) {
        console.error('Error al agregar el comentario:', error);
      }
    }
  };

  const handleEliminarComentario = async () => {
    if (usuario && comentario) {
      try {
        await axios.post(`${API_URL}/valoraciones/comentario`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'artista',
          entidad_id: parseInt(id, 10),
          comentario: ''  // Eliminar comentario
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "application/json"
          }
        });
        setComentario('');
        alert('Comentario eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar el comentario:', error);
      }
    }
  };

  const handleAgregarEmocion = async (newEmocion) => {
    if (!usuario || !newEmocion) return;

    try {
      await axios.put(`${API_URL}/emociones`, { // Usamos PUT para modificar la emoción
        usuario: usuario.id_usuario,
        entidad_tipo: 'artista',
        entidad_id: parseInt(id, 10),
        emocion: newEmocion
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          "Content-Type": "application/json"
        }
      });
      setEmocion(newEmocion);
      setEmocionesCount(prev => ({ ...prev, [newEmocion]: (prev[newEmocion] || 0) + 1 }));
      alert('Emoción agregada/modificada correctamente');
    } catch (error) {
      console.error('Error al agregar la emoción:', error);
    }
  };

  const handleEliminarEmocion = async () => {
    if (usuario) {
      try {
        await axios.delete(`${API_URL}/emociones`, {
          data: {
            usuario: usuario.id_usuario,
            entidad_tipo: 'artista',
            entidad_id: parseInt(id, 10)
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "Content-Type": "application/json"
          }
        });
        setEmocionesCount(prev => ({ ...prev, [emocion]: (prev[emocion] || 1) - 1 }));
        setEmocion('');
        alert('Emoción eliminada correctamente');
      } catch (error) {
        console.error('Error al eliminar la emoción:', error);
      }
    }
  };

  return (
    <div className="pt-16 p-4">
      {artist && (
        <>
          <h2 className="text-4xl font-bold my-4">{artist.nombre_artista}</h2>
          <img src={artist.foto_artista} alt={artist.nombre_artista} className="w-64 h-64 object-cover rounded-full" />
          <p className="mt-4">{artist.biografia}</p>
          {recommendation !== null && <p>Recomendación: {recommendation}%</p>}
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating} ⭐</p>
          </div>
          {usuario ? (
            <>
              <StarRating 
                valoracionInicial={rating} 
                onRatingChange={handleRatingChange} 
                entidadTipo="artista" 
                entidadId={parseInt(id, 10)}  // Convertir `id` a número
                usuario={usuario} 
                handleEliminarValoracion={handleEliminarValoracion}
                handleAgregarComentario={handleAgregarComentario}
                handleEliminarComentario={handleEliminarComentario}
                handleAgregarEmocion={handleAgregarEmocion}
                handleEliminarEmocion={handleEliminarEmocion}
              />
            </>
          ) : (
            <p>Inicia sesión para valorar</p>
          )}

          {usuario && (
            <div>
              {alreadyInList ? (
                <p>Este artista ya está en una de tus listas.</p>
              ) : (
                listas.length > 0 ? (
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
                  <button onClick={() => navigate('/lists')}>Ir a crear una nueva lista...</button>
                )
              )}
            </div>
          )}

          <h3 className="text-2xl font-bold mt-8">Álbumes</h3>
          <ul className="flex flex-wrap">
            {albums.map(album => (
              <li key={album.id_album} className="w-1/5 p-2">
                <Link to={`/album/${album.id_album}`}>
                  <img src={album.foto_album} alt={album.titulo} className="w-24 h-24 object-cover" />
                  <p className="text-center">{album.titulo}</p>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Canciones</h3>
          <ul>
            {songs.map(song => (
              <li key={song.id_cancion}>
                <Link to={`/song/${song.id_cancion}`}>{song.titulo}</Link>
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Videos Musicales</h3>
          <ul>
            {videos.map(video => (
              <li key={video.id_video}>
                <Link to={`/video/${video.id_video}`}>
                  <img src={video.miniatura} alt={video.titulo} className="w-32 h-32 object-cover" />
                  {video.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

ArtistPage.propTypes = {
  usuario: PropTypes.object,
};

export default ArtistPage;