# Development Environment Setup

## System Requirements
- **Runtime**: Bun (package manager and runtime)
- **Platform**: Compatible with Darwin (macOS), Linux, Windows
- **Node Version**: Not required (uses Bun runtime)

## Essential Environment Variables
Create `.env` file based on `.env.example`:

```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
CLOUDFLARE_RUNTIME_API_TOKEN=your_runtime_token

# AI Services
GOOGLE_API_KEY=your_google_ai_key
YOUTUBE_API_KEY=your_youtube_key

# Authentication
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
AUTH_BASE_URL=http://localhost:8787
BETTER_AUTH_SECRET=your_secret_key

# Application URLs
FRONT_URL=http://localhost:3000
```

## Development Workflow

### Initial Setup
```bash
# Clone and install
git clone <repo>
cd aim-ai-coach
bun install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
bun run db:push
```

### Daily Development
```bash
# Terminal 1: Frontend
bun run dev:front

# Terminal 2: API
bun run dev:api

# Terminal 3: Database GUI (optional)
bun run db:studio
```

## IDE Configuration
- **TypeScript**: Full type checking enabled
- **Import Resolution**: `@/` alias configured for src directory
- **Path Mapping**: Vite resolver handles import aliases
- **Formatting**: Biome handles formatting and linting

## Debugging Tools
- **TanStack Router Devtools**: Available in development
- **TanStack Query Devtools**: React Query debugging
- **Drizzle Studio**: Database inspection GUI
- **Wrangler**: Cloudflare Workers debugging and logs

## Testing Environment
- **Test Runner**: Vitest with jsdom environment
- **Testing Library**: React Testing Library integrated
- **Coverage**: Available via Vitest
- **Mocking**: jsdom for browser APIs

## Build Process
1. **Frontend**: Vite builds React app to `dist/`
2. **API**: Wrangler handles Worker compilation
3. **Types**: Auto-generated route types via TanStack Router
4. **Assets**: Static files served via Cloudflare Pages