const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const betSchema = z.object({
    userId: z.number().int().positive(),
    matchId: z.number().int().positive(),
    homeScore: z.number().int().min(0),
    awayScore: z.number().int().min(0),
});

// POST /api/bets
router.post('/', authenticateToken, async (req, res) => {
    try {
        const result = betSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Datos de apuesta inválidos', details: result.error.format() });
        }

        const { userId, matchId, homeScore, awayScore } = result.data;
        if (req.user.id !== userId) return res.status(403).json({ error: 'No tienes permiso para realizar esta apuesta' });

        const sim = req.app.get('sim');
        const match = sim.allMatches.find(m => m.id === matchId);
        if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
        if (match.status !== 'pending') return res.status(400).json({ error: 'No se pueden realizar apuestas en partidos ya iniciados' });

        const betRes = await db.query(
            'INSERT INTO bets (user_id, match_id, home_score, away_score) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, match_id) DO UPDATE SET home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score RETURNING *',
            [userId, matchId, homeScore, awayScore]
        );

        const newBet = {
            id: betRes.rows[0].id,
            userId: betRes.rows[0].user_id,
            matchId: betRes.rows[0].match_id,
            homeScore: betRes.rows[0].home_score,
            awayScore: betRes.rows[0].away_score,
            pointsEarned: betRes.rows[0].points_earned || 0
        };

        const existingIdx = sim.db.bets.findIndex(b => Number(b.userId) === Number(userId) && Number(b.matchId) === Number(matchId));
        if (existingIdx !== -1) sim.db.bets[existingIdx] = newBet;
        else sim.db.bets.push(newBet);

        const notif = {
            id: Date.now(), userId,
            title: 'Apuesta Recibida',
            message: `Has apostado para el ${match.home} vs ${match.away}`,
            createdAt: new Date().toISOString()
        };
        await db.query(
            'INSERT INTO notifications (id, user_id, title, message, created_at) VALUES ($1, $2, $3, $4, $5)',
            [notif.id, notif.userId, notif.title, notif.message, notif.createdAt]
        );
        sim.db.notifications.push(notif);

        res.json(newBet);
    } catch (error) {
        console.error('Error al procesar apuesta:', error);
        res.status(500).json({ error: 'Error al guardar apuesta', message: error.message });
    }
});

// GET /api/bets/user/:userId
router.get('/user/:userId', authenticateToken, (req, res) => {
    const userId = parseInt(req.params.userId);
    if (req.user.id !== userId) return res.status(403).json({ error: 'No puedes ver las apuestas de otro usuario' });

    const sim = req.app.get('sim');
    const userBets = sim.db.bets.filter(b => Number(b.userId) === userId);
    const enrichedBets = userBets.map(bet => {
        const match = sim.allMatches.find(m => Number(m.id) === Number(bet.matchId));
        return {
            ...bet,
            match: match || null,
            pointsEarned: bet.pointsEarned || 0,
            status: match && match.status === 'finished' ? (bet.pointsEarned > 0 ? 'win' : 'loss') : 'pending'
        };
    });
    res.json(enrichedBets);
});

module.exports = router;
