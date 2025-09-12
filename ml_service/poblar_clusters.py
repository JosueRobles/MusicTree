import os
from dotenv import load_dotenv
import supabase
import requests
import re
from difflib import SequenceMatcher
import time

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MICROSERVICIO_URL = "http://localhost:8000/similares"

sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

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

def get_artistas(tabla, id_field, id_val):
    if tabla == "cancion":
        res = sb.table("cancion_artistas").select("artista_id").eq("cancion_id", id_val).execute()
        return set(a["artista_id"] for a in res.data)
    if tabla == "video":
        res = sb.table("video_artistas").select("artista_id").eq("video_id", id_val).execute()
        return set(a["artista_id"] for a in res.data)
    return set()

def get_titulo(tabla, id_val):
    if tabla == "cancion":
        res = sb.table("canciones").select("titulo").eq("id_cancion", id_val).execute()
    else:
        res = sb.table("videos_musicales").select("titulo").eq("id_video", id_val).execute()
    return res.data[0]["titulo"].lower() if res.data else ""

def get_duracion(tabla, id_val):
    if tabla == "cancion":
        res = sb.table("canciones").select("duracion_ms").eq("id_cancion", id_val).execute()
        return res.data[0]["duracion_ms"] if res.data else None
    else:
        res = sb.table("videos_musicales").select("duracion").eq("id_video", id_val).execute()
        return res.data[0]["duracion"] if res.data else None

def normaliza_titulo(t):
    t = re.sub(r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo)\b', '', t, flags=re.I)
    t = t.strip()
    return t

def normaliza_titulo_album(t):
    t = t.lower()
    # Elimina términos comunes que no distinguen versiones
    t = re.sub(r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|track by track|commentary|anniversary|expanded|complete|version|mix|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|karaoke|single|ep|lp|box set|disc \d+|cd\d+|vinyl|digital|special|reissue)\b', '', t, flags=re.I)
    # Quitar "feat. ..." o "with ..."
    t = re.sub(r'(\(feat.*?\)|feat\.?.*|with .*)', '', t, flags=re.I)
    # Quitar números aislados que son reediciones (25, 40, 2012, etc.)
    t = re.sub(r'\b\d{2,4}\b', '', t)  
    # Normalizar espacios
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def titulos_similares_album(t1, t2):
    t1, t2 = normaliza_titulo_album(t1), normaliza_titulo_album(t2)
    if t1 == t2:
        return True
    if t1 in t2 or t2 in t1:
        return True
    ratio = SequenceMatcher(None, t1, t2).ratio()
    return ratio > 0.80   # relajamos a 0.80

def titulos_similares(t1, t2):
    t1, t2 = normaliza_titulo(t1), normaliza_titulo(t2)
    romanos = [' i', ' ii', ' iii', ' iv', ' v', ' vi', ' vii', ' viii', ' ix', ' x']
    for r in romanos:
        if r in t1 and r not in t2:
            return False
        if r in t2 and r not in t1:
            return False
    if t1 == t2:
        return True
    if t1 in t2 or t2 in t1:
        return True
    ratio = SequenceMatcher(None, t1, t2).ratio()
    return ratio > 0.85

def artistas_iguales(a1, a2):
    return a1 == a2 and len(a1) > 0

def duracion_cercana(d1, d2, tabla):
    if d1 is None or d2 is None:
        return False
    if tabla == "cancion":
        return abs(d1 - d2) < 5000
    if tabla == "video":
        return abs(d1 - d2) < 10
    return False

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

def get_album_artistas(id_album):
    res = sb.table("album_artistas").select("artista_id").eq("album_id", id_album).execute()
    return set(a["artista_id"] for a in res.data)

def get_album_generos(id_album):
    res = sb.table("album_generos").select("genero_id").eq("album_id", id_album).execute()
    return set(a["genero_id"] for a in res.data)

