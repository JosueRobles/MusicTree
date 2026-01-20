const fs = require('fs').promises;
const path = require('path');

const BASE = path.join(__dirname, '../../.checkpoints');

async function ensureDir() {
  try {
    console.log(`📁 Verificando/creando carpeta de checkpoints: ${BASE}`);
    await fs.mkdir(BASE, { recursive: true });
    console.log(`✅ Carpeta de checkpoints lista`);
  } catch (e) {
    console.error(`❌ Error creando carpeta de checkpoints:`, e.message || e);
    throw e;
  }
}

function keyToFile(key) {
  const safe = key.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filePath = path.join(BASE, `${safe}.json`);
  console.log(`🔑 Checkpoint file para key "${key}": ${filePath}`);
  return filePath;
}

async function getCheckpoint(key) {
  try {
    await ensureDir();
    const file = keyToFile(key);
    try {
      const raw = await fs.readFile(file, 'utf8');
      const data = JSON.parse(raw);
      console.log(`✓ Checkpoint cargado para "${key}":`, data);
      return data;
    } catch (readErr) {
      if (readErr.code === 'ENOENT') {
        console.log(`⚠️ No existe checkpoint previo para "${key}". Iniciando desde cero.`);
      } else {
        console.warn(`⚠️ Error leyendo checkpoint para "${key}":`, readErr.message);
      }
      return null;
    }
  } catch (e) {
    console.error(`❌ Error fatal en getCheckpoint("${key}"):`, e.message || e);
    throw e;
  }
}

async function setCheckpoint(key, data) {
  try {
    await ensureDir();
    const file = keyToFile(key);
    const jsonData = JSON.stringify(data, null, 2);
    console.log(`💾 Escribiendo checkpoint para "${key}":`, data);
    await fs.writeFile(file, jsonData, 'utf8');
    console.log(`✓ Checkpoint escrito exitosamente en ${file}`);
  } catch (e) {
    console.error(`❌ Error escribiendo checkpoint para "${key}":`, e.message || e);
    throw e;
  }
}

async function clearCheckpoint(key) {
  const file = keyToFile(key);
  try {
    await fs.unlink(file);
    console.log(`🗑️ Checkpoint eliminado para "${key}"`);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn(`⚠️ Error eliminando checkpoint para "${key}":`, e.message);
    }
    // ignore; es normal que no exista
  }
}

module.exports = { getCheckpoint, setCheckpoint, clearCheckpoint };
