# Task Completion Workflow

## Quality Gates (Required Before Task Completion)
1. **Code Quality**: Run `bun run check:write` to fix formatting and linting issues
2. **Type Safety**: Ensure TypeScript compilation succeeds
3. **Testing**: Run `bun run test:front` and ensure all tests pass
4. **Build Verification**: Verify `bun run build:front` succeeds without errors

## Pre-Commit Checklist
- [ ] All new code follows TypeScript conventions
- [ ] Components are properly typed
- [ ] API routes include proper error handling
- [ ] Database schema changes include migrations
- [ ] Environment variables are properly typed in CloudflareBindings
- [ ] Import paths use `@/` alias where appropriate

## Development Environment Validation
```bash
# Full quality check pipeline
bun run check:write && bun run test:front && bun run build:front
```

## Deployment Readiness
- [ ] Frontend builds successfully
- [ ] API compiles without TypeScript errors
- [ ] Database migrations are applied
- [ ] Environment variables are configured
- [ ] Cloudflare bindings are properly set up

## Common Issues to Check
- **Route Generation**: Ensure TanStack Router routes are properly structured
- **Type Imports**: Use `import type` for type-only imports
- **Database Schema**: Sync schema with migrations using `bun run db:push`
- **API Bindings**: Verify Cloudflare Worker bindings match environment

## When Making Database Changes
1. Update schema in `api/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate` or `bun run db:push`
4. Update TypeScript types if needed

## When Adding New Dependencies
1. Install with Bun: `bun add <package>`
2. Update TypeScript types if needed
3. Verify build still works: `bun run build:front`
4. Check for any Biome configuration conflicts