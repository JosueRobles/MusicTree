import os
from dotenv import load_dotenv
import requests
import supabase
from sentence_transformers import SentenceTransformer
import numpy as np
import re
import unicodedata

# Carga variables de entorno
load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
API_BASE = os.getenv('API_BASE') 

# Cliente Supabase
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# Modelo de embeddings
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# Funciones para obtener datos de Node.js con validación
def get_data(endpoint):
    all_data = []
    page = 0
    page_size = 1000
    while True:
        r = requests.get(f"{API_BASE}/{endpoint}?offset={page*page_size}&limit={page_size}")
        r.raise_for_status()
        data = r.json()
        if isinstance(data, dict) and "data" in data:
            data = data["data"]
        if not data:
            break
        all_data.extend(data)
        if len(data) < page_size:
            break
        page += 1
    return all_data

def strip_accents(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')

def normalizar_titulo_base(titulo: str) -> str:
    if not titulo:
        return ""
    t = strip_accents(titulo.lower())
    t = re.sub(r'\(.*?\)', ' ', t)
    t = re.sub(
        r'\b(remaster(ed)?|deluxe|edition|bonus|live|demo|super|anniversary|expanded|complete|'
        r'version|mix|radio edit|remix|original|mono|stereo|explicit|clean|instrumental|'
        r'karaoke|single|ep|lp|box set|disc \d+|cd\d+|vinyl|digital|special|reissue|commentary)\b',
        '', t, flags=re.I)
    t = re.sub(r'(\bfeat\.?.*|\bft\.?.*|\bwith .*)', '', t, flags=re.I)
    t = re.sub(r'\b\d{2,4}\b', '', t)
    t = re.sub(r'[^\w\s\-]', '', t)
    return re.sub(r'\s+', ' ', t).strip()

def get_albumes():
    return get_data("albumes")

def get_album_artistas(album):
    # Si tienes los nombres, úsalos; si no, busca por id
    if "album_artistas" in album and album["album_artistas"]:
        return [a.get("nombre_artista", "") for a in album["album_artistas"] if a.get("nombre_artista")]
    return []

def get_album_generos(album):
    if "album_generos" in album and album["album_generos"]:
        return [g.get("nombre", "") for g in album["album_generos"] if g.get("nombre")]
    return []

def get_album_canciones(id_album):
    # Trae títulos y artistas de cada track, ordenados
    rows = sb.table("canciones").select("titulo, orden").eq("album", id_album).order("orden", desc=False).execute().data
    return [normalizar_titulo_base(r["titulo"]) for r in rows if r.get("titulo")]

def embed_album(album):
    titulo = normalizar_titulo_base(album.get('titulo', ''))
    tipo = album.get('tipo_album', '')
    anio = str(album.get('anio', ''))
    artistas = ', '.join(get_album_artistas(album))
    generos = ', '.join(get_album_generos(album))
    num_tracks = str(album.get('numero_canciones', ''))
    canciones = get_album_canciones(album['id_album']) if album.get('id_album') else []
    canciones_str = '; '.join(canciones)
    texto = f"{titulo}. Tipo: {tipo}. Año: {anio}. Artistas: {artistas}. Géneros: {generos}. Canciones: {canciones_str}. Número de canciones: {num_tracks}."
    return texto, model.encode(texto).tolist()

def save_embedding_album(id_album, emb, texto):
    sb.table('album_embeddings').upsert({
        'id_album': id_album,
        'embedding': emb,
        'texto_embedding': texto,
        'cluster_pendiente': True
    }).execute()

def ya_tiene_embedding(tabla, id_field, id_val):
    res = sb.table(tabla).select("embedding").eq(id_field, id_val).execute()
    return bool(res.data and res.data[0].get("embedding"))

# --- Ejecutar ---
print("Generando embeddings de álbumes...")
for a in get_albumes():
    if isinstance(a, dict) and "id_album" in a:
        if not ya_tiene_embedding("album_embeddings", "id_album", a["id_album"]):
            texto, emb = embed_album(a)
            save_embedding_album(a['id_album'], emb, texto)
print("Embeddings de álbumes completados.")
