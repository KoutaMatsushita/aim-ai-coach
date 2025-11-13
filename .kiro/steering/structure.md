# Project Structure

## Organization Philosophy

**Frontend-Backend Separation with Unified Repository**:
- `src/`: フロントエンド（React + TanStack Router）
- `api/`: バックエンド（Hono + LangGraph + Mastra）
- 明確な責任分離とモジュール管理

## Directory Patterns

### Frontend (`/src/`)
**Purpose**: React アプリケーション、UI コンポーネント、ルーティング

```
src/
├── routes/          # TanStack Router file-based routes
│   ├── __root.tsx   # Root layout
│   ├── index.tsx    # Home page
│   └── auth/        # Auth pages (nested routes)
├── components/
│   ├── ui/          # Reusable UI primitives (Radix UI based)
│   ├── assistant-ui/ # AI chat UI components
│   ├── layout/      # Layout components (header, auth layout)
│   └── page/        # Page-specific components
├── lib/
│   ├── utils.ts     # Utility functions (cn, etc.)
│   ├── auth/        # Auth client config
│   └── chatApi.ts   # API client helpers
└── integrations/    # Third-party integrations (TanStack Query)
```

**Conventions**:
- Routes are file-based: `routes/foo/bar.tsx` → `/foo/bar`
- Components: PascalCase files (e.g., `ChatPage.tsx`)
- Utilities: camelCase files (e.g., `utils.ts`)
- Absolute imports: `@/components/ui/button` not `../../components/ui/button`

### Backend (`/api/`)
**Purpose**: API endpoints, LangGraph orchestration, database, middleware

```
api/
├── index.ts          # Hono app entry point
├── routes/           # API endpoints
│   ├── chat.ts       # Chat API (SSE streaming)
│   ├── coaching.ts   # LangGraph coaching endpoint
│   └── knowledges.ts # RAG knowledge management
├── langgraph/        # LangGraph AI orchestration
│   ├── index.ts      # Graph factory
│   ├── graphs/       # Graph definitions (supervisor)
│   ├── tools/        # LangChain tools (RAG, user data)
│   └── types.ts      # Shared types
├── mastra/           # Mastra services (RAG, vector)
│   ├── services/     # Content analyzer, YouTube, RAG
│   └── db/           # Mastra DB schema
├── middleware/       # Hono middleware (auth, CORS, DB)
├── db/               # Drizzle ORM schema & DB client
├── auth/             # Better Auth configuration
└── env.ts            # Environment variables (T3 Env)
```

**Conventions**:
- Routes export Hono app instances
- LangGraph graphs in `langgraph/graphs/`
- Tools in `langgraph/tools/` with clear naming (e.g., `rag-tools.ts`, `user-tools.ts`)
- Relative imports within `api/` (e.g., `import { db } from '../db'`)

### Other Directories

#### `/public/`
Static assets (images, fonts, etc.)

#### `/seeds/`
Database seed data

#### `/cli/`
CLI tools for local database operations

#### `/.kiro/`
Kiro specification and steering (project memory)
- `.kiro/specs/`: Feature specifications
- `.kiro/steering/`: Project memory files

## Naming Conventions

- **Files**:
  - Components: PascalCase (`ChatPage.tsx`)
  - Utilities: camelCase (`utils.ts`)
  - Routes: lowercase with kebab-case for multi-word (`auth/$authView.tsx`)
- **Components**: PascalCase (`AimAssistant`, `MessageBubble`)
- **Functions**: camelCase (`handleSubmit`, `createCoachingGraph`)
- **Constants**: UPPER_SNAKE_CASE (環境変数など)

## Import Organization

### Frontend (src/)
```typescript
// External dependencies (React, Radix UI, etc.)
import { useState } from "react";
import { Button } from "@radix-ui/themes";

// TanStack
import { createFileRoute } from "@tanstack/react-router";

// Internal absolute imports (@/)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Relative imports (same directory or parent)
import { MessageBubble } from "./MessageBubble";
```

### Backend (api/)
```typescript
// External dependencies
import { Hono } from "hono";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Relative internal imports
import { db } from "../db";
import { createRagTools } from "../langgraph/tools/rag-tools";
```

**Path Aliases**:
- `@/*`: Maps to `src/*` (frontend only)
- No alias for `api/` (use relative imports)

## Code Organization Principles

- **Feature-first in Routes**: Routes organized by feature (auth, account, device)
- **Separation of Concerns**: UI components, business logic (API), AI orchestration (LangGraph) are clearly separated
- **Type Safety**: Export types from source files, import where needed (e.g., `api/langgraph/types.ts`)
- **Minimal Cross-Domain Imports**: Frontend doesn't import backend code directly (API boundary via HTTP)

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
