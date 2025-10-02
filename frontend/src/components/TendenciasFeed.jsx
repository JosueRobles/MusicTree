import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_API_URL}/tendencias/feed`;

const TendenciasFeed = () => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);
  const [pausedCategory, setPausedCategory] = useState(null);

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get(API_URL);
        setTendencias(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (error) {
        console.error("Error al obtener tendencias:", error);
        setError("No se pudo obtener las tendencias. Por favor, inténtalo de nuevo más tarde.");
        setTendencias([]);
      }
    };

    fetchTendencias();
  }, []);

  const categorias = {
    artista: "Artistas",
    album: "Álbumes",
    cancion: "Canciones",
    video: "Videos Musicales",
  };

  const maxPages = 3;

  const getLink = (tipo, id, valoraciones, promedio_valoracion) => {
    switch (tipo) {
      case "artista":
        return `/artist/${id}`;
      case "album":
        return `/album/${id}`;
      case "cancion":
        return `/song/${id}`;
      case "video":
        return `/video/${id}`;
      default:
        return `/`;
    }
  };

  return (
    <div className="tendencias-container">
      <h2>Tendencias Mensuales</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias
          .filter((item) => item.entidad_tipo === tipo)
          .slice(0, 5 * maxPages);

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {tendenciasFiltradas.map((item, index) => (
                <div key={item.id || item.entidad_id || index} className="tendencia-card">
                  <Link to={getLink(tipo, item.id || item.entidad_id)}>
                    <img
                      src={item.imagen || "/placeholder.png"}
                      alt={item.nombre}
                      className="tendencia-imagen"
                    />
                    <h4 className="text-center mt-1 text-sm">{item.nombre}</h4>
                    <p className="text-center mt-1 text-xs">
                      Valoraciones: {item.valoraciones}
                      {item.promedio_valoracion != null && (
                        <> | Promedio: {Number(item.promedio_valoracion).toFixed(1)} ⭐</>
                      )}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TendenciasFeed;