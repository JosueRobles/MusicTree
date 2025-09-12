import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import numpy as np
import supabase

load_dotenv()  # carga variables del .env

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

app = Flask(__name__)
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@app.route('/similares', methods=['POST'])
def similares():
    try:
        data = request.json
        entidad = data['entidad']
        embedding = data['embedding']
        resultados = []
        if entidad == 'entidad':
            # Buscar en canciones y videos
            emb_c = sb.table('cancion_embeddings').select('*').execute().data
            emb_v = sb.table('video_embeddings').select('*').execute().data
            for item in emb_c:
                sim = cosine_similarity(embedding, item['embedding'])
                if sim > 0.85 and item['id_cancion'] != data['id']:
                    resultados.append({'id': item['id_cancion'], 'tipo': 'cancion', 'similaridad': sim})
            for item in emb_v:
                sim = cosine_similarity(embedding, item['embedding'])
                if sim > 0.85 and item['id_video'] != data['id']:
                    resultados.append({'id': item['id_video'], 'tipo': 'video', 'similaridad': sim})
        else:
            tabla = f"{entidad}_embeddings"
            emb_db = sb.table(tabla).select('*').execute().data
            for item in emb_db:
                sim = cosine_similarity(embedding, item['embedding'])
                if sim > 0.85 and item[f'id_{entidad}'] != data['id']:
                    resultados.append({'id': item[f'id_{entidad}'], 'tipo': entidad, 'similaridad': sim})
        resultados.sort(key=lambda x: -x['similaridad'])
        return jsonify(resultados)
    except Exception as e:
        print(f"Error en /similares: {e}")
        return jsonify([]), 500

if __name__ == '__main__':
    app.run(port=8000)