import { useEffect, useState } from "react";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';

const API_URL = `${import.meta.env.VITE_API_URL}/tendencias/feed`;

const MusicTendencias = ({ limit, itemsPerPage }) => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get(API_URL);
        setTendencias(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (error) {
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

  const maxPages = 5; // máximo 3 páginas

  function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  const getLink = (tipo, id) => {
    switch (tipo) {
      case "artista": return `/artist/${id}`;
      case "album": return `/album/${id}`;
      case "cancion": return `/song/${id}`;
      case "video": return `/video/${id}`;
      default: return `/`;
    }
  };

  return (
    <div className="tendencias-container">
      <h2>Tendencias Mensuales</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias
          .filter((item) => item.entidad_tipo === tipo)
          .slice(0, itemsPerPage * maxPages);

        const paginas = chunkArray(tendenciasFiltradas, itemsPerPage)
          .filter(p => p.length > 0);

        if (tendenciasFiltradas.length === 0) return null;

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            <Carousel
              responsive={{
                desktop: { breakpoint: { max: 3000, min: 1024 }, items: 1 },
                tablet: { breakpoint: { max: 1024, min: 464 }, items: 1 },
                mobile: { breakpoint: { max: 464, min: 0 }, items: 1 },
              }}
              infinite={true}
              autoPlay={false}
              containerClass="carousel-container"
              itemClass="carousel-item"
              arrows
              showDots={paginas.length > 1}
            >
              {paginas.map((pagina, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  maxWidth: 600,
                  margin: "0 auto"
                }}>
                  {pagina.map((item, index) => (
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
              ))}
            </Carousel>
          </div>
        );
      })}
    </div>
  );
};

MusicTendencias.propTypes = {
  limit: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
};

export default MusicTendencias;
