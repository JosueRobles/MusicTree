import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/tendencias/feed`;

const categorias = {
  artista: "Artistas",
  album: "Álbumes",
  cancion: "Canciones",
  video: "Videos Musicales",
};

const perPage = 5;

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

const TendenciasFeed = () => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);
  // control de página por categoría
  const [pageByCat, setPageByCat] = useState({});

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const res = await axios.get(API_URL);
        setTendencias(Array.isArray(res.data) ? res.data : []);
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
    <div className="tendencias-container">
      <h2 className="tendencias-title">Tendencias Mensuales</h2>

      {Object.keys(categorias).map((tipo) => {
        const filtradas = (tendencias.filter(it => it && it.entidad_tipo === tipo) || []).slice(0, 25);
        if (!filtradas.length) return null;

        const paginas = chunkArray(filtradas, perPage);
        const curPage = pageByCat[tipo] || 0;
        const items = paginas[curPage] || [];

        return (
          <section key={tipo} className="tendencias-section">
            <div className="tendencias-header">
              <h3>{categorias[tipo]}</h3>
              <div className="pager-controls">
                <button onClick={() => cambiarPagina(tipo, -1, paginas)} disabled={curPage <= 0} aria-label="Anterior">◀</button>
                <span className="pager-indicator">{curPage + 1} / {paginas.length}</span>
                <button onClick={() => cambiarPagina(tipo, +1, paginas)} disabled={curPage >= paginas.length - 1} aria-label="Siguiente">▶</button>
              </div>
            </div>

            <div
              className="tendencias-page"
              style={{
                display: 'flex',
                justifyContent: items.length < perPage ? 'center' : 'flex-start',
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
                  <div key={idKey} className="tendencia-card">
                    <Link to={getLink(tipo, item.id || item.entidad_id)}>
                      <img src={item.imagen || "/placeholder.png"} alt={item.nombre || item.texto} className="tendencia-imagen" />
                      <h4 className="tendencia-title">{item.nombre || item.texto}</h4>
                      <p className="tendencia-meta">
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

export default TendenciasFeed;