def poblar_cancion_clusters():
    print("Procesando clusters de canciones...")
    canciones = get_all_items("cancion_embeddings", "id_cancion")
    ids = [c["id_cancion"] for c in canciones]
    uf = UnionFind(ids)
    similitud_cache = {}

    for c in canciones:
        c_id = c["id_cancion"]
        cache_key = f"cancion_{c_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            resp = requests.post(MICROSERVICIO_URL, json={
                "entidad": "cancion",
                "id": c_id,
                "embedding": c["embedding"]
            })
            similares = resp.json()
            similitud_cache[cache_key] = similares

        t1 = get_titulo("cancion", c_id)
        a1 = get_artistas("cancion", "id_cancion", c_id)
        d1 = get_duracion("cancion", c_id)
        for s in similares:
            s_id = s["id"]
            t2 = get_titulo("cancion", s_id)
            a2 = get_artistas("cancion", "id_cancion", s_id)
            d2 = get_duracion("cancion", s_id)
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, "cancion"):
                uf.union(c_id, s_id)

    grupos = {}
    for i in ids:
        root = uf.find(i)
        if root not in grupos:
            grupos[root] = []
        grupos[root].append(i)

    sb.table("cancion_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    for root, miembros in grupos.items():
        for i in miembros:
            sb.table("cancion_clusters").upsert({
                "id_cancion": i,
                "grupo": grupo_num
            }).execute()
        grupo_num += 1
    print(f"Clusters de canciones poblados: {grupo_num-1} grupos.")

def poblar_video_clusters():
    print("Procesando clusters de videos...")
    videos = get_all_items("video_embeddings", "id_video")
    ids = [v["id_video"] for v in videos]
    uf = UnionFind(ids)
    similitud_cache = {}

    for v in videos:
        v_id = v["id_video"]
        cache_key = f"video_{v_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            resp = requests.post(MICROSERVICIO_URL, json={
                "entidad": "video",
                "id": v_id,
                "embedding": v["embedding"]
            })
            similares = resp.json()
            similitud_cache[cache_key] = similares

        t1 = get_titulo("video", v_id)
        a1 = get_artistas("video", "id_video", v_id)
        d1 = get_duracion("video", v_id)
        for s in similares:
            s_id = s["id"]
            t2 = get_titulo("video", s_id)
            a2 = get_artistas("video", "id_video", s_id)
            d2 = get_duracion("video", s_id)
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, "video"):
                uf.union(v_id, s_id)

    grupos = {}
    for i in ids:
        root = uf.find(i)
        if root not in grupos:
            grupos[root] = []
        grupos[root].append(i)

    sb.table("video_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    for root, miembros in grupos.items():
        for i in miembros:
            sb.table("video_clusters").upsert({
                "id_video": i,
                "grupo": grupo_num
            }).execute()
        grupo_num += 1
    print(f"Clusters de videos poblados: {grupo_num-1} grupos.")

def poblar_album_clusters():
    print("Procesando clusters de álbumes...")
    albumes = get_all_items("album_embeddings", "id_album")
    ids = [a["id_album"] for a in albumes]
    uf = UnionFind(ids)
    similitud_cache = {}

    for a in albumes:
        a_id = a["id_album"]
        t1 = get_titulo("album", a_id)
        a1 = get_album_artistas(a_id)
        g1 = get_album_generos(a_id)
        cache_key = f"album_{a_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            try:
                resp = requests.post(MICROSERVICIO_URL, json={
                    "entidad": "album",
                    "id": a_id,
                    "embedding": a["embedding"]
                }, timeout=60)
                try:
                    similares = resp.json()
                except Exception as e:
                    print(f"Error parseando JSON para album {a_id}: {e}, status={resp.status_code}, text={resp.text[:200]}")
                    time.sleep(1)
                    continue
            except Exception as e:
                print(f"Error de red para album {a_id}: {e}")
                time.sleep(1)
                continue
            similitud_cache[cache_key] = similares

        for s in similares:
            s_id = s["id"]
            t2 = get_titulo("album", s_id)
            a2 = get_album_artistas(s_id)
            g2 = get_album_generos(s_id)
            if titulos_similares_album(t1, t2) and a1 == a2: #and g1 == g2:
                uf.union(a_id, s_id)

    grupos = {}
    for i in ids:
        root = uf.find(i)
        if root not in grupos:
            grupos[root] = []
        grupos[root].append(i)

    sb.table("album_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    for root, miembros in grupos.items():
        for i in miembros:
            sb.table("album_clusters").upsert({
                "id_album": i,
                "grupo": grupo_num
            }).execute()
        grupo_num += 1
    print(f"Clusters de álbumes poblados: {grupo_num-1} grupos.")

def poblar_cancion_clusters_incremental():
    print("Procesando clusters de canciones (incremental)...")

    # 1. Trae solo los embeddings nuevos
    nuevos = sb.table("cancion_embeddings") \
               .select("id_cancion, embedding") \
               .eq("cluster_pendiente", True).execute().data
    if not nuevos:
        print("No hay nuevas canciones para clusterizar.")
        return

    # 2. Trae todos los cluster ya existentes
    existentes = sb.table("cancion_embeddings") \
                   .select("id_cancion, embedding") \
                   .eq("cluster_pendiente", False).execute().data

    # 3. Cargar mapa de grupos actuales
    grupos = {}
    grupo_map = {}
    for r in sb.table("cancion_clusters").select("id_cancion, grupo").execute().data:
        grupo_map[r["id_cancion"]] = r["grupo"]
        grupos.setdefault(r["grupo"], set()).add(r["id_cancion"])
    next_grupo = max(grupos.keys(), default=0) + 1

    # 4. Procesar solo los nuevos
    for c in nuevos:
        c_id, emb = c["id_cancion"], c["embedding"]
        t1 = get_titulo("cancion", c_id)
        a1 = get_artistas("cancion", "id_cancion", c_id)
        d1 = get_duracion("cancion", c_id)
        found = False
        for e in existentes:
            e_id, emb_e = e["id_cancion"], e["embedding"]
            t2 = get_titulo("cancion", e_id)
            a2 = get_artistas("cancion", "id_cancion", e_id)
            d2 = get_duracion("cancion", e_id)
            # Aquí puedes usar el microservicio de similitud con ambos embeddings
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, "cancion"):
                grupo = grupo_map[e_id]
                grupos[grupo].add(c_id)
                grupo_map[c_id] = grupo
                found = True
                break
        if not found:
            grupos[next_grupo] = {c_id}
            grupo_map[c_id] = next_grupo
            next_grupo += 1

    # 5. Inserta solo los nuevos en clusters
    for c in nuevos:
        sb.table("cancion_clusters").upsert({
            "id_cancion": c["id_cancion"],
            "grupo": grupo_map[c["id_cancion"]]
        }).execute()

    # 6. Marcar los nuevos embeddings como ya clusterizados
    nuevos_ids = [c["id_cancion"] for c in nuevos]
    sb.table("cancion_embeddings").update({"cluster_pendiente": False}).in_("id_cancion", nuevos_ids).execute()

    print(f"Clusters incrementales de canciones poblados: {len(nuevos)} nuevos.")

def poblar_video_clusters_incremental():
    print("Procesando clusters de videos (incremental)...")

    nuevos = sb.table("video_embeddings") \
               .select("id_video, embedding") \
               .eq("cluster_pendiente", True).execute().data
    if not nuevos:
        print("No hay nuevos videos para clusterizar.")
        return

    existentes = sb.table("video_embeddings") \
                   .select("id_video, embedding") \
                   .eq("cluster_pendiente", False).execute().data

    grupos = {}
    grupo_map = {}
    for r in sb.table("video_clusters").select("id_video, grupo").execute().data:
        grupo_map[r["id_video"]] = r["grupo"]
        grupos.setdefault(r["grupo"], set()).add(r["id_video"])
    next_grupo = max(grupos.keys(), default=0) + 1

    for v in nuevos:
        v_id, emb = v["id_video"], v["embedding"]
        t1 = get_titulo("video", v_id)
        a1 = get_artistas("video", "id_video", v_id)
        d1 = get_duracion("video", v_id)
        found = False
        for e in existentes:
            e_id, emb_e = e["id_video"], e["embedding"]
            t2 = get_titulo("video", e_id)
            a2 = get_artistas("video", "id_video", e_id)
            d2 = get_duracion("video", e_id)
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, "video"):
                grupo = grupo_map[e_id]
                grupos[grupo].add(v_id)
                grupo_map[v_id] = grupo
                found = True
                break
        if not found:
            grupos[next_grupo] = {v_id}
            grupo_map[v_id] = next_grupo
            next_grupo += 1

    for v in nuevos:
        sb.table("video_clusters").upsert({
            "id_video": v["id_video"],
            "grupo": grupo_map[v["id_video"]]
        }).execute()

    nuevos_ids = [v["id_video"] for v in nuevos]
    sb.table("video_embeddings").update({"cluster_pendiente": False}).in_("id_video", nuevos_ids).execute()

    print(f"Clusters incrementales de videos poblados: {len(nuevos)} nuevos.")


