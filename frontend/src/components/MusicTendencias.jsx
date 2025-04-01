import { useEffect, useState } from "react";
import axios from "axios";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';

const API_URL = "http://localhost:5000/tendencias/orden";

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
    desktop: { breakpoint: { max: 3000, min: 1024 }, items: itemsPerPage, slidesToSlide: itemsPerPage },
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

  const getImage = (item, tipo) => {
    switch (tipo) {
      case "artista":
        return item.foto_artista;
      case "album":
        return item.foto_album;
      case "cancion":
        return item.foto_album; // Asumimos que la canción usa la foto del álbum
      case "video":
        return item.miniatura;
      default:
        return "";
    }
  };

  return (
    <div className="tendencias-container">
      <h2>Tendencias Semanales</h2>
      {error && <p className="error-message">{error}</p>}
      {Object.keys(categorias).map((tipo) => {
        const tendenciasFiltradas = tendencias
          .filter((item) => item.entidad_tipo === tipo)
          .slice(0, limit);

        if (tendenciasFiltradas.length === 0) return null;

        return (
          <div key={tipo}>
            <h3>{categorias[tipo]}</h3>
            <Carousel 
              responsive={responsive} 
              infinite 
              autoPlay 
              autoPlaySpeed={3000}
              containerClass="carousel-container"
              itemClass="carousel-item"
            >
              {tendenciasFiltradas.map((item, index) => (
                <div 
                  key={index} 
                  className="tendencia-card"
                  style={{ width: 'calc(20% - 10px)', margin: '0 5px', border: '2px solid green' }} // Ajustamos el tamaño de los cuadros y agregamos el borde verde
                >
                  <Link to={getLink(tipo, item.entidad_id)}>
                    <img 
                      src={getImage(item, tipo)}
                      alt={item.nombre} 
                      className="tendencia-imagen" 
                    />
                    <h4 className="text-center mt-1 text-sm">{item.nombre}</h4> {/* Mostramos el nombre */}
                  </Link>
                  <p className="text-center mt-1 text-xs">Valoraciones: {item.valoraciones}</p>
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
  itemsPerPage: PropTypes.number.isRequired
};

export default MusicTendencias;