# CloudCast MVP

CloudCast is an MVP platform for exposing local services via secure tunnels.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
    - For SQLite (default): Set `DB_TYPE=sqlite` and optionally `DB_PATH=./database.sqlite`
    - For PostgreSQL: Set `DB_TYPE=postgres` and `DATABASE_URL=postgresql://user:password@host:port/database`
    - For tunnel routing: set `BASE_DOMAIN=cloudcast.dev`
    - For web app CORS: set `CORS_ORIGIN=http://localhost:5173`
    - For token hashing: set `TOKEN_SECRET` to a strong secret

3. Run migrations:
   ```bash
   npm run migrate
   ```

## Usage

Start the API server:
```bash
npm start
```

### Web app

The React + Tailwind web app lives in `web/`.

```bash
cd web
npm install
npm run dev
```

Create a `.env` in `web/` if you need to override the API URL:
```
VITE_API_URL=http://localhost:8000
```

### CLI

The Deno CLI lives in `cli/`.

```bash
deno run --allow-net --allow-read --allow-write --allow-env cli/main.ts login
```

Optional CLI environment variables:
```
CLOUDCAST_API_URL=http://localhost:8000
CLOUDCAST_APP_URL=http://localhost:5173
CLOUDCAST_CACHE_DIR=/path/to/cache
```

The CLI caches tunnel responses on disk when the upstream sends Cache-Control max-age (or Expires) headers.

## Troubleshooting

- Ensure environment variables are set correctly.
- For PostgreSQL, make sure the database exists and credentials are correct.
- For SQLite, the database file will be created automatically.
