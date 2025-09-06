import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import CarruselEntidad from "../components/CarruselEntidad";

const API_URL = import.meta.env.VITE_API_URL;
const POR_PAGINA = 18; // 3 páginas de 6 por sección

const fetchEntidadPorPag = async (url, pagina, porPagina) => {
  const { data } = await axios.get(`${url}?offset=${pagina * porPagina}&limit=${porPagina}`);
  return data;
};

const GenrePage = () => {
  const { id } = useParams();
  const [genero, setGenero] = useState(null);

  // Cada entidad tiene: items, paginaActual, hayMas
  const [artistas, setArtistas] = useState({ items: [], pagina: 0, hayMas: true });
  const [albumes, setAlbumes] = useState({ items: [], pagina: 0, hayMas: true });
  const [canciones, setCanciones] = useState({ items: [], pagina: 0, hayMas: true });
  const [videos, setVideos] = useState({ items: [], pagina: 0, hayMas: true });
  const [loading, setLoading] = useState(true);
  const [subgeneros, setSubgeneros] = useState([]);
  const [subgeneroFiltro, setSubgeneroFiltro] = useState(null);

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/generos/${id}`)
      .then(res => setGenero(res.data))
      .catch(() => setGenero(null));

    const cargarTodo = async () => {
      const [arts, albs, cans, vids] = await Promise.all([
        fetchEntidadPorPag(`${API_URL}/generos/${id}/artistas`, 0, POR_PAGINA),
        fetchEntidadPorPag(`${API_URL}/generos/${id}/albumes`, 0, POR_PAGINA),
        fetchEntidadPorPag(`${API_URL}/generos/${id}/canciones`, 0, POR_PAGINA),
        fetchEntidadPorPag(`${API_URL}/generos/${id}/videos`, 0, POR_PAGINA).catch(() => []),
      ]);
      setArtistas({ items: arts, pagina: 0, hayMas: arts.length === POR_PAGINA });
      setAlbumes({ items: albs, pagina: 0, hayMas: albs.length === POR_PAGINA });
      setCanciones({ items: cans, pagina: 0, hayMas: cans.length === POR_PAGINA });
      setVideos({ items: vids, pagina: 0, hayMas: vids.length === POR_PAGINA });
      setLoading(false);
    };
    cargarTodo();
  }, [id]);

  useEffect(() => {
    axios.get(`${API_URL}/generos/${id}/subgeneros`)
      .then(res => setSubgeneros(res.data || []));
  }, [id]);

  // Funciones para cargar más
  const cargarMasArtistas = useCallback(async () => {
    const nuevaPag = artistas.pagina + 1;
    const nuevos = await fetchEntidadPorPag(`${API_URL}/generos/${id}/artistas`, nuevaPag, POR_PAGINA);
    setArtistas(prev => ({
      items: [...prev.items, ...nuevos],
      pagina: nuevaPag,
      hayMas: nuevos.length === POR_PAGINA
    }));
  }, [id, artistas.pagina]);

  const cargarMasAlbumes = useCallback(async () => {
    const nuevaPag = albumes.pagina + 1;
    const nuevos = await fetchEntidadPorPag(`${API_URL}/generos/${id}/albumes`, nuevaPag, POR_PAGINA);
    setAlbumes(prev => ({
      items: [...prev.items, ...nuevos],
      pagina: nuevaPag,
      hayMas: nuevos.length === POR_PAGINA
    }));
  }, [id, albumes.pagina]);

  const cargarMasCanciones = useCallback(async () => {
    const nuevaPag = canciones.pagina + 1;
    const nuevos = await fetchEntidadPorPag(`${API_URL}/generos/${id}/canciones`, nuevaPag, POR_PAGINA);
    setCanciones(prev => ({
      items: [...prev.items, ...nuevos],
      pagina: nuevaPag,
      hayMas: nuevos.length === POR_PAGINA
    }));
  }, [id, canciones.pagina]);

  const cargarMasVideos = useCallback(async () => {
    const nuevaPag = videos.pagina + 1;
    const nuevos = await fetchEntidadPorPag(`${API_URL}/generos/${id}/videos`, nuevaPag, POR_PAGINA);
    setVideos(prev => ({
      items: [...prev.items, ...nuevos],
      pagina: nuevaPag,
      hayMas: nuevos.length === POR_PAGINA
    }));
  }, [id, videos.pagina]);

  // Filtra entidades por subgénero si hay filtro activo
  const filtrarPorSubgenero = (entidades) => {
    if (!subgeneroFiltro) return entidades;
    return entidades.filter(ent => {
      if (!ent.subgeneros) return false;
      let subs = [];
      if (Array.isArray(ent.subgeneros)) subs = ent.subgeneros;
      else if (typeof ent.subgeneros === 'string' && ent.subgeneros.startsWith('[')) {
        try { subs = JSON.parse(ent.subgeneros); } catch {}
      } else if (typeof ent.subgeneros === 'string') {
        subs = [ent.subgeneros];
      }
      return subs.includes(subgeneroFiltro);
    });
  };

  if (loading) return <p>Cargando...</p>;
  if (!genero) return <p>Género no encontrado.</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 32 }}>
        <img
          src={`/generos/${genero.id_genero}.png`}
          alt={genero.nombre}
          style={{ width: 180, height: 180, borderRadius: 16, objectFit: "cover", background: "#222" }}
          onError={e => { e.target.src = "/default-image.png"; }}
        />
        <div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: 8 }}>{genero.nombre}</h2>
          <p style={{ fontSize: "1.1rem", color: "#ccc" }}>{genero.descripcion || "Sin descripción."}</p>
        </div>
      </div>

      {subgeneros.length > 0 && (
        <div style={{ margin: "16px 0" }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>Subgéneros más presentes:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {subgeneros.map(sg => (
              <button
                key={sg.subgenero}
                onClick={() => setSubgeneroFiltro(f => f === sg.subgenero ? null : sg.subgenero)}
                style={{
                  background: subgeneroFiltro === sg.subgenero ? "#fde047" : "#fef9c3",
                  color: "#78350f",
                  border: "1px solid #fde047",
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {sg.subgenero} <span style={{ fontWeight: "normal" }}>({sg.count})</span>
              </button>
            ))}
          </div>
          {subgeneroFiltro && (
            <div style={{ marginTop: 8, color: "#78350f" }}>
              Mostrando solo entidades con subgénero: <b>{subgeneroFiltro}</b>
              <button style={{ marginLeft: 12, color: "#b91c1c" }} onClick={() => setSubgeneroFiltro(null)}>Quitar filtro</button>
            </div>
          )}
        </div>
      )}

      <CarruselEntidad
        titulo="Artistas"
        entidades={filtrarPorSubgenero(artistas.items, "artista")}
        porPagina={6}
        hayMas={artistas.hayMas}
        onCargarMas={cargarMasArtistas}
        renderEntidad={a => (
          <a key={a.id_artista} href={`/artist/${a.id_artista}`} style={{
            background: "#065F46",
            borderRadius: 12,
            width: 180,
            minHeight: 220,
            textAlign: "center",
            textDecoration: "none",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "1rem"
          }}>
            <img
              src={a.foto_artista || "/default-image.png"}
              alt={a.nombre_artista}
              style={{
                width: "100%",
                height: 100,
                objectFit: "cover",
                borderRadius: "8px",
                marginBottom: "1rem"
              }}
            />
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{a.nombre_artista}</span>
          </a>
        )}
      />

      <CarruselEntidad
        titulo="Álbumes"
        entidades={filtrarPorSubgenero(albumes.items, "album")}
        porPagina={6}
        hayMas={albumes.hayMas}
        onCargarMas={cargarMasAlbumes}
        renderEntidad={a => (
          <a key={a.id_album} href={`/album/${a.id_album}`} style={{
            background: "#065F46",
            borderRadius: 12,
            width: 180,
            minHeight: 220,
            textAlign: "center",
            textDecoration: "none",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "1rem"
          }}>
            <img
              src={a.foto_album || "/default-image.png"}
              alt={a.titulo}
              style={{
                width: "100%",
                height: 100,
                objectFit: "cover",
                borderRadius: "8px",
                marginBottom: "1rem"
              }}
            />
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{a.titulo}</span>
            <span style={{ fontSize: "0.9rem", color: "#d1fae5" }}>{a.anio}</span>
          </a>
        )}
      />

      <CarruselEntidad
        titulo="Canciones"
        entidades={filtrarPorSubgenero(canciones.items, "cancion")}
        porPagina={6}
        hayMas={canciones.hayMas}
        onCargarMas={cargarMasCanciones}
        renderEntidad={c => {
          // Formatea duración a mm:ss
          const duracion = c.duracion_ms
            ? (() => {
                const totalSec = Math.round(c.duracion_ms / 1000);
                const min = Math.floor(totalSec / 60);
                const sec = String(totalSec % 60).padStart(2, '0');
                return `${min}:${sec}`;
              })()
            : "—";
          return (
            <div
              key={c.id_cancion}
              style={{
                background: "#065F46",
                borderRadius: 12,
                width: 180,
                minHeight: 120,
                textAlign: "center",
                color: "white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem"
              }}
            >
              <a
                href={`/song/${c.id_cancion}`}
                style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "#fff",
                  textDecoration: "underline",
                  marginBottom: 4
                }}
              >
                {c.titulo}
              </a>
              <span style={{ fontSize: "0.9rem", color: "#d1fae5" }}>
                Duración: {duracion}
              </span>
              <span style={{ fontSize: "0.9rem", color: "#d1fae5" }}>
                Popularidad: {c.popularidad || 0}
              </span>
            </div>
          );
        }}
      />

      <CarruselEntidad
        titulo="Videos Musicales"
        entidades={filtrarPorSubgenero(videos.items, "video")}
        porPagina={6}
        hayMas={videos.hayMas}
        onCargarMas={cargarMasVideos}
        renderEntidad={v => (
          <a key={v.id_video} href={`/video/${v.id_video}`} style={{
            background: "#065F46",
            borderRadius: 12,
            width: 180,
            minHeight: 220,
            textAlign: "center",
            textDecoration: "none",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "1rem"
          }}>
            <img
              src={v.miniatura || "/default-image.png"}
              alt={v.titulo}
              style={{
                width: "100%",
                height: 100,
                objectFit: "cover",
                borderRadius: "8px",
                marginBottom: "1rem"
              }}
            />
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{v.titulo}</span>
          </a>
        )}
      />
    </div>
  );
};

export default GenrePage;