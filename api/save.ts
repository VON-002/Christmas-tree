import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { photos } = request.body;

        // Basic validation
        if (!photos || !Array.isArray(photos)) {
            return response.status(400).json({ error: 'Invalid data format' });
        }

        // Generate a simple unique ID (9 characters)
        const id = Math.random().toString(36).substr(2, 9);

        // Save to Vercel KV
        // Key format: tree:<id>
        await kv.set(`tree:${id}`, photos);

        return response.status(200).json({ id });
    } catch (error) {
        console.error("KV Error:", error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
