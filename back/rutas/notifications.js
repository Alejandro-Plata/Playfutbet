const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications/user/:userId — obtener notificaciones del usuario autenticado
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'No puedes ver las notificaciones de otro usuario' });
        }
        const result = await db.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(result.rows.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.created_at,
        })));
    } catch (error) {
        console.error('Error en getUserNotifications:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// GET /api/notifications/user/:userId/unread-count — badge de no leídas
router.get('/user/:userId/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (req.user.id !== userId) return res.status(403).json({ error: 'Acceso denegado' });
        const result = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE',
            [userId]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener badge' });
    }
});

// PATCH /api/notifications/:id/read — marcar como leída
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.query(
            'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Notificación no encontrada' });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
});

// DELETE /api/notifications/:id — eliminar notificación propia
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Notificación no encontrada' });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error en deleteNotification:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

module.exports = router;
