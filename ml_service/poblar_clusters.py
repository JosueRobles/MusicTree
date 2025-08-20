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

if __name__ == "__main__":
    poblar_entidad_clusters()