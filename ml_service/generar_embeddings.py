import os
from dotenv import load_dotenv
import requests
import supabase
from sentence_transformers import SentenceTransformer
import numpy as np

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

def get_canciones():
    return get_data("canciones")

def get_albumes():
    return get_data("albumes")

def get_videos():
    return get_data("videos")

# Funciones para generar embedding
def embed_cancion(cancion):
    texto = f"{cancion.get('titulo', '')} {cancion.get('albumes', {}).get('titulo', '')} " \
            f"{' '.join(str(a['artista_id']) for a in cancion.get('cancion_artistas', []))} " \
            f"{cancion.get('duracion_ms', '')}"
    return model.encode(texto).tolist()

def embed_album(album):
    texto = f"{album.get('titulo', '')} {album.get('tipo_album', '')} {album.get('anio', '')} " \
            f"{' '.join(str(a['artista_id']) for a in album.get('album_artistas', []))} " \
            f"{' '.join(str(g['genero_id']) for g in album.get('album_generos', []))}"
    return model.encode(texto).tolist()

def embed_video(video):
    texto = f"{video.get('titulo', '')} {video.get('anio', '')} {video.get('duracion', '')} " \
            f"{' '.join(str(a['artista_id']) for a in video.get('video_artistas', []))} " \
            f"{' '.join(str(g['genero_id']) for g in video.get('video_generos', []))}"
    return model.encode(texto).tolist()

# Funciones para guardar embeddings
def save_embedding_cancion(id_cancion, emb):
    sb.table('cancion_embeddings').upsert({
        'id_cancion': id_cancion,
        'embedding': emb
    }).execute()

def save_embedding_album(id_album, emb):
    sb.table('album_embeddings').upsert({
        'id_album': id_album,
        'embedding': emb
    }).execute()

def save_embedding_video(id_video, emb):
    sb.table('video_embeddings').upsert({
        'id_video': id_video,
        'embedding': emb
    }).execute()

# --- Ejecutar ---
print("Generando embeddings de canciones...")
for c in get_canciones():
    if isinstance(c, dict) and "id_cancion" in c:
        save_embedding_cancion(c['id_cancion'], embed_cancion(c))
print("Embeddings de canciones completados.")

print("Generando embeddings de álbumes...")
for a in get_albumes():
    if isinstance(a, dict) and "id_album" in a:
        save_embedding_album(a['id_album'], embed_album(a))
print("Embeddings de álbumes completados.")

print("Generando embeddings de videos...")
for v in get_videos():
    if isinstance(v, dict) and "id_video" in v:
        save_embedding_video(v['id_video'], embed_video(v))
print("Embeddings de videos completados.")
