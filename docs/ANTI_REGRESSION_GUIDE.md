# Guía Anti-Regresión para Unigrc

## 🎯 Objetivo

Evitar el problema "ayer funcionaba, hoy no" mediante:
1. **Entorno congelado** - Dependencias y Node.js en versiones exactas
2. **Pre-commit hooks** - Detectar problemas antes del commit
3. **Tests automatizados** - Validar funcionalidad crítica
4. **Smoke tests** - Verificar deployment exitoso

---

## ✅ Ya Implementado

### 1. Configuración de Versiones Exactas

**Archivo: `.npmrc`**
```
save-exact=true
engine-strict=true
```

Esto asegura que:
- Nuevas instalaciones usan versiones exactas (no `^` ni `~`)
- Node.js debe coincidir con la versión en `package.json`

### 2. Endpoints de Monitoreo

**`GET /health`** - Verifica salud del sistema
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "objectStorage": "up"
  }
}
```

**`GET /version`** - Información de deployment
```json
{
  "version": "1.0.0",
  "gitCommit": "a3f2d1c",
  "gitBranch": "main",
  "nodeVersion": "v20.19.0",
  "uptime": 3600
}
```

**`GET /metrics`** - Métricas de performance
```json
{
  "global": {
    "totalRequests": 1543,
    "avgDuration": 45,
    "errorRate": "0.2%"
  }
}
```

### 3. Scripts de Validación

**`scripts/smoke-test.ts`** - Pruebas post-deployment
```bash
tsx scripts/smoke-test.ts
```

Valida:
- ✅ `/health` responde correctamente
- ✅ `/version` devuelve info de build
- ✅ Frontend carga
- ✅ API responde sin errores 500

**`scripts/validate-database-schema.ts`** - Valida schema crítico
```bash
tsx scripts/validate-database-schema.ts
```

Verifica:
- ✅ `audit_logs.user_id` permite NULL
- ✅ Tablas de validación existen
- ✅ Columnas críticas presentes

### 4. Tests de Integración

**`tests/integration/email-validation.test.ts`**
```bash
npx vitest run tests/integration/
```

Protege contra regresiones en:
- Validaciones por email (NULL userId)
- Workflow de batch validations
- Schema de base de datos

### 5. Documentación de Código

- ✅ Code review checklist (`docs/CODE_REVIEW_CHECKLIST_VALIDATIONS.md`)
- ✅ JSDoc en código crítico
- ✅ Métricas estructuradas de validación

---

## 🔧 Configuración Manual Requerida

### Paso 1: Fijar versiones en package.json

**Opción A: Editar manualmente (recomendado para producción)**

Abre `package.json` y agrega:

```json
{
  "engines": {
    "node": "20.19.x",
    "npm": "10.x"
  },
  "packageManager": "npm@10.8.1"
}
```

**Opción B: Usar comando npm**
```bash
# Regenera package-lock.json con versiones exactas
rm -rf node_modules package-lock.json
npm install
```

Con `.npmrc` configurado, esto instalará versiones exactas.

### Paso 2: Agregar scripts en package.json

Agrega estos scripts en la sección `"scripts"`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/integration/",
    "test:watch": "vitest watch",
    "smoke-test": "tsx scripts/smoke-test.ts",
    "validate-schema": "tsx scripts/validate-database-schema.ts",
    "prepare": "command -v husky >/dev/null 2>&1 && husky || true"
  }
}
```

### Paso 3: Instalar Husky para Pre-commit Hooks

```bash
# Instalar Husky y lint-staged
npm install --save-dev husky lint-staged

# Inicializar Husky
npx husky init

# Crear pre-commit hook
echo 'npx lint-staged && npm run typecheck && npm run test:integration' > .husky/pre-commit
chmod +x .husky/pre-commit
```

Agregar en `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "tsc --noEmit"
    ]
  }
}
```

### Paso 4: Configurar Nix (Opcional pero recomendado)

**Nota:** Replit no permite editar `replit.nix` directamente mediante código.

Manualmente, asegúrate de que `replit.nix` tenga:

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20      # Node.js 20.x fijo
    pkgs.postgresql     # PostgreSQL client
    pkgs.git           # Git
  ];
}
```

---

## 📋 Checklist Pre-Deployment

Antes de cada deployment, ejecuta:

```bash
# 1. Validar tipos TypeScript
npm run typecheck

