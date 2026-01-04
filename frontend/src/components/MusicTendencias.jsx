import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';

const API_URL = `${import.meta.env.VITE_API_URL}/tendencias/feed`;

const categorias = {
  artista: "Artistas",
  album: "Álbumes",
  cancion: "Canciones",
  video: "Videos Musicales",
};

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const getLink = (tipo, id) => {
  switch (tipo) {
    case "artista": return `/artist/${id}`;
    case "album": return `/album/${id}`;
    case "cancion": return `/song/${id}`;
    case "video": return `/video/${id}`;
    default: return `/`;
  }
};

const MusicTendencias = ({ itemsPerPage = 8, maxPages = 10 }) => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);
  const [pageByCat, setPageByCat] = useState({});

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get(API_URL);
        setTendencias(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error("Error al obtener tendencias:", err);
        setError("No se pudo obtener las tendencias. Intenta más tarde.");
        setTendencias([]);
      }
    };
    fetchTendencias();
  }, []);

  const cambiarPagina = (tipo, delta, paginas) => {
    setPageByCat(prev => {
      const cur = prev[tipo] || 0;
      const next = Math.min(Math.max(cur + delta, 0), paginas.length - 1);
      return { ...prev, [tipo]: next };
    });
  };

  return (
    <div className="music-tendencias-container">
      <h2>Tendencias Mensuales</h2>

      {Object.keys(categorias).map((tipo) => {
        // filtrar y limitar por tipo: itemsPerPage * maxPages
        const filtradas = (tendencias.filter(it => it && it.entidad_tipo === tipo) || [])
          .slice(0, itemsPerPage * maxPages);
        if (!filtradas.length) return null;

        const paginas = chunkArray(filtradas, itemsPerPage);
        const curPage = pageByCat[tipo] || 0;
        const items = paginas[curPage] || [];

        return (
          <section key={tipo} className="music-tendencias-section">
            <div className="tendencias-header">
              <h3>{categorias[tipo]}</h3>
              <div className="pager-controls">
                <button onClick={() => cambiarPagina(tipo, -1, paginas)} disabled={curPage <= 0} aria-label="Anterior">◀</button>
                <span className="pager-indicator">{curPage + 1} / {paginas.length}</span>
                <button onClick={() => cambiarPagina(tipo, +1, paginas)} disabled={curPage >= paginas.length - 1} aria-label="Siguiente">▶</button>
              </div>
            </div>

            <div
              className="music-tendencias-page"
              style={{
                display: 'flex',
                justifyContent: items.length < itemsPerPage ? 'center' : 'flex-start',
                gap: 16,
                padding: '8px 6px',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                overflowY: 'visible',
                alignItems: 'flex-start'
              }}
            >
              {items.map((item, index) => {
                if (!item) return null;
                const idKey = item.id || item.entidad_id || `${tipo}-${curPage}-${index}`;
                return (
                  <div key={idKey} className="music-tendencia-card">
                    <Link to={getLink(tipo, item.id || item.entidad_id)}>
                      <img src={item.imagen || "/placeholder.png"} alt={item.nombre || item.texto} className="music-tendencia-imagen" />
                      <h4 className="text-center mt-1 text-sm">{item.nombre || item.texto}</h4>
                      <p className="text-center mt-1 text-xs">
                        Valoraciones: {item.valoraciones || 0}
                        {item.promedio_valoracion != null && (<> | Promedio: {Number(item.promedio_valoracion).toFixed(1)} ⭐</>)}
                      </p>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {error && <div className="tendencias-error">{error}</div>}
    </div>
  );
};

MusicTendencias.propTypes = {
  itemsPerPage: PropTypes.number,
  maxPages: PropTypes.number,
};

MusicTendencias.defaultProps = {
  itemsPerPage: 8,
  maxPages: 10,
};

export default MusicTendencias;
