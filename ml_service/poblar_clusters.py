import os
from dotenv import load_dotenv
import supabase
import requests
import re

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
    from difflib import SequenceMatcher
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
        cache_key = f"album_{a_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            resp = requests.post(MICROSERVICIO_URL, json={
                "entidad": "album",
                "id": a_id,
                "embedding": a["embedding"]
            })
            similares = resp.json()
            similitud_cache[cache_key] = similares

        t1 = get_titulo("album", a_id)
        # Puedes agregar lógica de artistas, año, tipo_album, etc.
        for s in similares:
            s_id = s["id"]
            t2 = get_titulo("album", s_id)
            # Puedes agregar lógica de artistas, año, tipo_album, etc.
            if titulos_similares(t1, t2):
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

def poblar_entidad_clusters():
    print("Procesando canciones y videos juntos...")
    canciones = get_all_items("cancion_embeddings", "id_cancion")
    videos = get_all_items("video_embeddings", "id_video")
    items = [{"id": c["id_cancion"], "tipo": "cancion", "embedding": c["embedding"]} for c in canciones] + \
            [{"id": v["id_video"], "tipo": "video", "embedding": v["embedding"]} for v in videos]
    ids = [(item["id"], item["tipo"]) for item in items]
    uf = UnionFind(ids)
    similitud_cache = {}

    for item in items:
        item_id, tipo = item["id"], item["tipo"]
        cache_key = f"{tipo}_{item_id}"
        if cache_key in similitud_cache:
            similares = similitud_cache[cache_key]
        else:
            resp = requests.post(MICROSERVICIO_URL, json={
                "entidad": tipo,
                "id": item_id,
                "embedding": item["embedding"]
            })
            similares = resp.json()
            similitud_cache[cache_key] = similares

        t1 = get_titulo(tipo, item_id)
        a1 = get_artistas(tipo, "id_cancion" if tipo == "cancion" else "id_video", item_id)
        d1 = get_duracion(tipo, item_id)
        for s in similares:
            s_id = s["id"]
            s_tipo = tipo
            t2 = get_titulo(s_tipo, s_id)
            a2 = get_artistas(s_tipo, "id_cancion" if s_tipo == "cancion" else "id_video", s_id)
            d2 = get_duracion(s_tipo, s_id)
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, tipo):
                uf.union((item_id, tipo), (s_id, s_tipo))

    grupos = {}
    for i in ids:
        root = uf.find(i)
        if root not in grupos:
            grupos[root] = []
        grupos[root].append(i)

    sb.table("entidad_clusters").delete().neq("grupo", -1).execute()
    grupo_num = 1
    for root, miembros in grupos.items():
        for i, tipo in miembros:
            sb.table("entidad_clusters").upsert({
                "id_entidad": i,
                "tipo_entidad": tipo,
                "grupo": grupo_num
            }).execute()
        grupo_num += 1
    print(f"Clusters universales poblados: {grupo_num-1} grupos.")

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


def poblar_entidad_clusters_incremental():
    print("Procesando clusters universales (incremental)...")

    nuevos_c = sb.table("cancion_embeddings").select("id_cancion, embedding").eq("cluster_pendiente", True).execute().data
    nuevos_v = sb.table("video_embeddings").select("id_video, embedding").eq("cluster_pendiente", True).execute().data
    nuevos = [{"id": c["id_cancion"], "tipo": "cancion", "embedding": c["embedding"]} for c in nuevos_c] + \
             [{"id": v["id_video"], "tipo": "video", "embedding": v["embedding"]} for v in nuevos_v]
    if not nuevos:
        print("No hay nuevas entidades (canciones/videos) para clusterizar.")
        return

    existentes_c = sb.table("cancion_embeddings").select("id_cancion, embedding").eq("cluster_pendiente", False).execute().data
    existentes_v = sb.table("video_embeddings").select("id_video, embedding").eq("cluster_pendiente", False).execute().data
    existentes = [{"id": c["id_cancion"], "tipo": "cancion", "embedding": c["embedding"]} for c in existentes_c] + \
                 [{"id": v["id_video"], "tipo": "video", "embedding": v["embedding"]} for v in existentes_v]

    grupos = {}
    grupo_map = {}
    for r in sb.table("entidad_clusters").select("id_entidad, tipo_entidad, grupo").execute().data:
        grupo_map[(r["id_entidad"], r["tipo_entidad"])] = r["grupo"]
        grupos.setdefault(r["grupo"], set()).add((r["id_entidad"], r["tipo_entidad"]))
    next_grupo = max(grupos.keys(), default=0) + 1

    for n in nuevos:
        n_id, n_tipo, emb = n["id"], n["tipo"], n["embedding"]
        t1 = get_titulo(n_tipo, n_id)
        a1 = get_artistas(n_tipo, "id_cancion" if n_tipo == "cancion" else "id_video", n_id)
        d1 = get_duracion(n_tipo, n_id)
        found = False
        for e in existentes:
            e_id, e_tipo, emb_e = e["id"], e["tipo"], e["embedding"]
            t2 = get_titulo(e_tipo, e_id)
            a2 = get_artistas(e_tipo, "id_cancion" if e_tipo == "cancion" else "id_video", e_id)
            d2 = get_duracion(e_tipo, e_id)
            if titulos_similares(t1, t2) and artistas_iguales(a1, a2) and duracion_cercana(d1, d2, n_tipo):
                grupo = grupo_map[(e_id, e_tipo)]
                grupos[grupo].add((n_id, n_tipo))
                grupo_map[(n_id, n_tipo)] = grupo
                found = True
                break
        if not found:
            grupos[next_grupo] = {(n_id, n_tipo)}
            grupo_map[(n_id, n_tipo)] = next_grupo
            next_grupo += 1

    for n in nuevos:
        sb.table("entidad_clusters").upsert({
            "id_entidad": n["id"],
            "tipo_entidad": n["tipo"],
            "grupo": grupo_map[(n["id"], n["tipo"])]
        }).execute()

    nuevos_ids_c = [c["id"] for c in nuevos if c["tipo"] == "cancion"]
    nuevos_ids_v = [v["id"] for v in nuevos if v["tipo"] == "video"]
    if nuevos_ids_c:
        sb.table("cancion_embeddings").update({"cluster_pendiente": False}).in_("id_cancion", nuevos_ids_c).execute()
    if nuevos_ids_v:
        sb.table("video_embeddings").update({"cluster_pendiente": False}).in_("id_video", nuevos_ids_v).execute()

    print(f"Clusters incrementales universales poblados: {len(nuevos)} nuevos.")

if __name__ == "__main__":
    #poblar_cancion_clusters()
    #poblar_video_clusters()
    #poblar_album_clusters()
    poblar_entidad_clusters()
    #poblar_cancion_clusters_incremental()
    #poblar_video_clusters_incremental()
    #poblar_album_clusters_incremental()
    #poblar_entidad_clusters_incremental()