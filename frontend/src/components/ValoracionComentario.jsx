import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

export default function ValoracionComentario({ valoracion }) {
  const usuario = valoracion.usuarios || {};
  const idUsuario = valoracion.usuario;

  return (
    <div className="valoracion-facebook">
      <Link to={`/profile/${idUsuario}`}>
        <img
          src={usuario.foto_perfil || '/default-user.png'}
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
            {valoracion.entidad_tipo && valoracion.entidad_id && (
              <>
                <span>
                  Valoró {valoracion.entidad_tipo}{" "}
                  <Link to={
                    valoracion.entidad_tipo === "album"
                      ? `/album/${valoracion.entidad_id}`
                      : valoracion.entidad_tipo === "cancion"
                      ? `/song/${valoracion.entidad_id}`
                      : valoracion.entidad_tipo === "video"
                      ? `/video/${valoracion.entidad_id}`
                      : valoracion.entidad_tipo === "artista"
                      ? `/artist/${valoracion.entidad_id}`
                      : "#"
                  }>
                    #{valoracion.entidad_id}
                  </Link>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="valoracion-facebook-col">
        <div className="valoracion-facebook-cuadro">
          {valoracion.calificacion ? `${valoracion.calificacion} ⭐` : '-'}
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
