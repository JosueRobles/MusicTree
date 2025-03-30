import { useEffect, useState } from "react";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/tendencias/orden";

const TendenciasFeed = () => {
  const [tendencias, setTendencias] = useState([]);
  const [error, setError] = useState(null);

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
    tablet: { breakpoint: { max: 1024, min: 464 }, items: 2, slidesToSlide: 2 },
    mobile: { breakpoint: { max: 464, min: 0 }, items: 1, slidesToSlide: 1 },
  };

  const getLink = (tipo, id) => {
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

  const generateCarouselItems = (items) => {
    if (items.length === 0) return [];
    
    const result = [];
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i++) {
      const startIndex = i % totalItems;
      const endIndex = (startIndex + 5) % totalItems;

      if (startIndex < endIndex) {
        result.push(items.slice(startIndex, endIndex));
      } else {
        result.push(items.slice(startIndex).concat(items.slice(0, endIndex)));
      }
    }

    return result.flat();
  };

  return (
    <div className="tendencias-container">
      <h2>Tendencias Semanales</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias
          .filter((item) => item.entidad_tipo === tipo)
          .slice(0, 15);

        const hasCarousel = tendenciasFiltradas.length >= 6;

        const carouselItems = hasCarousel ? generateCarouselItems(tendenciasFiltradas) : [];

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            {hasCarousel ? (
              <Carousel 
                responsive={responsive} 
                infinite 
                autoPlay 
                autoPlaySpeed={3000}
                containerClass="carousel-container"
                itemClass="carousel-item"
              >
                {carouselItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="tendencia-card"
                    style={{ width: 'calc(20% - 10px)', margin: '0 5px' }} // Ajustamos el tamaño de los cuadros
                  >
                    <Link to={getLink(tipo, item.entidad_id)}>
                      <img 
                        src={item.foto_album || item.imagen} 
                        alt={item.nombre} 
                        className="tendencia-imagen" 
                      />
                      <h4 className="text-center mt-1 text-sm">{item.nombre}</h4> {/* Mostramos el nombre */}
                    </Link>
                    <p className="text-center mt-1 text-xs">Valoraciones: {item.valoraciones}</p>
                    <p className="text-center mt-1 text-xs">Promedio: {item.promedio_valoracion?.toFixed(2) ?? "N/A"}</p>
                  </div>
                ))}
              </Carousel>
            ) : (
              <div className="static-container">
                {tendenciasFiltradas.map((item) => (
                  <div 
                    key={item.entidad_id} 
                    className="static-card"
                    style={{ width: 'calc(20% - 10px)', margin: '0 5px' }} // Ajustamos el tamaño de los cuadros
                  >
                    <Link to={getLink(tipo, item.entidad_id)}>
                      <img 
                        src={item.foto_album || item.imagen} 
                        alt={item.nombre} 
                        className="tendencia-imagen" 
                      />
                      <h4 className="text-center mt-1 text-sm">{item.nombre}</h4> {/* Mostramos el nombre */}
                    </Link>
                    <p className="text-center mt-1 text-xs">Valoraciones: {item.valoraciones}</p>
                    <p className="text-center mt-1 text-xs">Promedio: {item.promedio_valoracion?.toFixed(2) ?? "N/A"}</p>
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