import React, { useEffect, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { useLocation } from "react-router-dom";

const API_URL = "http://localhost:5000";
const tipos = [
  { key: "artista", label: "Artistas" },
  { key: "album", label: "Álbumes" },
  { key: "cancion", label: "Canciones" },
  { key: "video", label: "Videos Musicales" },
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ShareablePage = ({ usuario }) => {
  const query = useQuery();
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [rankings, setRankings] = useState({});
  const [tab, setTab] = useState({ active: "artista" });
  const [openDetail, setOpenDetail] = useState(null);
  const [segmentacion, setSegmentacion] = useState(null);
  const [segmentacionCanciones, setSegmentacionCanciones] = useState(null);
  const [segmentacionVideos, setSegmentacionVideos] = useState(null);
  const [albumArtistas, setAlbumArtistas] = useState([]);

  useEffect(() => {
    // Si hay usuario en props, úsalo; si no, busca en la URL (?user=)
    if (usuario?.id_usuario) {
      setUserId(usuario.id_usuario);
      setUserData(usuario);
    } else {
      const id = query.get("user");
      if (id) setUserId(id);
    }
  }, [usuario, query]);

  useEffect(() => {
    // Si no hay datos de usuario, fétchealos por ID
    const fetchUser = async () => {
      if (userId && !userData) {
        try {
          const res = await axios.get(`${API_URL}/ranking/${userId}`);
          setUserData(res.data);
        } catch {}
      }
    };
    fetchUser();
  }, [userId, userData]);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!userId) return;
      const nuevos = {};
      for (const tipo of tipos) {
        const res = await axios.get(`${API_URL}/rankings/personal`, {
          params: { usuario: userId, tipo_entidad: tipo.key },
        });
        nuevos[tipo.key] = res.data
          .sort((a, b) => a.posicion - b.posicion)
          .slice(0, 5);
      }
      setRankings(nuevos);
    };
    fetchRankings();
  }, [userId]);

  useEffect(() => {
    if (!openDetail) return;
    const fetchSegmentacion = async () => {
      const res = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: userId,
          entidad_tipo: tab.active,
          entidad_id: openDetail.entidad_id
        }
      });
      setSegmentacion(res.data);
    };
    fetchSegmentacion();
  }, [openDetail, tab.active, userId]);

  const handleShare = async () => {
    const el = document.getElementById("wrapped-share");
    if (!el) return;
    const canvas = await html2canvas(el);
    const url = canvas.toDataURL();
    const link = document.createElement("a");
    link.href = url;
    link.download = "musicTree-wrapped.png";
    link.click();
  };

  const handleOpenDetail = async (item) => {
    setOpenDetail(item);
    setSegmentacion(null);
    setSegmentacionCanciones(null);
    setSegmentacionVideos(null);
    setAlbumArtistas([]);

    // Segmentación principal (álbumes para artista, canciones para álbum, etc)
    const segRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
      params: {
        usuario: userId,
        entidad_tipo: tab.active,
        entidad_id: item.entidad_id
      }
    });
    setSegmentacion(segRes.data);

    // Si es artista, pide segmentación de canciones y videos
    if (tab.active === "artista") {
      // Canciones del artista
      const cancionesRes = await axios.get(`${API_URL}/relaciones/artistas/${item.entidad_id}/canciones`);
      const cancionesIds = (cancionesRes.data.canciones || []).map(c => c.id_cancion);
      if (cancionesIds.length) {
        const segCancionesRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
          params: {
            usuario: userId,
            entidad_tipo: "cancion",
            entidad_id: cancionesIds.join(",") // Puedes modificar el endpoint para aceptar varios IDs
          }
        });
        setSegmentacionCanciones(segCancionesRes.data);
      }
      // Videos del artista
      const videosRes = await axios.get(`${API_URL}/relaciones/artistas/${item.entidad_id}/videos`);
      const videosIds = (videosRes.data || []).map(v => v.id_video);
      if (videosIds.length) {
        const segVideosRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
          params: {
            usuario: userId,
            entidad_tipo: "video",
            entidad_id: videosIds.join(",")
          }
        });
        setSegmentacionVideos(segVideosRes.data);
      }
    }
    // Si es álbum, pide artistas y segmentación de canciones
    if (tab.active === "album") {
      const artistasRes = await axios.get(`${API_URL}/relaciones/albumes/${item.entidad_id}/artistas`);
      setAlbumArtistas(artistasRes.data.map(a => a.nombre_artista));
      const segCancionesRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: userId,
          entidad_tipo: "album",
          entidad_id: item.entidad_id
        }
      });
      setSegmentacionCanciones(segCancionesRes.data);
    }
  };

  
