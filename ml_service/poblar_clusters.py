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

    # eliminar todo lo que esté entre paréntesis primero
    t = re.sub(r'\(.*?\)', ' ', t)

    # lista extensa de tokens de versiones/remixes/ediciones
    t = re.sub(
        r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|anniversary|expanded|complete|version|mix|'
        r'radio|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|karaoke|single|ep|lp|box set|'
        r'disc\s*\d+|cd\s*\d+|vinyl|digital|special|reissue|commentary|edit|album version|single version|'
        r'club mix|extended|intro|outro|interlude|a cappella|minus mix|immortal version|'
        r'home demo|stripped mix|rejuvenated|directors cut|immortal|25th anniversary|2003 edit|2012 remaster)\b',
        '',
        t, flags=re.I
    )

    # remover "feat", "ft.", "with" y lo que venga después
    t = re.sub(r'\b(feat\.?|ft\.?|with)\b.*', '', t, flags=re.I)

    # quitar años y números sueltos
    t = re.sub(r'\b\d{2,4}\b', '', t)

    # eliminar caracteres extraños, dejar letras, numeros, espacios y guiones
    t = re.sub(r'[^a-z0-9\s\-]', ' ', t)

    # compactar espacios y guiones duplicados
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
    rows = sb.table("albumes").select("id_album, titulo, anio, popularidad_album").in_("id_album", ids).execute().data
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
SONG_THRESHOLD = 0.60  # un poco más estricto

VIDEO_WEIGHTS = SONG_WEIGHTS.copy()
VIDEO_THRESHOLD = 0.60

ALBUM_WEIGHTS = {
    "title": 0.60,
    "artist": 0.30,
    "genre": 0.08,
    "embedding": 0.02,
}
ALBUM_THRESHOLD = 0.55


def compute_song_match_score(m1, a1, d1, m2, a2, d2, sim_obj=None):
    # titulo
    title_score = titulo_ratio(m1.get("titulo", ""), m2.get("titulo", ""))
    # artistas
    artist_score = artistas_overlap_score(a1, a2)
    # duracion
    dur_score = duracion_score(d1, d2)
    dur_score_val = 0.0 if dur_score is None else dur_score
    # embedding score
    emb_score = parse_microservice_score(sim_obj) or 0.0
    score = (
        SONG_WEIGHTS["title"] * title_score +
        SONG_WEIGHTS["artist"] * artist_score +
        SONG_WEIGHTS["duration"] * dur_score_val +
        SONG_WEIGHTS["embedding"] * emb_score
    )
    # reglas adicionales de leniency: si hay al menos 1 artista en comun + titulo razonable, aceptamos
    if artist_score > 0 and title_score >= 0.7 and (dur_score is None or dur_score == 1.0):
        score = max(score, 0.7)
    # fallback boost: si títulos son casi idénticos (>=0.85) y hay un artista en común
    if title_score >= 0.85 and artist_score > 0:
        score = max(score, 0.8)
    # fallback para duetos/versiones: si título >=0.75 y duración casi igual
    if title_score >= 0.75 and duracion_score(d1, d2) >= 0.8:
        score = max(score, 0.75)
    if emb_score >= 0.85 and title_score >= 0.5:
        score = max(score, 0.7)
    # fallback fuerte: mismo artista + duración casi igual
    if artist_score > 0 and title_score >= 0.65 and duracion_relajada(d1, d2) >= 0.8:
        score = max(score, 0.75)
    # títulos base casi idénticos aunque score baje
    if normalizar_titulo_base(m1.get("titulo","")) == normalizar_titulo_base(m2.get("titulo","")):
        score = max(score, 0.9)
    return score


def compute_video_match_score(m1, a1, d1, m2, a2, d2, sim_obj=None):
    # usamos misma lógica que canciones
    title_score = titulo_ratio(m1.get("titulo", ""), m2.get("titulo", ""))
    artist_score = artistas_overlap_score(a1, a2)
    dur_score = duracion_score(d1, d2)
    dur_score_val = 0.0 if dur_score is None else dur_score
    emb_score = parse_microservice_score(sim_obj) or 0.0
    score = (
        VIDEO_WEIGHTS["title"] * title_score +
        VIDEO_WEIGHTS["artist"] * artist_score +
        VIDEO_WEIGHTS["duration"] * dur_score_val +
        VIDEO_WEIGHTS["embedding"] * emb_score
    )
    if artist_score > 0 and title_score >= 0.7 and (dur_score is None or dur_score == 1.0):
        score = max(score, 0.7)
    return score


