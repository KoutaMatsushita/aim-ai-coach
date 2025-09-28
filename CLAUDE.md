# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "aim-ai-coach" - an AI-powered coaching application for FPS (First Person Shooter) gamers to improve their aiming skills. The app provides personalized coaching through conversational AI, integrates with gaming platforms like Aimlab and Kovaaks, and tracks user progress over time.

## Architecture

**Frontend**: React 19 + TanStack Router + TanStack Query + Tailwind CSS v4
**Backend**: Hono + Cloudflare Workers + D1 Database + Vectorize
**AI**: Mastra framework with Google AI SDK (Gemini) and vector search
**Auth**: Better Auth with Discord OAuth

### Key Structure
- `src/` - React frontend with file-based routing
- `api/` - Cloudflare Workers backend with Hono
- `api/mastra/` - AI agent system and tools
- `migration/` - Database migrations
- `dist/` - Build output for Cloudflare Pages

## Development Commands

### Setup
```bash
bun install
cp .env.example .env  # Configure environment variables
bun run db:push       # Initialize database
```

### Development Servers
```bash
bun run dev:front     # Frontend dev server (port 3000)
bun run dev:api       # API dev server (Wrangler)
```

### Code Quality (Run Before Commits)
```bash
bun run check:write   # Format and lint with Biome
bun run test:front    # Run Vitest tests
bun run build:front   # Verify build succeeds
```

### Database Operations
```bash
bun run db:studio     # Open Drizzle Studio GUI
bun run db:generate   # Generate migrations
bun run db:migrate    # Run migrations
bun run db:push       # Push schema changes
```

### Deployment
```bash
bun run deploy       # Deploy to Cloudflare (build + deploy)
```

## Code Conventions

- **Formatting**: Tabs, double quotes (Biome handles this automatically)
- **Imports**: Use `@/` alias for src directory imports
- **Components**: PascalCase files and function names
- **API**: Hono patterns with full TypeScript typing
- **Database**: Drizzle ORM with schema in `api/db/schema.ts`

## Key Patterns

### Authentication Flow
User authenticates via Discord → Better Auth creates session → Session stored in D1 → AuthLayout provides user context to React components

### AI Integration
Requests → Hono middleware injects Mastra instance → AI agents use tools to fetch user data → Memory system maintains conversation context with semantic search

### Component Organization
- `src/components/ui/` - Radix UI primitives (don't edit directly)
- `src/components/page/` - Full page components
- `src/components/layout/` - Layout wrappers
- `src/components/ai-elements/` - AI-specific UI components

### Database Schema
Two schema files: `api/db/schema.ts` (auth tables) and `api/mastra/db/schema.ts` (AI/app data)

## Environment Variables Required

Core variables needed in `.env`:
- Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_D1_DATABASE_ID`
- AI: `GOOGLE_GENERATIVE_AI_API_KEY`, `YOUTUBE_API_KEY`
- Auth: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `BETTER_AUTH_SECRET`
- URLs: `FRONT_URL`, `AUTH_BASE_URL`

## Common Development Tasks

**Adding New Route**: Create file in `src/routes/` - TanStack Router auto-generates types
**Database Changes**: Edit schema → `bun run db:generate` → `bun run db:migrate`
**API Endpoints**: Add to `api/` with Hono patterns, ensure TypeScript types exported
**AI Tools**: Add to `api/mastra/tools/` and register in agent configuration

## Testing

Uses Vitest with React Testing Library. Tests run in jsdom environment with globals enabled. Run `bun run test:front` for all tests.