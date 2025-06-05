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

        if (usuario) {
          const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'artista',
              entidad_id: parseInt(id, 10),
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);

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

          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/${usuario.id_usuario}`);
          const listasFiltradas = listasResponse.data.filter(lista => lista.tipo_lista === 'artista');
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
        setValoracionesUsuarios(valoracionesResponse.data || []);
      } catch (error) {
        console.error('Error fetching artist data:', error);
      } finally {
        setLoading(false);
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
        console.error('Error adding artist to list:', error);
      }
    } else {
      alert('Seleccione una lista o cree una nueva');
    }
  };

  return (
    <div className="pt-20 px-4">
      {loading ? (
        <p>Cargando...</p>
      ) : artist ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">{artist.nombre_artista}</h2>
          <img
            src={artist.foto_artista}
            alt={artist.nombre_artista}
            className="w-64 h-64 object-cover rounded-full mx-auto"
          />
          <p className="mt-4">{artist.biografia}</p>
          <p className="mt-2"><strong>Popularidad:</strong> {artist.popularidad_artista}</p>
          <h3 className="text-2xl font-bold mt-8">Géneros</h3>
          <ul>
            {genres.map((genre, index) => (
              <li key={genre.id_genero || index}>{genre.nombre}</li>
            ))}
          </ul>
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
          </div>
          {usuario && (
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="artista"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
          )}

{usuario && (
              <div className="mt-4">
                {listas.filter(lista => lista.entidades.some(entidad => entidad.id === id)).length > 0 ? (
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

          <h3 className="text-2xl font-bold mt-8">Álbumes</h3>
          <ul className="grid grid-cols-3 gap-4">
            {albums.map((album) => (
              <li key={album.id_album} className="flex flex-col items-center">
                <Link to={`/album/${album.id_album}`}>
                  <img
                    src={album.foto_album}
                    alt={album.titulo}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <p className="text-center mt-2 text-sm">{album.titulo}</p>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Canciones</h3>
          <ul>
            {songs.map((song) => (
              <li key={song.id_cancion}>
                <Link to={`/song/${song.id_cancion}`}>{song.titulo}</Link>
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-bold mt-8">Videos Musicales</h3>
          <ul className="grid grid-cols-3 gap-4">
            {videos.map((video) => (
              <li key={video.id_video} className="flex flex-col items-center">
                <Link to={`/video/${video.id_video}`}>
                  <img
                    src={video.miniatura}
                    alt={video.titulo}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <p className="text-center mt-2 text-sm">{video.titulo}</p>
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
          <ul>
            {valoracionesUsuarios.map((valoracion, index) => (
              <li key={index}>
                <p>
                  <strong>Usuario:</strong>
                  <Link to={`/perfil/${valoracion.usuario}`}>
                    {valoracion.usuarios.nombre || 'Usuario Anónimo'}
                  </Link>
                </p>
                <p><strong>Calificación:</strong> {valoracion.calificacion} ⭐</p>
                <p><strong>Comentario:</strong> {valoracion.comentario || 'Sin comentario'}</p>
                <p><strong>Emoción:</strong> {valoracion.emocion || 'Sin emoción'}</p>
              </li>
            ))}
          </ul>
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