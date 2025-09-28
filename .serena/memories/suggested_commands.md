# Suggested Commands

## Development Server
```bash
# Start frontend development server
bun run dev:front
# Starts Vite dev server on port 3000

# Start API development server
bun run dev:api
# Starts Wrangler dev server for Cloudflare Workers API

# Install dependencies
bun install
```

## Building & Deployment
```bash
# Build frontend for production
bun run build:front

# Deploy to Cloudflare (frontend + API)
bun run deploy

# Preview production build locally
bun run serve:front
```

## Code Quality
```bash
# Format code (uses Biome)
bun run format

# Lint code
bun run lint

# Check and fix both formatting and linting
bun run check:write

# Check only (no fixes)
bun run check
```

## Testing
```bash
# Run all tests
bun run test:front

# Run tests in watch mode
vitest
```

## Database Operations
```bash
# Push schema changes to D1 database
bun run db:push

# Generate database migrations
bun run db:generate

# Run database migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## Cloudflare Tools
```bash
# Generate TypeScript types for Cloudflare bindings
bun run build-cf-types

# View Wrangler logs
wrangler tail

# Access D1 database directly
wrangler d1 execute aim-ai-coach-d1 --command="SELECT * FROM users"
```

## Development Workflow
1. Start both servers: `bun run dev:front` and `bun run dev:api`
2. Make changes to code
3. Run quality checks: `bun run check:write`
4. Run tests: `bun run test:front`
5. Deploy: `bun run deploy`