def compute_album_match_score(m1, a1, g1, m2, a2, g2, sim_obj=None):
    title_score = titulo_ratio(m1.get("titulo", ""), m2.get("titulo", ""))
    artist_score = artistas_overlap_score(a1, a2)
    genre_score = generos_overlap_score(g1, g2)
    # bloque ante años distintos si título no es casi idéntico
    year1 = m1.get("anio")
    year2 = m2.get("anio")
    if year1 and year2:
        diff = abs(int(year1) - int(year2))
        if diff > 3 and title_score < 0.7:
            return 0.0
        if diff > 1 and title_score < 0.6:
            return 0.0
    emb_score = parse_microservice_score(sim_obj) or 0.0
    score = (
        ALBUM_WEIGHTS["title"] * title_score +
        ALBUM_WEIGHTS["artist"] * artist_score +
        ALBUM_WEIGHTS["genre"] * genre_score +
        ALBUM_WEIGHTS["embedding"] * emb_score
    )
    # regla: si hay artist en comun y titulo muy parecido, subir confidence
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

def poblar_cancion_clusters():
    print("Procesando clusters de canciones (full)...")
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        rows = sb.table("cancion_embeddings").select("id_cancion", "embedding").range(offset, offset + page_size - 1).execute().data
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    ids = [r["id_cancion"] for r in all_rows]
    if not ids:
        print("No hay embeddings de canciones.")
        return

    meta_map = bulk_fetch_cancion_meta(ids)
    artistas_map = bulk_fetch_cancion_artistas(ids)
    popularity_map = {k: (v.get("popularidad") or 0) for k, v in meta_map.items()}

    # Agrupa por (frozenset(artistas), título normalizado)
    grupos = {}
    for id_c in ids:
        t = meta_map.get(id_c, {}).get("titulo", "")
        a = artistas_map.get(id_c, set())
        norm_t = normalizar_titulo_base(t)
        if not norm_t:
            norm_t = t.lower().strip()
        clave = (frozenset(str(x).lower().strip() for x in a), norm_t)
        grupos.setdefault(clave, []).append(id_c)

    # Asigna grupos y representante
    groups_with_rep = []
    for miembros in grupos.values():
        rep = max(miembros, key=lambda x: popularity_map.get(x, 0))
        rep_pop = popularity_map.get(rep, 0)
        groups_with_rep.append((miembros, rep, rep_pop))
    groups_with_rep.sort(key=lambda x: x[2], reverse=True)

    sb.table("cancion_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    batch = []
    for miembros, rep, rep_pop in groups_with_rep:
        for i in miembros:
            batch.append({"id_cancion": i, "grupo": grupo_num})
        grupo_num += 1
        if len(batch) >= 5000:
            sb.table("cancion_clusters").upsert(batch).execute()
            batch = []
    if batch:
        sb.table("cancion_clusters").upsert(batch).execute()
    print(f"Clusters de canciones poblados: {grupo_num-1} grupos.")
    agrupadas = set()
    for miembros, _, _ in groups_with_rep:
        agrupadas.update(miembros)
    no_agrupadas = [i for i in ids if i not in agrupadas]
    
    # Agrupa por título base y al menos un artista en común
    grupos_duetos = []
    usados = set()
    for i in no_agrupadas:
        if i in usados:
            continue
        t1 = meta_map.get(i, {}).get("titulo", "")
        a1 = artistas_map.get(i, set())
        norm_t1 = normalizar_titulo_base(t1)
        grupo = [i]
        for j in no_agrupadas:
            if j == i or j in usados:
                continue
            t2 = meta_map.get(j, {}).get("titulo", "")
            a2 = artistas_map.get(j, set())
            norm_t2 = normalizar_titulo_base(t2)
            # Título base igual y al menos un artista en común
            if norm_t1 == norm_t2 and len(set(a1) & set(a2)) > 0:
                grupo.append(j)
                usados.add(j)
        if len(grupo) > 1:
            grupos_duetos.append(grupo)
            usados.update(grupo)
    
    # Asigna nuevos grupos para duetos/remixes
    for grupo in grupos_duetos:
        rep = max(grupo, key=lambda x: popularity_map.get(x, 0))
        for i in grupo:
            batch.append({"id_cancion": i, "grupo": grupo_num})
        grupo_num += 1
        if len(batch) >= 5000:
            sb.table("cancion_clusters").upsert(batch).execute()
            batch = []
    if batch:
        sb.table("cancion_clusters").upsert(batch).execute()
    print(f"Clusters de duetos/remixes agregados: {len(grupos_duetos)} grupos.")

def poblar_video_clusters():
    print("Procesando clusters de videos (full)...")
    videos = get_all_items("video_embeddings", "id_video")
    ids = [v["id_video"] for v in videos]
    if not ids:
        print("No hay embeddings de videos.")
        return

    meta_map = bulk_fetch_video_meta(ids)
    artistas_map = bulk_fetch_video_artistas(ids)
    popularity_map = {k: (v.get("popularidad") or 0) for k, v in meta_map.items()}

    uf = UnionFind(ids)
    similitud_cache = {}

    for v in videos:
        v_id = v["id_video"]
        cache_key = f"video_{v_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            try:
                resp = requests.post(MICROSERVICIO_URL, json={
                    "entidad": "video",
                    "id": v_id,
                    "embedding": v["embedding"]
                }, timeout=30)
                similares = resp.json()
            except Exception as e:
                print(f"Error microservicio similitud para video {v_id}: {e}")
                similares = []
            similitud_cache[cache_key] = similares

        m1 = meta_map.get(v_id, {})
        a1 = artistas_map.get(v_id, set())
        d1 = m1.get("duracion")

        for s in similares:
            s_id = s.get("id")
            if s_id is None or s_id not in meta_map:
                continue
            m2 = meta_map.get(s_id, {})
            a2 = artistas_map.get(s_id, set())
            d2 = m2.get("duracion")
            sim_obj = s
            score = compute_video_match_score(m1, a1, d1, m2, a2, d2, sim_obj)
            if score >= VIDEO_THRESHOLD:
                uf.union(v_id, s_id)

    grupos = {}
    for i in ids:
        root = uf.find(i)
        grupos.setdefault(root, []).append(i)

    groups_with_rep = []
    for root, miembros in grupos.items():
        rep = max(miembros, key=lambda x: popularity_map.get(x, 0))
        rep_pop = popularity_map.get(rep, 0)
        groups_with_rep.append((root, miembros, rep, rep_pop))
    groups_with_rep.sort(key=lambda x: x[3], reverse=True)

    sb.table("video_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    for root, miembros, rep, rep_pop in groups_with_rep:
        for i in miembros:
            sb.table("video_clusters").upsert({
                "id_video": i,
                "grupo": grupo_num
            }).execute()
        grupo_num += 1

    print(f"Clusters de videos poblados: {grupo_num-1} grupos.")


def poblar_album_clusters():
    print("Procesando clusters de álbumes (full)...")
    # Pagina para obtener todos los embeddings
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

    grupos = cluster_por_embedding(ids, embs, threshold=0.80)
    uf = UnionFind(ids)

    meta_map = bulk_fetch_album_meta(ids)
    artistas_map = bulk_fetch_album_artistas(ids)
    generos_map = bulk_fetch_album_generos(ids)
    popularity_map = {k: (v.get("popularidad_album") or 0) for k, v in meta_map.items()}

    for root, miembros in grupos.items():
        for i in miembros:
            for j in miembros:
                if i == j: continue
                a1, a2 = artistas_map.get(i, set()), artistas_map.get(j, set())
                t1, t2 = meta_map.get(i, {}).get("titulo", ""), meta_map.get(j, {}).get("titulo", "")
                artist_overlap = artistas_overlap_score(a1, a2)
                t_ratio = titulo_ratio(t1, t2)
                # Solo si artistas son exactamente iguales y título >= 0.65
                if a1 == a2 and t_ratio >= 0.65:
                    if not son_albumes_ediciones_distintas(t1, t2):
                        uf.union(i, j)
                # Si el artista principal está en ambos y título >= 0.70
                elif artista_principal(a1) and artista_principal(a1) == artista_principal(a2) and t_ratio >= 0.65:
                    if not son_albumes_ediciones_distintas(t1, t2):
                        uf.union(i, j)
                # Nunca mezclar si los artistas son distintos

    grupos_final = {}
    for i in ids:
        root = uf.find(i)
        grupos_final.setdefault(root, []).append(i)

    groups_with_rep = []
    for root, miembros in grupos_final.items():
        rep = max(miembros, key=lambda x: popularity_map.get(x, 0))
        rep_pop = popularity_map.get(rep, 0)
        groups_with_rep.append((root, miembros, rep, rep_pop))
    groups_with_rep.sort(key=lambda x: x[3], reverse=True)

    sb.table("album_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    batch = []
    for root, miembros, rep, rep_pop in groups_with_rep:
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

if __name__ == "__main__":
    poblar_cancion_clusters()
    # poblar_video_clusters()
    # poblar_album_clusters()