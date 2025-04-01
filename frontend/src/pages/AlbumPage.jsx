import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

const AlbumPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [emocion, setEmocion] = useState('');
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const albumResponse = await axios.get(`${API_URL}/albumes/${id}`);
        setAlbum(albumResponse.data.album);

        const songsResponse = await axios.get(`${API_URL}/canciones_album/${id}`);
        setSongs(Array.isArray(songsResponse.data.songs) ? songsResponse.data.songs : []);

        const artistsResponse = await axios.get(`${API_URL}/artistas_album/${id}`);
        setArtists(Array.isArray(artistsResponse.data.artists) ? artistsResponse.data.artists : []);

        if (usuario) {
          // Obtener valoración (opcional)
          try {
            const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
              params: {
                usuario: usuario.id_usuario,
                entidad_tipo: 'album',
                entidad_id: parseInt(id, 10)
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
            setComentario(valoracionResponse.data.comentario || '');
            setEmocion(valoracionResponse.data.emocion || '');
          } catch (error) {
            console.error('Error al obtener valoración:', error);
            setRating(0); // Inicializa con 0 si hay un error
          }

          // Obtener solo las listas de tipo "album"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'album');
          setListas(listasFiltradas);

          // Verificar si la entidad ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10),
            entidad_tipo: 'album'
          });
          setAlreadyInList(existsResponse.data.exists);

          // Obtener recomendación para el álbum
          const recommendationResponse = await axios.get(`${API_URL}/recommend`, {
            params: {
              id_usuario: usuario.id_usuario
            }
          });
          const albumRecommendation = recommendationResponse.data.find(rec => rec.entidad_id === parseInt(id, 10) && rec.tipo === 'album');
          setRecommendation(albumRecommendation ? Math.round(albumRecommendation.estimacion) : null);
        }

        // Obtener la valoración promedio
        const avgRatingResponse = await axios.get(`${API_URL}/promedio/valoraciones`, {
          params: {
            entidad_tipo: 'album',
            entidad_id: parseInt(id, 10)
          }
        });
        setAverageRating(avgRatingResponse.data.promedio || 0);
      } catch (error) {
        console.error('Error fetching album data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [id, usuario]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'album',
          entidad_id: parseInt(id, 10),
          calificacion: newRating,
          comentario,
          emocion
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
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
          entidad_id: parseInt(id, 10),
          entidad_tipo: 'album',
        });
        alert('Álbum añadido a la lista');
      } catch (error) {
        console.error('Error adding album to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  const handleEliminarValoracion = async () => {
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/valoraciones`, {
          data: {
            usuario: usuario.id_usuario,
            entidad_tipo: 'album',
            entidad_id: parseInt(id, 10)
          },
          headers: {
            Authorization: `Bearer ${token}`,
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
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones/comentario`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'album',
          entidad_id: parseInt(id, 10),
          comentario
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        alert('Comentario agregado correctamente');
      } catch (error) {
        console.error('Error al agregar el comentario:', error);
      }
    }
  };

  const handleAgregarEmocion = async (newEmocion) => {
    if (usuario && newEmocion) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/emociones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'album',
          entidad_id: parseInt(id, 10),
          emocion: newEmocion
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        setEmocion(newEmocion);
        alert('Emoción agregada correctamente');
      } catch (error) {
        console.error('Error al agregar la emoción:', error);
      }
    }
  };

  return (
    <div className="pt-16 p-4">
      {album && (
        <>
          <h2 className="text-4xl font-bold my-4">{album.titulo}</h2>
          <img src={album.foto_album} alt={album.titulo} className="w-64 h-64 object-cover rounded" />
          <p>Año: {album.anio}</p>
          <p>Número de canciones: {album.numero_canciones}</p>
          <p>Popularidad: {album.popularidad_album}</p>
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating} ⭐</p>
          </div>
          {usuario ? (
            <>
              <StarRating 
                valoracionInicial={rating} 
                onRatingChange={handleRatingChange} 
                entidadTipo="album" 
                entidadId={parseInt(id, 10)}
                usuario={usuario} 
              />
              <div className="flex flex-col mt-4">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agregar comentario..."
                  className="border p-2 mt-4 w-full"
                />
                <button onClick={handleAgregarComentario} className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
                  Agregar Comentario
                </button>
                <div className="flex mt-4">
                  {['feliz', 'triste', 'enojado', 'emocionado', 'neutro'].map((emocion) => (
                    <img
                      key={emocion}
                      src={`/emojis/${emocion}.png`}
                      alt={emocion}
                      className={`w-8 h-8 cursor-pointer mx-1 ${emocion === emocion ? 'border border-blue-500' : ''}`}
                      onClick={() => handleAgregarEmocion(emocion)}
                    />
                  ))}
                </div>
                <button onClick={handleEliminarValoracion} className="bg-red-500 text-white px-4 py-2 rounded mt-4">
                  Eliminar Valoración
                </button>
              </div>
            </>
          ) : (
            <p>Inicia sesión para valorar</p>
          )}

          {usuario && (
            <div>
              {alreadyInList ? (
                <p>Este álbum ya está en una de tus listas.</p>
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

          <h3 className="text-2xl font-bold mt-8">Artistas</h3>
          <ul>
            {artists.map(artist => (
              <li key={artist.id_artista}>
                <Link to={`/artist/${artist.id_artista}`}>{artist.nombre_artista}</Link>
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
        </>
      )}
    </div>
  );
};

AlbumPage.propTypes = {
  usuario: PropTypes.object,
};

export default AlbumPage;