# 2. Ejecutar tests de integración
npm run test:integration

# 3. Validar schema de base de datos
npm run validate-schema

# 4. Build de producción
npm run build

# 5. Smoke test local (después de iniciar servidor)
npm run smoke-test
```

---

## 🚨 Causas Comunes de Regresiones

### Problema: "Ayer funcionaba, hoy no carga datos"

**Causa:** `DATABASE_URL` cambió o secrets no cargaron

**Solución:**
1. Verifica secrets en Replit: Settings → Secrets
2. Comprueba que `DATABASE_URL` apunta a la base correcta
3. Ejecuta: `tsx scripts/validate-database-schema.ts`

### Problema: "Se perdió la sesión tras reiniciar"

**Causa:** Sesiones en memoria (no persistentes)

**Solución:**
- ✅ Ya implementado: `connect-pg-simple` para sesiones en PostgreSQL

### Problema: "La UI muestra datos viejos"

**Causa:** Cache de TanStack Query no invalidado

**Solución:**
1. Busca `invalidateQueries` en el código
2. Asegura que cada mutación invalide las queries correspondientes
3. Verifica `refetchOnWindowFocus: true` en queries críticas

### Problema: "Dependencia se actualizó sola"

**Causa:** Versiones flotantes (`^` o `~`)

**Solución:**
1. ✅ `.npmrc` ya configurado con `save-exact=true`
2. Ejecuta: `npm ci` (no `npm install`)
3. Commitea `package-lock.json`

### Problema: "Validaciones por email fallan"

**Causa:** `audit_logs.user_id` no permite NULL

**Solución:**
1. Ejecuta: `npm run validate-schema`
2. Si falla, verifica documentación en `docs/CODE_REVIEW_CHECKLIST_VALIDATIONS.md`

---

## 🎯 Workflow de Desarrollo Seguro

```
1. Crear feature branch
   ↓
2. Desarrollar cambios
   ↓
3. Pre-commit hooks ejecutan automáticamente:
   - Typecheck
   - Tests de integración
   ↓
4. Push a GitHub
   ↓
5. Merge a main
   ↓
6. Deployment a Replit
   ↓
7. Ejecutar smoke tests
   ↓
8. Verificar /health y /version
```

---

## 📊 Monitoreo Post-Deployment

### Verificación Inmediata

```bash
# 1. Health check
curl https://tu-app.replit.app/health

# 2. Version info
curl https://tu-app.replit.app/version

# 3. Smoke test completo
BASE_URL=https://tu-app.replit.app npm run smoke-test
```

### Métricas Continuas

```bash
# Revisar métricas de performance
curl https://tu-app.replit.app/metrics
```

Busca en logs:
```
[VALIDATION_METRICS] - Tasas de éxito/fallo de validaciones
[VALIDATION_ERROR] - Errores en validaciones por email
```

---

## 🔐 Protección de Datos Críticos

### Schema de Base de Datos

**NUNCA cambiar:**
- `audit_logs.user_id` → Debe permitir NULL
- Primary keys de tablas existentes
- Tipos de columnas establecidas

**Antes de migrations:**
```bash
# 1. Valida schema actual
npm run validate-schema

# 2. Prueba en dev primero
npm run db:push

# 3. Si hay advertencia de pérdida de datos
npm run db:push --force

# 4. Valida nuevamente
npm run validate-schema
```

---

## 📚 Referencias

- **Tests:** `tests/integration/email-validation.test.ts`
- **Schema validation:** `scripts/validate-database-schema.ts`
- **Smoke tests:** `scripts/smoke-test.ts`
- **Code review:** `docs/CODE_REVIEW_CHECKLIST_VALIDATIONS.md`
- **Endpoints:** `/health`, `/version`, `/metrics`

---

## 🚀 Siguiente Paso

Para completar la protección anti-regresión:

```bash
# Instalar Husky
npm install --save-dev husky lint-staged
npx husky init

# Crear pre-commit hook
echo 'npx lint-staged && npm run typecheck' > .husky/pre-commit
chmod +x .husky/pre-commit

# Commitear cambios
git add .
git commit -m "Add anti-regression protections"
```

**Última actualización:** Noviembre 2025
