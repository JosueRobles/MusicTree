import { useEffect, useState } from "react";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
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

  const responsive = {
    desktop: { breakpoint: { max: 3000, min: 1024 }, items: 5, slidesToSlide: 5 },
    tablet: { breakpoint: { max: 1024, min: 464 }, items: 5, slidesToSlide: 5 },
    mobile: { breakpoint: { max: 464, min: 0 }, items: 5, slidesToSlide: 5 },
  };

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
      <h2>Tendencias Semanales</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias
          .filter((item) => item.entidad_tipo === tipo)
          .map((item) => ({
            id: item.entidad_id,
            nombre: item.nombre,
            imagen: item.imagen,
            valoraciones: item.valoraciones,
            promedio_valoracion: item.promedio_valoracion,
          }));

        const hasCarousel = tendenciasFiltradas.length >= 25;

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            {hasCarousel ? (
              <Carousel
                responsive={responsive}
                infinite={true}
                autoPlay={pausedCategory !== tipo}
                containerClass="carousel-container"
                itemClass="carousel-item"
                partialVisible={false}
                removeArrowOnDeviceType={["mobile"]}
              >
                {tendenciasFiltradas.map((item, index) => (
                  <div
                    key={item.id}
                    className="tendencia-card"
                    onMouseEnter={() => setPausedCategory(tipo)}
                    onMouseLeave={() => setPausedCategory(null)}
                  >
                    <Link to={getLink(tipo, item.id)}>
                      <img
                        src={item.imagen}
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
              </Carousel>
            ) : (
              <div className="static-container">
                {tendenciasFiltradas.map((item, index) => (
                  <div key={`${item.id}_${tipo}`} className="tendencia-card">
                    <Link to={getLink(tipo, item.id)}>
                      <img
                        src={item.imagen}
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
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TendenciasFeed;