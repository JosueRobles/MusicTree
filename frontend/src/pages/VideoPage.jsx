import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "http://localhost:5000";

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

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const videoResponse = await axios.get(`${API_URL}/videos/${id}`);
        setVideo(videoResponse.data);

        const artistsResponse = await axios.get(`${API_URL}/relaciones/videos/${id}/artistas`);
        setArtists(artistsResponse.data || []);

        if (usuario) {
          // Obtener valoración promedio
          const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'video',
              entidad_id: parseInt(id, 10), // Convertir id a número
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);

          // Obtener listas personalizadas de tipo "video"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'video');
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
              entidad_id: parseInt(id, 10), // Convertir id a número
            },
          });
          setValoracionesUsuarios(valoracionesResponse.data || []);
        }
      } catch (error) {
        console.error('Error al cargar los datos del video:', error);
      } finally {
        setLoading(false);
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
          entidad_id: parseInt(id, 10), // Convertir id a número
          entidad_tipo: 'video',
        });
        alert('Video añadido a la lista');
      } catch (error) {
        console.error('Error al añadir el video a la lista:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva.');
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!video) return <p>Error: Video no encontrado.</p>;

  return (
    <div className="pt-16 p-4">
      <h2 className="text-4xl font-bold my-4 text-center">{video.titulo}</h2>
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
      <ul>
        {valoracionesUsuarios.map((valoracion, index) => (
          <li key={index}>
            <p>
              <strong>Usuario:</strong>{' '}
              <Link to={valoracion.usuarios?.foto_perfil || '#'}>{valoracion.usuarios?.nombre || valoracion.usuario}</Link>
            </p>
            <p><strong>Calificación:</strong> {valoracion.calificacion} ⭐</p>
            <p><strong>Comentario:</strong> {valoracion.comentario || 'Sin comentario'}</p>
            <p><strong>Emoción:</strong> {valoracion.emocion || 'Sin emoción'}</p>
          </li>
        ))}
      </ul>

      {usuario && (
        <div className="mt-4">
          {listas.filter(lista => lista.entidades.some(entidad => entidad.id === parseInt(id, 10))).length > 0 ? (
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

      <h3 className="text-2xl font-bold mt-8">Artistas</h3>
      <ul className="grid grid-cols-3 gap-4">
        {artists.map(artist => (
          <li key={artist.id_artista} className="flex flex-col items-center">
            <img
              src={artist.foto_artista}
              alt={artist.nombre_artista}
              className="w-32 h-32 object-cover rounded-full"
            />
            <Link to={`/artist/${artist.id_artista}`} className="mt-2">{artist.nombre_artista}</Link>
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