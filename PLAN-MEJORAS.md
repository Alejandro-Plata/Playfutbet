# Plan de mejoras — PlayFutBet

> Estado: **pendiente de implementación**
> Objetivo: convertir PlayFutBet en una app realmente utilizable y competitiva: fotos de perfil
> reales (Supabase Storage), perfil público/privado configurable, estadísticas y competición con
> Chart.js, ciclo de temporadas con avisos, refuerzos de seguridad y login con Google.

**Stack actual (verificado en el código):**
- `front/`: Ionic 8 + Angular 20 standalone, Capacitor 8, sin librería de gráficas.
- `back/`: Express 5 + `pg` directo (sin ORM), monolito en `index.js` (~440 líneas),
  motor de simulación en `simulation.js`, esquema en `init-db.js`. JWT + bcrypt + Zod.
- Despliegue: front en Vercel, back en Render, BD PostgreSQL en Neon.

**Bugs preexistentes detectados (se corrigen dentro del plan):**
1. `front/src/app/services/notification.service.ts` llama a `GET /api/notifications/user/:id`
   y `DELETE /api/notifications/:id`, pero **esos endpoints no existen** en `back/index.js`.
   La campana de notificaciones está rota contra producción. → Se arregla en F4.
2. `jwt.sign({ id }, SECRET_KEY)` se firma **sin `expiresIn`**: los tokens no caducan nunca. → F5.
3. Al llegar a la jornada 38 la simulación se detiene para siempre (`advanceJornada` solo avanza
   `if (currentJornada < 38)`): la app "muere" al acabar la liga. → F4.

---

## F0 — Prerequisito: modularizar el backend (esfuerzo: bajo)

Este plan añade ~18 endpoints. Meterlos en `index.js` lo haría inmantenible.

**Reestructura mínima (sin cambiar lógica):**

```
back/
├── index.js              # solo bootstrap: app, middlewares globales, mounting de rutas
├── middleware/
│   ├── auth.js           # authenticateToken (extraído de index.js)
│   └── rateLimits.js     # limiteAuth + nuevos limiters
├── rutas/
│   ├── auth.js           # /api/register, /api/login (+ /api/auth/google en F6)
│   ├── users.js          # /api/users/*, /api/leaderboard
│   ├── matches.js        # /api/matches/*, /api/league/*, /api/players/*, /api/simulation/*
│   ├── bets.js           # /api/bets/*
│   ├── messages.js       # /api/messages/*
│   └── notifications.js  # nuevo (F4)
└── migrate.js            # nuevo: ALTER TABLE idempotentes (ver más abajo)
```

**`migrate.js`**: el esquema actual se crea con `init-db.js` una sola vez. Las fases siguientes
necesitan columnas nuevas → script de migración idempotente (`ALTER TABLE ... ADD COLUMN IF NOT
EXISTS`) que se ejecuta manualmente contra Neon antes de cada deploy que lo requiera.

### Criterio de aceptación
La API responde idéntico a antes (mismo contrato), Swagger sigue funcionando, y `index.js` queda
por debajo de ~100 líneas.

---

## F1 — Supabase Storage: fotos de perfil

> 🔐 **Regla de oro**: la `service_role` key de Supabase **solo vive en el backend**
> (`back/.env` local y variables de entorno de Render). **Nunca** en el frontend ni en el bundle.

### Infraestructura
1. Crear bucket `playfutbet` en Supabase Storage, **público en lectura**.
2. Variables de entorno nuevas en `back/.env` y Render:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=playfutbet`.

### Backend (`rutas/users.js` + nuevo `servicios/storage.js`)
- Dependencias: `@supabase/supabase-js`, `multer` (memoria, sin disco — compatible con Render).
- Nuevo endpoint:

  ```
  POST /api/users/:id/avatar   (authenticateToken + multer.single('avatar'))
  ```

  - Verifica `req.user.id === :id`.
  - Validación estricta: MIME real (`image/jpeg|png|webp`, comprobar magic bytes, no solo
    extensión), tamaño máx. **2 MB**, rate limit propio (5/15min).
  - Sube a `avatars/${userId}.webp` con `upsert: true`. Ruta **derivada del userId del token**,
    jamás del body (evita path traversal / sobrescribir avatares ajenos).
  - Guarda en BD la URL pública + query de cache-busting: `...?v=<timestamp>`.
  - Respuesta: `{ avatar: url }`.
- Endurecer `PUT /api/users/:id`: **dejar de aceptar `avatar` arbitrario en el body**
  (hoy cualquier string entra directo a la BD y se renderiza como `src` en el front).
  El avatar solo cambia por el endpoint de subida. Los usuarios existentes con DiceBear
  siguen funcionando (la columna no cambia).

### Frontend
- `user.service.ts`: método `uploadAvatar(userId, file): Promise<{avatar: string}>` con
  `FormData` (el interceptor JWT ya añade el header; no fijar `Content-Type` manualmente).
- `profile.component`: overlay de cámara sobre el avatar → `<input type="file" accept="image/*">`.
  En móvil Capacitor el input nativo ya ofrece cámara/galería (no hace falta plugin).
  Preview local con `URL.createObjectURL` mientras sube + spinner + toast de éxito/error
  (reutilizar `NotificationService.showAlert`).

### Criterio de aceptación
Subo una foto desde web y desde Android, se ve inmediatamente en perfil, ranking y chat;
un usuario no puede sobrescribir el avatar de otro; un `.exe` renombrado a `.jpg` se rechaza.

---

## F2 — Perfil público y privado configurable

### Migración (en `migrate.js`)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_team TEXT REFERENCES teams(name);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_bets BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_stats BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
```

