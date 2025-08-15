const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../db');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const MAX_SIZE = 4 * 1024 * 1024;

router.post('/cache-images', async (req, res) => {
  const { urls, userId } = req.body;
  console.log("Recibidas para cachear:", urls);

  const results = [];

  for (const url of urls) {
    try {
      let fileBuffer;
      let contentType;

      if (url.startsWith('data:image/')) {
        const matches = url.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!matches) throw new Error("Base64 inválido");

        contentType = matches[1];
        const base64Data = matches[2];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Descargar SIEMPRE y luego procesar
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);
        contentType = response.headers['content-type'] || 'image/jpeg';
      }

      // 🔹 Siempre reducir/comprimir para asegurarnos de estar por debajo del límite
      fileBuffer = await sharp(fileBuffer)
        .resize({ width: 800 }) // fuerza ancho
        .jpeg({ quality: 80 }) // fuerza compresión
        .toBuffer();

      // Si después de comprimir aún es demasiado grande, volver a comprimir
      if (fileBuffer.length > MAX_SIZE) {
        fileBuffer = await sharp(fileBuffer)
          .resize({ width: 600 })
          .jpeg({ quality: 70 })
          .toBuffer();
      }

      contentType = 'image/jpeg';
      let ext = 'jpg';
      const fileName = `share/${userId}/${uuidv4()}.${ext}`;

      const { error } = await supabase.storage
        .from('share-images')
        .upload(fileName, fileBuffer, { contentType });

      if (error) throw error;

      const publicUrl = supabase.storage
        .from('share-images')
        .getPublicUrl(fileName).publicUrl;

        // ✅ Forzar https y path correcto
        const finalUrl = publicUrl.replace('http://', 'https://');
        results.push(finalUrl);

    } catch (e) {
      console.error("Error cacheando", url, e.message);
      results.push(url); // fallback
    }
  }

  res.json(results);
});

module.exports = router;
