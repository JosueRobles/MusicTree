import os
from dotenv import load_dotenv
import supabase
import requests
import re
from difflib import SequenceMatcher
import time
import faiss
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MICROSERVICIO_URL = os.getenv("MICROSERVICIO_URL", "http://localhost:8000/similares")

sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

def normalizar_titulo_base(titulo: str) -> str:
    """
    Normaliza títulos para comparación:
    - lowercase
    - elimina tokens tipo 'remaster', 'deluxe', 'remix', 'radio edit', 'version', etc.
    - elimina contenidos entre paréntesis y 'feat/with' explícitos
    - elimina años/números sueltos
    - quita caracteres no-alfanuméricos salvo espacios y guiones
    - compacta espacios
    """
    if not titulo:
        return ""
    t = titulo.lower()
    t = re.sub(r'\(.*?\)', ' ', t)
    # Palabras clave ampliadas
    t = re.sub(
        r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|anniversary|expanded|complete|version|mix|'
        r'radio|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|karaoke|single|ep|lp|box set|'
        r'disc\s*\d+|cd\s*\d+|vinyl|digital|special|reissue|commentary|edit|album version|single version|'
        r'club mix|extended|intro|outro|interlude|a cappella|minus mix|immortal version|'
        r'home demo|stripped mix|rejuvenated|directors cut|immortal|25th anniversary|2003 edit|2012 remaster|'
        r'taylor\'?s version|complete edition|acoustic|from the vault|package|alternate|track by track)\b',
        '', t, flags=re.I
    )
    t = re.sub(r'\b(feat\.?|ft\.?|with)\b.*', '', t, flags=re.I)
    t = re.sub(r'\b\d{2,4}\b', '', t)
    t = re.sub(r'[^a-z0-9\s\-]', ' ', t)
    t = re.sub(r'[\s\-]+', ' ', t).strip()
    return t

