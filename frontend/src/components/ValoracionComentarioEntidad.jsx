import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

export default function ValoracionComentarioEntidad({ valoracion }) {
  const usuario = valoracion.usuarios || {};
  const idUsuario = valoracion.usuario;
  const entidad = valoracion.entidad || {};
  const fecha = valoracion.fecha ? new Date(valoracion.fecha) : null;

  return (
    <article className="valoracion-facebook" style={{ alignItems: 'flex-start' }}>
      <Link to={`/profile/${idUsuario}`} aria-label={`Ver perfil de ${usuario.nombre || idUsuario}`}>
        <img
          src={usuario.foto_perfil || '/default-profile.png'}
          alt={usuario.nombre || 'usuario'}
          className="valoracion-facebook-foto"
          loading="lazy"
          style={{ width: 48, height: 48 }}
        />
      </Link>
      <div className="valoracion-facebook-rect" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
          <Link to={`/profile/${idUsuario}`} className="valoracion-facebook-nombre">
            {usuario.nombre || idUsuario}
          </Link>
          <Link to={`/profile/${idUsuario}`} className="valoracion-facebook-username" style={{ marginLeft: 6 }}>
            @{usuario.username || idUsuario}
          </Link>
        </div>
        <div className="valoracion-facebook-comentario" style={{ marginTop: 8 }}>
          {valoracion.comentario || "Sin comentario"}
          <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
            {entidad.tipo && entidad.id && (
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
            )}
            {fecha && (
              <span style={{ display: 'block', marginTop: 6 }}>
                — {fecha.toLocaleDateString()} {fecha.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="valoracion-facebook-col" style={{ gap: 8 }}>
        <div className="valoracion-facebook-cuadro" style={{ width: 72, height: 72 }}>
          {valoracion.calificacion ? `${valoracion.calificacion} ⭐` : '0 ⭐'}
        </div>
        <div className="valoracion-facebook-cuadro" style={{ width: 72, height: 72 }}>
          {valoracion.emocion ? (
            <img src={`/emojis/${valoracion.emocion}.png`} alt={valoracion.emocion} style={{ maxWidth: '80%', maxHeight: '80%' }} loading="lazy" />
          ) : null}
        </div>
        <div className="valoracion-facebook-cuadro" style={{ width: 72, height: 72 }}>
          {valoracion.familiaridad ? (
            <img src={`/familiaridad/${valoracion.familiaridad}.png`} alt={valoracion.familiaridad} style={{ maxWidth: '80%', maxHeight: '80%' }} loading="lazy" />
          ) : null}
        </div>
      </div>
    </article>
  );
}
