import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const ArtistPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [rating, setRating] = useState(0);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);

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
                entidad_id: id
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
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
            entidad_id: id,
            entidad_tipo: 'artista'
          });
          setAlreadyInList(existsResponse.data.exists);
        }
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
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'artista',
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
          entidad_id: id,
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

  return (
    <div className="pt-16 p-4">
      {artist && (
        <>
          <h2 className="text-4xl font-bold my-4">{artist.nombre_artista}</h2>
          <img src={artist.foto_artista} alt={artist.nombre_artista} className="w-64 h-64 object-cover rounded-full" />
          <p className="mt-4">{artist.biografia}</p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
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
          <ul>
            {albums.map(album => (
              <li key={album.id_album}>
                <Link to={`/album/${album.id_album}`}>
                  <img src={album.foto_album} alt={album.titulo} className="w-32 h-32 object-cover" />
                  {album.titulo}
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
                  <img src={`https://img.youtube.com/vi/${video.url_video.split('/').pop()}/0.jpg`} alt={video.titulo} className="w-32 h-32 object-cover" />
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