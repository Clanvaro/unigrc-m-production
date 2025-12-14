# Plan de Implementación: Cloud Run → Cloud SQL por IP Privada

## Objetivo
Reducir la latencia de conexión de Cloud Run a Cloud SQL de 1-3.6s a <10ms mediante conexión privada usando VPC Connector.

## Estado Actual
- Cloud Run usa Unix socket (`/cloudsql/...`) que aún puede tener latencia alta
- Cloud SQL tiene IP pública habilitada
- Latencia actual: 1-3.6s (inaceptable)

## Arquitectura Objetivo
```
Cloud Run → VPC Connector → VPC Network → Cloud SQL (Private IP)
```

## Prerrequisitos
- Proyecto GCP: `unigrc-m`
- Región: `southamerica-west1`
- Cloud SQL Instance: `unigrc-db`
- Cloud Run Service: `unigrc-backend`

## Plan de Implementación (Paso a Paso)

### FASE 1: Preparación y Verificación (30 min)

#### 1.1 Verificar estado actual de Cloud SQL
```bash
# Verificar configuración actual
gcloud sql instances describe unigrc-db \
  --format="yaml(settings.ipConfiguration)"

# Verificar si ya tiene Private IP
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[0].type)"
```

#### 1.2 Verificar VPC Network existente
```bash
# Listar VPCs existentes
gcloud compute networks list

# Si no existe, necesitaremos crear uno
```

#### 1.3 Verificar DATABASE_URL actual
```bash
# Ver el DATABASE_URL actual
gcloud secrets versions access latest --secret="DATABASE_URL"
```

### FASE 2: Habilitar Private IP en Cloud SQL (15-30 min)

#### 2.1 Crear VPC Network (si no existe)
```bash
# Crear VPC Network para Cloud SQL Private IP
gcloud compute networks create unigrc-vpc \
  --subnet-mode=auto \
  --bgp-routing-mode=regional \
  --description="VPC Network for Cloud SQL Private IP connection"

# Verificar creación
gcloud compute networks describe unigrc-vpc
```

#### 2.2 Habilitar Private IP en Cloud SQL
```bash
# IMPORTANTE: Esto requiere que la instancia esté detenida o en modo de mantenimiento
# Verificar estado primero
gcloud sql instances describe unigrc-db \
  --format="value(state)"

# Habilitar Private IP (esto puede tomar 5-10 minutos)
gcloud sql instances patch unigrc-db \
  --network=projects/unigrc-m/global/networks/unigrc-vpc \
  --no-assign-ip

# O si prefieres mantener IP pública también (para rollback):
gcloud sql instances patch unigrc-db \
  --network=projects/unigrc-m/global/networks/unigrc-vpc

# Verificar que Private IP fue asignada
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"
```

**⚠️ ADVERTENCIA:** 
- Esto puede causar downtime temporal (5-10 min)
- Asegúrate de tener backup antes de proceder
- Considera hacer esto en ventana de mantenimiento

#### 2.3 Obtener Private IP de Cloud SQL
```bash
# Obtener la IP privada asignada
PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

echo "Cloud SQL Private IP: $PRIVATE_IP"
```

### FASE 3: Crear VPC Connector (Serverless VPC Access) (10-15 min)

#### 3.1 Habilitar API de Serverless VPC Access
```bash
# Habilitar API
gcloud services enable vpcaccess.googleapis.com

# Verificar
gcloud services list --enabled | grep vpcaccess
```

#### 3.2 Crear VPC Connector
```bash
# Crear VPC Connector en la misma región que Cloud Run
gcloud compute networks vpc-access connectors create unigrc-connector \
  --region=southamerica-west1 \
  --subnet=unigrc-vpc \
  --subnet-project=unigrc-m \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro

# Verificar creación (puede tomar 5-10 minutos)
gcloud compute networks vpc-access connectors describe unigrc-connector \
  --region=southamerica-west1
```