def titulo_ratio(t1, t2):
    """Ratio (0..1) entre 2 títulos usando token-jaccard + SequenceMatcher."""
    n1, n2 = normalizar_titulo_base(t1), normalizar_titulo_base(t2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0

    # token set jaccard
    s1 = set(n1.split())
    s2 = set(n2.split())
    if s1 and s2:
        inter = len(s1 & s2)
        union = len(s1 | s2)
        jaccard = inter / union if union > 0 else 0.0
    else:
        jaccard = 0.0

    # substring/sequence similarity
    sm = SequenceMatcher(None, n1, n2).ratio()

    # si uno contiene al otro y longitudes similares, darle empujón
    contains_boost = 0.0
    len_diff = abs(len(n1) - len(n2))
    if (n1 in n2 or n2 in n1) and len_diff < 5:
        contains_boost = 0.15


    # combinar: jaccard (0..1) y sm (0..1). Priorizamos jaccard un poco.
    combined = 0.6 * jaccard + 0.4 * sm + contains_boost
    return min(1.0, combined)


def artistas_overlap_score(s1, s2):
    """
    Retorna 0..1 según solapamiento de artistas.
    Acepta sets/listas de ids o nombres. Normaliza con str(...).lower().
    Normaliza por el tamaño del set más pequeño (favorece que un subconjunto coincida).
    """
    if not s1 or not s2:
        return 0.0
    set1 = {str(x).lower().strip() for x in s1}
    set2 = {str(x).lower().strip() for x in s2}
    inter = len(set1 & set2)
    if inter == 0:
        return 0.0
    denom = min(len(set1), len(set2))
    return inter / max(1, denom)

def generos_overlap_score(g1, g2):
    if not g1 or not g2:
        return 0.0
    i = len(set(g1).intersection(set(g2)))
    denom = max(1, min(len(g1), len(g2)))
    return i / denom


def duracion_score(d1, d2):
    if not d1 or not d2:
        return 0
    diff = abs(d1 - d2)
    if diff < 2000:   # 2 segundos
        return 1.0
    if diff < 5000:   # 5 segundos
        return 0.8
    if diff < 10000:  # 10 segundos
        return 0.5
    return 0

def duracion_relajada(d1, d2):
    if not d1 or not d2:
        return 0.0
    diff = abs(d1 - d2)
    if diff <= 2000: return 1.0
    if diff <= 5000: return 0.7
    if diff <= 10000: return 0.5
    return 0.0

def cluster_por_embedding(ids, embs, threshold=0.85):
    """
    Agrupa ids por similitud de embedding usando FAISS.
    Retorna: {grupo_id: [id1, id2, ...]}
    """
    index = faiss.IndexFlatIP(embs.shape[1])
    index.add(embs)
    D, I = index.search(embs, k=20)  # top 20 vecinos

    uf = UnionFind(ids)
    for i, id_i in enumerate(ids):
        for j, sim in zip(I[i], D[i]):
            if i == j or sim < threshold:
                continue
            uf.union(id_i, ids[j])
    grupos = {}
    for i in ids:
        root = uf.find(i)
        grupos.setdefault(root, []).append(i)
    return grupos

def parse_microservice_score(sim_obj):
    """Extrae un score de similitud desde la respuesta del microservicio si existe.
    Buscamos claves comunes: score, similarity, sim, s, distance (en cuyo caso devolvemos 1-distance).
    """
    if not isinstance(sim_obj, dict):
        return None
    for k in ("score", "similarity", "sim", "s"):
        if k in sim_obj:
            try:
                v = float(sim_obj[k])
                # asumimos que score ya es 0..1
                if 0 <= v <= 1:
                    return v
                # si está en 0..100
                if v > 1 and v <= 100:
                    return v / 100.0
            except Exception:
                pass
    if "distance" in sim_obj:
        try:
            d = float(sim_obj["distance"])
            return max(0.0, 1.0 - d)
        except Exception:
            pass
    return None

def fetch_similares(entidad, item_id, emb):
    try:
        resp = requests.post(MICROSERVICIO_URL, json={
            "entidad": entidad,
            "id": item_id,
            "embedding": emb
        }, timeout=30 if entidad != "album" else 60)
        return item_id, resp.json()
    except Exception as e:
        print(f"Error microservicio {entidad} {item_id}: {e}")
        return item_id, []

# -----------------------------
# Queries auxiliares (bulk-fetch para reducir round-trips)
# -----------------------------

def bulk_fetch_cancion_meta(ids):
    if not ids:
        return {}
    rows = sb.table("canciones").select("id_cancion, titulo, duracion_ms, popularidad").in_("id_cancion", ids).execute().data
    return {r["id_cancion"]: r for r in rows}


def bulk_fetch_cancion_artistas(ids):
    if not ids:
        return {}
    rows = sb.table("cancion_artistas").select("cancion_id, artista_id").in_("cancion_id", ids).execute().data
    m = {}
    for r in rows:
        m.setdefault(r["cancion_id"], set()).add(r["artista_id"])
    return m


def bulk_fetch_video_meta(ids):
    if not ids:
        return {}
    rows = sb.table("videos_musicales").select("id_video, titulo, duracion, popularidad").in_("id_video", ids).execute().data
    return {r["id_video"]: r for r in rows}


def bulk_fetch_video_artistas(ids):
    if not ids:
        return {}
    rows = sb.table("video_artistas").select("video_id, artista_id").in_("video_id", ids).execute().data
    m = {}
    for r in rows:
        m.setdefault(r["video_id"], set()).add(r["artista_id"])
    return m


def bulk_fetch_album_meta(ids):
    if not ids:
        return {}
    rows = sb.table("albumes").select("id_album, titulo, anio, popularidad_album, numero_canciones").in_("id_album", ids).execute().data
    return {r["id_album"]: r for r in rows}


def bulk_fetch_album_artistas(ids):
    if not ids:
        return {}
    rows = sb.table("album_artistas").select("album_id, artista_id").in_("album_id", ids).execute().data
    m = {}
    for r in rows:
        m.setdefault(r["album_id"], set()).add(r["artista_id"])
    return m


def bulk_fetch_album_generos(ids):
    if not ids:
        return {}
    rows = sb.table("album_generos").select("album_id, genero_id").in_("album_id", ids).execute().data
    m = {}
    for r in rows:
        m.setdefault(r["album_id"], set()).add(r["genero_id"])
    return m


def bulk_fetch_album_canciones(ids):
    if not ids:
        return {}
    rows = sb.table("canciones").select("id_cancion, album, titulo").in_("album", ids).execute().data
    m = {}
    for r in rows:
        m.setdefault(r["album"], set()).add(normalizar_titulo_base(r["titulo"]))
    return m


# -----------------------------
# Lógica de matching (score-based)
# -----------------------------

# Pesos (ajustables)
SONG_WEIGHTS = {
    "title": 0.55,   # 👆 más peso
    "artist": 0.25,  # 👇 menos peso
    "duration": 0.15,
    "embedding": 0.05,
}
SONG_THRESHOLD = 0.50  # un poco más estricto

VIDEO_WEIGHTS = SONG_WEIGHTS.copy()
VIDEO_THRESHOLD = 0.60

ALBUM_WEIGHTS = {
    "title": 0.30,   # baja un poco para compensar
    "artist": 0.45,  # sube el peso
    "genre": 0.08,
    "embedding": 0.17,
}
ALBUM_THRESHOLD = 0.35  # puedes ajustar tras pruebas


def compute_album_match_score(m1, a1, g1, m2, a2, g2, sim_obj=None):
    title_score = titulo_ratio(m1.get("titulo", ""), m2.get("titulo", ""))
    artist_score = artistas_overlap_score(a1, a2)
    genre_score = generos_overlap_score(g1, g2)
    # bloque ante años distintos si título no es casi idéntico
    year1 = m1.get("anio")
    year2 = m2.get("anio")
    if year1 and year2:
        diff = abs(int(year1) - int(year2))
        if diff > 3 and title_score < 0.85:
            return 0.0
        if diff > 1 and title_score < 0.7:
            return 0.0
    emb_score = parse_microservice_score(sim_obj) or 0.0
    score = (
        ALBUM_WEIGHTS["title"] * title_score +
        ALBUM_WEIGHTS["artist"] * artist_score +
        ALBUM_WEIGHTS["genre"] * genre_score +
        ALBUM_WEIGHTS["embedding"] * emb_score
    )
    # regla: si hay artist in comun y titulo muy parecido, subir confidence
    if artist_score > 0 and title_score >= 0.75:
        score = max(score, 0.7)
    return score


# -----------------------------
# Core: poblar clusters (full + incremental)
# -----------------------------


def get_all_items(tabla, id_field):
    all_items = []
    offset = 0
    page_size = 1000
    while True:
        res = sb.table(tabla).select(id_field, "embedding").range(offset, offset + page_size - 1).execute()
        if not res.data:
            break
        all_items.extend(res.data)
        if len(res.data) < page_size:
            break
        offset += page_size
    return all_items

def get_all_embeddings(tabla, id_field):
    rows = sb.table(tabla).select(id_field, "embedding").execute().data
    ids = [r[id_field] for r in rows]
    embs = [np.array(r["embedding"], dtype=np.float32) for r in rows]
    embs = np.vstack([v/np.linalg.norm(v) if np.linalg.norm(v)>0 else v for v in embs])
    return ids, embs


class UnionFind:
    def __init__(self, ids):
        self.parent = {i: i for i in ids}
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px != py:
            self.parent[py] = px


def artista_principal(artistas):
    # Devuelve el primer artista (o el más popular si tienes ese dato)
    return sorted([str(a).lower().strip() for a in artistas])[0] if artistas else None

def jaccard(set1, set2):
    if not set1 or not set2:
        return 0.0
    inter = len(set1 & set2)
    union = len(set1 | set2)
    return inter / union if union > 0 else 0.0

def mutual_knn(ids, embs, k=10, emb_threshold=0.40):
    index = faiss.IndexFlatIP(embs.shape[1])
    index.add(embs)
    D, I = index.search(embs, k+1)
    neighbors = {i: set() for i in range(len(ids))}
    for i, row in enumerate(I):
        for j, sim in zip(row, D[i]):
            if i == j or sim < emb_threshold:
                continue
            neighbors[i].add(j)
    # mutual kNN
    pairs = set()
    for i in range(len(ids)):
        for j in neighbors[i]:
            if i in neighbors[j]:
                pairs.add(tuple(sorted((i, j))))
    return pairs

def poblar_album_clusters():
    print("Procesando clusters de álbumes (mutual-kNN + combined_score)...")
    canciones_rows = sb.table("canciones").select("id_cancion, album, titulo, duracion_ms").execute().data
    canciones_df = pd.DataFrame(canciones_rows)
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        rows = sb.table("album_embeddings").select("id_album", "embedding").range(offset, offset + page_size - 1).execute().data
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    ids = [r["id_album"] for r in all_rows]
    embs = [np.array(r["embedding"], dtype=np.float32) for r in all_rows]
    if not ids:
        print("No hay embeddings de álbumes.")
        return
    embs = np.vstack([v/np.linalg.norm(v) if np.linalg.norm(v)>0 else v for v in embs])

    # 1. Vecinos recíprocos
    pairs = mutual_knn(ids, embs, k=10, emb_threshold=0.70)

    # 2. Cargar metadatos
    meta_map = bulk_fetch_album_meta(ids)
    artistas_map = bulk_fetch_album_artistas(ids)
    generos_map = bulk_fetch_album_generos(ids)
    canciones_map = bulk_fetch_album_canciones(ids)
    popularity_map = {k: (v.get("popularidad_album") or 0) for k, v in meta_map.items()}

    uf = UnionFind(ids)
    combined_threshold = 0.40

    REMIX_TOKENS = ["remix", "edit", "bundle", "mix", "radio edit", "version"]
    for i_idx, j_idx in pairs:
        i, j = ids[i_idx], ids[j_idx]
        m1, m2 = meta_map.get(i, {}), meta_map.get(j, {})
        a1, a2 = artistas_map.get(i, set()), artistas_map.get(j, set())
        g1, g2 = generos_map.get(i, set()), generos_map.get(j, set())
        can1, can2 = canciones_map.get(i, set()), canciones_map.get(j, set())
        t1_raw, t2_raw = m1.get("titulo", ""), m2.get("titulo", "")
        t1, t2 = normalizar_titulo_base(t1_raw), normalizar_titulo_base(t2_raw)
        artist_score = artistas_overlap_score(a1, a2)
        genre_score = generos_overlap_score(g1, g2)
        # Siempre compara títulos normalizados
        title_score = titulo_ratio(t1, t2)
        # Overlap de canciones
        songs_overlap = canciones_overlap(i, j, canciones_df)

        # Filtro obligatorio: artistas
        if artist_score < 0.7:
            continue

        # Regla: tokens especiales (deluxe, edition, anniversary, remaster, etc.)
        if (tiene_token_especial(t1_raw) or tiene_token_especial(t2_raw)) and t1 == t2:
            uf.union(i, j)
            continue

        # Regla: Taylor's Version
        if (es_taylors_version(t1_raw) or es_taylors_version(t2_raw)) and t1 == t2:
            uf.union(i, j)
            continue

        # Regla: singles/remixes/edits/bundles
        if t1 == t2 and any(tok in t1_raw.lower() or tok in t2_raw.lower() for tok in REMIX_TOKENS):
            uf.union(i, j)
            continue

        # Regla: overlap de canciones
        if songs_overlap >= 0.7:
            uf.union(i, j)
            continue

        # Regla general: títulos muy parecidos y artistas iguales
        if title_score >= 0.9 and artist_score >= 0.7:
            uf.union(i, j)
            continue

        # Regla general: overlap parcial y artistas iguales
        if songs_overlap >= 0.5 and artist_score >= 0.7:
            uf.union(i, j)
            continue

        # Regla general: combinación de scores
        songs_weight = 0.6
        combined_score = (
            0.30 * title_score +
            0.30 * artist_score +
            songs_weight * songs_overlap +
            0.05 * genre_score +
            0.10
        )
        if combined_score >= 0.35:
            uf.union(i, j)
            continue

    # 3. Construir clusters
    grupos_final = {}
    for i in ids:
        root = uf.find(i)
        grupos_final.setdefault(root, []).append(i)

    # 4. Guardar snapshot previo
    snapshot = sb.table("album_clusters").select("*").execute().data
    with open("album_clusters_snapshot.json", "w", encoding="utf-8") as f:
        import json
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    # 5. Guardar clusters nuevos
    sb.table("album_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    batch = []
    for root, miembros in grupos_final.items():
        rep = max(miembros, key=lambda x: popularity_map.get(x, 0))
        rep_pop = popularity_map.get(rep, 0)
        for i in miembros:
            batch.append({"id_album": i, "grupo": grupo_num})
        grupo_num += 1
        if len(batch) >= 5000:
            sb.table("album_clusters").upsert(batch).execute()
            batch = []
    if batch:
        sb.table("album_clusters").upsert(batch).execute()
    print(f"Clusters de álbumes poblados: {grupo_num-1} grupos.")

def extraer_numero_romano(titulo):
    # Busca números romanos al final del título
    match = re.search(r'\b([IVXLCDM]+)\b$', titulo.strip())
    return match.group(1) if match else None

def son_albumes_ediciones_distintas(t1, t2):
    n1 = extraer_numero_romano(t1)
    n2 = extraer_numero_romano(t2)
    if n1 and n2 and n1 != n2:
        return True
    return False

def tiene_sufijo_numerico(titulo):
    # Busca LP2, Vol. 2, II, III, etc.
    return bool(re.search(r'(vol\.?\s*\d+|lp\s*\d+|\bii+\b|\biii+\b|\biv+\b|\b2\b|\b3\b|\b4\b)', titulo.lower()))

SPECIAL_TOKENS = [
    "deluxe", "edition", "anniversary", "remaster", "version", "expanded",
    "international", "japan version", "super", "complete", "alternate", "bonus", "reissue"
]

def tiene_token_especial(titulo):
    t = normalizar_titulo_base(titulo)
    return any(tok in t for tok in SPECIAL_TOKENS)

def canciones_jaccard(album1, album2, canciones_df):
    # Matching por título normalizado y duración (tolerancia 10s), ratio ≥ 0.8
    songs1 = canciones_df[canciones_df['album'] == album1]
    songs2 = canciones_df[canciones_df['album'] == album2]
    set1 = set()
    for _, row1 in songs1.iterrows():
        t1 = normalizar_titulo_base(row1['titulo'])
        d1 = row1.get('duracion_ms', 0)
        for _, row2 in songs2.iterrows():
            t2 = normalizar_titulo_base(row2['titulo'])
            d2 = row2.get('duracion_ms', 0)
            ratio = titulo_ratio(t1, t2)
            if (ratio > 0.8 or t1 in t2 or t2 in t1) and abs((d1 or 0) - (d2 or 0)) < 10000:
                set1.add(t1)
                break
    set2 = set(normalizar_titulo_base(t) for t in songs2['titulo'])
    return len(set1 & set2) / len(set1 | set2) if set1 | set2 else 0.0

def canciones_overlap(album1, album2, canciones_df):
    songs1 = canciones_df[canciones_df['album'] == album1]
    songs2 = canciones_df[canciones_df['album'] == album2]
    set1 = set(normalizar_titulo_base(t) for t in songs1['titulo'])
    set2 = set(normalizar_titulo_base(t) for t in songs2['titulo'])
    inter = len(set1 & set2)
    denom = min(len(set1), len(set2)) or 1
    return inter / denom

def es_taylors_version(titulo):
    t = normalizar_titulo_base(titulo)
    return "taylors version" in t or "taylor's version" in t

if __name__ == "__main__":
    poblar_album_clusters()