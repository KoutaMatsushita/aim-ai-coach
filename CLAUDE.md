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
npm run db:generate    # Generate migration files
npm run db:push        # Push schema changes to database
npm run db:migrate     # Run database migrations
npm run db:studio      # Open Drizzle Studio (database GUI)
```

### CLI Data Collection
```bash
cd data-collector
bun install            # Install CLI dependencies
bun run . login        # Authenticate with Discord
bun run . kovaaks <path>  # Upload KovaaKs data
bun run . aimlab <path>   # Upload Aim Lab data
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
    │   ├── shared/    # Common utilities and abstractions
    │   ├── user-tool.ts         # Data retrieval and analysis
    │   ├── knowledge-tool-libsql.ts  # RAG and vector search
    │   ├── rag-wrapper.ts       # Guardrail-protected RAG
    │   └── reflection-tools.ts  # Session analysis and tracking
    └── services/      # RAG and analysis services

components/            # React UI components
data-collector/        # CLI application for local data upload
├── src/               # CLI source code
├── local-aimlab-schema/  # Aim Lab database schema
└── package.json       # CLI dependencies and scripts
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
  - `getAimlabStatsByUserId()`: Aim Lab statistical analysis
  - `findUser()`: User profile retrieval

- **Knowledge System**: `lib/mastra/tools/knowledge-tool-libsql.ts`
  - High-performance vector search using LibSQL Vector
  - `searchAimContentLibSQL()`: Semantic content search
  - `getPersonalizedRecommendationsLibSQL()`: AI-driven recommendations
  - `initializeVectorIndex()`: Vector index management
  - `addYoutubeContentLibSQL()`: Content ingestion tools

- **RAG Wrapper**: `lib/mastra/tools/rag-wrapper.ts`
  - `guardedSearchAimContent()`: Confidence-based content search with guardrails
  - `guardedPersonalizedRecommendations()`: Protected recommendation system
  - Automatic fallback handling for low confidence scenarios

- **Reflection Tools**: `lib/mastra/tools/reflection-tools.ts`
  - `analyzePerformanceDiff()`: Performance change analysis between sessions
  - `trackRecommendationProgress()`: Recommendation adherence tracking
  - `estimateCoachingEffectiveness()`: Coaching impact measurement

- **Shared Utilities**: `lib/mastra/tools/shared/`
  - `tool-utils.ts`: Standardized error handling, telemetry, and validation
  - `rag-telemetry.ts`: RAG operation monitoring and performance tracking
  - `cache-layer.ts`: Intelligent caching for tool operations

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
- Reflection tools provide session-to-session continuity and progress tracking
- RAG guardrails ensure reliable content delivery with automatic fallback
- Shared utilities provide consistent error handling and telemetry

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

## Current Architecture Features

### Implemented Enhancements
- **Reflection System**: Automatic session-to-session performance analysis and progress tracking
- **RAG Guardrails**: Confidence-based content filtering with automatic fallback mechanisms
- **Working Memory Integration**: Persistent user profiling across coaching sessions
- **Statistical Analysis**: Comprehensive trend analysis and consistency measurements
- **CLI Integration**: Seamless local game data collection and upload

### Agent Capabilities
- **Multi-modal Analysis**: KovaaKs and Aim Lab data integration with cross-platform insights
- **Adaptive Coaching**: Skill-level-based instruction personalization (Beginner/Intermediate/Advanced/Expert)
- **Content Integration**: YouTube video recommendations through high-performance vector search
- **Progress Tracking**: Quantitative measurement of coaching effectiveness and user adherence

### Development Guidelines
**Individual Development Project** - This is a personal-use FPS coaching application in active development. Feel free to make bold changes and improvements without enterprise-level caution.

### Technical Architecture
- **Shared Utilities**: Standardized error handling, caching, and telemetry across all tools
- **Modular Design**: Clean separation of concerns between data tools, knowledge systems, and reflection capabilities
- **Performance Optimization**: LibSQL Vector for 10-100x faster semantic search operations
- **Reliability Features**: Automatic fallback mechanisms and confidence-based guardrails

### CLI Data Collection System
The `data-collector/` provides a standalone CLI application for local game data upload:
- **Authentication**: Discord OAuth device flow for secure authentication
- **Duplicate Prevention**: SQLite-based tracking to prevent redundant uploads
- **Error Handling**: Robust error recovery and progress tracking
- **Multi-platform**: Support for both KovaaKs CSV exports and Aim Lab database files