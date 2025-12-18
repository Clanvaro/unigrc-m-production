# Optimización de Cloud Build para Reducir Costos

## Problema

Cada commit a la rama `main` está generando **2 builds automáticos** (backend + frontend), lo cual consume minutos de Cloud Build y genera costos innecesarios cuando solo se modifican archivos que no requieren deploy (por ejemplo, documentación, scripts, etc.).

## Solución Implementada

Se han configurado los triggers de Cloud Build para que **solo se ejecuten cuando hay cambios relevantes** en las carpetas correspondientes:

### Backend (`deploy-backend`)
Solo se despliega cuando hay cambios en:
- `server/` - Código del backend
- `cloudbuild-backend.yaml` - Configuración del build
- `Dockerfile.backend` - Dockerfile del backend
- `package.json` / `package-lock.json` - Dependencias
- `tsconfig.json` - Configuración de TypeScript

### Frontend (`deploy-frontend`)
Solo se despliega cuando hay cambios en:
- `client/` - Código del frontend
- `cloudbuild-frontend.yaml` - Configuración del build
- `Dockerfile.frontend` - Dockerfile del frontend
- `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js` - Configuración de build
- `components.json` - Configuración de componentes
- `package.json` / `package-lock.json` - Dependencias
- `tsconfig.json` - Configuración de TypeScript

## Aplicar la Optimización

Ejecuta el script de optimización:

```bash
./scripts/optimize-cloud-build-triggers.sh
```

Este script:
1. Actualiza el trigger `deploy-backend` con filtros de path
2. Actualiza el trigger `deploy-frontend` con filtros de path
3. Muestra un resumen de los cambios

## Beneficios

✅ **Reducción significativa de builds innecesarios**
- Si solo modificas `docs/`, `scripts/`, o archivos de configuración que no afectan el código, **no se generarán builds**

✅ **Ahorro en costos**
- Menos minutos de Cloud Build consumidos
- Menos recursos de red y almacenamiento utilizados

✅ **Deploys más rápidos**
- Solo se despliega cuando es realmente necesario
- Menos tiempo esperando builds que no son necesarios

## Casos de Uso

### Escenario 1: Solo cambios en documentación
```bash
# Modificas docs/README.md
git add docs/README.md
git commit -m "Actualizar documentación"
git push
# ✅ NO se generan builds (ahorro de costos)
```

### Escenario 2: Solo cambios en el backend
```bash
# Modificas server/routes.ts
git add server/routes.ts
git commit -m "Fix: Corregir endpoint"
git push
# ✅ Solo se despliega backend (frontend no se despliega innecesariamente)
```

### Escenario 3: Solo cambios en el frontend
```bash
# Modificas client/src/pages/risk-validation.tsx
git add client/src/pages/risk-validation.tsx
git commit -m "Fix: Mostrar riesgos aprobados"
git push
# ✅ Solo se despliega frontend (backend no se despliega innecesariamente)
```

### Escenario 4: Cambios en ambos
```bash
# Modificas server/routes.ts y client/src/pages/risks.tsx
git add server/routes.ts client/src/pages/risks.tsx
git commit -m "Feature: Nueva funcionalidad"
git push
# ✅ Se despliegan ambos servicios (como debe ser)
```

## Despliegue Manual (si es necesario)

Si necesitas forzar el despliegue de ambos servicios sin hacer cambios en el código:

### Opción 1: Commit vacío
```bash
git commit --allow-empty -m "Force deploy both services"
git push
```

### Opción 2: Ejecutar triggers manualmente
```bash
# Desplegar backend manualmente
gcloud builds triggers run deploy-backend \
  --branch=main \
  --project=unigrc-m \
  --region=southamerica-west1

# Desplegar frontend manualmente
gcloud builds triggers run deploy-frontend \
  --branch=main \
  --project=unigrc-m \
  --region=southamerica-west1
```

## Verificar Configuración Actual

Para ver los triggers actuales y sus filtros:

```bash
# Listar todos los triggers
gcloud builds triggers list \
  --project=unigrc-m \
  --region=southamerica-west1

# Ver detalles de un trigger específico
gcloud builds triggers describe deploy-backend \
  --project=unigrc-m \
  --region=southamerica-west1

gcloud builds triggers describe deploy-frontend \
  --project=unigrc-m \
  --region=southamerica-west1
```

## Revertir Cambios (si es necesario)

Si necesitas volver a la configuración anterior (desplegar en cada commit):

```bash
# Actualizar backend para que se ejecute siempre
gcloud builds triggers update github deploy-backend \
  --repo-name=unigrc-m-production \
  --repo-owner=Clanvaro \
  --branch-pattern=^main$ \
  --build-config=cloudbuild-backend.yaml \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --clear-included-files

# Actualizar frontend para que se ejecute siempre
gcloud builds triggers update github deploy-frontend \
  --repo-name=unigrc-m-production \
  --repo-owner=Clanvaro \
  --branch-pattern=^main$ \
  --build-config=cloudbuild-frontend.yaml \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --clear-included-files
```

## Monitoreo de Costos

Para monitorear el impacto en los costos:

1. **Google Cloud Console → Cloud Build → Builds**
   - Revisa la frecuencia de builds antes y después de la optimización

2. **Google Cloud Console → Billing → Reports**
   - Filtra por servicio "Cloud Build"
   - Compara costos mensuales

3. **Cloud Build Metrics**
   ```bash
   # Ver builds en los últimos 7 días
   gcloud builds list \
     --limit=100 \
     --format="table(id,status,createTime,duration)" \
     --project=unigrc-m
   ```

## Notas Adicionales

- Los filtros de path son **case-sensitive** y deben coincidir exactamente con las rutas en el repositorio
- Si agregas nuevas carpetas o archivos que deberían disparar un deploy, actualiza el script `optimize-cloud-build-triggers.sh`
- Los cambios en archivos compartidos (como `package.json` en la raíz) dispararán ambos builds si afectan tanto backend como frontend

