import { useState } from "react";
import { Link } from "react-router-dom";

const UserListGrid = ({ title, items, isArtist, perPage = 10 }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / perPage);

  return (
    <div className="section mt-6">
      <div style={{
        background: "#111", color: "#fff", borderRadius: 12, padding: 16, marginBottom: 8, display: "flex", alignItems: "center"
      }}>
        <div style={{ fontSize: 36, fontWeight: "bold", minWidth: 90, textAlign: "center" }}>
          {items.length}
          <div style={{ fontSize: 16, fontWeight: "normal" }}>{title}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginLeft: 24, alignItems: "flex-end" }}>
          {items.slice(page * perPage, (page + 1) * perPage).map((item) => (
            <div key={isArtist ? item.id_artista : item.id_usuario} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <img
                src={
                  isArtist
                    ? (item.foto_artista || "/default-artist.png")
                    : (item.foto_perfil || "/default-profile.png")
                }
                alt={isArtist ? item.nombre_artista : item.username}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }}
              />
              <div style={{ marginBottom: 2 }}>
                <Link
                  to={isArtist ? `/artist/${item.id_artista}` : `/profile/${item.id_usuario}`}
                  style={{ color: "#fff", fontWeight: "bold", textDecoration: "none" }}
                >
                  {isArtist ? item.nombre_artista : item.nombre}
                </Link>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {isArtist ? "" : `@${item.username}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <button
            onClick={() => setPage((p) => (p + 1) % totalPages)}
            style={{
              marginLeft: "auto", background: "#222", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer"
            }}
          >
            &gt;
          </button>
        )}
      </div>
    </div>
  );
};

export default UserListGrid;