require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const SimulationEngine = require('./simulation');
const { limiteGeneral } = require('./middleware/rateLimits');

const app = express();
app.set('trust proxy', 1);

// --- SEGURIDAD ---
app.use(helmet());

const ORIGENES_PERMITIDOS = [
    process.env.FRONTEND_URL,
    'https://playfutbet.vercel.app',
    'http://localhost:8100',
    'http://localhost:4200',
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
].filter(Boolean).map(u => u.replace(/\/+$/, ''));

const REGEX_VERCEL_PREVIEW = /^https:\/\/playfutbet[a-z0-9-]*\.vercel\.app$/;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const limpio = origin.replace(/\/+$/, '');
        if (ORIGENES_PERMITIDOS.includes(limpio) || REGEX_VERCEL_PREVIEW.test(limpio)) {
            return callback(null, true);
        }
        callback(null, false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(limiteGeneral);

// --- LOGGING ---
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

// --- SWAGGER ---
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'PlayFutBet API',
            version: '2.0.0',
            description: 'API para la aplicación de predicciones de fútbol PlayFutBet',
        },
        servers: [
            { url: 'http://localhost:3000' },
            { url: 'https://playfutbet-back.onrender.com' }
        ],
    },
    apis: [path.join(__dirname, 'index.js'), path.join(__dirname, 'swagger-docs.js')],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
const swaggerUiOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js'
    ]
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));

// --- MOTOR DE SIMULACIÓN ---
const sim = new SimulationEngine(null, null);
app.set('sim', sim);

sim.initialized
    .then(() => console.log('✅ Simulación inicializada'))
    .catch(err => console.error('⚠️ Error inicializando simulación:', err));

// --- MIDDLEWARE: esperar inicialización ---
async function awaitInit(req, res, next) {
    try {
        await sim.initialized;
        next();
    } catch (err) {
        try {
            sim.initialized = sim.init();
            await sim.initialized;
            next();
        } catch (err2) {
            res.status(503).json({ error: 'Servicio inicializándose, reintente', details: err2.message });
        }
    }
}
app.use('/api', awaitInit);

// --- RUTAS ---
app.use('/api', require('./rutas/auth'));
app.use('/api/users', require('./rutas/users'));
app.use('/api', require('./rutas/matches'));
app.use('/api/bets', require('./rutas/bets'));
app.use('/api/messages', require('./rutas/messages'));
app.use('/api/notifications', require('./rutas/notifications'));
app.use('/api/conversations', require('./rutas/conversations'));

// --- HEALTH CHECK ---
app.get('/', (_, res) => res.send('PlayFutBet API v2 running'));

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    // Error de multer (tamaño/tipo de archivo)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el límite de 2 MB' });
    }
    if (err.message && err.message.includes('Tipo de archivo')) {
        return res.status(400).json({ error: err.message });
    }
    console.error(`[Error] ${new Date().toISOString()}:`, err);
    res.status(err.status || 500).json({
        error: 'Error interno',
        message: process.env.NODE_ENV === 'production' ? 'Algo salió mal' : err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 PlayFutBet API corriendo en http://localhost:${PORT}`));
