# ⚽ PlayFutBet

Aplicación **móvil multiplataforma** de **predicciones de fútbol**: los usuarios pronostican
resultados, se simulan partidos y se gestionan plantillas de equipos. Cuenta con una **API REST
propia** documentada con Swagger.

🌐 **[Demo desplegada](https://playfutbet-r.vercel.app/login)**

## ✨ Características

- 🔮 Predicciones de resultados de partidos.
- 🎮 Simulación de partidos y actualización de plantillas.
- 🔐 Autenticación con **JWT** y contraseñas cifradas con bcrypt.
- 📱 App móvil con **Capacitor** (Android / iOS) además de web.
- 📖 API documentada con **Swagger**.

## 🛠️ Stack

**Frontend (`/front`)**
- Ionic 8 + Angular 20 · TypeScript
- Capacitor (App, Haptics, Keyboard, Preferences, Status Bar)
- Ionicons · RxJS

**Backend (`/back`)**
- Node.js · Express 5
- PostgreSQL (`pg`)
- JWT · bcryptjs · Zod (validación)
- Swagger (swagger-jsdoc + swagger-ui-express)

## 📁 Estructura

```
PlayFutBet/
├── front/                  # App Ionic + Angular
│   └── src/app/
│       ├── components/  layouts/  pages/
│       ├── services/    types/    utils/
├── back/                   # API Node + Express
│   ├── index.js            # Punto de entrada
│   ├── db.js               # Conexión PostgreSQL
│   ├── init-db.js          # Inicialización de BD
│   ├── simulation.js       # Lógica de simulación
│   ├── swagger-docs.js     # Documentación API
│   └── vercel.json         # Config de despliegue
└── README.md
```

## ▶️ Arranque rápido (local)

```bash
# Backend
cd back
npm install
cp .env.example .env     # configura DB y JWT
node init-db.js          # inicializa la base de datos
npm start

# Frontend
cd ../front
npm install
ionic serve              # o: npm start
```

### Compilar para móvil (Capacitor)

```bash
cd front
ionic build
npx cap sync
npx cap open android     # abre en Android Studio
```

## ✅ Requisitos

- Node.js v20+
- PostgreSQL
- Ionic CLI (`npm i -g @ionic/cli`)
- Android Studio (solo para build móvil)

> ⚠️ Configura las variables de entorno (`.env`) del backend. **No subas tu `.env` real** (contiene
> credenciales de BD y la clave JWT).
