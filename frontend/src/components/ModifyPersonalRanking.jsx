import React, { useEffect, useState } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API_URL = "http://localhost:5000";

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

  const groupedByValoracion = {};
  (rankings[tipoActivo] || []).forEach(item => {
    const key = item.valoracion ?? 0;
    if (!groupedByValoracion[key]) groupedByValoracion[key] = [];
    groupedByValoracion[key].push(item);
  });

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
                    {groupedByValoracion[valor].map((item, idx) => (
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
                            <img src={item.foto || '/default-profile.png'} alt={item.nombre} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginRight: 12 }} />
                            <span style={{ fontWeight: "bold" }}>{item.nombre || `ID ${item.entidad_id}`}</span>
                            <span style={{ marginLeft: "auto", color: "#ffd700" }}>
                              {item.valoracion ? `${item.valoracion} ⭐` : ""}
                            </span>
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
    </div>
  );
};

export default ModifyPersonalRanking;
