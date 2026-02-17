# Convert Dropbox Photo Link

An Obsidian plugin that automatically converts pasted Dropbox photo links into image embeds.

## What it does

When you paste a Dropbox photo URL into the editor, the plugin converts it into an Obsidian image embed:

```
Pasted:  https://www.dropbox.com/scl/fi/.../photo.jpg?rlkey=abc123&dl=0
Result:  ![|400](https://www.dropbox.com/scl/fi/.../photo.jpg?rlkey=abc123&raw=1)
```

- Replaces `&dl=0` with `&raw=1` so Dropbox serves the raw image
- Wraps the URL in `![|400](...)` for a 400px-wide image embed
- Non-Dropbox pastes are unaffected

Supported image extensions: jpg, jpeg, png, gif, bmp, webp, heic.

## Installation

Copy `main.js`, `styles.css`, and `manifest.json` into your vault at `.obsidian/plugins/dho-convert-dropbox-photolink/`.

## Development

```bash
npm install
npm run dev      # Watch mode
npm run build    # Production build
npm run lint     # ESLint
```
