# Codebase Architecture

## High-Level Structure

### Frontend Architecture (src/)
- **Router**: TanStack Router with file-based routing in `src/routes/`
- **State Management**: TanStack Query for server state, React hooks for local state
- **Component Hierarchy**: 
  - Layout components wrap page components
  - AuthLayout provides authentication context
  - UI components are reusable Radix-based primitives
- **AI Integration**: Specialized AI components in `src/components/ai-elements/`

### Backend Architecture (api/)
- **Framework**: Hono web framework optimized for Cloudflare Workers
- **Middleware Chain**: Authentication → Database → Mastra AI → CORS → Routes
- **AI System**: Mastra framework with agents, tools, and memory management
- **Data Layer**: Drizzle ORM with D1 SQLite database

## Key Architectural Patterns

### Monorepo Structure
```
├── src/           # React frontend
├── api/           # Cloudflare Workers backend
├── migration/     # Database migrations
├── dist/          # Build output
└── public/        # Static assets
```

### API Middleware Stack
1. **Database Injection**: Creates DB connection per request
2. **Authentication**: Better Auth with Discord OAuth
3. **Session Management**: User and session context
4. **Mastra Integration**: AI agent and vector store setup
5. **CORS Configuration**: Frontend-backend communication

### AI Agent System (Mastra)
- **Agents**: Specialized AI coaches (`aim-ai-coach-agent.ts`)
- **Tools**: User data fetching, game API integration
- **Memory**: Conversation history with semantic search
- **Vector Store**: Cloudflare Vectorize for embeddings
- **RAG**: Knowledge retrieval for coaching context

### Database Design
- **Primary DB**: Cloudflare D1 (SQLite) for user data, sessions
- **Vector DB**: Cloudflare Vectorize for AI embeddings
- **Schema**: Drizzle ORM with type-safe migrations
- **Integration**: Dual schema approach (auth + Mastra)

### Authentication Flow
1. Discord OAuth via Better Auth
2. Session stored in D1 database
3. User context injected into all API requests
4. Frontend receives user data via authentication layout

### State Management Strategy
- **Server State**: TanStack Query for API data
- **Authentication State**: Better Auth client integration
- **Local State**: React useState/useReducer
- **AI Conversation**: Managed by Mastra memory system

## Critical Dependencies
- **TanStack Ecosystem**: Router, Query, Store for frontend coordination
- **Mastra Framework**: AI agent orchestration and memory
- **Cloudflare Stack**: Workers, D1, Vectorize for infrastructure
- **Better Auth**: Complete authentication solution
- **Radix UI + Tailwind**: Accessible, styled component system