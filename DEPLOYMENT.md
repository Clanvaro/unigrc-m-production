# 🚀 Deployment Guide - UniGRC

## ⚠️ Critical Pre-Deployment Checklist

### 1. **Fix .replit Configuration (REQUIRED)**
**❌ CURRENT ISSUE:** El archivo `.replit` tiene **5 puertos configurados**. Replit Autoscale y Reserved VM **solo permiten UN puerto externo**.

**✅ SOLUCIÓN:**
Edita manualmente `.replit` y elimina todas las secciones `[[ports]]` excepto una:

```toml
[[ports]]
localPort = 5000
externalPort = 80
```

**Eliminar estas líneas:**
```toml
[[ports]]
localPort = 34869
externalPort = 3003

[[ports]]
localPort = 39273
externalPort = 3001

[[ports]]
localPort = 45265
externalPort = 3002
```

### 2. **Environment Variables**
Configura las siguientes variables en Replit Secrets:

**Requeridas:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # Tu Neon database URL
SESSION_SECRET=<genera-un-secreto-seguro-aqui>
CSRF_SECRET=<genera-un-secreto-seguro-aqui>
PORT=5000
```

**Opcionales pero recomendadas:**
```bash
# Email
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
MAILGUN_FROM=noreply@tudominio.com

# Azure OpenAI (para AI Assistant)
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=...

# Redis (si usas queues)
REDIS_ENABLED=true
REDIS_HOST=...
REDIS_PASSWORD=...
```

### 3. **Run Pre-Deployment Validation & Build**

**Opción A: Validación completa (recomendada)**
```bash
npm run validate-deploy
```

Esto ejecuta:
1. Pre-deployment checks (env vars, .replit config, etc.)
2. Build completo (frontend + backend)

**Opción B: Paso por paso**
```bash
# 1. Validar configuración
npm run pre-deploy

# 2. Build la aplicación
npm run build
```

Verifica que:
- Frontend compiló correctamente (carpeta `dist/client`)
- Backend compiló correctamente (`dist/index.js`)

## 📋 Deployment Steps

### Option A: Replit Autoscale (Recomendado para producción)

1. **Corrige .replit** (ver sección 1 arriba)
2. **Configura Secrets** en Replit
3. **Run Pre-Deployment Check:**
   ```bash
   npm run pre-deploy
   ```
4. **Click "Deploy"** en Replit
5. **Selecciona "Autoscale"**
6. **Configure:**
   - Deployment Target: `gce` (ya configurado en .replit)
   - Build Command: `npm run build` (ya configurado)
   - Run Command: `npm run start` (ya configurado)

### Option B: Reserved VM

1. Mismo proceso que Autoscale
2. Selecciona "Reserved VM" en lugar de "Autoscale"
3. Escoge el tier apropiado (2 vCPU / 4GB RAM mínimo recomendado)

## 🧪 Post-Deployment Validation

### 1. **Automatic Health Check**
Tu aplicación incluye un endpoint `/health` que Replit usa automáticamente.

Manualmente:
```bash
curl https://tu-app.replit.app/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "objectStorage": "up",
    "dataStorage": "DatabaseStorage",
    "envVars": "configured"
  },
  "deployment": {
    "environment": "production",
    "isDeployment": true,
    "nodeVersion": "v20.x.x",
    "uptime": 123
  }
}
```

### 2. **Run Smoke Tests (Después del Deployment)**

**Importante:** Los smoke tests requieren que la aplicación ya esté desplegada y corriendo.

```bash
BASE_URL=https://tu-app.replit.app npm run smoke-test
```

Esto valida:
- ✅ /health responde correctamente
- ✅ Frontend carga
- ✅ API endpoints funcionan
- ✅ Database está conectada
- ✅ Variables de entorno configuradas

**Nota:** Por defecto, `npm run smoke-test` apunta a `http://localhost:5000`. Siempre especifica `BASE_URL` para probar deployment en producción.

## 🔍 Common Deployment Errors

### Error: "Published app not working"
**Causa:** Múltiples puertos en `.replit`  
**Solución:** Deja solo puerto 5000 → 80 (ver sección 1)

