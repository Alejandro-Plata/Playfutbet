const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { limiteConv } = require('../middleware/rateLimits');

const msgSchema = z.object({ text: z.string().trim().min(1).max(500) });

async function getConvForUser(convId, userId) {
    const res = await db.query('SELECT * FROM conversations WHERE id = $1', [convId]);
    const conv = res.rows[0];
    if (!conv || (conv.user_a !== userId && conv.user_b !== userId)) return null;
    return conv;
}

// POST /api/conversations — crear o recuperar conversación
router.post('/', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId || parseInt(otherUserId) === myId) {
        return res.status(400).json({ error: 'Usuario inválido' });
    }

    const a = Math.min(myId, parseInt(otherUserId));
    const b = Math.max(myId, parseInt(otherUserId));

    try {
        const existing = await db.query(
            'SELECT id FROM conversations WHERE user_a = $1 AND user_b = $2',
            [a, b]
        );
        if (existing.rows.length > 0) {
            return res.json({ id: existing.rows[0].id });
        }

        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [otherUserId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const created = await db.query(
            'INSERT INTO conversations (user_a, user_b) VALUES ($1, $2) RETURNING id',
            [a, b]
        );
        res.json({ id: created.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear conversación' });
    }
});

// GET /api/conversations — listar conversaciones del usuario
router.get('/', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    try {
        const result = await db.query(`
            SELECT
                c.id,
                CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END AS other_id,
                u.username AS other_username,
                u.avatar AS other_avatar,
                pm.text AS last_text,
                pm.created_at AS last_time,
                pm.sender_id AS last_sender,
                COUNT(pm2.id) FILTER (WHERE pm2.sender_id != $1 AND pm2.read_at IS NULL) AS unread_count
            FROM conversations c
            JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
            LEFT JOIN LATERAL (
                SELECT text, created_at, sender_id
                FROM private_messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) pm ON true
            LEFT JOIN private_messages pm2 ON pm2.conversation_id = c.id
            WHERE c.user_a = $1 OR c.user_b = $1
            GROUP BY c.id, c.user_a, c.user_b, u.username, u.avatar,
                     pm.text, pm.created_at, pm.sender_id
            ORDER BY pm.created_at DESC NULLS LAST
        `, [myId]);

        res.json(result.rows.map(row => ({
            id: row.id,
            otherUser: {
                id: row.other_id,
                username: row.other_username,
                avatar: row.other_avatar,
            },
            lastMessage: row.last_text ? {
                text: row.last_text,
                createdAt: row.last_time,
                isMe: row.last_sender === myId,
            } : null,
            unreadCount: parseInt(row.unread_count) || 0,
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
});

// GET /api/conversations/:id — info de una conversación
router.get('/:id', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const convId = parseInt(req.params.id);
    try {
        const result = await db.query(`
            SELECT c.id, u.id AS other_id, u.username AS other_username, u.avatar AS other_avatar
            FROM conversations c
            JOIN users u ON u.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END
            WHERE c.id = $2 AND (c.user_a = $1 OR c.user_b = $1)
        `, [myId, convId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Conversación no encontrada' });
        const row = result.rows[0];
        res.json({
            id: row.id,
            otherUser: { id: row.other_id, username: row.other_username, avatar: row.other_avatar },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener conversación' });
    }
});

// GET /api/conversations/:id/messages?after=<id>
router.get('/:id/messages', authenticateToken, async (req, res) => {
    const myId = req.user.id;
    const convId = parseInt(req.params.id);
    const after = parseInt(req.query.after) || 0;

    const conv = await getConvForUser(convId, myId);
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    try {
        await db.query(
            `UPDATE private_messages
             SET read_at = NOW()
             WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
            [convId, myId]
        );

        const result = await db.query(`
            SELECT id, sender_id, text, created_at, read_at
            FROM private_messages
            WHERE conversation_id = $1 AND id > $2
            ORDER BY created_at ASC
            LIMIT 50
        `, [convId, after]);

        res.json(result.rows.map(m => ({
            id: m.id,
            conversationId: convId,
            senderId: m.sender_id,
            text: m.text,
            createdAt: m.created_at,
            readAt: m.read_at,
            isMe: m.sender_id === myId,
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', authenticateToken, limiteConv, async (req, res) => {
    const myId = req.user.id;
    const convId = parseInt(req.params.id);

    const conv = await getConvForUser(convId, myId);
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    const parsed = msgSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Mensaje inválido (máx. 500 caracteres)' });

    try {
        const result = await db.query(`
            INSERT INTO private_messages (conversation_id, sender_id, text)
            VALUES ($1, $2, $3)
            RETURNING id, sender_id, text, created_at, read_at
        `, [convId, myId, parsed.data.text]);

        const m = result.rows[0];
        res.json({
            id: m.id,
            conversationId: convId,
            senderId: m.sender_id,
            text: m.text,
            createdAt: m.created_at,
            readAt: m.read_at,
            isMe: true,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

module.exports = router;
