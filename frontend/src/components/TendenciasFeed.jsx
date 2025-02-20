import { useEffect, useState } from "react";
import axios from "axios";

const TendenciasFeed = () => {
  const [tendencias, setTendencias] = useState([]);

  useEffect(() => {
    const fetchTendencias = async () => {
      try {
        const response = await axios.get("http://localhost:5000/tendencias/feed");
        setTendencias(response.data);
      } catch (error) {
        console.error("Error al obtener el feed de tendencias:", error);
      }
    };
    fetchTendencias();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Tendencias Recientes</h2>
      <ul>
        {tendencias.map((tendencia) => (
          <li key={tendencia.id_tendencia} className="mb-2">
            {tendencia.usuarios?.nombre} {tendencia.accion} en{" "}
            {tendencia.entidad_tipo === "album" && tendencia.album?.titulo}
            {tendencia.entidad_tipo === "cancion" && tendencia.cancion?.titulo}
            {tendencia.entidad_tipo === "artista" && tendencia.artista?.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TendenciasFeed;