const express = require('express');
const router = express.Router();
const multer = require('multer');
const { z } = require('zod');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { limiteAvatar } = require('../middleware/rateLimits');
const { uploadAvatar } = require('../servicios/storage');

// Multer en memoria (sin disco — compatible Render)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG o WebP.'));
        }
        cb(null, true);
    }
});

const updateProfileSchema = z.object({
    username: z.string().min(3).max(20).optional(),
    bio: z.string().max(280).optional(),
    favoriteTeam: z.string().optional(),
    isPrivate: z.boolean().optional(),
    showBets: z.boolean().optional(),
    showStats: z.boolean().optional(),
});

// GET /api/leaderboard — puntaje total
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, points, avatar FROM users ORDER BY points DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
});

// GET /api/leaderboard/season — puntaje de temporada actual
router.get('/leaderboard/season', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, season_points, avatar FROM users ORDER BY season_points DESC');
        res.json(result.rows.map(u => ({ ...u, points: u.season_points })));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ranking de temporada' });
    }
});

// GET /api/users/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const allUsersResult = await db.query('SELECT id, points FROM users ORDER BY points DESC');
        const rank = allUsersResult.rows.findIndex(u => u.id === id) + 1;

        const isOwner = req.user.id === id;
        const isPrivate = user.is_private && !isOwner;

        if (isPrivate) {
            return res.json({ id: user.id, username: user.username, avatar: user.avatar, isPrivate: true });
        }

        const response = {
            id: user.id,
            username: user.username,
            points: user.points,
            avatar: user.avatar,
            rank,
            bio: user.bio || '',
            favoriteTeam: user.favorite_team || null,
            isPrivate: user.is_private || false,
        };

        if (isOwner) {
            response.email = user.email;
            response.showBets = user.show_bets !== false;
            response.showStats = user.show_stats !== false;
            response.seasonPoints = user.season_points || 0;
        } else {
            if (user.show_stats !== false) {
                response.showStats = true;
            }
            if (user.show_bets !== false) {
                response.showBets = true;
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// PUT /api/users/:id — actualizar perfil (sin avatar por URL arbitraria)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (req.user.id !== id) return res.status(403).json({ error: 'No puedes modificar el perfil de otro usuario' });

        const result = updateProfileSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Datos inválidos', details: result.error.format() });
        }

        const { username, bio, favoriteTeam, isPrivate, showBets, showStats } = result.data;

        // Validar que el equipo favorito existe
        if (favoriteTeam) {
            const teamCheck = await db.query('SELECT name FROM teams WHERE name = $1', [favoriteTeam]);
            if (teamCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Equipo no encontrado' });
            }
        }

        await db.query(
            `UPDATE users SET
                username = COALESCE($1, username),
                bio = COALESCE($2, bio),
                favorite_team = COALESCE($3, favorite_team),
                is_private = COALESCE($4, is_private),
                show_bets = COALESCE($5, show_bets),
                show_stats = COALESCE($6, show_stats)
            WHERE id = $7`,
            [username ?? null, bio ?? null, favoriteTeam ?? null, isPrivate ?? null, showBets ?? null, showStats ?? null, id]
        );

        const sim = req.app.get('sim');
        if (sim && username) {
            const idx = sim.db.users.findIndex(u => u.id === id);
            if (idx !== -1) sim.db.users[idx].username = username;
        }

        const updatedRes = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        const u = updatedRes.rows[0];
        res.json({ id: u.id, username: u.username, email: u.email, points: u.points, avatar: u.avatar, bio: u.bio, favoriteTeam: u.favorite_team });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// POST /api/users/:id/avatar — subir foto de perfil a Supabase Storage
router.post('/:id/avatar', authenticateToken, limiteAvatar, upload.single('avatar'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (req.user.id !== id) return res.status(403).json({ error: 'No puedes cambiar el avatar de otro usuario' });
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

        // Validar magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46)
        const buf = req.file.buffer;
        const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
        const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
        const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
        if (!isJpeg && !isPng && !isWebp) {
            return res.status(400).json({ error: 'El archivo no es una imagen válida' });
        }

        const avatarUrl = await uploadAvatar(id, req.file.buffer, req.file.mimetype);

        await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarUrl, id]);

        const sim = req.app.get('sim');
        if (sim) {
            const idx = sim.db.users.findIndex(u => u.id === id);
            if (idx !== -1) sim.db.users[idx].avatar = avatarUrl;
        }

        res.json({ avatar: avatarUrl });
    } catch (error) {
        console.error('Error al subir avatar:', error);
        res.status(500).json({ error: 'Error al subir avatar' });
    }
});