### Backend
- `GET /api/users/:id` (ya existe) — ampliar respuesta y aplicar privacidad:
  - **Dueño** (`req.user.id === id`): todo, incluido `email` y los flags de configuración.
  - **Otro usuario**: si `is_private` → solo `{ id, username, avatar, isPrivate: true }`.
    Si público → perfil completo menos email, filtrando `bets/stats` según `show_bets`/`show_stats`.
- `PUT /api/users/:id` — ampliar con Zod:

  ```js
  const updateProfileSchema = z.object({
      username: z.string().min(3).max(20).optional(),
      bio: z.string().max(280).optional(),
      favoriteTeam: z.string().optional(),   // validar contra tabla teams
      isPrivate: z.boolean().optional(),
      showBets: z.boolean().optional(),
      showStats: z.boolean().optional(),
  });
  ```

- Nuevo `GET /api/users/:id/bets/public`: últimas 10 apuestas **de partidos finalizados**
  (nunca pronósticos de partidos pendientes — evita copiar apuestas ajenas), solo si el
  perfil lo permite.

### Frontend
- **`profile.component` (perfil propio)**: añadir sección "Editar perfil" (username, bio,
  selector de equipo favorito con escudos de `team-logos.ts`) y sección "Privacidad" con
  3 toggles (`ion-toggle`): perfil privado / mostrar apuestas / mostrar estadísticas.
- **Nueva página `pages/dashboard/public-profile/`** (ruta `/dashboard/user/:id`):
  avatar, username, bio, escudo del equipo favorito, puntos, rank, racha; sección de
  últimas apuestas y stats según privacidad. Estado "perfil privado" con candado.
- **Ranking clicable**: en `ranking.component`, cada fila navega a `/dashboard/user/:id`.
  Igual con el autor de cada mensaje del chat de partido.
- `types.ts`: ampliar `User` y `UserProfile` con los campos nuevos.

### Criterio de aceptación
Con el perfil en privado, otro usuario solo ve username+avatar; los toggles persisten tras
relogin; desde el ranking puedo abrir el perfil de cualquier usuario.

---

## F3 — Competición y estadísticas con Chart.js

### Dependencias frontend
`chart.js` + `ng2-charts` (directiva `baseChartDirective` standalone, compatible Angular 20).

### Datos: el backend hoy no guarda histórico → crearlo

1. Migración:

   ```sql
   CREATE TABLE IF NOT EXISTS standings_history (
       id SERIAL PRIMARY KEY,
       season INTEGER NOT NULL DEFAULT 1,
       jornada INTEGER NOT NULL,
       team_name TEXT REFERENCES teams(name),
       position INTEGER, pts INTEGER, gf INTEGER, gc INTEGER,
       UNIQUE(season, jornada, team_name)
   );
   ```

2. En `simulation.js > advanceJornada()`: antes de incrementar `currentJornada`, volcar el
   snapshot de `getStandings()` a `standings_history` (20 filas por jornada, INSERT en bulk
   como ya se hace con matches).

### Endpoints nuevos
- `GET /api/users/:id/stats` → estadísticas agregadas calculadas en SQL (no en el front):

  ```json
  {
    "totalBets": 42, "exactHits": 7, "winnerHits": 15, "winRate": 0.52,
    "currentStreak": 3, "bestStreak": 6,
    "pointsByJornada": [{ "jornada": 1, "points": 10, "cumulative": 10 }, ...],
    "resultDistribution": { "exact": 7, "winner": 15, "miss": 20 }
  }
  ```

  (JOIN `bets` × `matches` agrupado por `jornada`; respeta `show_stats` si no es el dueño.)
- `GET /api/league/standings-history?team=X` → evolución de posición/puntos por jornada.

