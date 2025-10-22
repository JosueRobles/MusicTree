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
import json
from collections import Counter

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MICROSERVICIO_URL = os.getenv("MICROSERVICIO_URL", "http://localhost:8000/similares")

sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# -----------------------------
# Config: modos (Collection = estricto, Artist-Catalog = permisivo)
# -----------------------------
MODES = {
    "collection": {
        "weights": {"artist": 0.38, "title": 0.34, "songs": 0.12, "embedding": 0.12, "genre": 0.04},
        "hard_artist_min": 0.65,   # menos estricto
        "combined_threshold": 0.45, # bajar el umbral combinado
    },
    "artist_catalog": {
        "weights": {"artist": 0.28, "title": 0.28, "songs": 0.20, "embedding": 0.16, "genre": 0.08},
        "hard_artist_min": 0.50,
        "combined_threshold": 0.32,
    }
}
# fallback if mixed -> use collection (más estricto)
DEFAULT_MODE = "collection"

# tunables
MUTUAL_KNN_K = 20
EMB_THRESHOLD = 0.60

# -----------------------------
# Utilities / normalización / scoring (mantener compatibilidad)
# -----------------------------
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

    # mejora: si comparten tokens masivamente y sm alto, empujar
    if jaccard >= 0.8 and sm >= 0.7:
        contains_boost += 0.1

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

def canciones_overlap(album1, album2, canciones_df):
    songs1 = canciones_df[canciones_df['album'] == album1]
    songs2 = canciones_df[canciones_df['album'] == album2]
    set1 = set(normalizar_titulo_base(t) for t in songs1['titulo'] if t)
    set2 = set(normalizar_titulo_base(t) for t in songs2['titulo'] if t)
    inter = len(set1 & set2)
    denom = min(len(set1), len(set2)) or 1
    return inter / denom

def son_albumes_ediciones_distintas(t1, t2):
    def extraer_numero_romano(t):
        m = re.search(r'\b([IVXLCDM]+)\b$', (t or "").strip())
        return m.group(1) if m else None
    n1, n2 = extraer_numero_romano(t1), extraer_numero_romano(t2)
    if n1 and n2 and n1 != n2:
        return True
    if bool(re.search(r'(vol\.?\s*\d+|lp\s*\d+|\bii+\b|\biii+\b|\biv+\b|\b2\b|\b3\b)', (t1 or "").lower())) \
       and bool(re.search(r'(vol\.?\s*\d+|lp\s*\d+|\bii+\b|\biii+\b|\biv+\b|\b2\b|\b3\b)', (t2 or "").lower())) \
       and normalizar_titulo_base(t1) != normalizar_titulo_base(t2):
        return True
    return False

SPECIAL_TOKENS = ["deluxe", "edition", "anniversary", "remaster", "version", "expanded", "platinum", "super"]

def tiene_token_especial(titulo):
    t = (titulo or "").lower()
    # tokens explícitos y variantes de "taylor's version"
    if "taylor's version" in t or "taylors version" in t:
        return True
    return any(tok in t for tok in SPECIAL_TOKENS)

def parse_microservice_score(sim_obj):
    if not isinstance(sim_obj, dict):
        return None
    for k in ("score","similarity","sim","s"):
        if k in sim_obj:
            try:
                v = float(sim_obj[k])
                if 0 <= v <= 1: return v
                if 1 < v <= 100: return v/100.0
            except Exception:
                pass
    if "distance" in sim_obj:
        try:
            d = float(sim_obj["distance"])
            return max(0.0, 1.0 - d)
        except Exception:
            pass
    return None

# -----------------------------
# Bulk fetch helpers (añadir 'categoria' si existe)
# -----------------------------
def bulk_fetch_album_meta(ids):
    # no existe columna artista_id en albumes en tu esquema; no la solicitamos
    if not ids:
        return {}
    rows = sb.table("albumes").select(
        "id_album, titulo, anio, popularidad_album, numero_canciones, tipo_album, categoria"
    ).in_("id_album", ids).execute().data
    m = {}
    for r in rows:
        titulo = r.get("titulo") or ""
        r["titulo_norm"] = normalizar_titulo_base(titulo)
        cat = (r.get("categoria") or "").strip().lower()
        if "catalogo" in cat:
            r["categoria"] = "catalogo"
        elif "coleccion" in cat or cat == "":
            r["categoria"] = "coleccion"
        else:
            r["categoria"] = cat
        m[r["id_album"]] = r
    return m

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
    rows = sb.table("canciones").select("id_cancion, album, titulo, duracion_ms").in_("album", ids).execute().data
    m = {}
    for r in rows:
        if r.get("titulo"):
            m.setdefault(r["album"], []).append({"titulo": r["titulo"], "duracion_ms": r.get("duracion_ms")})
    return m

