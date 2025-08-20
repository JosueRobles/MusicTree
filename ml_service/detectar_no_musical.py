import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import supabase
import os
from dotenv import load_dotenv
import pickle

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
sb = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# Carga ejemplos etiquetados
df_train = pd.read_csv('ejemplos_no_musical.csv')  # Debes crear este archivo

# Prepara features
df_train['duracion'] = df_train['duracion_ms'] / 1000
df_train['posicion'] = df_train['orden'].fillna(0)
df_train['categoria'] = df_train['categoria'].fillna('desconocida')
df_train = pd.get_dummies(df_train, columns=['categoria'])

X_train = df_train.drop(columns=['id_cancion', 'titulo', 'album', 'spotify_id', 'es_no_musical_label'])
y_train = df_train['es_no_musical_label']

modelo = RandomForestClassifier(n_estimators=100, random_state=42)
modelo.fit(X_train, y_train)

# Guardar el modelo
with open('modelo_no_musical.pkl', 'wb') as f:
    pickle.dump(modelo, f)

# Cargar el modelo
with open('modelo_no_musical.pkl', 'rb') as f:
    modelo = pickle.load(f)

# Aplica a todas las canciones
canciones = sb.table('canciones').select('*').execute().data
df = pd.DataFrame(canciones)
df['duracion'] = df['duracion_ms'] / 1000
df['posicion'] = df['orden'].fillna(0)
df['categoria'] = df['categoria'].fillna('desconocida')
df = pd.get_dummies(df, columns=['categoria'])

# Asegúrate de tener las mismas columnas que el entrenamiento
for col in X_train.columns:
    if col not in df.columns:
        df[col] = 0
df = df[X_train.columns]

def es_no_musical_regla(row):
    t = row['titulo'].lower()
    if row['duracion_ms'] < 60000:
        return True
    palabras = ['intro', 'interlude', 'voice-over', 'commentary', 'outro', 'skit']
    if any(p in t for p in palabras):
        return True
    return False

for idx, row in df.iterrows():
    if es_no_musical_regla(row):
        es_no_musical = True
    else:
        features = row.values.reshape(1, -1)
        es_no_musical = bool(modelo.predict(features)[0])
    sb.table('canciones').update({'es_no_musical': es_no_musical}).eq('id_cancion', canciones[idx]['id_cancion']).execute()

print("Clasificación de pistas no musicales completada.")