**Notas importantes:**
- `min-instances=2`: Mantiene 2 instancias siempre activas (reduce cold start)
- `max-instances=3`: Límite de escalado
- `machine-type=e2-micro`: Suficiente para tráfico moderado

### FASE 4: Conectar Cloud Run al VPC Connector (5 min)

#### 4.1 Actualizar Cloud Run para usar VPC Connector
```bash
# Conectar Cloud Run al VPC Connector
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --vpc-connector=unigrc-connector \
  --vpc-egress=private-ranges-only

# Verificar
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.metadata.annotations)"
```

**Opciones de `--vpc-egress`:**
- `all-traffic`: Todo el tráfico sale por VPC (recomendado para Private IP)
- `private-ranges-only`: Solo rangos privados por VPC (más seguro)

### FASE 5: Actualizar DATABASE_URL (5 min)

#### 5.1 Obtener contraseña actual
```bash
# Obtener DATABASE_URL actual para extraer contraseña
CURRENT_DB_URL=$(gcloud secrets versions access latest --secret="DATABASE_URL")
echo $CURRENT_DB_URL

# Extraer contraseña (ajustar según formato actual)
# Si es: postgresql://user:pass@host/db
# Necesitas extraer 'pass'
```

#### 5.2 Crear nuevo DATABASE_URL con Private IP
```bash
# Obtener Private IP
PRIVATE_IP=$(gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)")

# Crear nuevo DATABASE_URL (reemplazar PASSWORD con la real)
NEW_DB_URL="postgresql://unigrc_user:PASSWORD@${PRIVATE_IP}:5432/unigrc_db?sslmode=require"

# Agregar nueva versión al secret
echo -n "$NEW_DB_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

# Verificar
gcloud secrets versions access latest --secret="DATABASE_URL"
```

**Formato Private IP:**
```
postgresql://user:password@PRIVATE_IP:5432/database?sslmode=require
```

### FASE 6: Actualizar cloudbuild-backend.yaml (5 min)

#### 6.1 Agregar flags de VPC al despliegue
Actualizar `cloudbuild-backend.yaml`:

```yaml
# En el paso de deploy, agregar:
- '--vpc-connector=unigrc-connector'
- '--vpc-egress=all-traffic'
```

**⚠️ IMPORTANTE:** 
- Remover `--add-cloudsql-instances` ya que usaremos IP privada directa
- O mantenerlo si quieres usar ambos métodos (Unix socket + Private IP)

### FASE 7: Verificación y Pruebas (15 min)

#### 7.1 Verificar conexión desde Cloud Run
```bash
# Revisar logs de Cloud Run
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=50

# Buscar mensajes de conexión a BD
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=100 | grep -i "database\|db\|sql\|connection"
```

#### 7.2 Probar endpoint
```bash
# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(status.url)")

# Probar endpoint de health check o API
curl "${SERVICE_URL}/api/health" || echo "Endpoint no disponible, probar otro"
```

#### 7.3 Medir latencia
```bash
# Desde Cloud Run, medir tiempo de conexión a BD
# Revisar logs para ver tiempos de respuesta
gcloud run services logs read unigrc-backend \
  --region=southamerica-west1 \
  --limit=200 | grep -i "duration\|time\|latency\|ms"
```

### FASE 8: Optimización y Ajustes (Opcional)

#### 8.1 Ajustar configuración de VPC Connector
```bash
# Si necesitas más capacidad
gcloud compute networks vpc-access connectors update unigrc-connector \
  --region=southamerica-west1 \
  --min-instances=3 \
  --max-instances=5 \
  --machine-type=e2-small
```

#### 8.2 Monitorear costos
```bash
# VPC Connector tiene costo por instancia-hora
# Verificar uso en Cloud Console > Serverless VPC Access
```

## Rollback Plan (Si algo falla)

