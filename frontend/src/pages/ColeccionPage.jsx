import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = "http://localhost:5000";

const ColeccionPage = () => {
  const { id } = useParams(); // Obtener el ID de la colección desde la URL
  const { usuario } = useContext(UsuarioContext);
  const [coleccion, setColeccion] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [detalles, setDetalles] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50; // Número de elementos a cargar por página
  const [hasMore, setHasMore] = useState(true); // Indica si hay más elementos para cargar
  const [progreso, setProgreso] = useState(0); // Progreso del usuario en la colección
  const [valorados, setValorados] = useState([]); // <-- NUEVO
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'valorados', 'pendientes'
  const [ordenarPor, setOrdenarPor] = useState('predeterminada'); // 'predeterminada', 'nombre', 'calificacion', etc.
  const [ordenDireccion, setOrdenDireccion] = useState('desc'); // 'asc', 'desc'


  // Función para cargar los elementos de la colección con paginación
  const fetchElementos = useCallback(async (currentOffset) => {
    try {
      setLoadingMore(true);
      const elementosResponse = await axios.get(`${API_URL}/colecciones/${id}/elementos`, {
        params: {
          offset: currentOffset,
          limit,
          userId: usuario?.id_usuario,
          orderBy: ordenarPor !== 'predeterminada' ? ordenarPor : undefined,
          orderDirection: ordenarPor !== 'predeterminada' ? ordenDireccion : undefined,
          filterValorados: filtroEstado === 'todos' ? undefined : filtroEstado === 'valorados'
            ? true
            : false,
        },
      });

      if (elementosResponse.data.length === 0) {
        setHasMore(false);
      } else {
        setElementos((prev) => [...prev, ...elementosResponse.data]);
        setOffset((prev) => prev + limit);

        // Usa los detalles que ya vienen del backend
        const detallesTemp = {};
        elementosResponse.data.forEach((elemento) => {
          detallesTemp[elemento.id_elemento] = elemento.detalles || {};
        });
        setDetalles((prev) => ({ ...prev, ...detallesTemp }));
      }
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching elementos:', error);
      setError('Error al cargar los elementos.');
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id, limit, ordenarPor, ordenDireccion, filtroEstado, usuario]);

  // Función para cargar el progreso del usuario en la colección
  const fetchProgreso = useCallback(async () => {
    if (!usuario) {
      setProgreso(0);
      setValorados([]);
      return;
    }
    try {
      const userId = usuario.id_usuario;
      const response = await axios.get(`${API_URL}/colecciones/${id}/progreso/${userId}`);
      setProgreso(response.data.progreso || 0);
      setValorados(response.data.valorados || []);
    } catch (error) {
      console.error("Error al obtener el progreso:", error);
      setProgreso(0);
      setValorados([]);
    }
  }, [id, limit, ordenarPor, ordenDireccion, filtroEstado, usuario]);

  // Manejo de scroll para cargar más elementos
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100 &&
      hasMore &&
      !loadingMore
    ) {
      fetchElementos(offset);
    }
  }, [offset, hasMore, loadingMore, fetchElementos]);

  // Cargar los datos de la colección
  useEffect(() => {
    const fetchColeccionData = async () => {
      try {
        const coleccionResponse = await axios.get(`${API_URL}/colecciones/${id}`);
        setColeccion(coleccionResponse.data);
        fetchElementos(0); // Cargar elementos iniciales
        fetchProgreso(); // Cargar el progreso del usuario (solo si hay usuario)
      } catch (coleccionError) {
        console.error('Error fetching collection data:', coleccionError);
        setError('Error al cargar la colección');
        setLoading(false);
      }
    };

    fetchColeccionData();
  }, [id, fetchElementos, fetchProgreso]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const getOpcionesOrdenamiento = () => {
    if (!coleccion) return [];
    return [
      { value: 'predeterminada', label: 'Predeterminada' },
      { value: 'nombre', label: 'Nombre' },
      { value: 'artista', label: 'Artista' }, // <-- NUEVO
      { value: 'popularidad', label: 'Popularidad' },
      ...(coleccion.tipo_coleccion === 'cancion' || coleccion.tipo_coleccion === 'video'
        ? [{ value: 'duracion', label: 'Duración' }]
        : []),
      ...(coleccion.tipo_coleccion !== 'artista'
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
        default:
          return 0;
      }
    });
  };

  const filtrarElementos = () => {
  // Asocia los detalles a cada elemento primero
  let elementosConDetalles = elementos.map(el => ({
    ...el,
    detalles: detalles[el.id_elemento] || {}
  }));

  if (filtroEstado !== 'todos') {
    elementosConDetalles = elementosConDetalles.filter(el => {
      const estaValorado = valorados.includes(el.id_elemento);
      return filtroEstado === 'valorados' ? estaValorado : !estaValorado;
    });
  }

  // Eliminar duplicados basado en id_elemento
  const vistos = new Set();
  elementosConDetalles = elementosConDetalles.filter(el => {
    if (vistos.has(el.id_elemento)) return false;
    vistos.add(el.id_elemento);
    return true;
  });

  return ordenarElementos(elementosConDetalles);
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

  const elementosConDetalles = filtrarElementos();

  return (
  <div>
    {error && <p style={{ color: 'red' }}>{error}</p>}
    {loading && <p>Cargando...</p>}
    {coleccion && (
      <>
        <h1>{coleccion.nombre}</h1>
        <p>{coleccion.descripcion}</p>

        {!usuario ? (
          <div style={{ color: '#b91c1c', fontWeight: 'bold', margin: '20px 0' }}>
            Debes iniciar sesión o registrarte para llevar un progreso en las colecciones de la plataforma.
          </div>
        ) : (
          <>
            <ProgressBar progreso={progreso} />
            <p>Has completado el {progreso.toFixed(2)}% de esta colección.</p>
          </>
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

          {/* Ordenamiento */}
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
        {/* Grid de elementos */} 
        <div className="elementos-grid" style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          {elementosConDetalles.map((el) => {
            const detalle = el.detalles || {};
            return (
              <div
                key={el.id_elemento}
                className={`elemento-card ${valorados.includes(el.id_elemento) ? 'valorado' : ''}`}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: valorados.includes(el.id_elemento) ? '#f0f9ff' : 'white',
                  border: '1px solid rgb(0, 27, 82)',
                  position: 'relative',
                }}
              >
                <Link
                  to={`/${el.entidad_tipo === 'artista' ? 'artist' : el.entidad_tipo === 'cancion' ? 'song' : el.entidad_tipo}/${el.entidad_id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {/* Imagen del elemento */}
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      marginBottom: '12px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={detalle.imagen ? detalle.imagen : '/default-artist.png'}
                      alt={detalle.titulo || detalle.nombre_artista || 'Entidad'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Detalles del elemento */}
                  <div style={{ marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1a56db' }}>
                      {detalle.titulo || detalle.nombre_artista || 'Cargando...'}
                    </h3>
                    {detalle.artista && (
                      <p style={{ margin: '4px 0', color: '#4b5563' }}>{detalle.artista}</p>
                    )}
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                    {typeof detalle.popularidad === 'number' && <p>Popularidad: {detalle.popularidad}</p>}
                    {detalle.duracion && (
                      <p>
                        Duración: {Math.floor(detalle.duracion / 60)}:
                        {(detalle.duracion % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                    {detalle.anio && <p>Año: {detalle.anio}</p>}
                    {detalle.calificacion_usuario && <p>Tu valoración: {detalle.calificacion_usuario}</p>}
                  </div>
                </Link>

                {/* Indicador de valoración */}
                {valorados.includes(el.id_elemento) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                    }}
                  >
                    Valorado ⭐
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Indicador de carga adicional */}
        {loadingMore && (
          <p style={{ textAlign: 'center', margin: '20px 0' }}>Cargando más...</p>
        )}
      </>
    )}
  </div>
);
};

export default ColeccionPage;