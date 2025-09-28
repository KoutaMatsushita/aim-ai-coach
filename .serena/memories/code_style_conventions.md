# Code Style and Conventions

## Formatting (Biome Configuration)
- **Indentation**: Tabs (not spaces)
- **Quote Style**: Double quotes for JavaScript/TypeScript
- **Line Endings**: LF
- **Organize Imports**: Enabled automatically

## File Organization
- **Import Alias**: `@/` maps to `src/` directory
- **Component Structure**: 
  - UI components: `src/components/ui/`
  - Page components: `src/components/page/`
  - Layout components: `src/components/layout/`
  - AI elements: `src/components/ai-elements/`
- **API Structure**: All API code in `api/` directory
- **Route Structure**: File-based routing in `src/routes/`

## TypeScript Conventions
- **Strict Mode**: Enabled in tsconfig.json
- **Type Imports**: Use `import type` for type-only imports
- **Interface Naming**: PascalCase (e.g., `CloudflareBindings`)
- **File Extensions**: `.tsx` for React components, `.ts` for utilities

## Component Conventions
- **React Components**: PascalCase function names
- **File Naming**: PascalCase for component files (e.g., `HomePage.tsx`)
- **Props Interfaces**: Define inline or as separate interface
- **Default Exports**: Used for main component in file

## API Conventions
- **Hono Routing**: RESTful patterns
- **Type Safety**: Full TypeScript coverage for API routes
- **Middleware**: Centralized in middleware directory
- **Environment Variables**: Typed via CloudflareBindings interface

## Database Conventions
- **Schema**: Defined in `api/db/schema.ts`
- **Migrations**: Generated in `migration/` directory
- **ORM**: Drizzle ORM with type-safe queries

## Ignored Files (Biome)
- `src/routeTree.gen.ts` (auto-generated)
- `src/components/ui/**` (external UI library)
- `src/components/ai-elements/**` (external AI components)

## Git Conventions
- **VCS**: Git integration disabled in Biome config
- **Ignore**: Standard Node.js, Cloudflare, and build artifacts