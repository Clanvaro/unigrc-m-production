# Cambios Manuales Requeridos en package.json

## ⚠️ IMPORTANTE
Estos cambios deben hacerse **manualmente** por el usuario ya que package.json está en forbidden_changes.

## 1. Eliminar ^ y ~ de TODAS las dependencias

**PROBLEMA**: El doctor encontrará ~140 dependencias con `^` que violan la política de versiones exactas.

**SOLUCIÓN**: Ejecutar este comando una sola vez:
```bash
npm install --save-exact $(jq -r '.dependencies | keys | .[]' package.json)
npm install --save-exact --save-dev $(jq -r '.devDependencies | keys | .[]' package.json)
```

O manualmente: Reemplazar todos los `^` por nada en las versiones de dependencies y devDependencies.

## 2. Agregar engines y packageManager

Agregar al inicio de package.json (después de "license"):
```json
  "engines": {
    "node": "20.19.x",
    "npm": "10.x"
  },
  "packageManager": "npm@10.8.1",
```

## 3. Agregar scripts faltantes

Agregar a la sección "scripts":
```json
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "doctor": "node scripts/doctor.mjs --base=$REPL_SLUG.replit.dev"
```

Nota: `build` y `start` ya existen, aunque `start` apunta a `dist/index.js` cuando debería ser `dist/server/index.js` (verificar después del build).

## 4. Agregar configuración lint-staged

Agregar al final de package.json (antes del último `}`):
```json
  "lint-staged": {
    "*.{ts,tsx,js}": "eslint --fix"
  }
```

## 5. Estado Actual vs Deseado

### ✅ YA CUMPLE
- `.npmrc` con `save-exact=true` y `engine-strict=true`
- `package-lock.json` presente
- `.husky/pre-commit` configurado
- `.github/workflows/ci.yml` presente
- `playwright.config.ts` presente
- `vitest` y `@playwright/test` instalados

### ❌ FALTA
- Versiones exactas (eliminar ^)
- engines y packageManager
- Scripts: typecheck, test, test:e2e, lint, doctor
- lint-staged config

## 6. Verificación

Después de hacer los cambios, ejecutar:
```bash
npm run doctor
```

Debería mostrar más PASS y menos FAIL.