### Error: "Database connection failed"
**Causa:** `DATABASE_URL` no configurado o inválido  
**Solución:** 
```bash
# Verifica que DATABASE_URL empiece con:
postgresql://usuario:password@host/database
# o
postgres://usuario:password@host/database
```

### Error: "Session/CSRF errors"
**Causa:** Secrets usando valores por defecto  
**Solución:** Genera nuevos secretos:
```bash
# En tu terminal local:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: "502 Bad Gateway"
**Causa:** Aplicación no escucha en 0.0.0.0:5000  
**Solución:** Ya está configurado correctamente en `server/index.ts`:
```typescript
server.listen({
  port: 5000,
  host: "0.0.0.0",  // ✅ Correcto
  reusePort: true,
})
```

### Error: "Build failed"
**Causa:** Errores de TypeScript o dependencias faltantes  
**Solución:**
```bash
npm run typecheck  # Verifica errores de TS
npm install        # Reinstala dependencias
npm run build      # Intenta build nuevamente
```

## 📊 Monitoring Post-Deployment

### Health Endpoint
```bash
curl https://tu-app.replit.app/health
```

### Metrics Endpoint
```bash
curl https://tu-app.replit.app/metrics
```

### Logs
- Replit Dashboard → Deployments → Logs
- Monitorea errores y warnings

## 🔄 Deployment Updates

Para actualizar la aplicación en producción:

1. **Haz tus cambios en código**
2. **Commit a Git**
3. **Run validación:**
   ```bash
   npm run validate-deploy
   ```
4. **Re-deploy** desde Replit Dashboard

Replit automáticamente:
- Ejecutará `npm run build`
- Reiniciará la aplicación
- Validará con health checks

## 🆘 Rollback

Si algo falla después del deployment:

1. **Replit Dashboard** → Deployments
2. Click en "..." junto al deployment anterior
3. Click "Promote to Production"

O usa el feature de Checkpoints de Replit Agent.

## 📞 Support

Si encuentras problemas:
1. Verifica `/health` endpoint
2. Revisa logs en Replit Dashboard
3. Run smoke tests: `npm run smoke-test`
4. Contacta soporte de Replit si persiste

---

**Última actualización:** Noviembre 2025  
**Versión:** 1.0.0

---

### Option 3: Configure .replit (Requires Replit Support)

Ideally, the `.replit` file should be configured to automatically prune devDependencies:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "npm run build && npm prune --production"]
run = ["npm", "run", "start"]
```

However, this file is currently locked and cannot be edited by the agent.

---

## Deployment Size Breakdown

**Current size (886MB):**
- react-icons: 83MB
- @napi-rs: 58MB
- pdfjs-dist: 36MB
- date-fns: 36MB
- lucide-react: 33MB
- jspdf: 29MB
- canvas: 24MB
- typescript: 22MB (dev-only)
- exceljs: 22MB
- And 100+ other packages...

**After moving devDependencies (~600MB):**
- Removes: TypeScript (22MB), ESLint (~10MB), testing tools (~40MB), build tools (~30MB), type definitions (~20MB)
- Keeps: All runtime dependencies needed for production

---

## Verification

After optimization, check the deployment size:

```bash
# Check node_modules size
du -sh node_modules

# Check what's installed
npm ls --depth=0 --production
```

Target: node_modules should be **~600MB or less**

---

## Long-term Recommendations

1. **Consider lighter alternatives:**
   - Replace `react-icons` (83MB) with `lucide-react` only
   - Use CDN for large assets instead of bundling
   - Lazy-load heavy dependencies

2. **Code splitting:**
   - Split large features into separate bundles
   - Use dynamic imports for optional features

3. **Regular dependency audits:**
   - Review and remove unused dependencies
   - Keep dependencies updated but minimal

---

## Troubleshooting

**If deployment still fails after optimization:**

1. Check actual node_modules size: `du -sh node_modules`
2. Verify devDependencies were removed: `npm ls --production | grep -E "@types|eslint|vitest"`
3. Check bundle sizes: `ls -lh dist/`
4. Contact Replit support if size is still too large

**If local development breaks:**

Run `npm install` to restore all dependencies including devDependencies.
