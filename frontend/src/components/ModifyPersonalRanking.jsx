import React, { useEffect, useState } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const tipos = [
  { key: "artista", label: "Artistas" },
  { key: "album", label: "Álbumes" },
  { key: "cancion", label: "Canciones" },
  { key: "video", label: "Videos" },
];

const ModifyPersonalRanking = ({ usuario, soloLectura = false }) => {
  const [rankings, setRankings] = useState({});
  const [loading, setLoading] = useState(false);
  const [tipoActivo, setTipoActivo] = useState("artista");
  const [guardando, setGuardando] = useState(false);
  const [filtroEstrella, setFiltroEstrella] = useState("all");
  const [limiteTop, setLimiteTop] = useState(1000);
  const [customTop, setCustomTop] = useState("");

  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [detalleStats, setDetalleStats] = useState(null);
  const [segmentacionCanciones, setSegmentacionCanciones] = useState(null);
  const [segmentacionVideos, setSegmentacionVideos] = useState(null);
  const [albumArtistas, setAlbumArtistas] = useState([]);

  const opcionesTop = [10, 20, 25, 30, 50, 100, 1000];

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      const nuevos = {};
      for (const tipo of tipos) {
        const res = await axios.get(`${API_URL}/rankings/personal`, {
          params: { usuario: usuario.id_usuario, tipo_entidad: tipo.key },
        });
        nuevos[tipo.key] = res.data.sort((a, b) => a.posicion - b.posicion);
      }
      setRankings(nuevos);
      setLoading(false);
    };
    fetchRankings();
  }, [usuario]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(rankings[tipoActivo]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setRankings({
      ...rankings,
      [tipoActivo]: items.map((item, idx) => ({ ...item, posicion: idx + 1 })),
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await axios.post(`${API_URL}/rankings/personal/ordenar`, {
        usuario: usuario.id_usuario,
        tipo_entidad: tipoActivo,
        nuevoOrden: rankings[tipoActivo].map(({ id, posicion }) => ({ id, posicion })),
      });
      alert("Ranking actualizado");
    } catch {
      alert("Error al guardar el ranking");
    }
    setGuardando(false);
  };

  const handleVerDetalle = async (item) => {
    setDetalleAbierto(item);
    setDetalleStats(null);
    // Segmentación álbumes/canciones/videos/artistas
    const segRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
      params: {
        usuario: usuario.id_usuario,
        entidad_tipo: tipoActivo,
        entidad_id: item.entidad_id
      }
    });
    setDetalleStats(segRes.data);

    // Si es álbum, trae artistas y segmentación de canciones
    if (tipoActivo === "album") {
      const artistasRes = await axios.get(`${API_URL}/relaciones/albumes/${item.entidad_id}/artistas`);
      setAlbumArtistas(artistasRes.data.map(a => a.nombre_artista));
      const segCancionesRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: usuario.id_usuario,
          entidad_tipo: "album",
          entidad_id: item.entidad_id
        }
      });
      setSegmentacionCanciones(segCancionesRes.data);
    }
    // Si es artista, trae segmentación de canciones y videos
    if (tipoActivo === "artista") {
      const segCancionesRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: usuario.id_usuario,
          entidad_tipo: "cancion",
          entidad_id: item.entidad_id
        }
      });
      setSegmentacionCanciones(segCancionesRes.data);
      const segVideosRes = await axios.get(`${API_URL}/valoraciones/segmentacion-personal`, {
        params: {
          usuario: usuario.id_usuario,
          entidad_tipo: "video",
          entidad_id: item.entidad_id
        }
      });
      setSegmentacionVideos(segVideosRes.data);
    }
  };

  const groupedByValoracion = {};
  (rankings[tipoActivo] || []).forEach(item => {
    const key = item.valoracion ?? 0;
    if (!groupedByValoracion[key]) groupedByValoracion[key] = [];
    groupedByValoracion[key].push(item);
  });

  const rankingFiltrado = (rankings[tipoActivo] || [])
    .filter(item => filtroEstrella === "all" || item.valoracion === Number(filtroEstrella))
    .slice(0, customTop ? Math.max(5, Math.min(1000, Number(customTop))) : limiteTop);

  return (
    <div className="section mt-8">
      {!soloLectura && <h3 className="text-xl font-bold mb-2">Editar tu ranking personal</h3>}
      {soloLectura && <h3 className="text-xl font-bold mb-2">Ranking personal</h3>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tipos.map((tipo) => (
          <button
            key={tipo.key}
            onClick={() => setTipoActivo(tipo.key)}
            className={`px-3 py-1 rounded ${tipoActivo === tipo.key ? "bg-green-600 text-white" : "bg-gray-200"}`}
          >
            {tipo.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label>Filtrar por estrellas: </label>
          <select value={filtroEstrella} onChange={e => setFiltroEstrella(e.target.value)}>
            <option value="all">Todas</option>
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map(val =>
              <option key={val} value={val}>{val}★</option>
            )}
          </select>
        </div>
        <div>
          <label>Top: </label>
          <select value={String(limiteTop)} onChange={e => setLimiteTop(e.target.value === "custom" ? "custom" : Number(e.target.value))}>
            {opcionesTop.map(val =>
              <option key={val} value={val}>Top {val}</option>
            )}
            <option value="custom">Personalizado</option>
          </select>
          {limiteTop === "custom" && (
            <input
              type="number"
              min={5}
              max={1000}
              value={customTop}
              onChange={e => setCustomTop(e.target.value)}
              placeholder="Top N"
              style={{ width: 60, marginLeft: 8 }}
            />
          )}
        </div>
      </div>
      {loading ? (
        <div>Cargando...</div>
      ) : (
        Object.keys(groupedByValoracion).sort((a, b) => b - a).map(valor => (
          <div key={valor} style={{ marginBottom: 24 }}>
            <div style={{ color: "#fff", background: "#222", padding: 4, borderRadius: 4, marginBottom: 8 }}>
              {valor} ⭐
            </div>
            <DragDropContext
              onDragEnd={soloLectura ? () => {} : (result) => {
                if (!result.destination) return;
                if (result.source.droppableId !== result.destination.droppableId) return;
                const items = Array.from(groupedByValoracion[valor]);
                const [reordered] = items.splice(result.source.index, 1);
                items.splice(result.destination.index, 0, reordered);
                const newRankings = { ...rankings };
                let idx = 0;
                Object.keys(groupedByValoracion).sort((a, b) => b - a).forEach(val => {
                  if (val === valor) {
                    newRankings[tipoActivo] = [
                      ...(newRankings[tipoActivo] || []).filter(i => i.valoracion !== Number(val)),
                      ...items.map((item, i) => ({ ...item, posicion: idx + i + 1 }))
                    ];
                  }
                  idx += groupedByValoracion[val].length;
                });
                setRankings(newRankings);
              }}
            >
              <Droppable droppableId={String(valor)} isDropDisabled={soloLectura}>
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{ maxWidth: 400, margin: "auto" }}
                  >
                    {rankingFiltrado.filter(item => item.valoracion === Number(valor)).map((item, idx) => (
                      <Draggable
                        key={item.id}
                        draggableId={String(item.id)}
                        index={idx}
                        isDragDisabled={soloLectura}
                      >
                        {(prov) => (
                          <li
                            ref={prov.innerRef}
                            {...(!soloLectura ? prov.draggableProps : {})}
                            {...(!soloLectura ? prov.dragHandleProps : {})}
                            style={{
                              ...prov.draggableProps?.style,
                              background: "#111",
                              marginBottom: 8,
                              padding: 12,
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              border: "1px solid #444",
                              color: "#fff",
                              position: "relative"
                            }}
                          >
                            <span style={{ fontWeight: "bold", marginRight: 8 }}>
                              Top {item.posicion}
                            </span>
                            <Link
                              to={
                                tipoActivo === "artista"
                                  ? `/artist/${item.entidad_id}`
                                  : tipoActivo === "album"
                                  ? `/album/${item.entidad_id}`
                                  : tipoActivo === "cancion"
                                  ? `/song/${item.entidad_id}`
                                  : tipoActivo === "video"
                                  ? `/video/${item.entidad_id}`
                                  : "#"
                              }
                              style={{ display: "flex", alignItems: "center", color: "#fff", textDecoration: "none", gap: 8 }}
                            >
                              <img src={item.foto || '/default-artist.png'} alt={item.nombre} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 12 }} />
                              <span style={{ fontWeight: "bold" }}>{item.nombre || `ID ${item.entidad_id}`}</span>
                            </Link>
                            <span style={{ marginLeft: "auto", color: "#ffd700" }}>
                              {item.valoracion ? `${item.valoracion} ⭐` : ""}
                            </span>
                            {!soloLectura && (
                              <button
                                style={{ marginLeft: 12, background: "#2563eb", color: "#fff", borderRadius: 6, padding: "4px 10px", fontWeight: "bold" }}
                                onClick={() => handleVerDetalle(item)}
                              >
                                Ver detalles
                              </button>
                            )}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        ))
      )}
      {!soloLectura && (
        <button
          className="bg-green-600 text-white px-4 py-2 rounded mt-4"
          onClick={handleGuardar}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      )}
      {detalleAbierto && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#18181b", borderRadius: 16, padding: 28, minWidth: 280, maxWidth: 340, color: "#fff", position: "relative"
          }}>
            <button onClick={() => setDetalleAbierto(null)} style={{
              position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer"
            }}>×</button>
            <h3 style={{ color: "#16a34a", fontWeight: "bold", marginBottom: 8 }}>{detalleAbierto.nombre}</h3>
            <img
              src={detalleAbierto.foto || "/default-profile.png"}
              alt={detalleAbierto.nombre}
              style={{
                width: 90, height: 90, borderRadius: 12, objectFit: "cover",
                border: "3px solid #16a34a", background: "#222", marginBottom: 10
              }}
            />
            <div style={{ fontSize: "1.05rem", marginTop: 8 }}>
              {tipoActivo === "artista" && (
                <>
                  <div>Valoración: <b style={{ color: "#ffd700" }}>{detalleAbierto.valoracion} ★</b></div>
                  <div>Álbumes: <b>{detalleAbierto.albumes?.length || 0}</b></div>
                  {detalleStats && (
                    <>
                      <div>% Álbumes valorados: <b style={{ color: "#16a34a" }}>{detalleStats.porcentaje}%</b></div>
                      <div>
                        Segmentación álbumes:
                        {Object.entries(detalleStats.segmentacion).map(([cal, count]) => (
                          <div key={cal}>{cal}★: {count} ({((count/detalleStats.valorados)*100).toFixed(0)}%)</div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: 10 }}>Canciones: <b>{detalleAbierto.canciones?.length || 0}</b></div>
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
                  <div style={{ marginTop: 10 }}>Videos musicales: <b>{detalleAbierto.videos?.length || 0}</b></div>
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
              {/* Similar para album, cancion, video */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModifyPersonalRanking;
