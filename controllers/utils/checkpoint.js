const fs = require('fs').promises;
const path = require('path');

const BASE = path.join(__dirname, '../../.checkpoints');

async function ensureDir() {
  try {
    await fs.mkdir(BASE, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function keyToFile(key) {
  const safe = key.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return path.join(BASE, `${safe}.json`);
}

async function getCheckpoint(key) {
  await ensureDir();
  const file = keyToFile(key);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function setCheckpoint(key, data) {
  await ensureDir();
  const file = keyToFile(key);
  try {
    await fs.writeFile(file, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.warn('Failed to write checkpoint', key, e.message || e);
  }
}

async function clearCheckpoint(key) {
  const file = keyToFile(key);
  try {
    await fs.unlink(file);
  } catch (e) {
    // ignore
  }
}

module.exports = { getCheckpoint, setCheckpoint, clearCheckpoint };