# -----------------------------
# FAISS mutual kNN
# -----------------------------
def mutual_knn(ids, embs, k=10, emb_threshold=0.40):
    if embs.size == 0:
        return set(), None, None
    index = faiss.IndexFlatIP(embs.shape[1])
    index.add(embs)
    D, I = index.search(embs, k+1)
    neighbors = {i: set() for i in range(len(ids))}
    for i, row in enumerate(I):
        for j_idx, sim in zip(row, D[i]):
            if i == j_idx or sim < emb_threshold:
                continue
            neighbors[i].add(j_idx)
    pairs = set()
    for i in range(len(ids)):
        for j in neighbors[i]:
            if i in neighbors.get(j, set()):
                pairs.add(tuple(sorted((i, j))))
    return pairs, D, I

# -----------------------------
# Mode decision
# -----------------------------
def decide_mode(meta_a, meta_b, artistas_a, artistas_b):
    cat_a = (meta_a.get("categoria") or "").lower() if meta_a else ""
    cat_b = (meta_b.get("categoria") or "").lower() if meta_b else ""
    share_artist = bool(set(artistas_a or set()) & set(artistas_b or set()))
    # If both indicate catalog (substring) and share artist -> artist_catalog
    if ("catalogo" in cat_a) and ("catalogo" in cat_b) and share_artist:
        return "artist_catalog"
    # If one mentions catalogo and they share artist -> artist_catalog
    if (("catalogo" in cat_a) or ("catalogo" in cat_b)) and share_artist:
        return "artist_catalog"
    # Mixed or collections -> collection (más estricto)
    return "collection"

# -----------------------------
# Core: poblar clusters con modo dual y logging por par
# -----------------------------
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

