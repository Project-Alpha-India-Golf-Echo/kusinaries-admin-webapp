# Build & Versioning

## Overview
This project now embeds build metadata (version, commit, branch, timestamp) into the app so it can be displayed in the UI footer.

## Files
- `scripts/generate-build-info.mjs`: Generates `src/build-info.json` before each build.
- `src/build-info.json`: Placeholder for dev; overwritten during production build.
- `src/lib/version.ts`: Type-safe accessor for build information.
- Footer in `Layout.tsx`: Renders version & build metadata.

## Usage
Run a standard build (this triggers metadata generation):

```
npm run build
```

### Bump Version
Use semantic version bump helpers (these create a git tag & commit):

```
npm run version:patch
npm run version:minor
npm run version:major
```

After bumping, push tags:

```
git push --follow-tags
```

Then build & deploy as usual. The new `package.json` version will appear in the footer combined with the short commit (e.g., `1.2.3+abc123`).

## CI Integration (Optional)
In CI you can enforce generation by running `npm run build`. If you create ephemeral builds you can also override the version environment variable and post-process `build-info.json` if needed.

## Troubleshooting
- If footer shows `dev`, ensure you ran `npm run build` not just `vite` dev server.
- If git fields show `unknown`, the build environment lacks a `.git` directory.
# Repository made public - triggering redeploy
