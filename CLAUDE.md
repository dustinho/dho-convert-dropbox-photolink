# Convert Dropbox Photo Link - Obsidian Plugin

## Build Commands

```bash
npm install      # Install dependencies (required before first build)
npm run build    # Type-check and build for production
npm run dev      # Development build (watches for changes)
npm run lint     # Run ESLint
```

## Architecture

- **Entry point**: `src/main.ts` - Single-file plugin extending Obsidian's `Plugin` class
- **Build**: esbuild bundles to `main.js` in the root
- **Type checking**: TypeScript with `tsc -noEmit`
- **No settings**: Plugin has no configuration; `settings.ts` was removed
- **No CSS**: Plugin has no styles; `styles.css` was removed

## Code Patterns

- Plugin lifecycle methods (`onload`, `onunload`) should only be `async` if they contain `await` expressions
- `onunload` can be omitted entirely when all listeners use `registerEvent` (auto-cleanup)
- Use `editor-paste` event to intercept and transform pasted content
- Call `evt.preventDefault()` before `editor.replaceSelection()` to replace default paste behavior
- Non-matching paste events should fall through silently (just `return`)

## Project Setup Checklist

When replacing boilerplate or creating a new plugin from a template:
- Update `manifest.json` with correct id, name, author, and description
- Replace the sample `README.md` with plugin-specific documentation
- Replace the template `LICENSE` with MIT (author: dho)
- Delete unused boilerplate files (`settings.ts`, `styles.css`, `AGENTS.md`, etc.)
- Check for swap files, editor artifacts, or other junk before committing
- Ensure `.gitignore` covers `*.swp`, `.DS_Store`, `node_modules/`, `main.js`

## Plugin Logic

Transforms Dropbox photo URLs on paste:
- Pattern: `https://www.dropbox.com/scl/fi/....<image ext>?...&dl=0`
- Replaces `&dl=0` with `&raw=1` (serves raw image instead of preview page)
- Wraps in `![|400](url)` for 400px-wide Obsidian image embed
- Supported extensions: jpg, jpeg, png, gif, bmp, webp, heic
