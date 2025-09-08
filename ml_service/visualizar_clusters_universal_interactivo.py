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

def fetch_all(table, select_fields, id_field):
    try:
        res = sb.table(table).select(select_fields).limit(1).execute()
    except Exception as e:
        print(f"⚠️ Aviso: {table} no tiene todas las columnas pedidas ({select_fields}). Error: {e}")
        # Si falla, seleccionamos solo el id_field
        res = sb.table(table).select(id_field).limit(1).execute()
        return []
    
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

# 1. Descarga clusters universales
clusters = fetch_all("entidad_clusters", "id_entidad, tipo_entidad, grupo", "id")

# 2. Descarga embeddings y metadatos de canciones y videos
embs_c = fetch_all("cancion_embeddings", "id_cancion, embedding", "id_cancion")
canciones = fetch_all("canciones", "id_cancion, titulo, album, categoria", "id_cancion")
artistas_rel_c = fetch_all("cancion_artistas", "cancion_id, artista_id", "cancion_id")
generos_rel_c = fetch_all("cancion_generos", "cancion_id, genero_id", "cancion_id")

embs_v = fetch_all("video_embeddings", "id_video, embedding", "id_video")
videos = fetch_all("videos_musicales", "id_video, titulo, anio, categoria", "id_video")
artistas_rel_v = fetch_all("video_artistas", "video_id, artista_id", "video_id")
generos_rel_v = fetch_all("video_generos", "video_id, genero_id", "video_id")

artistas = fetch_all("artistas", "id_artista, nombre_artista", "id_artista")
generos = fetch_all("generos", "id_genero, nombre", "id_genero")

# Canciones
df_c = pd.DataFrame(embs_c).rename(columns={"id_cancion": "id_entidad"})
df_c["tipo_entidad"] = "cancion"
df_c = df_c.merge(pd.DataFrame(canciones).rename(columns={"id_cancion": "id_entidad"}), on="id_entidad", how="left")
df_artrel_c = pd.DataFrame(artistas_rel_c).merge(pd.DataFrame(artistas), left_on="artista_id", right_on="id_artista", how="left")
df_artistas_c = df_artrel_c.groupby("cancion_id")["nombre_artista"].apply(lambda x: ", ".join(x.dropna())).reset_index()
df_c = df_c.merge(df_artistas_c, left_on="id_entidad", right_on="cancion_id", how="left")
df_genrel_c = pd.DataFrame(generos_rel_c).merge(pd.DataFrame(generos), left_on="genero_id", right_on="id_genero", how="left")
df_generos_c = df_genrel_c.groupby("cancion_id")["nombre"].apply(lambda x: ", ".join(x.dropna())).reset_index()
df_c = df_c.merge(df_generos_c, left_on="id_entidad", right_on="cancion_id", how="left")

# Videos
df_v = pd.DataFrame(embs_v).rename(columns={"id_video": "id_entidad"})
df_v["tipo_entidad"] = "video"
df_v = df_v.merge(pd.DataFrame(videos).rename(columns={"id_video": "id_entidad"}), on="id_entidad", how="left")
df_artrel_v = pd.DataFrame(artistas_rel_v).merge(pd.DataFrame(artistas), left_on="artista_id", right_on="id_artista", how="left")
df_artistas_v = df_artrel_v.groupby("video_id")["nombre_artista"].apply(lambda x: ", ".join(x.dropna())).reset_index()
df_v = df_v.merge(df_artistas_v, left_on="id_entidad", right_on="video_id", how="left")
df_genrel_v = pd.DataFrame(generos_rel_v).merge(pd.DataFrame(generos), left_on="genero_id", right_on="id_genero", how="left")
df_generos_v = df_genrel_v.groupby("video_id")["nombre"].apply(lambda x: ", ".join(x.dropna())).reset_index()
df_v = df_v.merge(df_generos_v, left_on="id_entidad", right_on="video_id", how="left")

# Unir todo
df_emb = pd.concat([df_c, df_v], ignore_index=True)
df_clus = pd.DataFrame(clusters)
df = pd.merge(df_emb, df_clus, on=["id_entidad", "tipo_entidad"])
df = df.dropna(subset=["embedding", "grupo"])

X = np.vstack(df["embedding"].values)
labels = df["grupo"].values
tipos = df["tipo_entidad"].values

# UMAP
umap_2d = umap.UMAP(n_neighbors=15, min_dist=0.1, metric='cosine', random_state=42)
X_2d = umap_2d.fit_transform(X)

df["UMAP1"] = X_2d[:,0]
df["UMAP2"] = X_2d[:,1]

# Filtros interactivos: tipo_entidad, artista, cluster, género, año
hover_cols = {}
for col in ["titulo", "nombre_artista", "nombre", "anio", "categoria", "tipo_entidad", "grupo"]:
    hover_cols[col] = col in df.columns

fig = px.scatter(
    df, x="UMAP1", y="UMAP2",
    color="grupo",
    symbol="tipo_entidad",
    hover_data=hover_cols,
    title="Mapa interactivo de Clusters Universales (Canciones y Videos)"
)
# Filtros por dropdown
dropdown_buttons = [
    dict(label="Todos los tipos", method="restyle", args=[{"marker": {"opacity": 0.7}}]),
]

# Filtro por tipo de entidad
if "tipo_entidad" in df.columns:
    dropdown_buttons += [
        dict(
            label=tipo,
            method="update",
            args=[
                {"marker": {"opacity": (df["tipo_entidad"] == tipo).astype(float) * 0.9}},
                {"title": f"Clusters Universales - {tipo.capitalize()}"}
            ]
        ) for tipo in sorted(df["tipo_entidad"].dropna().unique())
    ]

# Filtro por artista
if "nombre_artista" in df.columns:
    dropdown_buttons += [
        dict(
            label=f"Artista: {artista}",
            method="update",
            args=[
                {"marker": {"opacity": (df["nombre_artista"] == artista).astype(float) * 0.9}},
                {"title": f"Clusters Universales - Artista: {artista}"}
            ]
        ) for artista in sorted(df["nombre_artista"].dropna().unique())
    ]

# Filtro por género
if "nombre" in df.columns:
    dropdown_buttons += [
        dict(
            label=f"Género: {genero}",
            method="update",
            args=[
                {"marker": {"opacity": (df["nombre"] == genero).astype(float) * 0.9}},
                {"title": f"Clusters Universales - Género: {genero}"}
            ]
        ) for genero in sorted(df["nombre"].dropna().unique())
    ]

# Filtro por año (solo si existe)
if "anio" in df.columns:
    dropdown_buttons += [
        dict(
            label=f"Año: {anio}",
            method="update",
            args=[
                {"marker": {"opacity": (df["anio"] == anio).astype(float) * 0.9}},
                {"title": f"Clusters Universales - Año: {anio}"}
            ]
        ) for anio in sorted(df["anio"].dropna().unique())
    ]

fig.update_traces(marker=dict(size=8, opacity=0.7), selector=dict(mode='markers'))
fig.update_layout(
    updatemenus=[
        dict(
            buttons=dropdown_buttons,
            direction="down",
            showactive=True,
            x=1.05,
            xanchor="left",
            y=1.15,
            yanchor="top"
        )
    ]
)
fig.show()
fig.write_html("clusters_universales.html")
print("Archivo generado: clusters_universales.html")