### Gráficas
| Dónde | Gráfica | Tipo Chart.js |
|---|---|---|
| Perfil propio y público | Evolución de puntos acumulados por jornada | `line` (área rellena) |
| Perfil propio y público | Exactas / acertado ganador / falladas | `doughnut` |
| `classification.component` | Evolución de posición de un equipo (selector) | `line` con eje Y invertido |
| `team-detail.component` | Puntos por jornada del equipo + GF/GC | `bar` apiladas |
| `panel.component` | Mini-sparkline de la racha del usuario | `line` minimal sin ejes |

- Crear `components/stat-chart/` reutilizable (recibe config tipada, aplica el tema de la app
  vía variables CSS de `theme/variables.scss`, responsive, `maintainAspectRatio: false`).
- Top goleadores (`/api/players/top-scorers`, ya existe): pasar de lista a `bar` horizontal
  con avatar + goles.

### Criterio de aceptación
Las 5 gráficas renderizan con datos reales de Neon, se adaptan a móvil (Capacitor) y los
colores respetan el tema; un usuario con 0 apuestas ve estados vacíos, no gráficas rotas.

---

## F4 — Ciclo de temporadas + sistema de avisos

### 4a. Arreglar las notificaciones (bug preexistente)

Backend `rutas/notifications.js` — crear los endpoints que el front **ya consume**:

```
GET    /api/notifications/user/:userId   (authenticateToken, solo las propias, máx 50)
DELETE /api/notifications/:id            (authenticateToken, solo si user_id = req.user.id)
```

Añadir columna `read BOOLEAN DEFAULT FALSE` + `PATCH /api/notifications/:id/read`, y badge
de no-leídas en la campana del dashboard.

### 4b. Temporadas que se renuevan

Hoy la liga acaba en la jornada 38 y todo se congela. Cambios en `simulation.js`:

1. `state` pasa a incluir `season` (nº de temporada) y `seasonEndAt` / `nextSeasonStart`.
2. Al terminar la jornada 38 (`advanceJornada`):
   - Estado `state.offSeason = true`, `nextSeasonStart = Date.now() + DESCANSO`
     (`DESCANSO` configurable, p. ej. 24 h reales).
   - **Notificación a todos los usuarios**: campeón, posición final del usuario en el ranking
     y fecha de inicio de la nueva temporada.
3. En `tick()`: si `offSeason && now >= nextSeasonStart` → `startNewSeason()`:
   - Archivar clasificación final en `standings_history` (con su nº de `season`).
   - Resetear `teams` (pj/pg/pe/pp/gf/gc/pts → 0), borrar `matches` y regenerar calendario
     (`generateSchedule()` ya existe), `season++`.
   - **Decisión de producto**: los puntos de usuario **se conservan** (ranking histórico) y se
     añade columna `users.season_points` que sí se resetea → ranking con pestañas
     "Temporada" / "Histórico" en `ranking.component`.
   - Notificación "¡Nueva temporada!" a todos.

### 4c. Avisos de nueva temporada en el frontend

- `GET /api/simulation/state` (ya existe) ahora expone `season`, `offSeason`, `nextSeasonStart`.
- Banner persistente en `panel.component` durante el descanso: **cuenta atrás en vivo**
  ("La temporada 3 comienza en 17 h 32 m") con un `interval` de RxJS.
- Aviso previo: cuando `currentJornada === 38`, notificación "Última jornada — la temporada
  termina pronto".
- (Opcional, solo móvil) `@capacitor/local-notifications`: programar notificación local con la
  fecha de `nextSeasonStart` al abrir la app durante el descanso.

### Criterio de aceptación
La campana funciona (listar/borrar/badge); al acabar la jornada 38 la app entra en descanso con
cuenta atrás visible; pasado el plazo arranca sola la temporada N+1 con calendario nuevo y los
rankings de temporada a cero; todo sobrevive a un cold start de Render (catch-up).

---

## F5 — Refuerzos de seguridad

Orden interno: primero lo que rompe contratos (expiración de token), después lo aditivo.

1. **Expiración de JWT**: `jwt.sign({ id }, SECRET_KEY, { expiresIn: '7d' })` en login,
   registro y Google. En el front, `auth.interceptor.ts`: ante un `401/403` → limpiar
   Preferences y redirigir a `/login` (hoy un token muerto deja la app en estado zombi).
2. **Política de contraseñas**: `registerSchema` de `z.string().min(4)` →
   `min(8)` + al menos una letra y un número. Mensaje claro en `register.component`
   con indicador de fortaleza.
3. **Helmet**: `app.use(helmet())` (API pura, sin CSP de HTML; excluir `/api-docs`
   si interfiere con Swagger UI).
4. **CORS con whitelist**: sustituir `app.use(cors())` por lista de orígenes
   (`FRONTEND_URL` de Render + `http://localhost:8100` + `capacitor://localhost` y
   `https://localhost` para los WebView de Capacitor en Android/iOS).
