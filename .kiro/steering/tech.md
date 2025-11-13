# Technology Stack

## Architecture

**Frontend-Backend Unified**: TanStack Start (SSR) + Hono API を同一プロジェクトで管理。フロントエンドとバックエンドを統合した開発体験。

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Runtime**: Bun (開発・ビルド・パッケージマネージャー)
- **Frontend Framework**: React 19 + TanStack Start
- **Backend Framework**: Hono (API routing & middleware)
- **Database**: LibSQL (Turso) + Drizzle ORM
- **AI Orchestration**: LangGraph + LangChain (Google Gemini)

## Key Libraries

### Frontend
- **TanStack Router**: File-based routing (`src/routes/`)
- **TanStack Query**: Server state management
- **Radix UI**: Accessible UI primitives
- **Tailwind CSS v4**: Utility-first styling
- **Assistant UI**: AI チャット UI コンポーネント (`@assistant-ui/react`, `@assistant-ui/react-langgraph`)

### Backend
- **LangGraph**: Multi-agent coaching orchestration (supervisor pattern)
- **Mastra**: Vector store & RAG infrastructure
- **Better Auth**: Authentication (passkey support)
- **Drizzle ORM**: Type-safe database queries

### AI/ML
- **LangChain**: Tool binding & message handling
- **Google Gemini**: `gemini-2.0-flash-exp` model for coaching
- **Vector Search**: Mastra Vector for knowledge retrieval

## Development Standards

### Type Safety
- TypeScript strict mode enabled
- No `any` types without justification
- Zod for runtime validation
- T3 Env for environment variable type safety

### Code Quality
- **Biome**: Linting & formatting (replaces ESLint/Prettier)
- **Commands**: `bun check`, `bun format`, `bun lint`
- Japanese comments for business logic, English for technical documentation

### Testing
- **Vitest**: Unit & integration testing
- **Testing Library**: React component testing

## Development Environment

### Required Tools
- Bun 1.0+ (package manager & runtime)
- Node.js 20+ (compatibility)
- wrangler (Cloudflare deployment)

### Common Commands
```bash
# Dev: bun run dev (port 3000)
# Build: bun run build
# Test: bun test
# DB: bun run db:push, bun run db:studio
# Format: bun check:write
```

## Key Technical Decisions

### Why TanStack Start
- SSR で SEO 対応可能、かつ SPA の UX を提供
- File-based routing で直感的なルート管理
- React 19 の最新機能をフル活用

### Why LangGraph
- Multi-agent システムの状態管理に最適
- フェーズベースのコーチング戦略を明示的にモデリング
- MemorySaver で会話履歴を永続化（開発環境、本番は別ストレージ検討）

### Why Hono
- 軽量・高速な API フレームワーク
- Cloudflare Workers との親和性
- TypeScript first で型安全

### Why LibSQL
- Turso の分散データベースでグローバル展開に対応
- Drizzle ORM でマイグレーション管理が容易
- SQLite 互換で開発環境でも使いやすい

### Import Strategy
- **Absolute imports**: `@/*` で `src/` 配下を参照（フロントエンド）
- **Relative imports**: `api/` 配下は相対パスで API 内部モジュールを参照
- API と src は明確に分離

---
_Document standards and patterns, not every dependency_
