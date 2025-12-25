import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    const { id } = request.query;

    if (!id || Array.isArray(id)) {
        return response.status(400).json({ error: 'Missing or invalid ID' });
    }

    try {
        const photos = await kv.get(`tree:${id}`);

        if (!photos) {
            return response.status(404).json({ error: 'Tree not found' });
        }

        return response.status(200).json(photos);
    } catch (error) {
        console.error("KV Error:", error);
        return response.status(500).json({ error: 'Internal Server Error', details: String(error) });
    }
}
