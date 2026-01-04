import os
import supabase
import re
from dotenv import load_dotenv

load_dotenv()
sb = supabase.create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def normalizar_titulo_base(titulo):
    if not titulo: return ""
    t = titulo.lower()
    t = re.sub(r'\(.*?\)', ' ', t)
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

def es_similar(c1, c2):
    t1 = normalizar_titulo_base(c1['titulo'])
    t2 = normalizar_titulo_base(c2['titulo'])
    if not t1 or not t2: return False
    dur1, dur2 = c1.get('duracion_ms') or 0, c2.get('duracion_ms') or 0
    if abs(dur1 - dur2) > 7000: return False
    tokens1, tokens2 = set(t1.split()), set(t2.split())
    inter = len(tokens1 & tokens2)
    union = len(tokens1 | tokens2)
    jaccard = inter / union if union else 0
    substring = t1 in t2 or t2 in t1
    return (jaccard > 0.7 or substring)

rows = sb.table("canciones").select("id_cancion, titulo, duracion_ms").execute().data
similares = set()
for i, c1 in enumerate(rows):
    for j, c2 in enumerate(rows):
        if i >= j: continue
        if es_similar(c1, c2):
            similares.add((c1['id_cancion'], c2['id_cancion']))
            similares.add((c2['id_cancion'], c1['id_cancion']))

# Borra y llena la tabla
sb.table("canciones_similares").delete().neq("id_cancion1", -1).execute()
for chunk in [list(similares)[i:i+500] for i in range(0, len(similares), 500)]:
    sb.table("canciones_similares").upsert([
        {"id_cancion1": a, "id_cancion2": b} for a, b in chunk
    ]).execute()
print("Tabla canciones_similares actualizada.")