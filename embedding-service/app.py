import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import supabase
import threading
import time

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "1000"))

CFG = {
    "album": {"table": "album_embeddings", "id_field": "id_album", "emb_field": "embedding"},
}

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": FRONTEND_URL}})
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
INDEX = {}

def fetch_all(table, select_fields):
    all_rows = []
    offset = 0
    while True:
        res = sb.table(table).select(select_fields).range(offset, offset + PAGE_SIZE - 1).execute()
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return all_rows

def build_index_for(entidad):
    cfg = CFG[entidad]
    rows = fetch_all(cfg["table"], f"{cfg['id_field']}, {cfg['emb_field']}")
    ids, vecs = [], []
    for r in rows:
        emb = r.get(cfg["emb_field"])
        _id = r.get(cfg["id_field"])
        if emb is None or _id is None:
            continue
        v = np.array(emb, dtype=np.float32)
        n = np.linalg.norm(v)
        if n == 0:
            continue
        vecs.append(v / n)
        ids.append(int(_id))
    if not ids:
        return {"ids": np.array([], dtype=np.int64), "vecs": np.empty((0, 0), dtype=np.float32), "dim": 0}
    ids = np.array(ids, dtype=np.int64)
    vecs = np.vstack(vecs).astype(np.float32)
    dim = vecs.shape[1]
    return {"ids": ids, "vecs": vecs, "dim": dim}

def load_all_indexes():
    for entidad in CFG.keys():
        INDEX[entidad] = build_index_for(entidad)
    print("Índices cargados:", {k: v["vecs"].shape for k, v in INDEX.items()})

load_all_indexes()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "indexes": {k: {"count": int(v["ids"].size), "dim": int(v["dim"])} for k, v in INDEX.items()}
    })

@app.route("/similares", methods=["POST"])
def similares():
    data = request.get_json(force=True)
    entidad = data.get("entidad")
    if not entidad or entidad not in INDEX:
        return jsonify({"error": "Entidad no soportada"}), 400
    idx = INDEX[entidad]
    if idx["vecs"].size == 0:
        return jsonify([])
    top_k = int(data.get("top_k", 20))
    min_sim = float(data.get("min_sim", 0.85))
    query_embedding = data.get("embedding")
    query_id = data.get("id")
    if query_embedding is not None:
        q = np.array(query_embedding, dtype=np.float32)
        nq = np.linalg.norm(q)
        if nq == 0:
            return jsonify([])
        q = q / nq
    elif query_id is not None:
        positions = np.where(idx["ids"] == int(query_id))[0]
        if positions.size == 0:
            return jsonify({"error": "id no encontrado en índice"}), 404
        q = idx["vecs"][positions[0]]
    else:
        return jsonify({"error": "Envía 'embedding' o 'id'"}), 400
    sims = idx["vecs"] @ q
    if query_id is not None:
        positions = np.where(idx["ids"] == int(query_id))[0]
        if positions.size > 0:
            sims[positions[0]] = -1.0
    mask = sims >= min_sim
    if not np.any(mask):
        return jsonify([])
    sims_f = sims[mask]
    ids_f = idx["ids"][mask]
    idx_sorted = np.argsort(-sims_f)[:top_k]
    out = [{"id": int(ids_f[i]), "similaridad": float(sims_f[i])} for i in idx_sorted]
    return jsonify(out)

@app.route("/reload", methods=["POST"])
def reload_indexes():
    key = request.headers.get("X-API-KEY")
    if not ADMIN_API_KEY or key != ADMIN_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    def _reload():
        try:
            load_all_indexes()
            print("[RELOAD] Success")
        except Exception as e:
            print(f"[RELOAD] Error: {e}")
    threading.Thread(target=_reload, daemon=True).start()
    return jsonify({"status": "reloading"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)