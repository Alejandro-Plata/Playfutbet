# PlayFutBet

Aplicacion full-stack de **predicciones de futbol** que simula una temporada completa de La Liga
(38 jornadas, 20 equipos). Los usuarios predicen resultados de partidos y acumulan puntos segun
la precision de sus apuestas.

## Caracteristicas

**Sistema de apuestas**
- Prediccion de resultados exactos (goles local vs visitante).
- Puntuacion: 10 puntos por resultado exacto, 5 puntos por acertar ganador/empate.
- Historial de apuestas con seguimiento de aciertos.

**Simulacion de liga**
- Temporada completa con 380 partidos (doble vuelta).
- Progresion de partidos en tiempo real con eventos minuto a minuto.
- Generacion probabilistica de goles y tarjetas basada en la fuerza del equipo.
- Avance automatico de jornadas con periodos de descanso entre temporadas.
- Recuperacion ante caidas del servidor (catch-up de jornadas perdidas).

**Clasificacion y estadisticas**
- Tabla de clasificacion con puntos, goles a favor/en contra, victorias/empates/derrotas.
- Estadisticas de jugadores (goles, tarjetas amarillas/rojas).
- Ranking de maximos goleadores.

**Social**
- Leaderboard global y por temporada.
- Perfiles de usuario con avatar, bio y equipo favorito.
- Mensajeria privada entre usuarios.
- Chat en vivo durante los partidos.

**Notificaciones**
- Apuesta ganada.
- Hitos de temporada.
- Ranking final al acabar la temporada.

## Stack

**Frontend**
- Angular 20 · Ionic 8 · TypeScript
- Capacitor 8 (plataformas moviles)
- Chart.js (visualizacion de datos)
- RxJS (programacion reactiva)

**Backend**
- Express 5 · Node.js · JavaScript
- PostgreSQL (pg)
- JWT (autenticacion)
- Zod (validacion de entrada)
- Helmet + CORS + Rate Limiting (seguridad)
- Multer (subida de avatares via Supabase)
- Swagger/OpenAPI (documentacion de API)

## Estructura

```
PlayFutBet/
├── front/                         # Cliente Ionic + Angular
│   ├── src/
│   │   └── app/
│   │       ├── pages/             # Paginas principales
│   │       │   ├── auth/          # Login y registro
│   │       │   ├── panel/         # Dashboard con jornada actual
│   │       │   ├── historial/     # Historial de partidos y apuestas
│   │       │   ├── classification/# Tabla de clasificacion
│   │       │   ├── ranking/       # Leaderboard de usuarios
│   │       │   ├── profile/       # Perfil de usuario
│   │       │   ├── match-detail/  # Detalle de partido con chat
│   │       │   ├── team-detail/   # Plantilla y estadisticas del equipo
│   │       │   └── messages/      # Conversaciones privadas
│   │       ├── services/          # Clientes HTTP
│   │       ├── guards/            # Guards de autenticacion
│   │       ├── components/        # Componentes reutilizables
│   │       ├── layouts/           # Layout del dashboard
│   │       └── types/             # Interfaces TypeScript
│   ├── capacitor.config.ts
│   └── ionic.config.json
├── back/                          # API Express
│   ├── index.js                   # Servidor Express y configuracion
│   ├── simulation.js              # Motor de simulacion de liga
│   ├── rutas/                     # Rutas (auth, users, matches, bets, messages, notifications)
│   ├── servicios/                 # Utilidades (storage para avatares)
│   ├── middleware/                # Middleware de autenticacion
│   ├── db.js                      # Pool de conexion PostgreSQL
│   ├── swagger-docs.js            # Documentacion API
│   └── vercel.json                # Configuracion de despliegue
└── README.md
```

## API

Las principales rutas de la API son:

| Prefijo | Descripcion |
|---------|-------------|
| `/api/register`, `/api/login` | Autenticacion (JWT) |
| `/api/matches` | Partidos de la jornada actual y detalle |
| `/api/bets` | Crear/consultar predicciones |
| `/api/league/standings` | Clasificacion |
| `/api/league/results/:jornada` | Resultados por jornada |
| `/api/players/top-scorers` | Maximos goleadores |
| `/api/teams/:name/players` | Plantilla del equipo |
| `/api/leaderboard` | Ranking de usuarios |
| `/api/conversations` | Mensajeria privada |
| `/api/messages/:matchId` | Chat de partido |
| `/api/notifications` | Notificaciones del usuario |
| `/api/simulation/state` | Estado actual de la temporada |

La documentacion completa esta disponible en `/api-docs` (Swagger UI).

## Arranque local

```bash
# Backend
cd back
npm install
# Configura las variables de entorno (DB, JWT_SECRET, SUPABASE)
node index.js

# Frontend
cd ../front
npm install
ionic serve
```

## Requisitos

- Node.js v20+
- PostgreSQL
- Ionic CLI (`npm install -g @ionic/cli`)
