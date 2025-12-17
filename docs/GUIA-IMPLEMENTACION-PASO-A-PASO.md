# Guía de Implementación Paso a Paso - PgBouncer

## 📋 Paso 1: Verificar Estado Actual

Ejecuta el script de verificación para ver qué ya está configurado:

```bash
./scripts/check-infrastructure.sh
```

Este script te mostrará:
- ✅ Qué ya está configurado
- ⚠️ Qué necesita configuración
- 📝 Próximos pasos recomendados

---

## 🔧 Paso 2: Configurar Cloud SQL Private IP (si no está)

**Solo si el script indica que Private IP NO está configurada**

### 2.1 Verificar VPC Network

```bash
# Verificar qué VPC networks existen
gcloud compute networks list --project=unigrc-m
```

### 2.2 Habilitar Private IP en Cloud SQL

⚠️ **ADVERTENCIA:** Esto puede causar downtime de 5-10 minutos

```bash
# Obtener nombre de la VPC network (típicamente "default" o "unigrc-vpc")
VPC_NETWORK="default"  # Ajustar según tu caso

# Habilitar Private IP
gcloud sql instances patch unigrc-db \
  --network=projects/unigrc-m/global/networks/$VPC_NETWORK \
  --project=unigrc-m

# Esperar 5-10 minutos mientras se aplica el cambio
```

### 2.3 Verificar Private IP

```bash
# Obtener Private IP
PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --project=unigrc-m \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

echo "Private IP de Cloud SQL: $PRIVATE_IP"
```

**Guarda esta IP, la necesitarás para configurar PgBouncer.**

---

## 🖥️ Paso 3: Configurar PgBouncer en VM

### 3.1 Preparar Variables

```bash
# Configurar variables de entorno
export GCP_PROJECT_ID="unigrc-m"
export GCP_ZONE="southamerica-west1-a"
export VPC_NETWORK="default"  # Ajustar según tu caso

# Obtener Private IP de Cloud SQL (si no la tienes)
export CLOUD_SQL_PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --project=$GCP_PROJECT_ID \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

# Obtener contraseña de la base de datos desde Secret Manager
export DB_PASSWORD=$(gcloud secrets versions access latest \
  --secret=DATABASE_URL \
  --project=$GCP_PROJECT_ID | grep -oP '://[^:]+:\K[^@]+' || echo "")

# Si no funciona el comando anterior, extrae manualmente la contraseña de DATABASE_URL
# Formato: postgresql://user:password@host/db
```

### 3.2 Ejecutar Script de Configuración

```bash
# Ejecutar script automatizado
./scripts/setup-pgbouncer-vm.sh
```

El script:
- ✅ Crea la VM e2-micro si no existe
- ✅ Instala y configura PgBouncer
- ✅ Configura firewall
- ✅ Prueba la conexión
- ✅ Muestra la URL de PgBouncer para crear el secret

### 3.3 Verificar que PgBouncer Funciona

```bash
# Conectar a la VM
gcloud compute ssh unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --project=unigrc-m

# Dentro de la VM, verificar PgBouncer
sudo systemctl status pgbouncer

# Probar conexión
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW VERSION;"
```

---

## 🔐 Paso 4: Crear Secret PGBOUNCER_URL

### 4.1 Obtener IP de la VM PgBouncer

```bash
# Obtener IP interna de la VM
PGPOOLER_IP=$(gcloud compute instances describe unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --project=unigrc-m \
  --format="value(networkInterfaces[0].networkIP)")

echo "IP de PgBouncer: $PGPOOLER_IP"
```

### 4.2 Extraer Credenciales de DATABASE_URL

```bash
# Obtener DATABASE_URL completo
DATABASE_URL=$(gcloud secrets versions access latest \
  --secret=DATABASE_URL \
  --project=unigrc-m)

# Extraer usuario, contraseña y nombre de DB
# Formato: postgresql://user:password@host/db
DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*@[^/]*/\([^?]*\).*|\1|p')

echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo "Database: $DB_NAME"
```

### 4.3 Crear Secret PGBOUNCER_URL

```bash
# Crear PGBOUNCER_URL
# Formato: postgresql://user:password@PGPOOLER_IP:6432/db?sslmode=disable
PGBOUNCER_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PGPOOLER_IP}:6432/${DB_NAME}?sslmode=disable"

echo -n "$PGBOUNCER_URL" | \
  gcloud secrets create PGBOUNCER_URL \
    --data-file=- \
    --project=unigrc-m

# Verificar que se creó
gcloud secrets describe PGBOUNCER_URL --project=unigrc-m
```