function msToMMSS(ms) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function secToMMSS(sec) {
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, "0")}`;
}

  return (
    <div className="p-4" style={{ background: "#111", minHeight: "100vh" }}>
      <div style={{ maxWidth: 600, margin: "auto" }}>
        <a href="/" style={{ display: "block", width: 120, margin: "24px auto 0 auto" }}>
          <img src="/logo.png" alt="Logo MusicTree" style={{ width: 120, display: "block" }} />
        </a>
        <h2 className="text-2xl font-bold mt-4 mb-2 text-center" style={{
          color: "#fff",
          fontFamily: "cursive"
        }}>
          Bienvenido al árbol musical de <span style={{ color: "#16a34a" }}>{userData?.username}</span>
        </h2>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          margin: "32px 0 24px 0"
        }}>
          <span style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#fff",
            fontFamily: "cursive",
            letterSpacing: 1,
            minWidth: 140
          }}>
            {tipos.find(t => t.key === (tab.active || "artista")).label}
          </span>
          <select
            aria-label="Cambiar pestaña"
            value={tab.active}
            onChange={e => setTab({ active: e.target.value })}
            style={{
              background: "#18181b",
              color: "#16a34a",
              fontWeight: "bold",
              border: "2px solid #16a34a",
              borderRadius: 8,
              padding: "6px 18px",
              fontSize: "1.1rem",
              outline: "none"
            }}
          >
            <option disabled value="">
              Cambiar pestaña
            </option>
            {tipos.map(tipo => (
              <option key={tipo.key} value={tipo.key}>{tipo.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
        {/* Recuadro compartible (solo imagen) */}
        <div id="wrapped-share" style={{
          width: 360,
          height: 640,
          background: "#18181b",
          borderRadius: 18,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative"
        }}>
          <img src="/logo.png" alt="MusicTree" style={{ width: 60, marginBottom: 8 }} />
          <div style={{
            color: "#16a34a",
            fontWeight: "bold",
            fontSize: "1.1rem",
            marginBottom: 8,
            textAlign: "center"
          }}>
            Compartido a través de MusicTree
          </div>
          <div style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.3rem",
            marginBottom: 12,
            textAlign: "center",
            letterSpacing: 1
          }}>
            Top {tipos.find(t => t.key === (tab.active || "artista")).label}
          </div>

          {/* Lista visual de los Top 5 */}
          <div style={{ flex: 1, width: "100%", overflowY: "auto" }}>
            {(rankings[tab.active] || []).slice(0, 5).map((item, idx) => (
              <div key={item.id} style={{ marginBottom: 24 }}>
                <div className="shareable-section-dark" style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#18181b",
                  borderRadius: 18,
                  boxShadow: "0 4px 24px #000a",
                  padding: "10px 8px"
                }}>
                  <div style={{
                    width: 40,
                    fontSize: "1.3rem",
                    fontWeight: "bold",
                    color: "#fff",
                    fontFamily: "cursive",
                    textAlign: "center"
                  }}>
                    {idx + 1}
                  </div>
                  <img
                    src={item.foto || "/default-profile.png"}
                    alt={item.nombre}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      objectFit: "cover",
                      border: "2px solid #16a34a",
                      background: "#222",
                      marginRight: 10
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: "bold",
                      color: "#fff",
                      fontSize: "1rem"
                    }}>
                      {item.nombre}
                    </div>
                    <div style={{
                      color: "#ffd700",
                      fontWeight: "bold",
                      fontSize: "1.1rem"
                    }}>
                      {item.valoracion} ★
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones Ver detalle a la derecha */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 50
        }}>
          {(rankings[tab.active] || []).slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: "bold",
                fontSize: "0.95rem",
                cursor: "pointer"
              }}
            >
              Ver detalles
            </button>
          ))}
        </div>
      </div>
        <button onClick={handleShare}>Descargar imagen</button>
        <div className="text-center mt-8" style={{ color: "#fff", fontSize: "1.1rem" }}>
          <span style={{ color: "#16a34a", display: "inline-block" }}>
            <br />
            Para ver todas mis valoraciones ve a mi perfil en MusicTree:&nbsp;
            <a href={`/profile/${userData?.id_usuario}`} style={{ color: "#60a5fa", textDecoration: "underline" }}>
              /profile/{userData?.id_usuario}
            </a>
          </span>
        </div>
      </div>
      {openDetail && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#18181b",
            borderRadius: 16,
            padding: 28,
            minWidth: 280,
            maxWidth: 340,
            color: "#fff",
            boxShadow: "0 4px 32px #000a",
            position: "relative"
          }}>
            <button
              onClick={() => setOpenDetail(null)}
              style={{
                position: "absolute", top: 10, right: 10,
                background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer"
              }}
              aria-label="Cerrar"
            >×</button>
            <h3 style={{ color: "#16a34a", fontWeight: "bold", marginBottom: 8 }}>{openDetail.nombre}</h3>
            <img
              src={openDetail.foto || "/default-profile.png"}
              alt={openDetail.nombre}
              style={{
                width: 90, height: 90, borderRadius: 12, objectFit: "cover",
                border: "3px solid #16a34a", background: "#222", marginBottom: 10
              }}
            />
            <div style={{ fontSize: "1.05rem", marginTop: 8 }}>
              {tab.active === "artista" && (
                <>
                  <div>Valoración: <b style={{ color: "#ffd700" }}>{openDetail.valoracion} ★</b></div>
                  <div>Álbumes: <b>{openDetail.albumes?.length || 0}</b></div>
                  {segmentacion && (
                    <>
                      <div>% Álbumes valorados: <b style={{ color: "#16a34a" }}>{segmentacion.porcentaje}%</b></div>
                      <div>
                        Segmentación álbumes:
                        {Object.entries(segmentacion.segmentacion).map(([cal, count]) => (
                          <div key={cal}>{cal}★: {count} ({((count/segmentacion.valorados)*100).toFixed(0)}%)</div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 10 }}>Canciones: <b>{openDetail.canciones?.length || 0}</b></div>
                  {segmentacionCanciones && (
                    <>
                      <div>% Canciones valoradas: <b style={{ color: "#16a34a" }}>{segmentacionCanciones.porcentaje}%</b></div>
                      <div>
                        Segmentación canciones:
                        {Object.entries(segmentacionCanciones.segmentacion).map(([cal, count]) => (
                          <div key={cal}>{cal}★: {count} ({((count/segmentacionCanciones.valorados)*100).toFixed(0)}%)</div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 10 }}>Videos musicales: <b>{openDetail.videos?.length || 0}</b></div>
                  {segmentacionVideos && (
                    <>
                      <div>% Videos valorados: <b style={{ color: "#16a34a" }}>{segmentacionVideos.porcentaje}%</b></div>
                      <div>
                        Segmentación videos:
                        {Object.entries(segmentacionVideos.segmentacion).map(([cal, count]) => (
                          <div key={cal}>{cal}★: {count} ({((count/segmentacionVideos.valorados)*100).toFixed(0)}%)</div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {tab.active === "album" && (
                <>
                  <div>Valoración: <b style={{ color: "#ffd700" }}>{openDetail.valoracion} ★</b></div>
                  <div>Artista(s): <b>{albumArtistas?.join(", ")}</b></div>
                  <div>Número de canciones: <b>{openDetail.numero_canciones || 0}</b></div>
                  {segmentacionCanciones && (
                    <>
                      <div>% Canciones valoradas: <b style={{ color: "#16a34a" }}>{segmentacionCanciones.porcentaje}%</b></div>
                      <div>
                        Segmentación canciones:
                        {Object.entries(segmentacionCanciones.segmentacion).map(([cal, count]) => (
                          <div key={cal}>{cal}★: {count} ({((count/segmentacionCanciones.valorados)*100).toFixed(0)}%)</div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {tab.active === "cancion" && (
                <>
                  <div>Valoración: <b style={{ color: "#ffd700" }}>{openDetail.valoracion} ★</b></div>
                  <div>Artista(s): <b>{openDetail.artistas?.join(", ")}</b></div>
                  {openDetail.duracion_ms && (
                    <div>Duración: <b>{msToMMSS(openDetail.duracion_ms)}</b></div>
                  )}
                </>
              )}
              {tab.active === "video" && (
                <>
                  <div>Valoración: <b style={{ color: "#ffd700" }}>{openDetail.valoracion} ★</b></div>
                  <div>Artista(s): <b>{openDetail.artistas?.join(", ")}</b></div>
                  {openDetail.duracion && (
                    <div>Duración: <b>{secToMMSS(openDetail.duracion)}</b></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareablePage;