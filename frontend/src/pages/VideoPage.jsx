import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const VideoPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [artists, setArtists] = useState([]);
  const [rating, setRating] = useState(0);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const videoResponse = await axios.get(`${API_URL}/videos/${id}`);
        setVideo(videoResponse.data);
  
        const artistsResponse = await axios.get(`${API_URL}/artistas_video/${id}`);
        setArtists(artistsResponse.data.artists || []);
  
        if (usuario) {
          // Obtener valoración (opcional)
          try {
            const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
              params: {
                usuario: usuario.id_usuario,
                entidad_tipo: 'video',
                entidad_id: id
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
          } catch (error) {
            console.error('Error al obtener valoración:', error);
            setRating(0); // Inicializa con 0 si hay un error
          }
  
          // Obtener solo las listas de tipo "video"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'video');
          console.log("Listas del usuario (filtradas):", listasFiltradas);
          setListas(listasFiltradas);
  
          // Verificar si la entidad ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: id,
            entidad_tipo: 'video'
          });
          setAlreadyInList(existsResponse.data.exists);
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
      }
    };
  
    fetchVideoData();
  }, [id, usuario]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
  
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'video',
          entidad_id: id,
          calificacion: newRating,
          comentario: "Comentario de ejemplo",
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
  
        console.log('Rating saved:', newRating);
  
        // Recargamos la valoración desde la API después de guardarla
        fetchValoracion();
      } catch (error) {
        console.error('Error saving rating:', error);
      }
    }
  };    

  const fetchValoracion = async () => {
    try {
      const response = await axios.get(`${API_URL}/valoraciones`, {
        params: {
          usuario: usuario.id_usuario,
          entidad_tipo: 'video',
          entidad_id: id
        }
      });
  
      if (response.data && response.data.length > 0) {
        setRating(response.data[0].calificacion || 0);
      } else {
        setRating(0); // Si no hay valoraciones, ponemos 0
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
      setRating(0); // Si hay un error, asumimos que no hay calificación
    }
  };  

  const handleAddToList = async () => {
    if (selectedLista) {
      try {
        await axios.post(`${API_URL}/listas-personalizadas/anadir`, {
          userId: usuario.id_usuario,
          listaId: selectedLista,
          entidad_id: id,
          entidad_tipo: 'video',
        });
        alert('Video añadido a la lista');
      } catch (error) {
        console.error('Error adding video to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  return (
    <div className="pt-16 p-4">
      {video && (
        <>
          <h2 className="text-4xl font-bold my-4">{video.titulo}</h2>
          <iframe
            width="560"
            height="315"
            src={video.url_video}
            title={video.titulo}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <p>Duración: {Math.floor(video.duracion / 60)}:{(video.duracion % 60).toString().padStart(2, '0')} minutos</p>
          <p>Popularidad: {video.popularidad}</p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
          ) : (
            <p>Inicia sesión para valorar</p>
          )}

          {usuario && (
            <div>
              {alreadyInList ? (
                <p>Este video ya está en una de tus listas.</p>
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
        </>
      )}
    </div>
  );
};

VideoPage.propTypes = {
  usuario: PropTypes.object,
};

export default VideoPage;