import React, { useEffect, useState } from "react";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { Link } from "react-router-dom";

const API_URL = "https://organic-space-cod-7j9pgvq44qp36q9-5000.app.github.dev/tendencias/feed";

const TendenciasFeed = () => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get(API_URL);
        console.log("Respuesta de la API:", response.data);
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

  useEffect(() => {
    console.log("Tendencias actualizadas:", tendencias);
  }, [tendencias]);

  const categorias = {
    artista: "Artistas",
    album: "Álbumes",
    cancion: "Canciones",
    video: "Videos Musicales",
  };

  const responsive = {
    desktop: { breakpoint: { max: 3000, min: 1024 }, items: 4, slidesToSlide: 4 },
    tablet: { breakpoint: { max: 1024, min: 464 }, items: 2, slidesToSlide: 2 },
    mobile: { breakpoint: { max: 464, min: 0 }, items: 1, slidesToSlide: 1 },
  };

  const getLink = (tipo, id) => {
    switch (tipo) {
      case 'artista':
        return `/artist/${id}`;
      case 'album':
        return `/album/${id}`;
      case 'cancion':
        return `/song/${id}`;
      case 'video':
        return `/video/${id}`;
      default:
        return `/`;
    }
  };

  return (
    <div className="tendencias-container">
      <h2>Tendencias Recientes</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias.filter((item) => item.entidad_tipo === tipo);

        console.log(`Tendencias filtradas para ${tipo}:`, tendenciasFiltradas);

        if (tendenciasFiltradas.length === 0) return null;

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            <Carousel responsive={responsive} infinite autoPlay autoPlaySpeed={3000}>
              {tendenciasFiltradas.map((item) => (
                <div key={item.entidad_id} className="tendencia-card">
                  <Link to={getLink(tipo, item.entidad_id)}>
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="tendencia-imagen" />
                    ) : (
                      <div className="placeholder-imagen">Sin Imagen</div>
                    )}
                    <h4>{item.nombre}</h4>
                  </Link>
                  <p>Valoraciones: {item.valoraciones}</p>
                  <p>Promedio: {item.promedio_valoracion?.toFixed(2) ?? "N/A"}</p>
                </div>
              ))}
            </Carousel>
          </div>
        );
      })}
    </div>
  );
};

export default TendenciasFeed;