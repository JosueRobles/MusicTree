import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const Badges = ({ usuario }) => {
  const [insignias, setInsignias] = useState([]);
  const [insigniasUsuario, setInsigniasUsuario] = useState([]);
  const [newBadge, setNewBadge] = useState(null);
  const [error, setError] = useState(null);
  
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroCantidad, setFiltroCantidad] = useState('');
  const [ordenFecha, setOrdenFecha] = useState('ninguno');  // Cambiar a 'ninguno'

  useEffect(() => {
    const fetchInsignias = async () => {
      try {
        const response = await axios.get(`${API_URL}/insignias`);
        setInsignias(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (error) {
        setInsignias([]);
        setError(error.message || 'Error al obtener insignias');
      }
    };

    const fetchInsigniasUsuario = async () => {
      if (usuario) {
        try {
          // Cambia aquí para usar el endpoint de progreso
          const response = await axios.get(`${API_URL}/insignias/progreso/${usuario.id_usuario}`);

          // Verificar la estructura de la respuesta y adaptarse a ella
          if (response.data && response.data.progreso) {
            // Si la respuesta tiene formato { progreso: [...] }
            setInsigniasUsuario(Array.isArray(response.data.progreso) ? response.data.progreso : []);
          } else {
            // Si la respuesta es directamente un array
            setInsigniasUsuario(Array.isArray(response.data) ? response.data : []);
          }
        } catch (error) {
          console.error("Error al obtener progreso de insignias:", error);
          setInsigniasUsuario([]);
        }
      }
    };

    fetchInsignias();
    fetchInsigniasUsuario();
  }, [usuario]);

  useEffect(() => {
    if (newBadge) {
      const audio = new Audio('/path/to/sound.mp3');
      audio.play();
    }
  }, [newBadge]);

  // Busca el progreso de la insignia
  const obtenerProgresoInsignia = (insigniaId) => {
    return insigniasUsuario.find((insignia) =>
      String(insignia.insignia_id) === String(insigniaId)
    );
  };

  const totalInsignias = insignias.length;
  const obtenidas = insigniasUsuario.filter(insignia =>
    // Asegurarse de que progreso es un número y es >= 100
    insignia.progreso !== undefined &&
    !isNaN(insignia.progreso) &&
    Number(insignia.progreso) >= 100
  ).length;
  const porcentaje = totalInsignias > 0 ? Math.round((obtenidas / totalInsignias) * 100) : 0;

  // Filtrar insignias según los criterios seleccionados
  const insigniasFiltradas = insignias.filter(insignia => {
    const progreso = obtenerProgresoInsignia(insignia.id_insignia);
    const obtenida = progreso && Number(progreso.progreso) >= 100;

    // Filtro por estado (obtenidas/pendientes)
    if (filtroEstado === 'obtenidas' && !obtenida) return false;
    if (filtroEstado === 'pendientes' && obtenida) return false;

    // Filtro por cantidad
    if (filtroCantidad && insignia.criterio) {
      try {
        const criterio = typeof insignia.criterio === 'string'
          ? JSON.parse(insignia.criterio)
          : insignia.criterio;

        if (criterio.cantidad !== parseInt(filtroCantidad)) {
          return false;
        }
      } catch (e) {
        // Si hay error al parsear, no filtrar
        console.log("Error al parsear criterio:", e);
      }
    }

    return true;
  });

  // Ordenar por fecha si es necesario
  const insigniasOrdenadas = [...insigniasFiltradas].sort((a, b) => {
    if (ordenFecha === 'antiguas' || ordenFecha === 'recientes') {
      const progresoA = obtenerProgresoInsignia(a.id_insignia);
      const progresoB = obtenerProgresoInsignia(b.id_insignia);

      // Si no tienen fecha, se posicionan al final
      if (!progresoA || !progresoB) {
        // Los que tienen progreso van primero
        if (progresoA && !progresoB) return -1;
        if (!progresoA && progresoB) return 1;
        return 0;
      }

      const fechaA = new Date(progresoA.fecha || 0).getTime();
      const fechaB = new Date(progresoB.fecha || 0).getTime();

      return ordenFecha === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
    }
    return 0;
  });

  return (
    <div>
      <main className="p-4">
        <h2 className="text-4xl font-bold my-4">Insignias</h2>
        {usuario && totalInsignias > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: "bold", fontSize: "1.1rem", marginBottom: 8 }}>
              Tienes {obtenidas}/{totalInsignias} insignias ({porcentaje}%)
            </div>
            <div style={{
              width: 320,
              maxWidth: "90vw",
              margin: "0 auto 8px auto",
              background: "#eee",
              borderRadius: 8,
              overflow: "hidden"
            }}>
              <div
                style={{
                  width: `${porcentaje}%`,
                  background: "#16a34a",
                  height: 14
                }}
              />
            </div>
            {obtenidas === totalInsignias && totalInsignias > 0 ? (
              <div style={{ color: "#16a34a", fontWeight: "bold", marginTop: 8 }}>
                ¡Agradecemos tu entusiasmo, pronto habrá nuevas insignias!
              </div>
            ) : (
              <div style={{ color: "#eab308", marginTop: 8 }}>
                ¡Sigue así!
              </div>
            )}
          </div>
        )}

        {usuario && (
          <div className="filters-container" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {/* Filtro por estado */}
            <div className="filter-group">
              <label style={{ fontWeight: 'bold', marginRight: 8 }}>Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="todas">Todas</option>
                <option value="obtenidas">Obtenidas</option>
                <option value="pendientes">Por conseguir</option>
              </select>
            </div>

            {/* Filtro por cantidad */}
            <div className="filter-group">
              <label style={{ fontWeight: 'bold', marginRight: 8 }}>Cantidad:</label>
              <select
                value={filtroCantidad}
                onChange={(e) => setFiltroCantidad(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="">Todas</option>
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>

            {/* Ordenar por fecha */}
            <div className="filter-group">
              <label style={{ fontWeight: 'bold', marginRight: 8 }}>Ordenar:</label>
              <select
                value={ordenFecha}
                onChange={(e) => setOrdenFecha(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="ninguno">Sin ordenar</option>
                <option value="recientes">Más recientes primero</option>
                <option value="antiguas">Más antiguas primero</option>
              </select>
            </div>
          </div>
        )}

        {usuario ? (
          <>
            <div className="insignias-grid">
              {insigniasOrdenadas.length > 0 ? (
                insigniasOrdenadas.map((insignia) => {
                  const progreso = obtenerProgresoInsignia(insignia.id_insignia);
                  const progresoValor = progreso ? Number(progreso.progreso) : 0;
                  const obtenida = progreso && progresoValor >= 100;

                  return (
                    <Link
                      to={`/badge/${insignia.id_insignia}`}
                      key={insignia.id_insignia}
                      className={`insignia-badge-link${obtenida ? ' obtenida' : ''}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="insignia-badge">
                        <img
                          src={insignia.icono || '/insignias/placeholder.png'}
                          alt={insignia.nombre}
                          className={`insignia-img${obtenida ? ' obtenida' : ''}`}
                        />
                        <h3>{insignia.nombre}</h3>
                        <p>{insignia.descripcion}</p>
                        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                          <div style={{
                            width: 200,
                            background: "#eee",
                            borderRadius: 8,
                            overflow: "hidden",
                            margin: "0.5rem 0"
                          }}>
                            <div
                              style={{
                                width: `${Math.min(progresoValor || 0, 100)}%`,
                                background: "#16a34a",
                                height: 10
                              }}
                            />
                          </div>
                        </div>
                        {obtenida ? (
                          <p style={{ color: "#16a34a", fontWeight: "bold", marginTop: 8 }}>
                            Obtenida {progreso?.fecha ? new Date(progreso.fecha).toLocaleDateString() : ''}
                          </p>
                        ) : (
                          <p className="text-red-500" style={{ marginTop: 8 }}>
                            No obtenida {progresoValor > 0 ? `(${progresoValor}%)` : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', width: '100%', padding: '2rem 0' }}>
                  <p>No se encontraron insignias que coincidan con los filtros seleccionados.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <p>¡Inicia sesión o crea una cuenta para comenzar a obtener insignias!</p>
            <p>Las insignias son una forma divertida de reconocer tus logros y participación en MusicTree. ¡Empieza hoy mismo!</p>
          </div>
        )}
        {error && <div style={{color: 'red'}}>Error: {error}</div>}
      </main>
    </div>
  );
};

Badges.propTypes = {
  usuario: PropTypes.shape({
    id_usuario: PropTypes.number,
  }),
};

export default Badges;