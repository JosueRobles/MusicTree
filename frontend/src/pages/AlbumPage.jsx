import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev";

const AlbumPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [rating, setRating] = useState(0);
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [albumRecommendation, setAlbumRecommendation] = useState(null);

  useEffect(() => {
    console.log("Ejecutando fetchAlbumData con id:", id);
    
    const fetchAlbumData = async () => {
      try {
        const albumResponse = await axios.get(`${API_URL}/albumes/${id}`);
        console.log("Seteando álbum:", albumResponse.data.album);
        setAlbum(albumResponse.data.album);
        console.log("Estado de album actualizado:", album);
        
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
                entidad_id: id
              }
            });
            setRating(valoracionResponse.data.calificacion || 0);
          } catch (error) {
            console.error('Error al obtener valoración:', error);
            setRating(0); // Inicializa con 0 si hay un error
          }

          // Obtener solo las listas de tipo "album"
          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'album');
          console.log("Listas del usuario (filtradas):", listasFiltradas);
          setListas(Array.isArray(listasFiltradas) ? listasFiltradas : []);

          // Verificar si la entidad ya está en una lista
          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: id,
            entidad_tipo: 'album'
          });
          setAlreadyInList(existsResponse.data.exists);

          // Obtener recomendaciones
          const recommendationResponse = await axios.get(`${API_URL}/recommend`, {
            params: { id_usuario: usuario.id_usuario }
          });
          const allRecommendations = Array.isArray(recommendationResponse.data) ? recommendationResponse.data : [];
          setRecommendations(allRecommendations);

          // Obtener la recomendación específica para el álbum actual
          const albumRec = allRecommendations.find(rec => rec.entidad_id === parseInt(id) && rec.tipo === 'album');
          setAlbumRecommendation(albumRec ? Math.round(albumRec.estimacion) : null);
        }
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
  console.log("Renderizando AlbumPage con album:", album);

  return (
    <div className="pt-16 p-4">
      {album && (
        <>
          <h2 className="text-4xl font-bold my-4">{album.titulo}</h2>
          <img src={album.foto_album} alt={album.titulo} className="w-64 h-64 object-cover rounded" />
          <p>Año: {album.anio}</p>
          <p>Número de canciones: {album.numero_canciones}</p>
          <p>Popularidad: {album.popularidad_album}</p>
          {albumRecommendation !== null && (
            <p>Recomendación: {albumRecommendation}%</p>
          )}
          {usuario ? (
            <StarRating valoracionInicial={rating} onRatingChange={handleRatingChange} />
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