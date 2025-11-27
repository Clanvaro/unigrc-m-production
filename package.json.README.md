# Package.json Manual Configuration Required

## ⚠️ CRITICAL: These changes must be made manually to package.json

Due to Replit restrictions, you need to manually add/modify these sections in `package.json`:

### 1. Add Engines (prevents Node version drift)

```json
{
  "engines": {
    "node": "20.19.x",
    "npm": "10.x"
  },
  "packageManager": "npm@10.8.1"
}
```

### 2. Add/Update Scripts

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "echo '🔨 Building...' && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "smoke-test": "tsx scripts/smoke-test.ts",
    "validate-schema": "tsx scripts/validate-database-schema.ts",
    "db:push": "drizzle-kit push",
    "prepare": "command -v husky >/dev/null 2>&1 && husky || true"
  }
}
```

### 3. Add lint-staged configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix"
    ]
  }
}
```

### 4. Fix all dependency versions (remove ^ and ~)

Go through ALL dependencies and devDependencies, remove `^` and `~` prefixes.

Example:
```json
// BEFORE:
"react": "^18.3.1"

// AFTER:
"react": "18.3.1"
```

**Why?** The `.npmrc` file enforces `save-exact=true`, but existing package.json 
needs manual cleanup to remove version ranges.

## 📋 Steps to Apply

1. Open `package.json` in editor
2. Copy the sections above
3. Paste them into the appropriate locations
4. Remove ALL `^` and `~` from version numbers
5. Save the file
6. Run: `npm ci` (NOT `npm install`)
7. Commit: `git add package.json package-lock.json`

## ✅ Verification

After making changes, run:

```bash
npm run typecheck
npm run lint
npm run test:integration
npm run test:e2e
```

All should pass before committing.
