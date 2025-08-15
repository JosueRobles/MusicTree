import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

export default function ValoracionComentarioEntidad({ valoracion }) {
  const usuario = valoracion.usuarios || {};
  const idUsuario = valoracion.usuario;
  const entidad = valoracion.entidad || {};
  const fecha = valoracion.fecha ? new Date(valoracion.fecha) : null;

  return (
    <div className="valoracion-facebook">
      <Link to={`/profile/${idUsuario}`}>
        <img
          src={usuario.foto_perfil || '/default-profile.png'}
          alt="user"
          className="valoracion-facebook-foto"
        />
      </Link>
      <div className="valoracion-facebook-rect">
        <div>
          <Link to={`/profile/${idUsuario}`} className="valoracion-facebook-nombre">
            {usuario.nombre || idUsuario}
          </Link>
          <Link to={`/profile/${idUsuario}`} className="valoracion-facebook-username">
            @{usuario.username || idUsuario}
          </Link>
        </div>
        <div className="valoracion-facebook-comentario">
          {valoracion.comentario || "Sin comentario"}
          <div style={{ fontSize: 12, color: "#888" }}>
            {entidad.tipo && entidad.id && (
              <>
                <span>
                  Valoró {entidad.tipo}{" "}
                  <Link to={
                    entidad.tipo === "album"
                      ? `/album/${entidad.id}`
                      : entidad.tipo === "cancion"
                      ? `/song/${entidad.id}`
                      : entidad.tipo === "video"
                      ? `/video/${entidad.id}`
                      : entidad.tipo === "artista"
                      ? `/artist/${entidad.id}`
                      : "#"
                  }>
                    {entidad.nombre}
                  </Link>
                </span>
              </>
            )}
            {fecha && (
              <span style={{ marginLeft: 8 }}>
                — {fecha.toLocaleDateString()} {fecha.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="valoracion-facebook-col">
        <div className="valoracion-facebook-cuadro">
          {valoracion.calificacion ? `${valoracion.calificacion} ⭐` : '0 ⭐'}
        </div>
        <div className="valoracion-facebook-cuadro">
          {valoracion.emocion ? (
            <img src={`/emojis/${valoracion.emocion}.png`} alt={valoracion.emocion} />
          ) : null}
        </div>
        <div className="valoracion-facebook-cuadro">
          {valoracion.familiaridad ? (
            <img src={`/familiaridad/${valoracion.familiaridad}.png`} alt={valoracion.familiaridad} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
