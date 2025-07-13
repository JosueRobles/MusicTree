import { useState } from "react";

const CarruselEntidad = ({
  titulo,
  entidades,
  renderEntidad,
  porPagina = 6,
  onCargarMas,
  hayMas
}) => {
  const [pagina, setPagina] = useState(0);

  const totalPaginas = Math.ceil(entidades.length / porPagina);

  const handleNext = () => {
    if (pagina < totalPaginas - 1) {
      setPagina(pagina + 1);
      // Si estamos en la última página cargada y hay más, pide más
      if (pagina + 1 === totalPaginas - 1 && hayMas) {
        onCargarMas && onCargarMas();
      }
    }
  };

  const handlePrev = () => {
    if (pagina > 0) setPagina(pagina - 1);
  };

  const entidadesPagina = entidades.slice(
    pagina * porPagina,
    pagina * porPagina + porPagina
  );

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "1rem 0 0.5rem 0" }}>{titulo}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
          {entidadesPagina.map(renderEntidad)}
        </div>
        <button
          onClick={handleNext}
          disabled={pagina >= totalPaginas - 1 && !hayMas}
          style={{
            background: "none",
            border: "none",
            fontSize: "2rem",
            color: pagina >= totalPaginas - 1 && !hayMas ? "#888" : "#fff",
            cursor: pagina >= totalPaginas - 1 && !hayMas ? "default" : "pointer",
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

export default CarruselEntidad;