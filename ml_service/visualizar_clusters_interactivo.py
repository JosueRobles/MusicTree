import os
from dotenv import load_dotenv
import supabase
import pandas as pd
import numpy as np
import umap
import plotly.express as px

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Config --- 🔄 Cambia aquí entre cancion | album | video
TIPO = "cancion"

TABLES = {
    "cancion": {
        "emb": "cancion_embeddings",
        "clus": "cancion_clusters",
        "main": "canciones",
        "id_field": "id_cancion",
        "rels_art": "cancion_artistas",
        "rels_gen": "cancion_generos",
        "id_rel": "cancion_id"
    },
    "album": {
        "emb": "album_embeddings",
        "clus": "album_clusters",
        "main": "albumes",
        "id_field": "id_album",
        "rels_art": "album_artistas",
        "rels_gen": "album_generos",
        "id_rel": "album_id"
    },
    "video": {
        "emb": "video_embeddings",
        "clus": "video_clusters",
        "main": "videos_musicales",
        "id_field": "id_video",
        "rels_art": "video_artistas",
        "rels_gen": "video_generos",
        "id_rel": "video_id"
    }
}

# --- Helper para paginación ---
def fetch_all(table, select_fields):
    all_data = []
    offset = 0
    page_size = 1000
    while True:
        res = sb.table(table).select(select_fields).range(offset, offset + page_size - 1).execute()
        if not res.data:
            break
        all_data.extend(res.data)
        if len(res.data) < page_size:
            break
        offset += page_size
    return all_data

# --- Config dinámico ---
cfg = TABLES[TIPO]
id_field = cfg["id_field"]

# Embeddings + clusters
embs = fetch_all(cfg["emb"], f"{id_field}, embedding")
clusters = fetch_all(cfg["clus"], f"{id_field}, grupo")

# Metadatos principales (maneja si no existe `anio`)
try:
    entidades = fetch_all(cfg["main"], f"{id_field}, titulo, album, anio, categoria")
except:
    entidades = fetch_all(cfg["main"], f"{id_field}, titulo, album, categoria")
    for e in entidades:
        e["anio"] = None

# Relaciones
artistas_rel = fetch_all(cfg["rels_art"], f"{cfg['id_rel']}, artista_id")
generos_rel = fetch_all(cfg["rels_gen"], f"{cfg['id_rel']}, genero_id")

# Catálogos
artistas = fetch_all("artistas", "id_artista, nombre_artista")
generos = fetch_all("generos", "id_genero, nombre")

# --- DataFrames ---
df_emb = pd.DataFrame(embs).rename(columns={id_field: "id_entidad"})
df_clus = pd.DataFrame(clusters).rename(columns={id_field: "id_entidad"})
df_main = pd.DataFrame(entidades).rename(columns={id_field: "id_entidad"})

df_artrel = pd.DataFrame(artistas_rel)
df_genrel = pd.DataFrame(generos_rel)
df_arts = pd.DataFrame(artistas)
df_gens = pd.DataFrame(generos)

# Artistas
if not df_artrel.empty:
    df_artrel = df_artrel.merge(df_arts, left_on="artista_id", right_on="id_artista", how="left")
    df_artistas = df_artrel.groupby(cfg["id_rel"])["nombre_artista"].apply(lambda x: ", ".join(x.dropna())).reset_index()
else:
    df_artistas = pd.DataFrame(columns=[cfg["id_rel"], "nombre_artista"])

# Géneros
if not df_genrel.empty:
    df_genrel = df_genrel.merge(df_gens, left_on="genero_id", right_on="id_genero", how="left")
    df_generos = df_genrel.groupby(cfg["id_rel"])["nombre"].apply(lambda x: ", ".join(x.dropna())).reset_index()
else:
    df_generos = pd.DataFrame(columns=[cfg["id_rel"], "nombre"])

# Merge total
df = df_emb.merge(df_clus, on="id_entidad", how="inner")
df = df.merge(df_main, on="id_entidad", how="left")
df = df.merge(df_artistas, left_on="id_entidad", right_on=cfg["id_rel"], how="left")
df = df.merge(df_generos, left_on="id_entidad", right_on=cfg["id_rel"], how="left")

df = df.dropna(subset=["embedding", "grupo"]).reset_index(drop=True)

# --- UMAP ---
X = np.vstack(df["embedding"].values)
umap_2d = umap.UMAP(n_neighbors=15, min_dist=0.1, metric="cosine", random_state=42)
X_2d = umap_2d.fit_transform(X)

df["UMAP1"] = X_2d[:, 0]
df["UMAP2"] = X_2d[:, 1]

# --- Visualización ---
fig = px.scatter(
    df, x="UMAP1", y="UMAP2",
    color="grupo",
    hover_data={
        "titulo": True,
        "nombre_artista": True,
        "nombre": True,   # género
        "anio": True,
        "categoria": True,
        "grupo": True,
        "UMAP1": False,
        "UMAP2": False
    },
    title=f"Mapa interactivo de Clusters ({TIPO.capitalize()})"
)

# Dropdown dinámico
dropdown_buttons = [
    dict(label="Todos", method="restyle", args=[{"marker": {"opacity": 0.7}}]),
] + [
    dict(
        label=f"Artista: {artista}",
        method="update",
        args=[
            {"marker": {"opacity": (df["nombre_artista"] == artista).astype(float) * 0.9}},
            {"title": f"Clusters {TIPO.capitalize()} - {artista}"}
        ]
    ) for artista in sorted(df["nombre_artista"].dropna().unique())
] + [
    dict(
        label=f"Género: {genero}",
        method="update",
        args=[
            {"marker": {"opacity": (df["nombre"] == genero).astype(float) * 0.9}},
            {"title": f"Clusters {TIPO.capitalize()} - Género: {genero}"}
        ]
    ) for genero in sorted(df["nombre"].dropna().unique())
] + [
    dict(
        label=f"Año: {anio}",
        method="update",
        args=[
            {"marker": {"opacity": (df["anio"] == anio).astype(float) * 0.9}},
            {"title": f"Clusters {TIPO.capitalize()} - Año: {anio}"}
        ]
    ) for anio in sorted(df["anio"].dropna().unique())
]

fig.update_traces(marker=dict(size=8, opacity=0.7), selector=dict(mode="markers"))
fig.update_layout(
    updatemenus=[dict(
        buttons=dropdown_buttons,
        direction="down",
        showactive=True,
        x=1.05, xanchor="left",
        y=1.15, yanchor="top"
    )]
)
fig.show()
fig.write_html("clusters_canciones.html")
print("Archivo generado: clusters_canciones.html")
