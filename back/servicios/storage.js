const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getClient() {
    if (!supabase) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) throw new Error('Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
        supabase = createClient(url, key);
    }
    return supabase;
}

const BUCKET = () => process.env.SUPABASE_BUCKET || 'playfutbet';

/**
 * Sube el avatar de un usuario y devuelve la URL pública con cache-bust.
 * La ruta es siempre avatars/${userId}.ext — derivada del token, no del body.
 */
async function uploadAvatar(userId, buffer, mimeType) {
    const client = getClient();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `avatars/${userId}.${ext}`;

    const { error } = await client.storage
        .from(BUCKET())
        .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) throw new Error(`Supabase upload error: ${error.message}`);

    const { data } = client.storage.from(BUCKET()).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
}

module.exports = { uploadAvatar };
