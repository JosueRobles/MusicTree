import { useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const sonido = "/InsigniaSound.mp3";
const API_URL = import.meta.env.VITE_API_URL;

const InsigniaToast = ({ visible, insignia, notificacionId, onClose }) => {
  const navigate = useNavigate();

  // Autocierre a 8 segundos
  useEffect(() => {
    if (visible && insignia) {
      const timer = setTimeout(onClose, 8000);
      return () => clearTimeout(timer);
    }
  }, [visible, insignia, onClose]);

  // Reproducir sonido cuando aparece la notificación
  useEffect(() => {
    if (visible && insignia) {
      try {
        const audio = new Audio(sonido);
        audio.volume = 0.7; // Ajustar volumen al 70%
        audio.play().catch(err => {
          console.error("Error reproduciendo sonido:", err);
        });
      } catch (error) {
        console.error("Error al crear objeto de audio:", error);
      }
    }
  }, [visible, insignia]);

  // Al hacer clic: redirige a la página de detalles de la insignia
  const handleClick = async () => {
    // Marca la notificación como vista en el backend
    if (notificacionId) {
      try {
        await axios.put(`${API_URL}/notificaciones/${notificacionId}/visto`);
      } catch (e) {
        // Silenciar error
        console.error("Error al marcar notificación como vista:", e);
      }
    }

    onClose();
    if (insignia && insignia.id_insignia) {
      navigate(`/badge/${insignia.id_insignia}`);
    }
  };

  if (!visible || !insignia) return null;

  return (
    <div
      className="insignia-toast"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        backgroundColor: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        borderRadius: "8px",
        padding: "16px",
        maxWidth: "400px",
        cursor: "pointer",
        border: "2px solid #16a34a",
        animation: "fadeInUp 0.3s ease-out"
      }}
      onClick={handleClick}
      title="Ver detalles de la insignia"
    >
      {/* Botón de cierre (X) */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "none",
          border: "none",
          fontSize: 22,
          color: "#888",
          cursor: "pointer",
          zIndex: 10
        }}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
      <div className="insignia-toast-content" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <img
          src={insignia.icono || '/insignias/placeholder.png'}
          alt={insignia.nombre}
          className="insignia-toast-img"
          style={{
            width: "64px",
            height: "64px",
            objectFit: "contain",
            animation: "pulse 1.5s infinite"
          }}
        />
        <div>
          <div className="insignia-toast-title" style={{ fontWeight: "bold", fontSize: "18px", color: "#16a34a" }}>
            ¡Insignia desbloqueada!
          </div>
          <div className="insignia-toast-name" style={{ fontWeight: "bold", fontSize: "16px", marginTop: "4px" }}>
            {insignia.nombre}
          </div>
          <div className="insignia-toast-desc" style={{ fontSize: "14px", marginTop: "4px", color: "#666" }}>
            {insignia.descripcion}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#eab308",
              marginTop: "8px",
            }}
          >
            Haz clic para ver detalles
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          const audio = new Audio("/insigniaSound.mp3");
          audio.volume = 0.7;
          audio.play();
          handleClick();
        }}
        style={{ marginTop: 8, background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px" }}
      >
        ¡Ver mi insignia!
      </button>
    </div>
  );
};

InsigniaToast.propTypes = {
  visible: PropTypes.bool,
  insignia: PropTypes.shape({
    id_insignia: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    icono: PropTypes.string,
    nombre: PropTypes.string,
    descripcion: PropTypes.string,
  }),
  notificacionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
};

export default InsigniaToast;