def poblar_album_clusters():
    print("Procesando clusters de álbumes (modo dual)...")
    canciones_rows = sb.table("canciones").select("id_cancion, album, titulo, duracion_ms").execute().data
    canciones_df = pd.DataFrame(canciones_rows)

    # cargar embeddings (paginado)
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

    valid_rows = []
    for r in all_rows:
        emb = r.get("embedding")
        if not emb:
            continue
        vec = np.array(emb, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            continue
        valid_rows.append({"id_album": r["id_album"], "emb": (vec / norm).astype(np.float32)})

    if not valid_rows:
        print("No hay embeddings válidos.")
        return

    ids = [r["id_album"] for r in valid_rows]
    embs = np.vstack([r["emb"] for r in valid_rows]).astype(np.float32)
    idx_of = {idv: i for i, idv in enumerate(ids)}

    pairs, D, I = mutual_knn(ids, embs, k=MUTUAL_KNN_K, emb_threshold=EMB_THRESHOLD)

    # bulk metadata
    meta_map = bulk_fetch_album_meta(ids)
    artistas_map = bulk_fetch_album_artistas(ids)
    generos_map = bulk_fetch_album_generos(ids)
    canciones_map = bulk_fetch_album_canciones(ids)
    popularity_map = {k: (v.get("popularidad_album") or 0) for k, v in meta_map.items()}

    uf = UnionFind(ids)
    decisions_log = []

    # prefilter pairs by local emb sim if possible (reduce workload)
        # prefilter pairs by local emb sim if possible (reduce workload)
    filtered_pairs = []
    for i_idx, j_idx in pairs:
        sim = float(np.dot(embs[i_idx], embs[j_idx]))
        if sim >= 0.40:
            filtered_pairs.append((i_idx, j_idx))

    # PROCESS FILTERED PAIRS (sin variables sin usar; usa canciones_map si existe)
    for i_idx, j_idx in filtered_pairs:
        combined_score = 0.0   # ya lo tenías, pero asegúrate de definirlo aquí
        ida, idb = ids[i_idx], ids[j_idx]
        ma, mb = meta_map.get(ida, {}), meta_map.get(idb, {})
        aa, ab = artistas_map.get(ida, set()), artistas_map.get(idb, set())

        # NOTA: no uses ma.get("artista_id") porque esa columna no existe en albumes.
        # Si llega a haber álbumes sin artistas, artistas_map ya los tendrá vacíos y
        # procederemos con conjuntos vacíos (y reglas fallarán según cfg).

        ga, gb = generos_map.get(ida, set()), generos_map.get(idb, set())
        ca, cb = canciones_map.get(ida, []), canciones_map.get(idb, [])

        tipo_a = (ma.get("tipo_album") or "").lower()
        tipo_b = (mb.get("tipo_album") or "").lower()

        title_score = titulo_ratio(ma.get("titulo",""), mb.get("titulo",""))
        artist_score = artistas_overlap_score(aa, ab)

        # Nota: no hay columna artista_id en albumes. aa/ab ya vienen de album_artistas.
        # Si album_artistas está vacío dejamos artist_score = 0.0 (las reglas lo manejarán).
        artist_score = artistas_overlap_score(aa, ab)

        # Preferir cálculo con canciones_map (más ligero). Si no hay datos, usar canciones_df.
        if ca and cb:
            # ca/cb son listas de dicts {"titulo":..., "duracion_ms":...}
            # vamos a calcular un songs_overlap sencillo similar a canciones_overlap,
            # comparando títulos normalizados y tolerancia en duración.
            set1 = set()
            for r1 in ca:
                t1 = normalizar_titulo_base(r1.get("titulo") or "")
                d1 = r1.get("duracion_ms") or 0
                if not t1:
                    continue
                for r2 in cb:
                    t2 = normalizar_titulo_base(r2.get("titulo") or "")
                    d2 = r2.get("duracion_ms") or 0
                    if not t2:
                        continue
                    ratio = titulo_ratio(t1, t2)
                    if (ratio > 0.8 or t1 in t2 or t2 in t1) and abs((d1 or 0) - (d2 or 0)) < 10000:
                        set1.add(t1)
                        break
            set2 = set(normalizar_titulo_base(r.get("titulo") or "") for r in cb if r.get("titulo"))
            songs_overlap = len(set1 & set2) / len(set1 | set2) if (set1 | set2) else 0.0
        else:
            # fallback: usar la función existente basada en canciones_df
            songs_overlap = canciones_overlap(ida, idb, canciones_df)

        genre_score = generos_overlap_score(ga, gb)

        year_a = ma.get("anio"); year_b = mb.get("anio")
        year_diff = None
        try:
            if year_a and year_b:
                year_diff = abs(int(year_a) - int(year_b))
        except Exception:
            year_diff = None

        emb_score = float(np.dot(embs[i_idx], embs[j_idx]))
        emb_score = max(0.0, min(1.0, emb_score))

        # decide mode (antes de usar cfg)
        mode = decide_mode(ma, mb, aa, ab)
        cfg = MODES.get(mode, MODES[DEFAULT_MODE])

        # --- (INSERTAR AQUÍ) inicializar variables que se usarán en todas las ramas
        rule_triggered = None
        decision = "no-union"
        reason = ""
        combined_score = 0.0
        confidence = 0.0
        # --- fin de la inserción

        # Si no hay artista pero la evidencia semántica es muy fuerte, permitir unión como excepción
        strong_emb_exception = False
        if (artist_score < cfg["hard_artist_min"]) and emb_score >= 0.92 and title_score >= 0.45:
            strong_emb_exception = True

        # --- PREFILTER FUERTE POR ARTISTA / TIPOS (antes de las reglas)
        # 1) si artist_score muy bajo -> bloquear salvo excepciones muy fuertes
        pref_decision = None
        if artist_score < 0.25:
            # excepción rara: mismo título normalizado y embedding ultra-alto
            if normalizar_titulo_base(ma.get("titulo","")) == normalizar_titulo_base(mb.get("titulo","")) and emb_score >= 0.95:
                pref_decision = ("union", "artist_low_but_identical_title_high_emb", "Título idéntico y emb muy alto pese a artist_score bajo")
            elif strong_emb_exception:
                pref_decision = ("union", "strong_embedding_exception", "Alta similitud de embedding suple falta de metadata")
            else:
                pref_decision = ("no-union", "artist_too_low_prefilter", "artist_score < 0.25")

        # 2) compilations/various/soundtrack necesitan evidencia muy fuerte
        tipo_combo = f"{tipo_a}|{tipo_b}"
        if any(x in tipo_combo for x in ("compilation","various","soundtrack")) and not pref_decision:
            if not (songs_overlap >= 0.85 and title_score >= 0.85):
                pref_decision = ("no-union", "compilation_requires_strong_evidence", "Compilations requieren songs+title altos")

        # 3) single vs album: bloquear salvo evidencia muy fuerte
        if (("single" in tipo_a and "album" in tipo_b) or ("single" in tipo_b and "album" in tipo_a)) and not pref_decision:
            if not (songs_overlap >= 0.8 or emb_score >= 0.9):
                pref_decision = ("no-union", "single_vs_album_prefilter", "Single vs album sin evidencia fuerte")

        if pref_decision:
            d_decision, d_rule, d_reason = pref_decision
            # aplicar y loguear
            if d_decision == "union":
                uf.union(ida, idb)
            decisions_log.append({
                "id_a": ida, "id_b": idb, "mode": mode,
                "artist_score": round(float(artist_score), 4),
                "title_score": round(float(title_score), 4),
                "songs_overlap": round(float(songs_overlap), 4),
                "emb_score": round(float(emb_score), 4),
                "genre_score": round(float(genre_score), 4),
                "year_diff": year_diff,
                "tipo_a": tipo_a, "tipo_b": tipo_b,
                "combined_score": round(float(0.0),4),
                "decision": d_decision,
                "rule_triggered": d_rule,
                "reason": d_reason,
                "confidence": 0.0
            })
            continue

        # HARD RULES (aplicar antes del score)
        if son_albumes_ediciones_distintas(ma.get("titulo",""), mb.get("titulo","")):
            rule_triggered = "ediciones_numeradas_distintas"
            decision = "no-union"
            reason = "Ediciones numeradas distintas"
        elif year_diff is not None and year_diff > 3 and title_score < 0.75:
            rule_triggered = "year_diff_big"
            decision = "no-union"
            reason = f"Años difieren {year_diff} y título no similar"
        elif normalizar_titulo_base(ma.get("titulo","")) == normalizar_titulo_base(mb.get("titulo","")) and artist_score >= (cfg["hard_artist_min"]/2):
            if (tipo_a != tipo_b) and songs_overlap < 0.2:
                rule_triggered = "same_title_diff_type_low_songs"
                decision = "no-union"
                reason = "Mismo título pero album vs single con bajo solapamiento de tracks"
            else:
                rule_triggered = "same_title_same_artist"
                decision = "union"
                reason = "Título normalizado idéntico y artista coincide"
        elif tiene_token_especial(ma.get("titulo","")) or tiene_token_especial(mb.get("titulo","")):
            if normalizar_titulo_base(ma.get("titulo","")) == normalizar_titulo_base(mb.get("titulo","")):
                rule_triggered = "token_especial_same_base"
                decision = "union"
                reason = "Versión/Deluxe/Taylor's con misma base de título"
        elif (tipo_a != tipo_b) and (("single" in (tipo_a or "")) or ("single" in (tipo_b or ""))):
            if songs_overlap >= 0.8 or emb_score >= 0.85:
                rule_triggered = "single_vs_album_strong_evidence"
                decision = "union"
                reason = "Single vs album pero evidencia fuerte (songs/emb)"
            else:
                rule_triggered = "single_vs_album"
                decision = "no-union"
                reason = "Evitar unir singles con álbumes sin evidencia fuerte"
        elif normalizar_titulo_base(ma.get("titulo","")) == normalizar_titulo_base(mb.get("titulo","")) and artist_score < 0.2:
            rule_triggered = "title_identical_diff_artist"
            decision = "no-union"
            reason = "Título idéntico pero artistas diferentes"
        else:
            # Score-based decision según modo
            w = cfg["weights"]
            combined_score = (
                w["title"] * title_score +
                w["artist"] * artist_score +
                w["songs"] * songs_overlap +
                w["embedding"] * emb_score +
                w["genre"] * genre_score
            )
            confidence = combined_score * 0.7 + artist_score * 0.3
            # overrides
            if songs_overlap >= 0.7:
                decision = "union"; rule_triggered = "songs_overlap_high"; reason = "Alto solapamiento de canciones"
            elif title_score >= 0.92 and artist_score >= (cfg["hard_artist_min"]):
                decision = "union"; rule_triggered = "title_high_artist_high"; reason = "Título muy parecido + artista fuerte"
            elif (ma.get("categoria","").lower() == "catalogo" or mb.get("categoria","").lower() == "catalogo") and (artist_score >= 0.6) and (songs_overlap >= 0.35 or title_score >= 0.70):
                decision = "union"; rule_triggered = "catalogo_relaxed_rule"; reason = "Catalogo: reglas permisivas"
            elif artist_score < cfg["hard_artist_min"] and songs_overlap < 0.4 and title_score < 0.8 and not strong_emb_exception:
                decision = "no-union"; rule_triggered = "artist_below_hard_min"; reason = "Artistas no coinciden lo suficiente"
            elif strong_emb_exception:
                decision = "union"; rule_triggered = "strong_embedding_exception"; reason = "Alta similitud de embedding suple falta de metadata"
            elif combined_score >= cfg["combined_threshold"]:
                decision = "union"; rule_triggered = "combined_threshold"; reason = "Combined score supera umbral"
            else:
                lower = cfg["combined_threshold"] - 0.05
                if lower <= combined_score < cfg["combined_threshold"] + 0.05:
                    decision = "manual_review"; rule_triggered = "ambiguous_zone"; reason = "Puntaje cercano al umbral"
                else:
                    decision = "no-union"; rule_triggered = None; reason = "No alcanza evidencia suficiente"

        # aplicar union si corresponde
        if decision == "union":
            uf.union(ida, idb)

        # log
        decisions_log.append({
            "id_a": ida, "id_b": idb, "mode": mode,
            "artist_score": round(float(artist_score), 4),
            "title_score": round(float(title_score), 4),
            "songs_overlap": round(float(songs_overlap), 4),
            "emb_score": round(float(emb_score), 4),
            "genre_score": round(float(genre_score), 4),
            "year_diff": year_diff,
            "tipo_a": tipo_a, "tipo_b": tipo_b,
            "combined_score": round(float(combined_score),4),
            "decision": decision,
            "rule_triggered": rule_triggered,
            "reason": reason,
            "confidence": round(float(confidence if confidence else 0.0),4)
        })

    # construir clusters resultantes
    grupos_final = {}
    for i in ids:
        root = uf.find(i)
        grupos_final.setdefault(root, []).append(i)

    # ---- exportar decisions log como JSONL (útil para ingest)
    with open("album_cluster_decisions.jsonl","w",encoding="utf-8") as f:
        for rec in decisions_log:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # ---- resumen rápido
    cnt = Counter(d["decision"] for d in decisions_log)
    total = len(decisions_log)
    print(f"Pairs evaluados: {total}. Decisions: {dict(cnt)}. Manual review: {cnt.get('manual_review',0)}")

    # snapshot previo
    snapshot = sb.table("album_clusters").select("*").execute().data
    with open("album_clusters_snapshot.json", "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    # persistir clusters (borrado seguro)
    sb.table("album_clusters").delete().gte("grupo", 1).execute()
    grupo_num = 1
    batch = []
    for root, miembros in grupos_final.items():
        for i in miembros:
            batch.append({"id_album": i, "grupo": grupo_num})
        grupo_num += 1
        if len(batch) >= 5000:
            sb.table("album_clusters").upsert(batch).execute()
            batch = []
    if batch:
        sb.table("album_clusters").upsert(batch).execute()
    print(f"Clusters de álbumes poblados: {grupo_num-1} grupos. Decisions guardadas en album_cluster_decisions.json")

if __name__ == "__main__":
    poblar_album_clusters()