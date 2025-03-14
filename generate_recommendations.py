import sys
import json
import numpy as np
from supabase import create_client, Client
import logging
from collections import defaultdict
import pickle
from flask import Flask, request, jsonify
import httpx
from functools import lru_cache
from dotenv import load_dotenv
import os

load_dotenv()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar el modelo entrenado con KNN
with open('recommender_model.pkl', 'rb') as f:
    algo = pickle.load(f)

# Conexión a Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuración de Flask
app = Flask(__name__)

def get_user_data(user_id):
    """Obtiene todas las valoraciones del usuario."""
    valoraciones = {
        "cancion": supabase.table("valoraciones_canciones").select("*").eq("usuario", user_id).execute().data,
        "album": supabase.table("valoraciones_albumes").select("*").eq("usuario", user_id).execute().data,
        "artista": supabase.table("valoraciones_artistas").select("*").eq("usuario", user_id).execute().data,
        "video": supabase.table("valoraciones_videos_musicales").select("*").eq("usuario", user_id).execute().data,
    }

    valorados = {tipo: {v[f"{tipo}"] for v in data} for tipo, data in valoraciones.items()}
    return valoraciones, valorados

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

def fetch_data(table, user_id=None):
    """Obtiene datos de Supabase y maneja errores."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    if user_id:
        url += f"&usuario=eq.{user_id}"
    
    response = httpx.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return data  # Retorna la lista de diccionarios directamente
    else:
        print(f"Error al obtener {table}: {response.text}")
        return []
    
def get_all_entities():
    """Obtiene todas las entidades (canciones, álbumes, artistas, videos) con sus relaciones."""
    canciones = supabase.table("canciones").select("*").execute().data
    albumes = supabase.table("albumes").select("*").execute().data
    artistas = supabase.table("artistas").select("*").execute().data
    videos = supabase.table("videos_musicales").select("*").execute().data

    album_artistas = supabase.table("album_artistas").select("album_id, artista_id").execute().data
    cancion_artistas = supabase.table("cancion_artistas").select("cancion_id, artista_id").execute().data
    video_artistas = supabase.table("video_artistas").select("video_id, artista_id").execute().data

    # Crear diccionarios para asociaciones
    artistas_por_album = defaultdict(list)
    for relacion in album_artistas:
        artistas_por_album[relacion["album_id"]].append(relacion["artista_id"])

    artistas_por_cancion = defaultdict(list)
    for relacion in cancion_artistas:
        artistas_por_cancion[relacion["cancion_id"]].append(relacion["artista_id"])

    artistas_por_video = defaultdict(list)
    for relacion in video_artistas:
        artistas_por_video[relacion["video_id"]].append(relacion["artista_id"])

    # Agregar artistas a cada entidad
    for album in albumes:
        album["artistas"] = artistas_por_album.get(album["id_album"], [])

    for cancion in canciones:
        cancion["artistas"] = artistas_por_cancion.get(cancion["id_cancion"], [])

    for video in videos:
        video["artistas"] = artistas_por_video.get(video["id_video"], [])

    return canciones + albumes + artistas + videos

def get_related_entities_map():
    """Obtiene un mapa de entidades relacionadas (canciones del mismo álbum, álbumes del mismo artista, etc.)."""
    canciones_album = supabase.table("canciones").select("id_cancion, album").execute().data
    album_artistas = supabase.table("album_artistas").select("album_id, artista_id").execute().data
    video_artistas = supabase.table("video_artistas").select("video_id, artista_id").execute().data

    logger.info(f"Relaciones de canciones a álbumes: {len(canciones_album)}")
    logger.info(f"Relaciones de álbumes a artistas: {len(album_artistas)}")
    logger.info(f"Relaciones de videos a artistas: {len(video_artistas)}")

    related_entities_map = defaultdict(list)

    for cancion in canciones_album:
        related_entities_map[cancion['id_cancion']].append(("album", cancion['album']))

    for album_artista in album_artistas:
        related_entities_map[album_artista['album_id']].append(("artista", album_artista['artista_id']))

    for video_artista in video_artistas:
        related_entities_map[video_artista['video_id']].append(("artista", video_artista['artista_id']))

    return related_entities_map

def get_community_recommendations():
    """Calcula recomendaciones de artistas basadas en la comunidad."""
    valoraciones_artistas = supabase.table("valoraciones_artistas").select("*").execute().data
    usuarios_por_artista = defaultdict(set)

    for v in valoraciones_artistas:
        usuarios_por_artista[v['artista']].add(v['usuario'])

    comunidad_recom = defaultdict(lambda: defaultdict(int))

    for artista1, usuarios1 in usuarios_por_artista.items():
        for artista2, usuarios2 in usuarios_por_artista.items():
            if artista1 != artista2:
                interseccion = usuarios1 & usuarios2
                if len(interseccion) > 0:
                    porcentaje = len(interseccion) / len(usuarios1)
                    comunidad_recom[artista1][artista2] = porcentaje * 100

    return comunidad_recom

def obtener_artistas_por_album():
    """Obtiene un diccionario {id_album: [lista de id_artista]} desde la BD"""
    data = supabase.table("album_artistas").select("album_id, artista_id").execute().data
    
    artistas_por_album = {}
    for relacion in data:
        print(relacion, type(relacion))
        for relacion in data:
            album_id = relacion["album_id"]
            artista_id = relacion["artista_id"]
        if album_id not in artistas_por_album:
            artistas_por_album[album_id] = []
        artistas_por_album[album_id].append(artista_id)
    
    return artistas_por_album

def obtener_artistas_por_cancion():
    """Obtiene un diccionario {id_cancion: [lista de id_artista]}"""
    data = supabase.table("cancion_artistas").select("cancion_id, artista_id").execute()
    
    artistas_por_cancion = {}
    for relacion in data:
        print(relacion, type(relacion))
        cancion_id = relacion[0]
        artista_id = relacion[0]
        if cancion_id not in artistas_por_cancion:
            artistas_por_cancion[cancion_id] = []
        artistas_por_cancion[cancion_id].append(artista_id)
    
    return artistas_por_cancion

def obtener_artistas_por_video():
    """Obtiene un diccionario {id_video: [lista de id_artista]}"""
    data = supabase.table("video_artistas").select("video_id, artista_id").execute()
    
    artistas_por_video = {}
    for relacion in data:
        print(relacion, type(relacion))
        video_id = relacion[0]
        artista_id = relacion[0]
        if video_id not in artistas_por_video:
            artistas_por_video[video_id] = []
        artistas_por_video[video_id].append(artista_id)
    
    return artistas_por_video

def recomendar_albumes():
    """Calcula las recomendaciones de álbumes basadas en valoraciones"""
    albumes = supabase.table("albumes").select("id_album").execute()
    valoraciones = supabase.table("valoraciones_albumes").select("album, calificacion").execute()
    
    # Obtener artistas relacionados con cada álbum
    artistas_por_album = obtener_artistas_por_album()

    # Diccionario para almacenar las recomendaciones
    recomendaciones = {}

    for album in albumes:
        album_id = album[0]
        artistas = artistas_por_album.get(album_id, [])  # Obtener los artistas del álbum
        if not artistas:
            print(f"⚠️ Álbum {album_id} no tiene artistas asociados.")
            continue

        # Filtrar valoraciones de álbumes de los mismos artistas
        valoraciones_relacionadas = [v["calificacion"] for v in valoraciones if v["album"] == album_id]

        recomendacion = np.mean(valoraciones_relacionadas) if valoraciones_relacionadas else 0

        recomendaciones[album_id] = recomendacion

    return recomendaciones

# Ejecutar el sistema de recomendación
recomendaciones_albumes = recomendar_albumes()
print("Recomendaciones de álbumes:", recomendaciones_albumes)


def generate_recommendations(user_id):
    canciones = fetch_data("canciones")
    albumes = fetch_data("albumes")
    artistas = fetch_data("artistas")
    videos = fetch_data("videos_musicales")

    album_artistas = fetch_data("album_artistas")
    cancion_artistas = fetch_data("cancion_artistas")
    video_artistas = fetch_data("video_artistas")

    # Crear diccionarios para facilitar la búsqueda de artistas relacionados
    artistas_por_album = defaultdict(list)
    for relacion in album_artistas:
        artistas_por_album[relacion["album_id"]].append(relacion["artista_id"])

    artistas_por_cancion = defaultdict(list)
    for relacion in cancion_artistas:
        artistas_por_cancion[relacion["cancion_id"]].append(relacion["artista_id"])

    artistas_por_video = defaultdict(list)
    for relacion in video_artistas:
        artistas_por_video[relacion["video_id"]].append(relacion["artista_id"])

    # Obtener valoraciones del usuario
    valoraciones_canciones = fetch_data("valoraciones_canciones", user_id)
    valoraciones_albumes = fetch_data("valoraciones_albumes", user_id)
    valoraciones_artistas = fetch_data("valoraciones_artistas", user_id)
    valoraciones_videos = fetch_data("valoraciones_videos_musicales", user_id)

    # Extraer IDs de cada tipo de entidad ya valorada
    valoradas_canciones = {item["cancion"] for item in valoraciones_canciones}
    valoradas_albumes = {item["album"] for item in valoraciones_albumes}
    valoradas_artistas = {item["artista"] for item in valoraciones_artistas}
    valoradas_videos = {item["video"] for item in valoraciones_videos}

    recommendations = []

    # 🔄 Generar recomendaciones
    for cancion in canciones:
        id_cancion = str(cancion["id_cancion"])
        if id_cancion not in valoradas_canciones:
            try:
                prediction = algo.predict(str(user_id), id_cancion)
                recommendations.append({
                    "id": id_cancion,
                    "tipo": "cancion",
                    "titulo": cancion["titulo"],
                    "artistas": artistas_por_cancion.get(id_cancion, []),
                    "prediccion": prediction.est
                })
            except Exception as e:
                print(f"Error al predecir para la canción {id_cancion}: {str(e)}")

    for album in albumes:
        id_album = str(album["id_album"])
        if id_album not in valoradas_albumes:
            try:
                prediction = algo.predict(str(user_id), id_album)
                recommendations.append({
                    "id": id_album,
                    "tipo": "album",
                    "titulo": album["titulo"],
                    "artistas": artistas_por_album.get(id_album, []),
                    "prediccion": prediction.est
                })
            except Exception as e:
                print(f"Error al predecir para el álbum {id_album}: {str(e)}")

    for artista in artistas:
        id_artista = str(artista["id_artista"])
        if id_artista not in valoradas_artistas:
            try:
                prediction = algo.predict(str(user_id), id_artista)
                recommendations.append({
                    "id": id_artista,
                    "tipo": "artista",
                    "nombre": artista["nombre"],
                    "prediccion": prediction.est
                })
            except Exception as e:
                print(f"Error al predecir para el artista {id_artista}: {str(e)}")

    for video in videos:
        id_video = str(video["id_video"])
        if id_video not in valoradas_videos:
            try:
                prediction = algo.predict(str(user_id), id_video)
                recommendations.append({
                    "id": id_video,
                    "tipo": "video",
                    "titulo": video["titulo"],
                    "artistas": artistas_por_video.get(id_video, []),
                    "prediccion": prediction.est
                })
            except Exception as e:
                print(f"Error al predecir para el video {id_video}: {str(e)}")

    return recommendations

@app.route("/recommendations", methods=["GET"])
def recommendations():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user_id = str(user_id)  # Convertir el user_id a string

    try:
        recommendations = generate_recommendations(user_id)
        return jsonify({"recommendations": recommendations}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
