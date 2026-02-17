# Copy Embed Code - Obsidian Plugin

## Build Commands

```bash
npm run build    # Type-check and build for production
npm run dev      # Development build (watches for changes)
npm run lint     # Run ESLint
```

## Architecture

- **Entry point**: `src/main.ts` - Single-file plugin extending Obsidian's `Plugin` class
- **Build**: esbuild bundles to `main.js` in the root
- **Type checking**: TypeScript with `tsc -noEmit`

## Code Patterns

- Plugin lifecycle methods (`onload`, `onunload`) should only be `async` if they contain `await` expressions
- Use Obsidian's `Menu` API via `editor-menu` event for context menus in edit mode
- Fall back to DOM injection for reading mode where `editor-menu` doesn't fire
