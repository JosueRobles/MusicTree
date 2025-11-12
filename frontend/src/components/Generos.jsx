import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const imagenesPorGenero = {
  1: "/generos/1.png",
  2: "/generos/2.png",
  3: "/generos/3.png",
  4: "/generos/4.png",
  5: "/generos/5.png",
  6: "/generos/6.png",
  7: "/generos/7.png",
  8: "/generos/8.png",
  9: "/generos/9.png",
  10: "/generos/10.png",
  11: "/generos/11.png",
  12: "/generos/12.png",
  13: "/generos/13.png",
  14: "/generos/14.png",
};

const GENEROS_POR_PAGINA = 5;

const Generos = () => {
  const [generos, setGeneros] = useState([]);
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    axios.get(`${API_URL}/generos`)
      .then(res => setGeneros(res.data))
      .catch(() => setGeneros([]));
  }, []);

  const totalPaginas = Math.ceil(generos.length / GENEROS_POR_PAGINA);

  const handleNext = () => {
    if (pagina < totalPaginas - 1) setPagina(pagina + 1);
  };

  const handlePrev = () => {
    if (pagina > 0) setPagina(pagina - 1);
  };

  const generosPagina = generos.slice(
    pagina * GENEROS_POR_PAGINA,
    pagina * GENEROS_POR_PAGINA + GENEROS_POR_PAGINA
  );

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">Explora por Género</h3>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        marginBottom: "2rem",
        width: '100%'
      }}>
        {/* Flecha izquierda */}
        <button
          onClick={handlePrev}
          disabled={pagina === 0}
          style={{
            background: "none",
            border: "none",
            fontSize: "2rem",
            color: pagina === 0 ? "#888" : "#fff",
            cursor: pagina === 0 ? "default" : "pointer",
            userSelect: "none"
          }}
          aria-label="Anterior"
        >
          &#8592;
        </button>
        {/* Carrusel de géneros */}
        <div
          role="list"
          aria-label="Géneros"
          style={{
            display: "flex",
            gap: "20px",
            overflowX: 'auto',
            padding: '8px 4px',
            WebkitOverflowScrolling: 'touch'
          }}>
          {generosPagina.map(genero => (
            <Link
              key={genero.id_genero}
              to={`/genre/${genero.id_genero}`}
              style={{
                background: "#065F46",
                color: "white",
                borderRadius: "12px",
                width: 180,
                minHeight: 220,
                textAlign: "center",
                textDecoration: "none",
                boxShadow: "2px 2px 10px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "1rem"
              }}
              role="listitem"
            >
              <img
                src={imagenesPorGenero[genero.id_genero] || "/default-image.png"}
                alt={genero.nombre}
                loading="lazy"
                width="260"
                height="140"
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "1rem"
                }}
              />
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{genero.nombre}</span>
              <span style={{ fontSize: "0.9rem", marginTop: 8, color: "#d1fae5" }}>
                {genero.descripcion
                  ? genero.descripcion.length > 100
                    ? genero.descripcion.slice(0, 100) + "..."
                    : genero.descripcion
                  : "Descubre lo mejor de este género"}
              </span>
            </Link>
          ))}
        </div>
        {/* Flecha derecha */}
        <button
          onClick={handleNext}
          disabled={pagina === totalPaginas - 1}
          style={{
            background: "none",
            border: "none",
            fontSize: "2rem",
            color: pagina === totalPaginas - 1 ? "#888" : "#fff",
            cursor: pagina === totalPaginas - 1 ? "default" : "pointer",
            userSelect: "none"
          }}
          aria-label="Siguiente"
        >
          &#8594;
        </button>
      </div>
    </div>
  );
};

export default Generos;