5. **Rate limiting ampliado**: además del de auth (ya existe), limiter general
   (300 req/15min/IP) y específicos para subida de avatar (5/15min) y chat (20 msg/min)
   — el chat hoy no tiene ningún freno y es spameable.
6. **Sanitización del chat**: `text: z.string().trim().min(1).max(280)` en
   `POST /api/messages`. (Angular ya escapa HTML al interpolar; el límite evita payloads
   gigantes.)
7. **No filtrar detalles internos**: en el handler global de errores y en `details` de Zod,
   devolver mensajes genéricos cuando `NODE_ENV === 'production'` (parcialmente hecho).
8. **Cierre del vector avatar**: ya cubierto en F1 (el body de `PUT /users/:id` deja de
   aceptar URLs arbitrarias).

### Criterio de aceptación
Un token de hace 8 días devuelve 403 y el front redirige a login; un origen no listado no pasa
CORS; 25 mensajes de chat en un minuto devuelven 429; el registro rechaza "1234".

---

## F6 — Login con Google

### Backend
- Dependencia: `google-auth-library`. Variable nueva: `GOOGLE_CLIENT_ID` (en `back/.env`,
  Render y también en el front — el client ID **no es secreto**; el client secret no se usa
  en este flujo).
- Migración:

  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
  ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
  ```

- Nuevo `POST /api/auth/google` (con `limiteAuth`): recibe `{ idToken }`, lo verifica con
  `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })` y:
  - Si existe usuario con ese `google_id` → login.
  - Si existe usuario con ese **email verificado** (`payload.email_verified === true`)
    → vincular `google_id` y login.
  - Si no existe → crear usuario (username del `payload.name` desambiguado, avatar de
    `payload.picture`, `password = NULL`).
  - Devuelve `{ token, user }` con el mismo formato que `/api/login`.
- Guardia en `/api/login` clásico: si `user.password IS NULL` → 401 con
  "Esta cuenta usa Google para iniciar sesión".

### Frontend
- **Web**: Google Identity Services (`https://accounts.google.com/gsi/client`) con
  `renderButton` en `login.component` y `register.component`; el callback recibe el
  `credential` (idToken) → `authService.loginWithGoogle(idToken)` → mismo flujo de
  Preferences/redirect que el login normal.
- **Móvil (Capacitor)**: GIS no funciona en WebView → plugin `@capgo/capacitor-social-login`
  (mantenido, Capacitor 8). Mismo endpoint del backend: en ambas plataformas el back solo
  ve un idToken de Google. Requiere configurar OAuth Client IDs (Web + Android con SHA-1)
  en Google Cloud Console.
- `auth-service.ts`: método `loginWithGoogle()` que abstrae plataforma
  (`Capacitor.isNativePlatform()`).

### Criterio de aceptación
Login con Google funciona en web y Android; una cuenta registrada por email puede entrar
también con Google (mismo email) sin duplicarse; una cuenta solo-Google no puede entrar
por el formulario clásico.

---

## Orden de implementación y dependencias

| # | Fase | Esfuerzo | Riesgo | Depende de |
|---|------|----------|--------|------------|
| 1 | F0 Modularizar backend + `migrate.js` | Bajo | Bajo | — |
| 2 | F5 Seguridad | Bajo | Medio (expiración rompe sesiones vivas) | F0 |
| 3 | F1 Supabase Storage (avatares) | Medio | Bajo | F0 |
| 4 | F2 Perfil público/privado | Medio | Bajo | F0, F1 |
| 5 | F4 Temporadas + avisos | Medio-alto | Medio (toca el motor de simulación) | F0 |
| 6 | F3 Chart.js | Medio | Bajo | F2 (perfil), F4 (`standings_history`) |
| 7 | F6 Login con Google | Medio | Medio (config OAuth móvil) | F5 |

F5 va pronto porque endurece la base sobre la que se construye todo lo demás. F3 va después
de F4 porque la gráfica de evolución de la clasificación necesita `standings_history`.

## Variables de entorno nuevas (resumen)

| Variable | Dónde | Secreta |
|---|---|---|
| `SUPABASE_URL` | back/.env + Render | No |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo** back/.env + Render | **Sí** |
| `SUPABASE_BUCKET` | back/.env + Render | No |
| `FRONTEND_URL` | back/.env + Render (CORS) | No |
| `GOOGLE_CLIENT_ID` | back + front (no es secreto) | No |

## Verificación final

- Backend: arranque limpio en Render, Swagger actualizado con los endpoints nuevos,
  `migrate.js` idempotente (ejecutable dos veces sin error) contra Neon.
- Frontend: `ng build` limpio, prueba manual en web + `npx cap run android`.
- E2E manual: registro → subir avatar → configurar privacidad → apostar → ver gráficas →
  fin de temporada simulado (reducir `DESCANSO` en local) → nueva temporada → login con Google.
