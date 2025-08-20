import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import StarRating from '../components/StarRating';
import ValoracionComentario from '../components/ValoracionComentario';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const AlbumPage = ({ usuario }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(null);
  const [comentario, setComentario] = useState('');
  const [emocion, setEmocion] = useState('');
  const [listas, setListas] = useState([]);
  const [selectedLista, setSelectedLista] = useState('');
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [valoradas, setValoradas] = useState([]);
  const [valoracionesUsuarios, setValoracionesUsuarios] = useState([]);
  const [posicionRanking, setPosicionRanking] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [listasDestacadas, setListasDestacadas] = useState([]);
  const [sugerenciasAlbum, setSugerenciasAlbum] = useState({ nuevas: [] });
  const [sugerenciasSimilar, setSugerenciasSimilar] = useState({ mensaje: '', nuevas: [] });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCancionId, setFeedbackCancionId] = useState(null);
  const [feedbackComentario, setFeedbackComentario] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    const fetchAlbumData = async () => {
      try {
        const albumResponse = await axios.get(`${API_URL}/albumes/${id}`);
        setAlbum(albumResponse.data.album);

        const songsResponse = await axios.get(`${API_URL}/relaciones/albumes/${id}/canciones`);
        setSongs(Array.isArray(songsResponse.data.canciones) ? songsResponse.data.canciones : []);

        const artistsResponse = await axios.get(`${API_URL}/relaciones/albumes/${id}/artistas`);
        setArtists(Array.isArray(artistsResponse.data) ? artistsResponse.data : []);

        const genresResponse = await axios.get(`${API_URL}/relaciones/albumes/${id}/generos`);
        setGenres(Array.isArray(genresResponse.data) ? genresResponse.data : []);

        const avgRatingResponse = await axios.get(`${API_URL}/valoraciones/promedio`, {
            params: {
              entidad_tipo: 'album',
              entidad_id: parseInt(id, 10),
            },
          });
          setAverageRating(avgRatingResponse.data.promedio || null);
          
        if (usuario) {
          const valoracionResponse = await axios.get(`${API_URL}/valoraciones`, {
            params: {
              usuario: usuario.id_usuario,
              entidad_tipo: 'album',
              entidad_id: parseInt(id, 10),
            },
          });
          setRating(valoracionResponse.data.calificacion || 0);
          setComentario(valoracionResponse.data.comentario || '');
          setEmocion(valoracionResponse.data.emocion || '');

          const listasResponse = await axios.get(`${API_URL}/listas-personalizadas/colaborativas-o-propias/${usuario.id_usuario}`);
                    const listasFiltradas = listasResponse.data.filter(
                      lista =>
                        lista.tipo_lista === 'album' &&
                        (
                          lista.usuario_id === usuario.id_usuario ||
                          (lista.privacidad === 'colaborativa' && ['agregar', 'admin', 'eliminar'].includes(lista.rol_colaborador))
                        )
                    );
                    setListas(listasFiltradas);

          const existsResponse = await axios.post(`${API_URL}/listas-personalizadas/verificar`, {
            userId: usuario.id_usuario,
            entidad_id: parseInt(id, 10),
            entidad_tipo: 'album',
          });
          setAlreadyInList(existsResponse.data.exists);

          // Fetch valoraciones de canciones valoradas por el usuario
          const cancionesValoradas = await axios.get(`${API_URL}/valoraciones`, {
            params: { usuario: usuario.id_usuario, entidad_tipo: 'cancion' }
          });
          if (Array.isArray(cancionesValoradas.data)) {
            setValoradas(cancionesValoradas.data.map(c => c.cancion));
          }

          // Fetch valoraciones de usuarios para el álbum
          const valoracionesResponse = await axios.get(`${API_URL}/valoraciones/globales`, {
            params: {
              entidad_tipo: 'album',
              entidad_id: parseInt(id, 10),
            },
          });
          setValoracionesUsuarios(Array.isArray(valoracionesResponse.data) ? valoracionesResponse.data : []);
        }
      } catch (error) {
        console.error('Error fetching album data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [id, usuario]);

  useEffect(() => {
    axios.get(`${API_URL}/rankings/posicion-global`, {
      params: { tipo_entidad: 'album', entidad_id: id }
    }).then(res => setPosicionRanking(res.data.posicion));
  }, [id, usuario]);

  useEffect(() => {
    if (usuario) {
      axios.get(`${API_URL}/valoraciones/historial`, {
        params: { usuario: usuario.id_usuario, entidad_tipo: 'album', entidad_id: id }
      }).then(res => setHistorial(res.data));
    }
  }, [usuario, id]);

  useEffect(() => {
    axios.get(`${API_URL}/listas-personalizadas/destacadas-por-entidad`, {
      params: { entidad_id: id, entidad_tipo: 'album' }
    }).then(res => setListasDestacadas(res.data));
  }, [id]);

  const fetchSugerenciasAlbum = async () => {
    if (!usuario) return;
    try {
      const res = await axios.get(`${API_URL}/albumes/sugerencias-nuevas`, {
        params: { usuario_id: usuario.id_usuario, id_album: id }
      });
      setSugerenciasAlbum(res.data);
    } catch (err) {
      setSugerenciasAlbum({ nuevas: [] });
    }
  };

  useEffect(() => {
    fetchSugerenciasAlbum();
  }, [id, usuario]);

  useEffect(() => {
    if (usuario) {
      axios.get(`${API_URL}/albumes/sugerencias-similar`, {
        params: { usuario_id: usuario.id_usuario, id_album: id }
      }).then(res => setSugerenciasSimilar(res.data));
    }
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
        entidad_tipo: 'album',
      });
      alert('Álbum añadido a la lista');
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data &&
        error.response.data.error &&
        error.response.data.error.includes('ya existe')
      ) {
        alert('Este álbum ya está en la lista seleccionada.');
      } else {
        alert('Error al añadir el álbum a la lista.');
      }
      console.error('Error adding album to list:', error);
    }
  } else {
    alert('Seleccione una lista o cree una nueva');
  }
};

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
      entidad_tipo: 'cancion',
      entidad_id_1: id, // id_album
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

  return (
    <div className="pt-16 p-4">
      {loading ? (
        <p>Cargando...</p>
      ) : album ? (
        <>
          <h2 className="text-4xl font-bold my-4 text-center">
            {album.titulo}
          </h2>
          {posicionRanking && (
            <div className="text-center mt-2">
              <span className="ranking-global">
                #{posicionRanking} en Ranking Global de Albumes
              </span>
            </div>
          )}
          <img
            src={album.foto_album}
            alt={album.titulo}
            className="w-64 h-64 object-cover rounded mx-auto"
          />
          <p className="mt-4 text-center">Año: {album.anio}</p>
          <p className="text-center">Tipo: {album.tipo_album}</p>
          <p className="text-center">Número de canciones: {album.numero_canciones}</p>
          <p className="text-center">Popularidad: {album.popularidad_album}</p>
          <div className="flex items-center">
            <p className="text-lg font-bold mr-4">Valoración Promedio:</p>
            <p>{averageRating !== null ? `${averageRating} ⭐` : 'Sin valoraciones'}</p>
          </div>
          {usuario && (
            <StarRating
              valoracionInicial={rating}
              onRatingChange={handleRatingChange}
              entidadTipo="album"
              entidadId={parseInt(id, 10)}
              usuario={usuario}
            />
          )}

          <h3 className="text-2xl font-bold mt-8">Valoraciones de Usuarios</h3>
          {valoracionesUsuarios.length === 0 ? (
            <div>No hay valoraciones aún.</div>
          ) : (
            valoracionesUsuarios.map((valoracion, idx) => (
              <ValoracionComentario key={idx} valoracion={valoracion} />
            ))
          )}

          <h3 className="text-2xl font-bold mt-8">Géneros</h3>
          <ul className="text-center">
            {genres.map((genre) => (
              <li key={genre.id_genero}>
                <Link to={`/genre/${genre.id_genero}`}>{genre.nombre}</Link>
              </li>
            ))}
          </ul>
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

          <h3 className="text-2xl font-bold mt-8">Artistas</h3>
          <ul className="artist-grid gap-4 w-full justify-items-center mx-auto">
            {artists.map((artist) => (
              <li key={artist.id_artista}>
                <Link to={`/artist/${artist.id_artista}`}>
                  <img
                    src={artist.foto_artista}
                    alt={artist.nombre_artista}
                    style={{ width: '255px', height: '255px', objectFit: 'cover' }}
                    className={`rounded-md ${valoradas?.includes?.(`artista-${artist.id_artista}`) ? 'valorada-img' : ''}`}
                  />
                  <p className={`text-center mt-2 text-xs font-semibold ${valoradas?.includes?.(`artista-${artist.id_artista}`) ? 'valorada' : ''}`}>
                    {artist.nombre_artista}
                    {valoradas?.includes?.(`artista-${artist.id_artista}`) && <span style={{ marginLeft: 6 }}>⭐</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="text-2xl font-bold mt-8">Canciones</h3>
          <table className="min-w-full mt-2">
            <thead>
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Duración</th>
                <th># Valoraciones</th>
                <th>Promedio</th>
                <th>Popularidad</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, idx) => (
                <tr key={song.id_cancion}>
                  <td>{song.numero_pista || idx + 1}</td>
                  <td>
                    <Link to={`/song/${song.id_cancion}`}>{song.titulo}</Link>
                  </td>
                  <td>{Math.floor(song.duracion_ms / 60000)}:{((song.duracion_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}</td>
                  <td>{song.valoraciones_count || '-'}</td>
                  <td>{song.promedio_valoracion ? `${song.promedio_valoracion} ⭐` : '-'}</td>
                  <td>{song.popularidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
    <h4 className="font-bold">Listas destacadas con este álbum</h4>
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

{/* SUGERENCIAS DE CANCIONES NUEVAS */}
{sugerenciasAlbum.nuevas && sugerenciasAlbum.nuevas.length > 0 && (
  <div className="mt-8">
    <h3 className="text-xl font-bold text-green-600">Canciones nuevas por valorar en este álbum</h3>
    <ul>
      {sugerenciasAlbum.nuevas.map((song) => (
        <li key={song.id_cancion}>
          <Link to={`/song/${song.id_cancion}`}>{song.titulo || `Canción #${song.id_cancion}`}</Link>
        </li>
      ))}
    </ul>
  </div>
)}

{sugerenciasSimilar.mensaje && (
  <div className="mt-8 bg-yellow-100 border-l-4 border-yellow-500 p-4">
    <strong>{sugerenciasSimilar.mensaje}</strong>
    {sugerenciasSimilar.nuevas.length > 0 && (
      <ul>
        {sugerenciasSimilar.nuevas.map(song => (
          <li key={song.id_cancion}>
            <Link to={`/song/${song.id_cancion}`} className="text-green-700 font-bold">{song.titulo}</Link>
            <button
          className="ml-2 text-xs text-blue-700 underline"
          onClick={() => openFeedbackModal(song.id_cancion)}
        >Reportar diferencia</button>
          </li>
        ))}
      </ul>
    )}
  </div>
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
        </>
      ) : (
        <p>Álbum no encontrado.</p>
      )}
    </div>
  );
};

AlbumPage.propTypes = {
  usuario: PropTypes.object,
};

export default AlbumPage;