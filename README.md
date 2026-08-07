# Backend — Proyecto Auth

API backend con **Express + TypeScript**, autenticación con **Better Auth** y persistencia con **Prisma (PostgreSQL)**.

> ⚠️ Versión experimental. 👀

---

## Stack

| Capa      | Tecnología                             |
| --------- | -------------------------------------- |
| Runtime   | Node.js + TypeScript (tsx)             |
| Framework | Express 5                              |
| Auth      | Better Auth (email/password + OAuth GitHub/Google + sesiones) |
| Validación| Zod 4                                  |
| ORM       | Prisma 7 + PostgreSQL                  |
| Sesiones  | Redis 7 (ioredis) — sesiones y códigos de verificación con TTL |
| Tests     | Vitest + Supertest                     |

---

## Requisitos

- Node.js 20+
- pnpm 11+
- PostgreSQL en `localhost:5050` (usuario `postgres`, password `1234`)
- Redis 7 accesible en `localhost:6379` (recomendado: contenedor Docker, ver [Sesiones en Redis](#sesiones-en-redis))

---

## Configuración

1. Clona el repo e instala dependencias:

   ```bash
   pnpm install
   ```

2. Copia `.env.example` a `.env` y ajusta los valores:

   ```bash
   cp .env.example .env
   ```

3. Genera el cliente de Prisma y aplica las migraciones:

   ```bash
   pnpm prisma:generate
   pnpm db:migrate:dev
   ```

4. Siembra roles y usuario administrador (opcional pero recomendado):

   ```bash
   pnpm db:seed
   ```

   - Admin por defecto: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (ver `.env`).

5. Levanta el servidor:

   ```bash
   pnpm dev
   ```

   El server escucha en `http://localhost:3000`.

---

## Variables de entorno

| Variable            | Descripción                              |
| ------------------- | ---------------------------------------- |
| `NODE_ENV`          | `development` \| `production` \| `test`  |
| `PORT`              | Puerto del servidor (default `3000`)     |
| `DATABASE_URL`      | Cadena de conexión de PostgreSQL         |
| `REDIS_URL`         | Cadena de conexión de Redis (default `redis://localhost:6379`) |
| `BETTER_AUTH_SECRET`| Secreto (mín. 32 caracteres)             |
| `BETTER_AUTH_URL`   | URL base de la API                       |
| `CORS_ORIGIN`       | Origen permitido por CORS (default `http://localhost:5173`) |
| `GITHUB_CLIENT_ID`  | Client ID de la OAuth App de GitHub (obligatorio) |
| `GITHUB_CLIENT_SECRET` | Client secret de GitHub (obligatorio)  |
| `GOOGLE_CLIENT_ID`  | Client ID de OAuth 2.0 de Google (obligatorio) |
| `GOOGLE_CLIENT_SECRET` | Client secret de Google (obligatorio)  |
| `ADMIN_EMAIL`       | Email del admin sembrado con `db:seed`   |
| `ADMIN_PASSWORD`    | Password del admin (mín. 8 caracteres)   |

---

## Inicio de sesión con proveedores (OAuth)

Se soporta **GitHub** y **Google**. El flujo lo maneja Better Auth vía su handler HTTP montado en `/api/auth/*` (en `src/app.ts`), mientras que las rutas propias `/api/auth/login|register|logout|profile` conservan su prioridad.

### Crear las apps de OAuth

- **GitHub** → Settings → Developer settings → OAuth Apps → *New OAuth App*
  - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- **Google** → Cloud Console → Credentials → OAuth 2.0 Client IDs
  - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

Rellena `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.

### Endpoints expuestos por Better Auth (además de los propios)

| Método | Ruta                          | Descripción                                    |
| ------ | ----------------------------- | ---------------------------------------------- |
| POST   | `/api/auth/sign-in/social`    | Inicia el flujo OAuth (body: `provider`, `callbackURL`) |
| GET/POST | `/api/auth/callback/:provider`| Callback del proveedor (crea sesión y redirige)|
| GET    | `/api/auth/get-session`       | Devuelve la sesión actual                      |
| GET    | `/api/auth/ok`                | Health check de Better Auth                    |

### Uso desde el frontend

Instala `better-auth` en el frontend y configura el cliente:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  basePath: "/api/auth",
});

// Botón "Continuar con GitHub":
authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
```

El backend expone `trustedOrigins: [CORS_ORIGIN]` para permitir el flujo desde el frontend (origen distinto).

> Nota: un usuario que inicia sesión por OAuth queda vinculado a su cuenta con el `providerId` correspondiente en la tabla `Account`. El segundo inicio de sesión con el mismo proveedor no crea un usuario duplicado.

---

## Sesiones en Redis

Better Auth se configura con `secondaryStorage` (`src/auth/auth.ts`): las **sesiones activas** y los **códigos de verificación** (OAuth, reset de password) viven en **Redis**, no en Postgres. Las tablas `Session`/`Verification` del schema quedan vacías (decisión: no se usan).

- Cada sesión se guarda con **TTL = tiempo de expiración** (`expiresIn` 7 días), así que **Redis las borra solo** al expirar.
- En Postgres solo persisten `User`, `Account` y los roles (`UserRole`).
- El rate limit de Better Auth también usa Redis (`rateLimit.storage: "secondary-storage"`).

### Levantar Redis (recomendado: Docker Desktop)

```bash
docker run -d --name project-auth-redis \
  -p 6379:6379 --restart unless-stopped \
  redis:7-alpine
```

> El `REDIS_URL` no cambia entre una instancia local de Redis y un contenedor que publique el puerto `6379`. Evita usar un Redis dentro de WSL2: al dormirse el distro, el puerto desaparece en Windows (`ECONNREFUSED`).

### Índices por entorno

| Entorno | Índice Redis | Dónde |
| ------- | ------------ | ----- |
| dev     | `/0`         | `.env` |
| test    | `/1`         | `.env.test` (`REDIS_URL="redis://localhost:6379/1"`) |

El `setup.ts` de tests hace `redis.flushdb()` en cada test; al apuntar a `/1` no borra las sesiones de dev.

### Ver las sesiones

- **Redis Insight**: conexión `localhost:6379` → Browser. La key de una sesión es el **token pelado** (valor JSON con `session` + `user`); además hay un índice `active-sessions-<userId>`.
- **CLI**:
  ```bash
  docker exec project-auth-redis redis-cli --scan
  docker exec project-auth-redis redis-cli ttl <token>
  ```

### Nota sobre el seed

`prisma/seed.ts` importa `auth` (y por tanto el cliente de ioredis), que **mantiene vivo el proceso** si no se cierra. El `.finally` cierra Prisma **y** Redis con `redis.disconnect()`; sin eso, `pnpm db:seed` (y el `globalSetup` de tests, que lo llama vía `execSync`) se queda colgado tras imprimir `Seed completado ✅`.

---

## Scripts

| Script                 | Descripción                                  |
| ---------------------- | -------------------------------------------- |
| `pnpm dev`             | Servidor en modo watch                       |
| `pnpm start`           | Inicia el servidor                           |
| `pnpm prisma:generate` | Genera el cliente de Prisma                  |
| `pnpm prisma:validate` | Valida el schema de Prisma                   |
| `pnpm db:migrate:dev`  | Crea/aplica migraciones en dev               |
| `pnpm db:migrate:deploy` | Aplica migraciones (producción/CI)         |
| `pnpm db:seed`         | Siembra roles y admin                        |
| `pnpm db:studio`       | Abre Prisma Studio                           |
| `pnpm test`            | Ejecuta la suite de tests (una vez)          |
| `pnpm test:watch`      | Ejecuta los tests en modo watch              |
| `pnpm test:coverage`   | Ejecuta tests con reporte de cobertura       |
| `pnpm typecheck`       | Type-check con `tsc --noEmit`                |

---

## API

Todas las rutas bajo `/api`.

### Auth (`/api/auth`)

| Método | Ruta        | Descripción        | Auth |
| ------ | ----------- | ------------------ | ---- |
| POST   | `/register` | Registro           | —    |
| POST   | `/login`    | Inicio de sesión   | —    |
| POST   | `/logout`   | Cerrar sesión      | ✔️   |
| GET    | `/profile`  | Perfil del usuario | ✔️   |

### Users (`/api/users`)

| Método | Ruta   | Descripción        | Auth |
| ------ | ------ | ------------------ | ---- |
| GET    | `/me`  | Datos del usuario  | ✔️   |
| PATCH  | `/me`  | Actualizar perfil  | ✔️   |
| DELETE | `/me`  | Eliminar cuenta    | ✔️   |

### Admin (`/api/admin`, rol `admin`)

| Método | Ruta          | Descripción        | Rol  |
| ------ | ------------- | ------------------ | ---- |
| GET    | `/users`      | Listar usuarios    | admin|
| GET    | `/users/:id`  | Ver un usuario     | admin|
| POST   | `/users`      | Crear usuario      | admin|
| PATCH  | `/users/:id`  | Actualizar usuario | admin|
| DELETE | `/users/:id`  | Eliminar usuario   | admin|

> `POST /api/admin/users` recibe `roles` como **nombres** de rol (`["admin"]`, `["user"]`) y los mapea a IDs internamente.

### Posts (`/api/posts`)

| Método | Ruta       | Descripción        | Auth |
| ------ | ---------- | ------------------ | ---- |
| GET    | `/`        | Listar publicados  | —    |
| GET    | `/mine`    | Mis posts (públicos y borradores) | ✔️ |
| GET    | `/:id`     | Ver un post        | —    |
| POST   | `/`        | Crear post         | ✔️   |
| PATCH  | `/:id`     | Editar post (dueño)| ✔️   |
| DELETE | `/:id`     | Eliminar post      | ✔️   |

---

## Tests

### Pila de testing

- **Vitest** como runner.
- **Supertest** para las pruebas de integración sobre la app de Express.
- **@vitest/coverage-v8** para el reporte de cobertura.
- La suite usa una **base de datos aislada** (`project_auth_test`), nunca la de desarrollo.

### Configuración

- Entorno de tests en `.env.test` (ignorado por git) con `DATABASE_URL` apuntando a `project_auth_test`.
- `vitest.config.ts`:
  - Carga `.env.test` e inyecta sus variables en los workers.
  - `globalSetup` (`src/test/global-setup.ts`): crea la BD si no existe, aplica `prisma migrate deploy` y ejecuta el seed (roles + admin).
  - `setup.ts`: limpia las tablas de Postgres y hace `redis.flushdb()` (índice `/1`) entre tests.
  - `fileParallelism: false` → los archivos corren en serie porque comparten BD.
  - El rate limit de Better Auth se desactiva en `NODE_ENV=test` (`src/auth/auth.ts`).

### Estructura

```
src/
├── test/                  # Infraestructura de tests
│   ├── global-setup.ts    # Crea BD de tests + migraciones + seed
│   ├── setup.ts           # Reset entre tests
│   └── helpers.ts         # registerUser, registerAdmin, createPost, etc.
├── __tests__/             # Tests de integración (rutas)
│   ├── auth.routes.test.ts
│   ├── social-auth.routes.test.ts   # OAuth GitHub/Google (mockeando fetch)
│   ├── users.routes.test.ts
│   ├── admin.routes.test.ts
│   └── posts.routes.test.ts
├── utils/__tests__/       # Unit tests (ApiError, getParam, cookies)
└── schemas/__tests__/     # Unit tests de schemas Zod
```

### Cobertura

Los umbrales mínimos están configurados en `vitest.config.ts`:

| Metric      | Umbral |
| ----------- | ------ |
| Lines       | 85%    |
| Statements  | 80%    |
| Functions   | 80%    |
| Branches    | 55%    |

Si la cobertura baja de esos valores, la suite **falla** (ideal para CI). El reporte `coverage/` se genera con `pnpm test:coverage` y está ignorado por git.

### CI

El comando recomendado para pipelines es:

```bash
pnpm install
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm test:coverage
pnpm typecheck
```

> Nota: en CI se debe apuntar `DATABASE_URL` (y `.env.test`) a la BD de tests.

### Troubleshooting

- **`DATABASE_URL required` en tests**: asegúrate de que `.env.test` exista (está ignorado por git).
- **Tests lentos**: el globalSetup aplica migraciones + seed; es normal que la primera corrida tarde.
- **Tests en paralelo corruptos**: los archivos corren en serie (`fileParallelism: false`); no cambies eso mientras los tests compartan BD.
- **Tests colgados tras `Seed completado ✅`**: el seed importa `auth` → ioredis abre un socket que mantiene vivo el proceso. El `.finally` de `prisma/seed.ts` debe llamar `redis.disconnect()` (además de `prisma.$disconnect()`), o el `execSync` del globalSetup no retorna y Vitest nunca arranca los tests.
- **`ECONNREFUSED` hacia Redis en tests**: revisa que el Redis de Docker esté corriendo (`docker ps`). Un Redis en WSL2 puede dejar de responder cuando el distro duerme.
- **Rate limit en tests**: si agregas muchos requests por ventana, revisa que `NODE_ENV=test` para que el rate limit siga desactivado.

---

## Troubleshooting general

- **`prisma generate` falla**: asegúrate de tener `DATABASE_URL` en `.env` (Prisma 7 la lee de `prisma.config.ts`).
- **CORS en desarrollo**: el frontend (Vite) corre en `http://localhost:5173`; verifica `CORS_ORIGIN`.