### Opción 1: Revertir a Unix Socket
```bash
# 1. Restaurar DATABASE_URL anterior
gcloud secrets versions access <VERSION_ANTERIOR> --secret="DATABASE_URL" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# 2. Remover VPC Connector de Cloud Run
gcloud run services update unigrc-backend \
  --region=southamerica-west1 \
  --clear-vpc-connector \
  --clear-vpc-egress

# 3. Restaurar --add-cloudsql-instances en cloudbuild-backend.yaml
```

### Opción 2: Restaurar IP Pública
```bash
# Habilitar IP pública nuevamente
gcloud sql instances patch unigrc-db \
  --assign-ip

# Actualizar DATABASE_URL a formato IP pública
# (usar IP pública obtenida con: gcloud sql instances describe unigrc-db)
```

## Checklist de Implementación

### Pre-implementación
- [ ] Backup de base de datos realizado
- [ ] Ventana de mantenimiento programada (si es necesario)
- [ ] Equipo notificado del cambio
- [ ] Plan de rollback revisado

### Durante implementación
- [ ] FASE 1: Verificación completada
- [ ] FASE 2: Private IP habilitada en Cloud SQL
- [ ] FASE 3: VPC Connector creado
- [ ] FASE 4: Cloud Run conectado a VPC
- [ ] FASE 5: DATABASE_URL actualizado
- [ ] FASE 6: cloudbuild-backend.yaml actualizado
- [ ] FASE 7: Verificación y pruebas exitosas

### Post-implementación
- [ ] Latencia medida y verificada (<10ms)
- [ ] Aplicación funcionando correctamente
- [ ] Logs revisados sin errores
- [ ] Monitoreo configurado
- [ ] Documentación actualizada

## Costos Estimados

### VPC Connector
- **Costo base:** ~$0.10 por instancia-hora
- **Con min-instances=2:** ~$144/mes (2 instancias × 24h × 30 días × $0.10)
- **Tráfico:** Gratis (dentro de la misma región)

### VPC Network
- **Costo:** Gratis (solo se cobra por recursos usados)

### Cloud SQL Private IP
- **Costo:** Sin costo adicional (solo el costo normal de Cloud SQL)

**Total estimado:** ~$144/mes adicionales por VPC Connector

## Beneficios Esperados

- ✅ **Latencia reducida:** De 1-3.6s a <10ms
- ✅ **Mayor seguridad:** Tráfico dentro de red privada
- ✅ **Mejor rendimiento:** Sin overhead de SSL/TLS público
- ✅ **Escalabilidad:** VPC Connector escala automáticamente

## Troubleshooting

### Error: "VPC connector not found"
```bash
# Verificar que el connector existe
gcloud compute networks vpc-access connectors list \
  --region=southamerica-west1
```

### Error: "Cannot connect to database"
```bash
# Verificar Private IP
gcloud sql instances describe unigrc-db \
  --format="value(ipAddresses[?type=='PRIVATE'].ipAddress)"

# Verificar que Cloud Run tiene VPC Connector
gcloud run services describe unigrc-backend \
  --region=southamerica-west1 \
  --format="value(spec.template.metadata.annotations)"
```

### Error: "Connection timeout"
```bash
# Verificar que VPC Connector está activo
gcloud compute networks vpc-access connectors describe unigrc-connector \
  --region=southamerica-west1 \
  --format="value(state)"

# Verificar logs de VPC Connector
gcloud logging read "resource.type=vpc_access_connector" --limit=50
```

## Referencias

- [Cloud SQL Private IP](https://cloud.google.com/sql/docs/postgres/configure-private-ip)
- [Serverless VPC Access](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
- [Cloud Run VPC Egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc)

## Notas Finales

- Este plan está diseñado para implementarse en **ventana de mantenimiento** debido al posible downtime durante la habilitación de Private IP
- Tiempo total estimado: **1-2 horas**
- Considera hacer esto en **horario de bajo tráfico**
- Mantén el plan de rollback a mano durante toda la implementación
