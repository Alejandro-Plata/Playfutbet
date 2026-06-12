const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { limiteChat } = require('../middleware/rateLimits');

const messageSchema = z.object({
    matchId: z.number().int().positive(),
    text: z.string().trim().min(1).max(280),
});

// GET /api/messages/:matchId
router.get('/:matchId', authenticateToken, async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.matchId);
        if (isNaN(matchId)) return res.status(400).json({ error: 'ID de partido inválido' });
        const sim = req.app.get('sim');
        const history = sim.db.messages.filter(m => m.matchId === matchId);
        res.json(history);
    } catch (error) {
        next(error);
    }
});

// POST /api/messages
router.post('/', authenticateToken, limiteChat, async (req, res, next) => {
    try {
        const parsed = messageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Datos faltantes o texto inválido' });
        }
        const { matchId, text } = parsed.data;

        const sim = req.app.get('sim');
        const autor = sim.db.users.find(u => Number(u.id) === Number(req.user.id));
        const username = autor ? autor.username : 'Usuario';

        const newMessage = {
            match_id: matchId,
            username,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        await db.query(
            'INSERT INTO messages (match_id, username, text, time) VALUES ($1, $2, $3, $4)',
            [newMessage.match_id, newMessage.username, newMessage.text, newMessage.time]
        );

        sim.db.messages.push({ ...newMessage, matchId: newMessage.match_id });
        res.json({ ...newMessage, matchId: newMessage.match_id });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
