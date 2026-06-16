const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db');
const { limiteAuth } = require('../middleware/rateLimits');

const SECRET_KEY = process.env.JWT_SECRET;
// trim + quitar comillas accidentales: errores comunes al pegar la variable en Render
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');

const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[a-zA-Z]/, 'La contraseña debe contener al menos una letra')
        .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});

// POST /api/register
router.post('/register', limiteAuth, async (req, res) => {
    try {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Datos de registro inválidos', details: result.error.format() });
        }

        const { username, email, password } = result.data;

        const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(username)}`;

        const newUserRes = await db.query(
            'INSERT INTO users (username, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING id, username, email, points, avatar',
            [username, email, hashedPassword, avatarUrl]
        );

        const newUser = newUserRes.rows[0];
        const sim = req.app.get('sim');
        if (sim) sim.db.users.push({ ...newUser, password: hashedPassword });

        const token = jwt.sign({ id: newUser.id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email, points: newUser.points, avatar: newUser.avatar } });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// POST /api/login
router.post('/login', limiteAuth, async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Cuenta solo-Google: sin contraseña en BD
        if (!user.password) {
            return res.status(401).json({ error: 'Esta cuenta usa Google para iniciar sesión' });
        }

        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, points: user.points, avatar: user.avatar }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// POST /api/auth/google  — verifica el idToken de Google Identity Services
router.post('/auth/google', limiteAuth, async (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(503).json({ error: 'Login con Google no configurado' });
    }
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ error: 'idToken requerido' });

        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();

        if (!payload.email_verified) {
            return res.status(401).json({ error: 'Email de Google no verificado' });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Buscar por google_id primero
        let userRes = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
        let user = userRes.rows[0];

        if (!user) {
            // Vincular si existe cuenta con mismo email verificado
            userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            user = userRes.rows[0];

            if (user) {
                await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
                user.google_id = googleId;
            } else {
                // Crear cuenta nueva
                let username = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'user';
                const existCheck = await db.query('SELECT id FROM users WHERE username = $1', [username]);
                if (existCheck.rows.length > 0) username = username + Math.floor(Math.random() * 9000 + 1000);

                const newRes = await db.query(
                    'INSERT INTO users (username, email, avatar, google_id) VALUES ($1, $2, $3, $4) RETURNING *',
                    [username, email, picture || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(username)}`, googleId]
                );
                user = newRes.rows[0];
                const sim = req.app.get('sim');
                if (sim) sim.db.users.push(user);
            }
        }

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, points: user.points || 0, avatar: user.avatar }
        });
    } catch (error) {
        // error.message de google-auth-library es descriptivo, p.ej.:
        // "Wrong recipient, payload audience != requiredAudience" → el Client ID
        // del front no coincide con GOOGLE_CLIENT_ID del backend.
        console.error('Error en auth/google:', error.message);
        res.status(401).json({ error: 'Token de Google inválido', details: error.message });
    }
});

module.exports = router;
