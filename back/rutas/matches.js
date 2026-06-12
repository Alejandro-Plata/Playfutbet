const express = require('express');
const router = express.Router();

// GET /api/matches
router.get('/matches', async (req, res) => {
    const sim = req.app.get('sim');
    res.json(sim.matches || []);
});

// GET /api/matches/:id
router.get('/matches/:id', (req, res) => {
    const sim = req.app.get('sim');
    const match = sim.allMatches.find(m => m.id === parseInt(req.params.id));
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json({ ...match, events: match.status === 'pending' ? [] : match.events });
});

// GET /api/league/standings
router.get('/league/standings', async (req, res) => {
    const sim = req.app.get('sim');
    await sim.tick();
    res.json(sim.getStandings());
});

// GET /api/league/results/:jornada
router.get('/league/results/:jornada', async (req, res) => {
    const sim = req.app.get('sim');
    await sim.tick();
    const jornada = parseInt(req.params.jornada);
    res.json(sim.allMatches.filter(m => m.jornada === jornada));
});

// GET /api/league/standings-history
router.get('/league/standings-history', async (req, res) => {
    const db = require('../db');
    try {
        const team = req.query.team;
        let query, params;
        if (team) {
            query = `SELECT jornada, position, pts, gf, gc FROM standings_history WHERE team_name = $1 ORDER BY jornada ASC`;
            params = [team];
        } else {
            query = `SELECT * FROM standings_history ORDER BY jornada ASC, position ASC`;
            params = [];
        }
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial de clasificación' });
    }
});

// GET /api/simulation/state
router.get('/simulation/state', async (req, res) => {
    const sim = req.app.get('sim');
    await sim.tick();
    res.json(sim.state);
});

// GET /api/teams/:teamName/players
router.get('/teams/:teamName/players', (req, res) => {
    const sim = req.app.get('sim');
    const players = sim.db.players.filter(p => p.team_name === req.params.teamName);
    res.json(players);
});

// GET /api/players/top-scorers
router.get('/players/top-scorers', (req, res) => {
    const sim = req.app.get('sim');
    const topScorers = [...sim.db.players]
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 10);
    res.json(topScorers);
});

module.exports = router;