// GET /api/users/:id/stats — estadísticas del usuario
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const isOwner = req.user.id === id;

        if (!isOwner) {
            const userRes = await db.query('SELECT show_stats, is_private FROM users WHERE id = $1', [id]);
            const u = userRes.rows[0];
            if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
            if (u.is_private || u.show_stats === false) {
                return res.status(403).json({ error: 'Este usuario ha ocultado sus estadísticas' });
            }
        }

        // Estadísticas agregadas en SQL
        const statsRes = await db.query(`
            SELECT
                COUNT(b.id) AS total_bets,
                COUNT(CASE WHEN b.home_score = m.home_score AND b.away_score = m.away_score AND m.status = 'finished' THEN 1 END) AS exact_hits,
                COUNT(CASE WHEN m.status = 'finished' AND b.points_earned > 0 THEN 1 END) AS winner_hits,
                COUNT(CASE WHEN m.status = 'finished' AND b.points_earned = 0 THEN 1 END) AS misses
            FROM bets b
            JOIN matches m ON m.id = b.match_id
            WHERE b.user_id = $1
        `, [id]);

        const s = statsRes.rows[0];
        const totalBets = parseInt(s.total_bets) || 0;
        const exactHits = parseInt(s.exact_hits) || 0;
        const winnerHits = parseInt(s.winner_hits) || 0;
        const misses = parseInt(s.misses) || 0;
        const winRate = totalBets > 0 ? (winnerHits / totalBets) : 0;

        // Puntos por jornada
        const byJornada = await db.query(`
            SELECT m.jornada, SUM(b.points_earned) AS pts
            FROM bets b
            JOIN matches m ON m.id = b.match_id
            WHERE b.user_id = $1 AND m.status = 'finished'
            GROUP BY m.jornada
            ORDER BY m.jornada ASC
        `, [id]);

        let cumulative = 0;
        const pointsByJornada = byJornada.rows.map(row => {
            cumulative += parseInt(row.pts) || 0;
            return { jornada: row.jornada, points: parseInt(row.pts) || 0, cumulative };
        });

        // Racha actual
        const recentBets = await db.query(`
            SELECT b.points_earned
            FROM bets b
            JOIN matches m ON m.id = b.match_id
            WHERE b.user_id = $1 AND m.status = 'finished'
            ORDER BY m.jornada DESC, m.id DESC
            LIMIT 50
        `, [id]);

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        for (const row of recentBets.rows) {
            if (row.points_earned > 0) {
                tempStreak++;
                if (currentStreak === 0) currentStreak = tempStreak;
            } else {
                if (currentStreak === 0) currentStreak = 0; // ya falló
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 0;
            }
        }
        bestStreak = Math.max(bestStreak, tempStreak);

        res.json({
            totalBets, exactHits, winnerHits, winRate,
            currentStreak, bestStreak,
            pointsByJornada,
            resultDistribution: { exact: exactHits, winner: winnerHits - exactHits, miss: misses }
        });
    } catch (error) {
        console.error('Error en stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// GET /api/users/:id/bets/public — últimas apuestas públicas (solo partidos finalizados)
router.get('/:id/bets/public', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (req.user.id !== id) {
            const userRes = await db.query('SELECT show_bets, is_private FROM users WHERE id = $1', [id]);
            const u = userRes.rows[0];
            if (!u || u.is_private || u.show_bets === false) {
                return res.status(403).json({ error: 'Apuestas no públicas' });
            }
        }
        const result = await db.query(`
            SELECT b.*, m.home_team, m.away_team, m.home_score AS real_home, m.away_score AS real_away, m.jornada
            FROM bets b
            JOIN matches m ON m.id = b.match_id
            WHERE b.user_id = $1 AND m.status = 'finished'
            ORDER BY m.jornada DESC LIMIT 10
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener apuestas públicas' });
    }
});

module.exports = router;
