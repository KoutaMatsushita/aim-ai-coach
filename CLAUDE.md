# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AIM AI Coach** is an FPS aiming improvement application that provides data-driven coaching using KovaaKs and Aim Lab performance data. The application features Discord authentication, personalized AI coaching through the Mastra framework, and comprehensive statistics analysis.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm start           # Start production server
```

### Database Management
```bash
npx drizzle-kit generate    # Generate migration files
npx drizzle-kit migrate     # Run database migrations
npx drizzle-kit studio      # Open Drizzle Studio (database GUI)
```

### Deployment (SST + AWS)
```bash
npx sst dev         # Local development with AWS integration
npx sst deploy      # Deploy to AWS
npx sst remove      # Remove AWS resources
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TailwindCSS v4
- **Authentication**: Better Auth with Discord OAuth
- **Database**: LibSQL/Turso (SQLite-compatible, edge-optimized)
- **AI/ML**: Mastra Framework + Google Gemini 2.5 Pro
- **UI Components**: Radix UI + assistant-ui/react
- **Deployment**: SST (AWS) + Cloudflare

### Key Directories
```
app/                    # Next.js App Router
├── api/auth/          # Better Auth API routes
├── api/chat/          # Mastra chat endpoints
├── login/             # Authentication pages
└── device/            # Device authorization flow

lib/                   # Core application logic
├── auth/              # Authentication configuration
├── db/                # Database schema and connection
└── mastra/            # AI agent and tools
    ├── agents/        # AI coach agent definitions
    ├── tools/         # User data and knowledge tools
    └── services/      # RAG and analysis services

components/            # React UI components
```

### AI Agent System
The core AI coaching functionality is implemented through the Mastra framework:

- **Main Agent**: `lib/mastra/agents/aim-ai-coach-agent.ts`
  - Uses Google Gemini 2.5 Pro for natural language processing
  - Implements working memory for personalized user interactions
  - Provides skill-level-based coaching (Beginner/Intermediate/Advanced/Expert)
  - Analyzes KovaaKs and Aim Lab performance data

- **Data Tools**: `lib/mastra/tools/user-tool.ts`
  - `findKovaaksScoresByUserId()`: Retrieve KovaaKs performance data
  - `findAimlabTasksByUserId()`: Retrieve Aim Lab task data
  - `assessSkillLevel()`: Automatic skill level assessment
  - `getKovaaksStatsByUserId()`: Statistical analysis with trends

- **Knowledge System**: `lib/mastra/tools/knowledge-tool-libsql.ts`
  - High-performance vector search using LibSQL Vector
  - `searchAimContentLibSQL()`: Semantic content search
  - `getPersonalizedRecommendationsLibSQL()`: AI-driven recommendations

### Database Schema
The application uses Drizzle ORM with LibSQL/Turso for data management:

- **Authentication Tables**: Better Auth standard tables (users, sessions, accounts)
- **Game Data Tables**:
  - `kovaaks_scores`: KovaaKs performance metrics (accuracy, efficiency, shots, etc.)
  - `aimlab_task_data`: Aim Lab task results and scores
- **Indexes**: Optimized for time-series analysis and user-specific queries

### Authentication Flow
1. Discord OAuth integration through Better Auth
2. User sessions managed with secure token storage
3. Device authorization flow for external clients
4. Automatic user ID resolution in AI agent runtime context

## Environment Variables

Required environment variables for development:

```bash
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Authentication
AUTH_BASE_URL=http://localhost:3000  # or production URL

# Database (Turso)
TURSO_DATABASE_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token

# AI Service
GOOGLE_API_KEY=your_gemini_api_key
```

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- Drizzle ORM for type-safe database operations
- Zod schemas for runtime validation
- Japanese language support in AI agent interactions

### AI Agent Development
- All user tools automatically resolve user ID from runtime context
- Working memory template maintains user profiles and coaching history
- Multi-language support with Japanese as primary coaching language
- Skill assessment based on quantitative performance metrics

### Database Operations
- Use Drizzle Studio for database inspection and management
- Time-series data analysis optimized with proper indexing
- Soft cascading deletes for data integrity
- Statistical functions built into the schema for performance analysis

## Special Considerations

### Turbopack Integration
This project uses Next.js with Turbopack for faster development builds. All development and build commands include the `--turbopack` flag.

### Mastra Framework
The AI coaching system is built on Mastra, which provides:
- Agent orchestration with memory management
- Tool integration for data analysis
- Streaming responses for real-time chat
- Telemetry and logging for production monitoring

### Performance Optimization
- LibSQL Vector for high-speed semantic search (10-100x faster than traditional methods)
- Edge-optimized database with Turso
- Efficient indexing for time-series game performance data
- Memory management for persistent user coaching relationships

## AI Agent Improvement Guidelines

### Current Development Focus
**Individual Development Project** - This is a personal-use FPS coaching application in active development. Feel free to make bold changes and improvements without enterprise-level caution.

### Agent Enhancement Strategy
**Problem**: Current agent is overly focused on practice plan generation and underutilizes the powerful RAG system.

**Solution Approach**:
1. **Conversation Diversification**: Transform from plan-heavy to natural coaching dialogue
2. **RAG Integration**: Seamlessly incorporate YouTube content analysis into conversations
3. **Working Memory Utilization**: Leverage memory for personalized, continuous coaching relationships
4. **Real-time Analysis**: Integrate data analysis naturally into conversation flow

### Implementation Philosophy
- **Bold Changes Encouraged**: Personal project allows for rapid iteration
- **User Experience First**: Prioritize natural conversation over technical complexity
- **RAG-First Approach**: Make high-performance vector search central to coaching
- **Memory-Driven Personalization**: Build persistent coaching relationships

### Technical Implementation Steps
1. **Dynamic Instructions**: Convert static instructions to runtime-contextual functions
2. **RAG Automation**: Automatically trigger knowledge search after data analysis
3. **Conversation Patterns**: Implement diverse response types beyond practice plans
4. **Memory Integration**: Use working memory for session continuity and personalization