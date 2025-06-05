import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import axios from 'axios';

const API_URL = "http://localhost:5000";

const ColeccionPage = () => {
  const { id } = useParams(); // Obtener el ID de la colección desde la URL
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

  // Función para cargar los elementos de la colección con paginación
  const fetchElementos = useCallback(async (currentOffset) => {
    try {
      setLoadingMore(true);
      const elementosResponse = await axios.get(`${API_URL}/colecciones/${id}/elementos`, {
        params: { offset: currentOffset, limit },
      });

      if (elementosResponse.data.length === 0) {
        setHasMore(false);
      } else {
        setElementos((prev) => [...prev, ...elementosResponse.data]);
        setOffset((prev) => prev + limit);

        const detallesTemp = {};
        await Promise.all(
          elementosResponse.data.map(async (elemento) => {
            try {
              let detalleResponse;
              switch (elemento.entidad_tipo) {
                case 'album':
                  detalleResponse = await axios.get(`${API_URL}/albumes/${elemento.entidad_id}`);
                  detallesTemp[elemento.id_elemento] = detalleResponse.data.album;
                  break;
                case 'artista':
                  detalleResponse = await axios.get(`${API_URL}/artistas/${elemento.entidad_id}`);
                  detallesTemp[elemento.id_elemento] = detalleResponse.data.artista;
                  break;
                case 'cancion':
                  detalleResponse = await axios.get(`${API_URL}/canciones/${elemento.entidad_id}`);
                  detallesTemp[elemento.id_elemento] = detalleResponse.data;
                  break;
                case 'video':
                  detalleResponse = await axios.get(`${API_URL}/videos/${elemento.entidad_id}`);
                  detallesTemp[elemento.id_elemento] = detalleResponse.data;
                  break;
                default:
                  detallesTemp[elemento.id_elemento] = { error: 'Tipo de entidad desconocido' };
              }
            } catch (detalleError) {
              console.error(`Error fetching ${elemento.entidad_tipo} details:`, detalleError);
              detallesTemp[elemento.id_elemento] = { error: 'No encontrado' };
            }
          })
        );

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
  }, [id, limit]);

  // Función para cargar el progreso del usuario en la colección
  const fetchProgreso = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/colecciones/${id}/progreso/1`); // Cambiar "1" por el ID del usuario dinámico
      setProgreso(response.data.progreso || 0);
    } catch (error) {
      console.error("Error al obtener el progreso:", error);
      setProgreso(0);
    }
  }, [id]);

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
        fetchProgreso(); // Cargar el progreso del usuario
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

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Cargando...</p>}
      {coleccion && (
        <>
          <h1>{coleccion.nombre}</h1>
          <p>{coleccion.descripcion}</p>
          <ProgressBar progreso={progreso} />
          <p>Has completado el {progreso.toFixed(2)}% de esta colección.</p>
          <ul>
            {elementos.map((elemento, index) => (
              <li key={`${elemento.id_elemento}-${index}`}>
                <Link
                  to={`/${elemento.entidad_tipo === 'cancion' ? 'song' : elemento.entidad_tipo}/${elemento.entidad_id}`}
                >
                  {detalles[elemento.id_elemento] ? (
                    detalles[elemento.id_elemento].error ? (
                      `Entidad ${elemento.entidad_id} no encontrada`
                    ) : (
                      elemento.entidad_tipo === 'cancion'
                        ? detalles[elemento.id_elemento].titulo
                        : elemento.entidad_tipo === 'album'
                        ? detalles[elemento.id_elemento].titulo
                        : elemento.entidad_tipo === 'artista'
                        ? detalles[elemento.id_elemento].nombre_artista
                        : elemento.entidad_tipo === 'video'
                        ? detalles[elemento.id_elemento].titulo
                        : `Entidad ${elemento.entidad_id}`
                    )
                  ) : (
                    `Cargando...`
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {loadingMore && <p>Cargando más...</p>}
        </>
      )}
    </div>
  );
};

export default ColeccionPage;