def poblar_album_clusters_incremental():
    print("Procesando clusters de álbumes (incremental)...")

    nuevos = sb.table("album_embeddings") \
               .select("id_album, embedding") \
               .eq("cluster_pendiente", True).execute().data
    if not nuevos:
        print("No hay nuevos álbumes para clusterizar.")
        return

    existentes = sb.table("album_embeddings") \
                   .select("id_album, embedding") \
                   .eq("cluster_pendiente", False).execute().data

    grupos = {}
    grupo_map = {}
    for r in sb.table("album_clusters").select("id_album, grupo").execute().data:
        grupo_map[r["id_album"]] = r["grupo"]
        grupos.setdefault(r["grupo"], set()).add(r["id_album"])
    next_grupo = max(grupos.keys(), default=0) + 1

    for a in nuevos:
        a_id, emb = a["id_album"], a["embedding"]
        t1 = get_titulo("album", a_id)
        found = False
        for e in existentes:
            e_id, emb_e = e["id_album"], e["embedding"]
            t2 = get_titulo("album", e_id)
            if titulos_similares(t1, t2):
                grupo = grupo_map[e_id]
                grupos[grupo].add(a_id)
                grupo_map[a_id] = grupo
                found = True
                break
        if not found:
            grupos[next_grupo] = {a_id}
            grupo_map[a_id] = next_grupo
            next_grupo += 1

    for a in nuevos:
        sb.table("album_clusters").upsert({
            "id_album": a["id_album"],
            "grupo": grupo_map[a["id_album"]]
        }).execute()

    nuevos_ids = [a["id_album"] for a in nuevos]
    sb.table("album_embeddings").update({"cluster_pendiente": False}).in_("id_album", nuevos_ids).execute()

    print(f"Clusters incrementales de álbumes poblados: {len(nuevos)} nuevos.")

if __name__ == "__main__":
    #poblar_cancion_clusters()
    #poblar_video_clusters()
    poblar_album_clusters()
    #poblar_cancion_clusters_incremental()
    #poblar_video_clusters_incremental()
    #poblar_album_clusters_incremental()