**⚠️ IMPORTANTE:** No muestres el contenido del secret en logs públicos.

---

## 🚀 Paso 5: Desplegar Backend con Nueva Configuración

### 5.1 Verificar que Cloud Build está Configurado

El archivo `cloudbuild-backend.yaml` ya tiene:
- ✅ `--concurrency=1`
- ✅ `PGBOUNCER_URL` en secrets

### 5.2 Trigger Despliegue

```bash
# Opción 1: Push a main (si tienes Cloud Build trigger configurado)
git push origin main

# Opción 2: Desplegar manualmente
gcloud builds submit \
  --config=cloudbuild-backend.yaml \
  --project=unigrc-m
```

### 5.3 Verificar Despliegue

```bash
# Ver logs del despliegue
gcloud builds list --limit=1 --project=unigrc-m

# Ver logs de Cloud Run para confirmar que usa PgBouncer
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --limit=50 | grep -i "pgbouncer\|db config"
```

**Debes ver:**
```
[DB Config] Using: PgBouncer connection pooler at 10.x.x.x:6432
[DB Config] PgBouncer mode: Cloud Run poolMax=10 (PgBouncer handles real pooling to DB)
```

---

## ✅ Paso 6: Verificar que Funciona

### 6.1 Probar Endpoint

```bash
# Probar endpoint que antes tardaba 88-195s
curl -w "\nTime: %{time_total}s\n" \
  https://unigrc-backend-*.run.app/api/risks/page-data-lite

# Debe responder en <5s
```

### 6.2 Verificar Pool Metrics

```bash
# Ver logs de pool metrics
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --limit=100 | grep "Pool metrics"

# Debe mostrar:
# - waiting=0 (sin espera por conexiones)
# - utilization <80% (pool no saturado)
```

### 6.3 Verificar PgBouncer Stats

```bash
# Conectar a VM de PgBouncer
gcloud compute ssh unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --project=unigrc-m

# Conectar a PgBouncer admin
psql -h localhost -p 6432 -U pgbouncer pgbouncer

# Ver estadísticas
SHOW POOLS;
SHOW STATS;
SHOW CLIENTS;
```

---

## 🔄 Rollback (si algo falla)

### Rollback Rápido

```bash
# 1. Remover PGBOUNCER_URL (o usar versión vacía)
# El código automáticamente usará DATABASE_URL si PGBOUNCER_URL no está disponible

# 2. Revertir concurrency (opcional)
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --project=unigrc-m \
  --concurrency=10

# 3. Redeploy
git push origin main
```

---

## 📊 Checklist de Implementación

- [ ] Paso 1: Verificar estado actual (`./scripts/check-infrastructure.sh`)
- [ ] Paso 2: Configurar Cloud SQL Private IP (si no está)
- [ ] Paso 3: Configurar PgBouncer en VM (`./scripts/setup-pgbouncer-vm.sh`)
- [ ] Paso 4: Crear secret `PGBOUNCER_URL`
- [ ] Paso 5: Desplegar backend (push a main o manual)
- [ ] Paso 6: Verificar que funciona (endpoint <5s, pool metrics OK)

---

## 🆘 Troubleshooting

### Error: "VM no se puede crear"
- Verificar cuota de VMs en la región
- Verificar permisos de IAM

### Error: "PgBouncer no conecta a Cloud SQL"
- Verificar que Cloud SQL tiene Private IP
- Verificar firewall de Cloud SQL (debe permitir conexiones desde VPC)
- Verificar que PgBouncer tiene las credenciales correctas

### Error: "Cloud Run no conecta a PgBouncer"
- Verificar que VPC Connector está configurado
- Verificar firewall de la VM (debe permitir conexiones desde VPC Connector)
- Verificar que secret `PGBOUNCER_URL` existe y es correcto

### Error: "Pool sigue saturado"
- Verificar que `concurrency=1` está aplicado
- Verificar logs de PgBouncer (`SHOW POOLS;`)
- Considerar aumentar `default_pool_size` en `pgbouncer.ini`

---

## 📚 Referencias

- Plan completo: `docs/PLAN-ARQUITECTURA-A-PRUEBA-DE-BALAS.md`
- Implementación técnica: `docs/IMPLEMENTACION-PGBOUNCER.md`
- Scripts: `scripts/setup-pgbouncer-vm.sh`, `scripts/check-infrastructure.sh`

---

**¿Listo para empezar?** Ejecuta `./scripts/check-infrastructure.sh` para ver el estado actual.
