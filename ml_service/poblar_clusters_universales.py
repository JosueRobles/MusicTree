import os
import re
import numpy as np
from dotenv import load_dotenv
import supabase
from difflib import SequenceMatcher
from collections import defaultdict

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

DEBUG = True          # pon False para silencio
EMBED_MIN = 0.75      # mínimo crédito para que el embedding aporte peso
SCORE_THRESHOLD = 0.85  # umbral final para considerar match válido

# ------------------ Helpers ------------------

def log(*args, **kwargs):
    if DEBUG:
        print(*args, **kwargs)

def normaliza_titulo(t: str) -> str:
    if not t:
        return ""
    t = t.lower()
    t = re.sub(r'\(.*?\)', '', t)  # quitar paréntesis con cosas (feat., versión...)
    t = re.sub(r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo|anniversary|remix|radio edit|super|special|track by track|commentary|version)\b', '', t, flags=re.I)
    t = re.sub(r'[^a-z0-9\s]', ' ', t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def titulos_similares(t1: str, t2: str) -> bool:
    t1n, t2n = normaliza_titulo(t1), normaliza_titulo(t2)
    if not t1n or not t2n:
        return False
    if t1n == t2n:
        return True
    if t1n in t2n or t2n in t1n:
        return True
    return SequenceMatcher(None, t1n, t2n).ratio() > 0.80

def artistas_iguales(a1: set, a2: set) -> bool:
    return a1 == a2 and len(a1) > 0

def artistas_parecidos(a1: set, a2: set) -> bool:
    return len(a1 & a2) > 0

def generos_iguales(g1: set, g2: set) -> bool:
    return g1 == g2 and len(g1) > 0

def generos_parecidos(g1: set, g2: set) -> bool:
    return len(g1 & g2) > 0

def duracion_cercana(d1, d2) -> bool:
    if d1 is None or d2 is None:
        return False
    # normalizar ms <-> s
    d1s = d1 / 1000 if d1 > 1000 else d1
    d2s = d2 / 1000 if d2 > 1000 else d2
    return abs(d1s - d2s) < 10

def cosine_sim_vecs_matrix(video_matrix_norm, vec_normed):
    # video_matrix_norm shape (n_v, dim) normalized, vec_normed shape (dim,)
    return (video_matrix_norm @ vec_normed)  # array (n_v,)

# ------------------ Precarga ------------------

def fetch_all(table, select_cols="*"):
    """Paginado simple para evitar límites."""
    out = []
    offset = 0
    page = 1000
    while True:
        res = sb.table(table).select(select_cols).range(offset, offset + page - 1).execute()
        data = res.data or []
        out.extend(data)
        if len(data) < page:
            break
        offset += page
    return out

def precargar_diccionarios():
    datos = {}

    # Canciones
    canciones = fetch_all("canciones", "id_cancion, titulo, duracion_ms")
    embeddings_c = fetch_all("cancion_embeddings", "id_cancion, embedding")
    artistas_c = fetch_all("cancion_artistas", "cancion_id, artista_id")
    generos_c = fetch_all("cancion_generos", "cancion_id, genero_id")

    datos["canciones"] = {c["id_cancion"]: c for c in canciones}
    datos["embeddings_c"] = {e["id_cancion"]: e["embedding"] for e in embeddings_c}
    datos["artistas_c"] = {}
    for a in artistas_c:
        datos["artistas_c"].setdefault(a["cancion_id"], set()).add(a["artista_id"])
    datos["generos_c"] = {}
    for g in generos_c:
        datos["generos_c"].setdefault(g["cancion_id"], set()).add(g["genero_id"])

    # Videos
    videos = fetch_all("videos_musicales", "id_video, titulo, duracion")
    embeddings_v = fetch_all("video_embeddings", "id_video, embedding")
    artistas_v = fetch_all("video_artistas", "video_id, artista_id")
    generos_v = fetch_all("video_generos", "video_id, genero_id")

    datos["videos"] = {v["id_video"]: v for v in videos}
    datos["embeddings_v"] = {e["id_video"]: e["embedding"] for e in embeddings_v}
    datos["artistas_v"] = {}
    for a in artistas_v:
        datos["artistas_v"].setdefault(a["video_id"], set()).add(a["artista_id"])
    datos["generos_v"] = {}
    for g in generos_v:
        datos["generos_v"].setdefault(g["video_id"], set()).add(g["genero_id"])

    return datos

# ------------------ Main ------------------

# ... (mantén todos tus imports, helpers y precargar_diccionarios)

def main():
    datos = precargar_diccionarios()
    log("Datos precargados: canciones:", len(datos["canciones"]), "videos:", len(datos["videos"]))

    # 1) Grupos base
    grupos_c_rows = fetch_all("cancion_clusters", "grupo, id_cancion")
    grupos_v_rows = fetch_all("video_clusters", "grupo, id_video")
    grupos_c = sorted(set(r["grupo"] for r in grupos_c_rows if r.get("grupo") is not None))
    grupos_v = sorted(set(r["grupo"] for r in grupos_v_rows if r.get("grupo") is not None))

    # 2) Representantes
    reps_c = []
    for g in grupos_c:
        res = sb.table("cancion_clusters").select("id_cancion").eq("grupo", g).limit(1).execute().data
        if res:
            reps_c.append((g, res[0]["id_cancion"]))
    reps_v = []
    for g in grupos_v:
        res = sb.table("video_clusters").select("id_video").eq("grupo", g).limit(1).execute().data
        if res:
            reps_v.append((g, res[0]["id_video"]))

    # 3) Prepara embeddings normalizados de videos
    video_embs, video_meta = [], []
    for g_v, vid in reps_v:
        emb = datos["embeddings_v"].get(vid)
        if emb is None: continue
        vec = np.array(emb, dtype=float)
        if np.linalg.norm(vec) == 0: continue
        video_embs.append(vec / np.linalg.norm(vec))
        video_meta.append({
            "grupo": g_v,
            "id": vid,
            "titulo": datos["videos"].get(vid, {}).get("titulo", ""),
            "artistas": datos["artistas_v"].get(vid, set()),
            "generos": datos["generos_v"].get(vid, set()),
            "duracion": datos["videos"].get(vid, {}).get("duracion")
        })
    if not video_embs:
        log("No embeddings de videos disponibles")
        return
    video_matrix = np.vstack(video_embs)

    # 4) Matching directo canción–video
    grupo_to_universal = {}
    next_group = 1
    matched_examples = []

    for g_c, cid in reps_c:
        emb_c = datos["embeddings_c"].get(cid)
        if emb_c is None: 
            grupo_to_universal[g_c] = next_group; next_group += 1
            continue
        vec_c = np.array(emb_c, dtype=float)
        if np.linalg.norm(vec_c) == 0:
            grupo_to_universal[g_c] = next_group; next_group += 1
            continue
        vec_c /= np.linalg.norm(vec_c)

        sims = video_matrix @ vec_c
        cand_idx = np.where(sims >= EMBED_MIN)[0]
        if cand_idx.size == 0:
            grupo_to_universal[g_c] = next_group; next_group += 1
            continue

        t_c = datos["canciones"].get(cid, {}).get("titulo", "")
        a_c = datos["artistas_c"].get(cid, set())
        g_c_gen = datos["generos_c"].get(cid, set())
        d_c = datos["canciones"].get(cid, {}).get("duracion_ms")

        best_score, best_vid_group, best_vid_id, best_sim = 0, None, None, 0
        for i in cand_idx:
            vmeta = video_meta[i]
            sim = float(sims[i])
            score = 0.35 * sim

            if titulos_similares(t_c, vmeta["titulo"]):
                score += 0.30
            if artistas_iguales(a_c, vmeta["artistas"]):
                score += 0.25
            elif artistas_parecidos(a_c, vmeta["artistas"]):
                score += 0.15
            if duracion_cercana(d_c, vmeta["duracion"]):
                score += 0.05
            if generos_iguales(g_c_gen, vmeta["generos"]):
                score += 0.05
            elif generos_parecidos(g_c_gen, vmeta["generos"]):
                score += 0.02
            
            if score > best_score:
                best_score, best_vid_group, best_vid_id, best_sim = score, vmeta["grupo"], vmeta["id"], sim

        if best_score >= SCORE_THRESHOLD and best_vid_group is not None:
            if best_sim >= 0.75 and (titulos_similares(t_c, vmeta["titulo"]) or artistas_parecidos(a_c, vmeta["artistas"])):
                # Asignar mismo grupo universal a canción y video
                if g_c not in grupo_to_universal and best_vid_group not in grupo_to_universal:
                    grupo_to_universal[g_c] = next_group
                    grupo_to_universal[best_vid_group] = next_group
                    next_group += 1
                elif g_c in grupo_to_universal:
                    grupo_to_universal[best_vid_group] = grupo_to_universal[g_c]
                elif best_vid_group in grupo_to_universal:
                    grupo_to_universal[g_c] = grupo_to_universal[best_vid_group]
                matched_examples.append((cid, best_vid_id, best_score))
        else:
            grupo_to_universal[g_c] = next_group; next_group += 1

    # 5) Asignar grupos faltantes a videos
    for g_v in grupos_v:
        if g_v not in grupo_to_universal:
            grupo_to_universal[g_v] = next_group
            next_group += 1

    # 6) Repoblar entidad_clusters
    sb.table("entidad_clusters").delete().neq("grupo", -1).execute()

    for row in grupos_c_rows:
        sb.table("entidad_clusters").upsert({
            "id_entidad": row["id_cancion"],
            "tipo_entidad": "cancion",
            "grupo": grupo_to_universal[row["grupo"]]
        }).execute()

    for row in grupos_v_rows:
        sb.table("entidad_clusters").upsert({
            "id_entidad": row["id_video"],
            "tipo_entidad": "video",
            "grupo": grupo_to_universal[row["grupo"]]
        }).execute()

    log("Clusters universales repoblados. Total grupos:", next_group - 1)
    log("Matches:", matched_examples[:20])

if __name__ == "__main__":
    main()
