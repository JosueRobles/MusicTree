import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
import numpy as np
import supabase
from difflib import SequenceMatcher
import re

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
app = Flask(__name__)

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def jaccard(set1, set2):
    if not set1 or not set2:
        return 0.0
    inter = len(set1 & set2)
    union = len(set1 | set2)
    return inter / union if union > 0 else 0.0

def normalizar_titulo_base(titulo: str) -> str:
    if not titulo:
        return ""
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

def fuzzy_title_score(t1, t2):
    n1, n2 = normalizar_titulo_base(t1), normalizar_titulo_base(t2)
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0
    sm = SequenceMatcher(None, n1, n2).ratio()
    s1, s2 = set(n1.split()), set(n2.split())
    jaccard = len(s1 & s2) / max(1, len(s1 | s2))
    return 0.7 * jaccard + 0.3 * sm

def artist_overlap(a1, a2):
    set1 = {str(x).lower().strip() for x in a1}
    set2 = {str(x).lower().strip() for x in a2}
    return len(set1 & set2) / max(1, min(len(set1), len(set2)))

def genre_overlap(g1, g2):
    set1 = {str(x).lower().strip() for x in g1}
    set2 = {str(x).lower().strip() for x in g2}
    return len(set1 & set2) / max(1, min(len(set1), len(set2)))

@app.route('/similares', methods=['POST'])
def similares():
    try:
        data = request.json
        entidad = data['entidad']
        if entidad != 'album':
            return jsonify([])
        embedding = data['embedding']
        id_album = data['id']
        emb_db = sb.table('album_embeddings').select('id_album, embedding').execute().data
        # incluir categoría (no existe columna artista_id en albumes en tu esquema)
        meta_db = sb.table('albumes').select('id_album, titulo, anio, tipo_album, categoria').execute().data
        artistas_db = sb.table('album_artistas').select('album_id, artista_id').execute().data
        generos_db = sb.table('album_generos').select('album_id, genero_id').execute().data
        canciones_db = sb.table('canciones').select('id_cancion, album, titulo').execute().data

        album_canciones = {}
        for c in canciones_db:
            album_canciones.setdefault(c['album'], set()).add(normalizar_titulo_base(c['titulo']))

        album_artistas = {}
        for a in artistas_db:
            album_artistas.setdefault(a['album_id'], set()).add(a['artista_id'])

        album_generos = {}
        for g in generos_db:
            album_generos.setdefault(g['album_id'], set()).add(g['genero_id'])

        meta_map = {m['id_album']: m for m in meta_db}

        resultados = []
        for item in emb_db:
            if item['id_album'] == id_album:
                continue
            sim_emb = cosine_similarity(embedding, item['embedding'])
            meta1 = meta_map.get(id_album, {})
            meta2 = meta_map.get(item['id_album'], {})
            t1, t2 = meta1.get('titulo', ''), meta2.get('titulo', '')
            a1, a2 = album_artistas.get(id_album, set()), album_artistas.get(item['id_album'], set())
            g1, g2 = album_generos.get(id_album, set()), album_generos.get(item['id_album'], set())
            can1 = album_canciones.get(id_album, set())
            can2 = album_canciones.get(item['id_album'], set())
            title_score = fuzzy_title_score(t1, t2)
            # artist_score se calcula solo desde album_artistas; no hay columna artista_id en albumes
            artist_score = artist_overlap(a1, a2) if a1 and a2 else 0.0
            genre_score = genre_overlap(g1, g2)
            songs_jaccard = jaccard(can1, can2)
            # dar más peso al embedding para capturar variantes sin metadata
            combined_score = (
                0.30 * title_score +
                0.20 * artist_score +
                0.20 * songs_jaccard +
                0.05 * genre_score +
                0.25 * sim_emb
            )
            # penalizar fuertemente cuando no hay evidencia de artista (evita unir por emb/título sólo)
            if artist_score < 0.25:
                combined_score = combined_score * 0.4
            resultados.append({
                 'id': item['id_album'],
                 'embedding_similarity': float(sim_emb),
                 'title_score': float(title_score),
                 'artist_score': float(artist_score),
                 'songs_jaccard': float(songs_jaccard),
                 'genre_score': float(genre_score),
                 'combined_score': float(combined_score),
                 'explanation': f"title:{title_score:.2f}, artist:{artist_score:.2f}, songs:{songs_jaccard:.2f}, genre:{genre_score:.2f}, emb:{sim_emb:.2f}"
             })
        resultados.sort(key=lambda x: -x['combined_score'])
        return jsonify(resultados)
    except Exception as e:
        print(f"Error en /similares: {e}")
        return jsonify([]), 500

if __name__ == '__main__':
    app.run(port=8000)