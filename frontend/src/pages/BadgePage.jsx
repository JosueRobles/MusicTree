import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL;

const BadgePage = ({ usuario }) => {
  const { id } = useParams();
  const [insignia, setInsignia] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const fetchInsignia = async () => {
      try {
        const res = await axios.get(`${API_URL}/insignias`);
        const badge = res.data.find(i => String(i.id_insignia) === String(id));
        setInsignia(badge);
      } catch (error) {
        setInsignia(null);
      }
    };

    const fetchProgreso = async () => {
      if (usuario) {
        try {
          // endpoint más rápido: insignias_usuario + insignias
          const res = await axios.get(`${API_URL}/insignias/usuario/${usuario.id_usuario}`);
          // buscar si la insignia está en la lista del usuario
          const prog = (res.data || []).find(i => String(i.insignia_id) === String(id));
          setProgreso(prog || null);
        } catch (error) {
          setProgreso(null);
        }
      }
    };

    fetchInsignia();
    fetchProgreso();
  }, [id, usuario]);

  if (!insignia) return <div>Cargando insignia...</div>;

  let criterio = {};
  try {
    criterio = typeof insignia.criterio === 'string' ? JSON.parse(insignia.criterio) : insignia.criterio;
  } catch {
    criterio = {};
  }

  const handleShare = async () => {
  const badgeContainer = document.getElementById("badge-container");
  if (!badgeContainer) return;

  const canvas = await html2canvas(badgeContainer);
  const url = canvas.toDataURL();
  const link = document.createElement("a");
  link.href = url;
  link.download = `musicTree-badge-${insignia.nombre}.png`;
  link.click();

  const texto = `Mira la insignia "${insignia.nombre}" que gané a través de MusicTree. ¡Ahora ve y publícalo en tus redes sociales!`;

  try {
    await navigator.clipboard.writeText(texto);
    setMensaje("Texto copiado al portapapeles. ¡Ahora ve y publícalo en tus redes sociales!");
  } catch (err) {
    setMensaje("No se pudo copiar el texto automáticamente. Cópialo manualmente");
  }
};

  return (
    <div id="badge-container" style={{ background: "#222", padding: 20 }}>
  <h2 className="text-3xl font-bold mb-2">{insignia.nombre}</h2>
  <img
    id="badge-image"
    src={insignia.icono}
    alt={insignia.nombre}
    style={{
      width: 240,
      height: 240,
      objectFit: 'cover',
      borderRadius: 0, // Imagen cuadrada
      margin: "0 auto",
      display: "block",
      border: "5px solid #16a34a",
      background: "#222"
    }}
  />
  <p className="my-2" style={{ fontSize: "1.2rem" }}>{insignia.descripcion}</p>
      {usuario && progreso && (
        <div className="my-4">
          <strong>Progreso:</strong>
          <div style={{
            width: 300,
            margin: "12px auto",
            background: "#eee",
            borderRadius: 8,
            overflow: "hidden"
          }}>
            <div
              style={{
                width: `${Math.min(progreso.progreso, 100)}%`,
                background: "#16a34a",
                height: 18
              }}
            />
          </div>
          <span style={{ fontWeight: "bold" }}>{Math.min(Math.round(progreso.progreso), 100)}%</span>

          {progreso.progreso >= 100 ? (
            <>
              <p style={{ color: "#16a34a", fontWeight: "bold", marginTop: 8 }}>
                ¡Insignia obtenida!
              </p>
              <button onClick={handleShare}>Compartir y guardar en galería</button>
              {mensaje && <p style={{ marginTop: 12, color: "#1e40af" }}>{mensaje}</p>}
            </>
          ) : (
            <p style={{ color: "#eab308", marginTop: 8 }}>Sigue participando para obtenerla.</p>
          )}
        </div>
      )}

      {!usuario && (
        <div className="my-2">
          <p>Inicia sesión para ver tu progreso en esta insignia.</p>
        </div>
      )}
    </div>
  );
};

export default BadgePage;
