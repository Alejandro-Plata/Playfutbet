/**
 * migrate.js — Migraciones idempotentes sobre el esquema existente.
 * Ejecutar manualmente contra Neon antes de cada deploy que añada columnas:
 *   node migrate.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Conectando a PostgreSQL...');

        // F2: perfil público/privado
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_team TEXT`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_bets BOOLEAN DEFAULT TRUE`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_stats BOOLEAN DEFAULT TRUE`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
        console.log('✓ F2: columnas de perfil añadidas');

        // F4: notificaciones — columna read
        await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE`);
        console.log('✓ F4: columna read en notifications');

        // F4: temporadas — season_points en users
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS season_points INTEGER DEFAULT 0`);
        console.log('✓ F4: columna season_points en users');

        // F3: historial de clasificación
        await client.query(`
            CREATE TABLE IF NOT EXISTS standings_history (
                id SERIAL PRIMARY KEY,
                season INTEGER NOT NULL DEFAULT 1,
                jornada INTEGER NOT NULL,
                team_name TEXT REFERENCES teams(name),
                position INTEGER,
                pts INTEGER,
                gf INTEGER,
                gc INTEGER,
                UNIQUE(season, jornada, team_name)
            )
        `);
        console.log('✓ F3: tabla standings_history creada');

        // F6: login con Google
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`);
        await client.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
        console.log('✓ F6: columna google_id y password nullable');

        console.log('\n✅ Todas las migraciones completadas con éxito.');
    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
