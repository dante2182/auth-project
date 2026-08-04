# Backend — Proyecto Auth

API backend con **Express + TypeScript**, autenticación con **Better Auth** y persistencia con **Prisma (PostgreSQL)**.

> ⚠️ Versión experimental. 👀

---

## Stack

| Capa      | Tecnología                             |
| --------- | -------------------------------------- |
| Runtime   | Node.js + TypeScript (tsx)             |
| Framework | Express 5                              |
| Auth      | Better Auth (email/password + sesiones)|
| Validación| Zod 4                                  |
| ORM       | Prisma 7 + PostgreSQL                  |
| Tests     | Vitest + Supertest                     |

---

## Requisitos

- Node.js 20+
- pnpm 11+
- PostgreSQL en `localhost:5050` (usuario `postgres`, password `1234`)

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
| `BETTER_AUTH_SECRET`| Secreto (mín. 32 caracteres)             |
| `BETTER_AUTH_URL`   | URL base de la API                       |
| `CORS_ORIGIN`       | Origen permitido por CORS (default `http://localhost:5173`) |
| `ADMIN_EMAIL`       | Email del admin sembrado con `db:seed`   |
| `ADMIN_PASSWORD`    | Password del admin (mín. 8 caracteres)   |

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
  - `setup.ts`: limpia las tablas entre tests.
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
- **Rate limit en tests**: si agregas muchos requests por ventana, revisa que `NODE_ENV=test` para que el rate limit siga desactivado.

---

## Troubleshooting general

- **`prisma generate` falla**: asegúrate de tener `DATABASE_URL` en `.env` (Prisma 7 la lee de `prisma.config.ts`).
- **CORS en desarrollo**: el frontend (Vite) corre en `http://localhost:5173`; verifica `CORS_ORIGIN`.
