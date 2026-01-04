import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import axios from 'axios';
import { UsuarioContext } from '../context/UsuarioContext';

const API_URL = import.meta.env.VITE_API_URL;

const ColeccionPage = () => {
  const { id } = useParams(); // Obtener el ID de la colección desde la URL
  const { usuario } = useContext(UsuarioContext);
  const [coleccion, setColeccion] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50; // Número de elementos a cargar por página
  const [hasMore, setHasMore] = useState(true); // Indica si hay más elementos para cargar
  const [progreso, setProgreso] = useState(0); // Progreso del usuario en la colección
  const [valorados, setValorados] = useState([]); // <-- NUEVO
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'valorados', 'pendientes'
  const [ordenarPor, setOrdenarPor] = useState('predeterminada'); // 'predeterminada', 'titulo', 'calificacion', etc.
  const [ordenDireccion, setOrdenDireccion] = useState('desc'); // 'asc', 'desc'
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);


  // Función para cargar los elementos de la colección con paginación
  const fetchElementos = useCallback(async (paginaActual = 1) => {
    setLoading(true);
    try {
      const elementosResponse = await axios.get(`${API_URL}/colecciones/${id}/elementos`, {
        params: {
          offset: (paginaActual - 1) * limit,
          limit,
          userId: usuario?.id_usuario,
          orderBy: ordenarPor,             // siempre manda algo
          orderDirection: ordenDireccion,  // siempre manda algo
          filterValorados: filtroEstado === 'todos' ? undefined :
                          filtroEstado === 'valorados' ? true : false,
        },
      });
      setElementos(elementosResponse.data);
      setPagina(paginaActual);

      // Obtener el total de elementos para calcular totalPaginas
      const totalRes = await axios.get(`${API_URL}/colecciones/${id}/elementos/count`, {
        params: {
          userId: usuario?.id_usuario,
          filterValorados: filtroEstado === 'todos' ? undefined :
                 filtroEstado === 'valorados' ? 'true' : 'false',
        },
      });
      setTotalPaginas(Math.ceil(totalRes.data.total / limit));
      setLoading(false);
    } catch (error) {
      setError('Error al cargar los elementos.');
      setLoading(false);
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

  // Cargar los datos de la colección
  useEffect(() => {
    const fetchColeccionData = async () => {
      try {
        const coleccionResponse = await axios.get(`${API_URL}/colecciones/${id}`);
        setColeccion(coleccionResponse.data);
        fetchElementos(1); // <-- Página inicial debe ser 1
        fetchProgreso();
      } catch (coleccionError) {
        setError('Error al cargar la colección');
        setLoading(false);
      }
    };
    fetchColeccionData();
  }, [id, fetchElementos, fetchProgreso]);

  const getOpcionesOrdenamiento = () => {
    if (!coleccion) return [];
    return [
      { value: 'predeterminada', label: 'Predeterminada' },
      { value: 'titulo', label: 'Titulo' },
      { value: 'artista', label: 'Artista' }, // <-- NUEVO
      { value: 'popularidad', label: 'Popularidad' },
      ...(coleccion.tipo_coleccion === 'cancion' || coleccion.tipo_coleccion === 'video'
        ? [{ value: 'duracion', label: 'Duración' }]
        : []),
      ...(coleccion.tipo_coleccion !== 'artista'
        ? [{ value: 'anio', label: 'Año' }]
        : [])
    ];
  };

  const elementosConDetalles = elementos; // Ya vienen filtrados y ordenados del backend

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
            const detalle = {
              titulo: el.titulo,
              nombre_artista: el.nombre_artista, // solo para artistas
              artista: el.artista,
              anio: el.anio,
              popularidad: el.popularidad,
              imagen: el.imagen,
              calificacion_usuario: el.calificacion_usuario // si lo agregas luego
            };
            return (
              <div
                key={el.id_elemento}
                className={`elemento-card ${el.valorado ? 'valorado' : ''}`}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: valorados.includes(el.id_elemento) ? '#f0f9ff' : 'white',
                  border: '1px solid rgb(0, 27, 82)',
                  position: 'relative',
                }}
              >
                <Link
                  to={
                    el.entidad_tipo === 'cancion'
                      ? `/song/${el.entidad_id}?context=coleccion&contextId=${id}`
                      : `/${el.entidad_tipo === 'artista' ? 'artist' : el.entidad_tipo}/${el.entidad_id}`
                  }
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
                    {detalle.artista && <p style={{ margin: '4px 0', color: '#4b5563' }}>Artista(s): {detalle.artista}</p>}
                    {detalle.anio && <p style={{ margin: '4px 0', color: '#4b5563' }}>Año: {detalle.anio}</p>}
                    {detalle.popularidad && <p style={{ margin: '4px 0', color: '#4b5563' }}>Popularidad: {detalle.popularidad}</p>}
                    {detalle.generos && <p style={{ margin: '4px 0', color: '#4b5563' }}>Géneros: {detalle.generos.join(", ")}</p>}
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                    {detalle.calificacion_usuario && <p>Tu valoración: {detalle.calificacion_usuario}</p>}
                  </div>
                </Link>

                {/* Indicador de valoración */}
                {el.valorado && (
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

        {/* Botones de paginación */}
<div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0', gap: 12 }}>
  <button
    disabled={pagina <= 1}
    onClick={() => fetchElementos(pagina - 1)}
    style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none' }}
  >
    Anterior
  </button>
  <span style={{ fontWeight: 'bold', color: '#222', fontSize: '1.1rem' }}>
    Página {pagina} de {totalPaginas}
  </span>
  <button
    disabled={pagina >= totalPaginas}
    onClick={() => fetchElementos(pagina + 1)}
    style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none' }}
  >
    Siguiente
  </button>
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