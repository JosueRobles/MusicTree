import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';
import ProgressBar from '../components/ProgressBar';

const API_URL = import.meta.env.VITE_API_URL;

const ListPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(UsuarioContext);

  // Estados principales
  const [lista, setLista] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privacidad, setPrivacidad] = useState('publica');
  const [guardada, setGuardada] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [valorados, setValorados] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'valorados', 'pendientes'
  const [ordenarPor, setOrdenarPor] = useState('predeterminada'); // 'fecha', 'nombre', 'artista', 'duracion'
  const [ordenDireccion, setOrdenDireccion] = useState('desc'); // 'asc', 'desc'

  // Estados para subir imagen
  const [nuevaImagen, setNuevaImagen] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // Verifica si el usuario es dueño de la lista
  const esDueno = usuario && lista && String(usuario.id_usuario) === String(lista.usuario_id);

  // Función para traer los datos de la lista y sus elementos con detalles
  const fetchListaData = useCallback(async () => {
  setError(null);
  setLoading(true);
  try {
    const params = usuario ? { userId: usuario.id_usuario } : {};

    // Datos principales de la lista
    const listaResponse = await axios.get(`${API_URL}/listas-personalizadas/detalle/${id}`, { params });
    setLista(listaResponse.data);
    setPrivacidad(listaResponse.data.privacidad);

    // Elementos asociados
    const elementosResponse = await axios.get(`${API_URL}/listas-personalizadas/elementos/${id}`);
    
    // Guardamos los elementos y sus detalles
    const elementosData = elementosResponse.data;
    setElementos(elementosData);
    
    // Crear objeto de detalles
    const detallesObj = {};
    elementosData.forEach(elemento => {
      detallesObj[elemento.id_elemento] = elemento.detalles;
    });
    setDetalles(detallesObj);
    
    setLoading(false);
  } catch (err) {
    console.error('Error fetching data:', err);
    setError(err.response?.status === 403 ? 'No tienes acceso a esta lista.' : 'Error fetching list data');
    setLista(null);
    setElementos([]);
    setDetalles({});
    setLoading(false);
  }
}, [id, usuario]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchListaData();
  }, [id, usuario, fetchListaData]);

  // Verifica si la lista está guardada
  useEffect(() => {
    if (!usuario) return;
    axios.post(`${API_URL}/listas-personalizadas/verificar-guardada`, {
      userId: usuario.id_usuario,
      listaId: id
    }).then(r => setGuardada(r.data.guardada))
      .catch(console.error);
  }, [id, usuario]);

  // Obtener progreso y valorados
  useEffect(() => {
    if (!usuario) return;
    axios.get(`${API_URL}/listas-personalizadas/progreso/${id}/${usuario.id_usuario}`)
      .then(r => {
        setProgreso(r.data.progreso || 0);
        setValorados(r.data.valorados || []);
      })
      .catch(console.error);
  }, [id, usuario]);

  // Eliminar elemento de la lista
  const eliminarElemento = async (elementoId) => {
    try {
      await axios.delete(`${API_URL}/listas-personalizadas/elemento/${elementoId}`, {
        params: { userId: usuario.id_usuario }
      });
      setElementos(prev => prev.filter(el => el.id_elemento !== elementoId));
      setDetalles(prev => {
        const copy = { ...prev };
        delete copy[elementoId];
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Guardar o eliminar lista guardada
  const handleGuardarLista = async () => {
    if (!usuario) {
      alert('Debes iniciar sesión para guardar una lista.');
      return;
    }
    try {
      if (guardada) {
        await axios.delete(`${API_URL}/listas-personalizadas/eliminar`, {
          data: { userId: usuario.id_usuario, listaId: id }
        });
        setGuardada(false);
        alert('Lista eliminada de guardadas.');
      } else {
        await axios.post(`${API_URL}/listas-personalizadas/guardar`, {
          userId: usuario.id_usuario,
          listaId: id
        });
        setGuardada(true);
        alert('Lista guardada correctamente.');
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar/eliminar la lista.');
    }
  };

  // Cambiar privacidad
  const handlePrivacidadChange = async (newPrivacidad) => {
    try {
      const r = await axios.put(`${API_URL}/listas-personalizadas/${id}`, { privacidad: newPrivacidad });
      setPrivacidad(r.data.privacidad);
    } catch {
      alert('No se pudo cambiar la privacidad.');
    }
  };

  // Subir imagen de la lista
  const handleImagen = async (e) => {
    e.preventDefault();
    if (!nuevaImagen) return;
    setSubiendo(true);
    const formData = new FormData();
    formData.append('imagen', nuevaImagen);

    try {
      await axios.put(`${API_URL}/listas-personalizadas/imagen/${lista.id_lista}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNuevaImagen(null);
      fetchListaData(); // refresca la lista para actualizar imagen
    } catch {
      alert('Error al actualizar la imagen');
    }
    setSubiendo(false);
  };

  const getOpcionesOrdenamiento = () => {
    if (!lista) return [];
    return [
      { value: 'predeterminada', label: 'Predeterminada' },
      { value: 'nombre', label: 'Nombre' },
      { value: 'artista', label: 'Artista' }, // <-- NUEVO
      { value: 'popularidad', label: 'Popularidad' },
      ...(lista.tipo_lista === 'cancion' || lista.tipo_lista === 'video'
        ? [{ value: 'duracion', label: 'Duración' }]
        : []),
      ...(lista.tipo_lista !== 'artista'
        ? [{ value: 'año', label: 'Año' }]
        : [])
    ];
  };

  const ordenarElementos = (elementos) => {
    return [...elementos].sort((a, b) => {
      const detalleA = detalles[a.id_elemento] || {};
      const detalleB = detalles[b.id_elemento] || {};

      switch (ordenarPor) {
        case 'predeterminada': {
          return ordenDireccion === 'asc' 
            ? a.id_elemento - b.id_elemento
            : b.id_elemento - a.id_elemento;
        }
        case 'nombre': {
          const nombreA = detalleA.titulo || detalleA.nombre_artista || '';
          const nombreB = detalleB.titulo || detalleB.nombre_artista || '';
          return ordenDireccion === 'asc' 
            ? nombreA.localeCompare(nombreB)
            : nombreB.localeCompare(nombreA);
        }
        case 'artista': { // <-- NUEVO
          const artistaA = detalleA.artista || detalleA.nombre_artista || '';
          const artistaB = detalleB.artista || detalleB.nombre_artista || '';
          return ordenDireccion === 'asc'
            ? artistaA.localeCompare(artistaB)
            : artistaB.localeCompare(artistaA);
        }
        case 'popularidad': {
          const popularidadA = detalleA.popularidad || 0;
          const popularidadB = detalleB.popularidad || 0;
          return ordenDireccion === 'asc'
              ? popularidadA - popularidadB
              : popularidadB - popularidadA;
        }
        case 'duracion': {
          if (lista.tipo_lista !== 'cancion' && lista.tipo_lista !== 'video') return 0;
          const duracionA = detalleA.duracion || 0;
          const duracionB = detalleB.duracion || 0;
          return ordenDireccion === 'asc'
            ? duracionA - duracionB
            : duracionB - duracionA;
        }
        case 'año': {
          const anioA = detalleA.anio || 0;
          const anioB = detalleB.anio || 0;
          return ordenDireccion === 'asc'
              ? anioA - anioB
              : anioB - anioA;
          }
        default: {
          return 0;
        }
      }
    });
  };

  const filtrarElementos = () => {
    let elementosFiltrados = [...elementos];

    // Filtrar solo por estado de valoración
    if (filtroEstado !== 'todos') {
      elementosFiltrados = elementosFiltrados.filter(el => {
        const estaValorado = valorados.includes(el.id_elemento);
        return filtroEstado === 'valorados' ? estaValorado : !estaValorado;
      });
    }

    return ordenarElementos(elementosFiltrados);
  };

  const mostrarDetallesElemento = (elemento, detalle) => {
    if (!detalle || detalle.error) return null;
  
    const detallesComunes = (
        <>
        {detalle.calificacion_usuario && (
                      <div style={{ 
            backgroundColor: '#4b5563',
                        color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '8px'
                      }}>
            Tu valoración: {detalle.calificacion_usuario.toFixed(1)}
                      </div>
                    )}
        <div style={{
          backgroundColor: '#6b7280',
                          color: 'white',
          padding: '2px 6px',
                          borderRadius: '4px',
          display: 'inline-block',
          marginLeft: '8px'
        }}>
          Popularidad: {detalle.popularidad}
    </div>
                </>
  );

    switch (elemento.entidad_tipo) {
      case 'cancion':
        return (
          <>
            {detallesComunes}
            <p>Artista: {detalle.artista}</p>
            <p>Duración: {Math.floor(detalle.duracion / 60)}:{(detalle.duracion % 60).toString().padStart(2, '0')}</p>
            <p>Año: {detalle.anio}</p>
          </>
        );
      case 'album':
        return (
          <>
            {detallesComunes}
            <p>Artista: {detalle.artista}</p>
            <p>Año: {detalle.anio}</p>
          </>
        );
      case 'video':
        return (
          <>
            {detallesComunes}
            <p>Artista: {detalle.artista}</p>
            <p>Duración: {Math.floor(detalle.duracion / 60)}:{(detalle.duracion % 60).toString().padStart(2, '0')}</p>
            <p>Año: {detalle.anio}</p>
          </>
        );
      case 'artista':
        return (
          <>
            {detallesComunes}
          </>
        );
      default:
        return null;
    }
};

  const getElementImage = (elemento, detalle) => {
    if (!detalle || detalle.error) return '/default_entity.png';

    switch (elemento.entidad_tipo) {
      case 'artista':
        return detalle.foto_artista ? `${API_URL}/${detalle.foto_artista}` : '/default_artist.png';
      case 'album':
        return detalle.caratula ? `${API_URL}/${detalle.caratula}` : '/default_album.png';
      case 'cancion': {
        // Para canciones, usar la carátula del álbum
        const albumCaratula = detalle.album_caratula;
        return albumCaratula ? `${API_URL}/${albumCaratula}` : '/default_song.png';
      }
      case 'video':
        return detalle.miniatura ? `${API_URL}/${detalle.miniatura}` : '/default_video.png';
      default:
        return '/default_entity.png';
    }
  };

  return (
    <div style={{ padding: 32 }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {lista && (
        <>
          <h1>{lista.nombre_lista} ({lista.tipo_lista})</h1>
          <p>{lista.descripcion}</p>

          {/* Imagen de la lista */}
          {esDueno ? (
            <>
              <input
                type="file"
                accept="image/*"
                id="inputImagen"
                style={{ display: 'none' }}
                onChange={e => setNuevaImagen(e.target.files[0])}
              />
              <img
                src={lista.imagen ? `${API_URL}/uploads/${lista.imagen}?t=${Date.now()}` : '/default_playlist.png'}
                alt="Imagen de lista"
                style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 16, cursor: 'pointer', marginBottom: 16 }}
                onClick={() => document.getElementById('inputImagen').click()}
              />
              {nuevaImagen && (
                <form onSubmit={handleImagen} style={{ marginTop: 8 }}>
                  <button type="submit" disabled={subiendo}>
                    {subiendo ? 'Subiendo...' : 'Actualizar Imagen'}
                  </button>
                </form>
              )}
            </>
          ) : (
            lista.imagen && (
              <img
                src={`${API_URL}/uploads/${lista.imagen}?t=${Date.now()}`}
                alt={lista.nombre_lista}
                style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }}
              />
            )
          )}

          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {/* Gestión de colaboradores para listas colaborativas */}
              {usuario && privacidad === 'colaborativa' && (lista.usuario_id === usuario.id_usuario || lista.rol_colaborador === 'admin') && (
                <button onClick={() => navigate(`/list/${id}/colaboradores`)}>Gestionar Colaboradores</button>
              )}

              {/* Cambio de privacidad (solo dueño) */}
              {usuario && lista.usuario_id === usuario.id_usuario && (
                <div>
                  <select value={privacidad} onChange={e => handlePrivacidadChange(e.target.value)}>
                    <option value="publica">Pública</option>
                    <option value="privada">Privada</option>
                    <option value="colaborativa">Colaborativa</option>
                  </select>
                </div>
              )}

              {/* Panel de filtros y ordenamiento */}
              <div className="filters-container" style={{
                marginBottom: 20,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                {/* Filtro por estado de valoración */}
                <div className="filter-group">
                  <label style={{ fontWeight: 'bold', marginRight: 8 }}>Estado:</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="todos">Todos</option>
                    <option value="valorados">Valorados</option>
                    <option value="pendientes">Pendientes</option>
                  </select>
                </div>

                {/* Ordenamiento condicional según tipo de lista */}
                <div className="filter-group">
                  <label style={{ fontWeight: 'bold', marginRight: 8 }}>Ordenar por:</label>
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    {getOpcionesOrdenamiento().map(opcion => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setOrdenDireccion(prev => prev === 'asc' ? 'desc' : 'asc')}
                    style={{ marginLeft: 8, padding: '6px 12px' }}
                  >
                    {ordenDireccion === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {/* Lista mejorada de elementos */}
              <div className="elementos-grid" style={{
                display: 'grid',
                gap: '16px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {filtrarElementos().map(el => (
                  <div
                    key={el.id_elemento}
                    className={`elemento-card ${valorados.includes(el.id_elemento) ? 'valorado' : ''}`}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      backgroundColor: valorados.includes(el.id_elemento) ? '#f0f9ff' : 'white',
                      border: '1px solid #e5e7eb',
                      position: 'relative'
                    }}
                  >
                    <Link
                      to={`/${el.entidad_tipo === 'artista' ? 'artist' : el.entidad_tipo === 'cancion' ? 'song' : el.entidad_tipo}/${el.entidad_id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{
                        width: '100%',
                        height: '200px',
                        marginBottom: '12px',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={detalles[el.id_elemento]?.imagen 
                            ? `${detalles[el.id_elemento].imagen}`
                            : '/default_entity.png'}
                          alt={detalles[el.id_elemento]?.titulo || detalles[el.id_elemento]?.nombre_artista || 'Entidad'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, color: '#1a56db' }}>
                          {detalles[el.id_elemento]?.titulo || detalles[el.id_elemento]?.nombre_artista || 'Cargando...'}
                        </h3>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                        {mostrarDetallesElemento(el, detalles[el.id_elemento])}
                      </div>
                    </Link>

                    {/* Indicador de valoración */}
                    {valorados.includes(el.id_elemento) && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        Valorado ⭐
                      </div>
                    )}

                    {/* Botón de eliminar */}
                    {(usuario && (lista.usuario_id === usuario.id_usuario ||
                      (lista.privacidad === 'colaborativa' &&
                       ['eliminar', 'admin'].includes(lista.rol_colaborador)))) && (
                      <button
                        onClick={() => eliminarElemento(el.id_elemento)}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Progreso */}
              {!usuario ? (
                <div style={{ color: '#b91c1c', fontWeight: 'bold', margin: '20px 0' }}>
                  Debes iniciar sesión o registrarte para llevar un progreso en las listas de la plataforma.
                </div>
              ) : (
                <>
                  <ProgressBar progreso={progreso} />
                  <p>Has valorado el {progreso.toFixed(2)}% de esta lista.</p>
                </>
              )}

              {/* Botón para guardar lista si no es dueño */}
              {usuario && lista.usuario_id !== usuario.id_usuario && (
                <button onClick={handleGuardarLista}>
                  {guardada ? 'Eliminar de Guardadas' : 'Guardar Lista'}
                </button>
              )}

              <p>Guardada por {lista.saved_count || 0} usuario(s)</p>
              <p>Privacidad: {privacidad}</p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ListPage;
