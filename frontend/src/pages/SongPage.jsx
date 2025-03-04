import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const SongPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [artists, setArtists] = useState([]);
  const [album, setAlbum] = useState(null);
  const [rating, setRating] = useState(0);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);

  useEffect(() => {
    const fetchSongData = async () => {
      try {
        const songResponse = await axios.get(`${API_URL}/canciones/${id}`);
        setSong(songResponse.data);
  
        const artistsResponse = await axios.get(`${API_URL}/artistas_cancion/${id}`);
        setArtists(artistsResponse.data.artists);
  
        const albumResponse = await axios.get(`${API_URL}/album_cancion/${id}`);
        setAlbum(albumResponse.data.album);
  
        if (usuario) {
          // Obtener valoración (opcional)
          try {
            const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
              params: {
                usuario: usuario.id_usuario,
                entidad_tipo: 'cancion',
                entidad_id: id
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
          } catch (error) {
            console.error('Error al obtener valoración:', error);
            setRating(0); // Inicializa con 0 si hay un error
          }
  
          // Obtener solo las listas de tipo "cancion"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'cancion');
          console.log("Listas del usuario (filtradas):", listasFiltradas);
          setListas(listasFiltradas);
  
          // Verificar si la entidad ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: id,
            entidad_tipo: 'cancion'
          });
          console.log("Respuesta de verificación:", existsResponse.data);
          setAlreadyInList(existsResponse.data.exists);
        }
      } catch (error) {
        console.error('Error fetching song data:', error);
      }
    };
  
    fetchSongData();
  }, [id, usuario]);

  useEffect(() => {
    console.log("Estado alreadyInList:", alreadyInList); // Verifica el estado
    console.log("Listas disponibles:", listas.length > 0); // Verifica si hay listas
  }, [alreadyInList, listas]);

  const handleRatingChange = async (newRating) => {
    setRating(newRating);
    if (usuario) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/valoraciones`, {
          usuario: usuario.id_usuario,
          entidad_tipo: 'cancion',
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
          entidad_tipo: 'cancion',
        });
        alert('Canción añadida a la lista');
      } catch (error) {
        console.error('Error adding song to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  return (
    <div className="pt-16 p-4">
      {song && (
        <>
          <h2 className="text-4xl font-bold my-4">{song.titulo}</h2>
          <p>Duración: {Math.floor(song.duracion_ms / 60000)}:{((song.duracion_ms % 60000) / 1000).toFixed(0).padStart(2, '0')} minutos</p>
          <p>Popularidad: {song.popularidad}</p>
          <p>Preview: <a href={song.preview_url} target="_blank" rel="noopener noreferrer">{song.preview_url}</a></p>
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
          ) : (
            <p>Inicia sesión para valorar</p>
          )}

{usuario && (
  <div>
    {alreadyInList ? (
      <p>Esta canción ya está en una de tus listas.</p>
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

          {album && (
            <>
              <h3 className="text-2xl font-bold mt-8">Álbum</h3>
              <p>
                <Link to={`/album/${album.id_album}`}>
                  {album.titulo} ({album.anio})
                </Link>
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

SongPage.propTypes = {
  usuario: PropTypes.object,
};

export default SongPage;