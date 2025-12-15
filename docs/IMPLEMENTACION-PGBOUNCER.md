# Implementación: Soporte para PgBouncer

## Cambios Realizados

### 1. `server/db.ts` - Detección y Configuración de PgBouncer

#### Cambios Implementados:

1. **Prioridad de URLs de Base de Datos:**
   - Agregada `PGBOUNCER_URL` con **prioridad más alta**
   - Nueva prioridad: `PGBOUNCER_URL` > `RENDER_DATABASE_URL` > `POOLED_DATABASE_URL` > `DATABASE_URL`

2. **Detección de PgBouncer:**
   - Nueva variable `isUsingPgBouncer` que detecta si `PGBOUNCER_URL` está configurado
   - Logging mejorado que indica cuando se usa PgBouncer

3. **Configuración de Pool para PgBouncer:**
   - Cuando `isUsingPgBouncer = true`, el pool de Cloud Run se configura con `poolMax=10` (en lugar de 4)
   - **Razón:** PgBouncer maneja el pooling real a Cloud SQL, Cloud Run solo necesita conexiones "cliente" al pooler
   - **Fórmula:** `poolMax=10 × concurrency=1 = 10 conexiones cliente` → PgBouncer las pool a ~25 conexiones DB

4. **Logging Mejorado:**
   - Muestra claramente cuando se usa PgBouncer
   - Indica el host de PgBouncer
   - Explica la configuración de pool cuando está en modo PgBouncer

#### Código Clave:

```typescript
// Prioridad: PGBOUNCER_URL > RENDER_DATABASE_URL > POOLED_DATABASE_URL > DATABASE_URL
const pgbouncerUrl = process.env.PGBOUNCER_URL;
const databaseUrl = pgbouncerUrl || process.env.RENDER_DATABASE_URL || process.env.POOLED_DATABASE_URL || process.env.DATABASE_URL;

const isUsingPgBouncer = !!pgbouncerUrl;

// Pool config para PgBouncer
if (isUsingPgBouncer) {
  const pgbouncerMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
  poolMax = pgbouncerMax;
  console.log(`[DB Config] PgBouncer mode: Cloud Run poolMax=${poolMax} (PgBouncer handles real pooling to DB)`);
}
```

---

### 2. `cloudbuild-backend.yaml` - Configuración de Cloud Run

#### Cambios Implementados:

1. **Concurrency Reducida:**
   - Cambiado de `--concurrency=10` a `--concurrency=1`
   - **Razón:** Con pool=4 y 9 queries paralelas, concurrency=10 causaba pool starvation
   - **Con PgBouncer:** Concurrency=1 es suficiente porque PgBouncer maneja el pooling

2. **Secret PGBOUNCER_URL Agregado:**
   - Agregado `PGBOUNCER_URL=PGBOUNCER_URL:latest` a la lista de secrets
   - El secret debe crearse en Secret Manager antes del despliegue

#### Código Clave:

```yaml
- '--concurrency=1'  # Cambiado de 10
- '--set-secrets=...PGBOUNCER_URL=PGBOUNCER_URL:latest...'
```

---

## Cómo Funciona

### Sin PgBouncer (Configuración Actual):
```
Cloud Run (concurrency=1, poolMax=4)
  ↓
  Directo a Cloud SQL (4 conexiones por instancia)
  ↓
  Pool starvation cuando hay 9 queries paralelas
```

### Con PgBouncer (Nueva Configuración):
```
Cloud Run (concurrency=1, poolMax=10)
  ↓
  PgBouncer VM (1000 conexiones cliente → 25 conexiones DB)
  ↓
  Cloud SQL (25 conexiones compartidas)
  ↓
  Sin pool starvation ✅
```

---

## Próximos Pasos

### 1. Crear Secret PGBOUNCER_URL

```bash
# Obtener IP de VM PgBouncer (después de ejecutar setup-pgbouncer-vm.sh)
PGPOOLER_IP="10.x.x.x"  # IP interna de la VM
DB_USER="unigrc_user"
DB_PASSWORD="..."  # Obtener de DATABASE_URL
DB_NAME="unigrc_db"

# Crear secret
echo -n "postgresql://${DB_USER}:${DB_PASSWORD}@${PGPOOLER_IP}:6432/${DB_NAME}?sslmode=disable" | \
  gcloud secrets create PGBOUNCER_URL --data-file=-
```

### 2. Configurar PgBouncer en VM

```bash
# Ejecutar script automatizado
export CLOUD_SQL_PRIVATE_IP="10.x.x.x"  # IP privada de Cloud SQL
export DB_PASSWORD="..."  # Obtener de DATABASE_URL
./scripts/setup-pgbouncer-vm.sh
```

### 3. Verificar Configuración

```bash
# Ver logs de Cloud Run para confirmar que usa PgBouncer
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=50 | grep -i "pgbouncer\|db config"

# Debe mostrar:
# [DB Config] Using: PgBouncer connection pooler at 10.x.x.x:6432
# [DB Config] PgBouncer mode: Cloud Run poolMax=10 (PgBouncer handles real pooling to DB)
```

### 4. Probar Endpoint

```bash
# Probar endpoint que antes tardaba 88-195s
curl -w "\nTime: %{time_total}s\n" \
  https://unigrc-backend-*.run.app/api/risks/page-data-lite

# Debe responder en <5s
```

---

## Rollback

Si necesitas revertir a conexión directa:

1. **Remover PGBOUNCER_URL de Secret Manager** (o usar versión vacía)
2. **Revertir concurrency** (opcional, si quieres volver a 10):
   ```bash
   gcloud run services update unigrc-backend \
     --region=southamerica-west1 \
     --concurrency=10
   ```
3. **Redeploy** - El código automáticamente usará `DATABASE_URL` si `PGBOUNCER_URL` no está disponible

---

## Beneficios Esperados

1. **Eliminación de Pool Starvation:**
   - PgBouncer maneja pooling real (1000 clientes → 25 DB)
   - Cloud Run solo necesita 10 conexiones "cliente"
   - Fórmula: `10 conexiones × 1 concurrency = 10 conexiones` ✅

2. **Mejor Performance:**
   - Latencia reducida: Private IP <10ms
   - Sin espera por conexiones: PgBouncer siempre tiene conexiones disponibles
   - CPU always allocated: Sin cold start

3. **Escalabilidad:**
   - PgBouncer puede manejar 1000+ conexiones cliente
   - Cloud Run puede escalar sin preocuparse por pool
   - Fácil ajustar pool de PgBouncer sin tocar código

---

## Notas Técnicas

- **Pool Mode:** PgBouncer usa `pool_mode = transaction` (más eficiente para Cloud Run)
- **SSL:** Deshabilitado dentro de VPC (`sslmode=disable`)
- **Seguridad:** PgBouncer solo acepta conexiones desde VPC (firewall configurado)
- **Monitoreo:** Ver stats de PgBouncer con `SHOW POOLS; SHOW STATS;` en psql

---

**Estado:** ✅ Cambios de código implementados  
**Próximo paso:** Configurar PgBouncer en VM y crear secret  
**Referencia:** Ver `docs/PLAN-ARQUITECTURA-A-PRUEBA-DE-BALAS.md` para plan completo
