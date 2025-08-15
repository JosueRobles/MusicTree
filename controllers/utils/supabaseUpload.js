const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

async function uploadToSupabase(fileBuffer, fileName, mimetype) {
  // Usa una carpeta por tipo si quieres (opcional)
  const path = `${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (error) throw error;

  // Obtén la URL pública
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrlData.publicUrl;
}

module.exports = { uploadToSupabase };