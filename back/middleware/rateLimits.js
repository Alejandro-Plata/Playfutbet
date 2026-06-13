const rateLimit = require('express-rate-limit');

const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' },
});

const limiteAvatar = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas subidas de avatar. Espera un momento.' },
});

const limiteChat = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados mensajes. Espera un momento.' },
});

const limiteConv = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados mensajes. Espera un momento.' },
});

const limiteGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
});

module.exports = { limiteAuth, limiteAvatar, limiteChat, limiteConv, limiteGeneral };
