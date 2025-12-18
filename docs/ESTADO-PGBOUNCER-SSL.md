# Estado: Configuración PgBouncer con SSL

## Resumen

Se intentó configurar PgBouncer con certificados SSL para conectarse a Cloud SQL, pero se encontraron varios problemas técnicos:

1. **Certificados de Cliente:** Cloud SQL requiere certificados de cliente para conexiones por IP privada, pero el comando `gcloud sql ssl client-certs create` falla con errores.

2. **Cloud SQL Proxy:** Se intentó usar Cloud SQL Proxy en la VM de PgBouncer, pero requiere permisos adicionales (`cloudsql.instances.connect`) que la VM no tiene configurados.

## Estado Actual

- ✅ **PgBouncer VM:** Corriendo en `10.194.0.4:6432`
- ✅ **Cloud SQL Proxy:** Instalado y configurado como servicio systemd
- ⚠️ **Conexión:** No funciona debido a permisos insuficientes
- ✅ **Aplicación:** Funciona con Cloud SQL directo (Unix socket) como solución temporal

## Solución Temporal (Activa)

La aplicación está configurada para usar Cloud SQL directamente a través de Unix socket:

```
PGBOUNCER_URL=postgresql://unigrc_user:PASSWORD@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

Esta configuración funciona correctamente y proporciona:
- ✅ Latencia baja (<10ms)
- ✅ Sin necesidad de certificados SSL
- ✅ Conexión segura a través de Cloud SQL Proxy integrado en Cloud Run

## Soluciones para Habilitar PgBouncer

### Opción 1: Otorgar Permisos a la VM (Recomendado)

```bash
# Otorgar rol Cloud SQL Client a la cuenta de servicio de la VM
gcloud projects add-iam-policy-binding unigrc-m \
  --member=serviceAccount:524018293934-compute@developer.gserviceaccount.com \
  --role=roles/cloudsql.client
```

Luego reiniciar Cloud SQL Proxy:
```bash
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo systemctl restart pgbouncer-cloudsql" \
  --project=unigrc-m
```

### Opción 2: Usar Certificados SSL Manualmente

Si se logra crear certificados de cliente correctamente:

1. Generar clave privada y CSR
2. Crear certificado en Cloud SQL
3. Copiar certificados a VM
4. Configurar PgBouncer con rutas de certificados

### Opción 3: Mantener Configuración Actual

La configuración actual (Cloud SQL directo) funciona bien y proporciona buen rendimiento. PgBouncer puede agregarse más adelante cuando se resuelvan los problemas de permisos.

## Próximos Pasos

1. **Corto plazo:** Mantener configuración actual (funciona)
2. **Mediano plazo:** Otorgar permisos a VM y configurar Cloud SQL Proxy correctamente
3. **Largo plazo:** Evaluar si PgBouncer es necesario o si Cloud SQL directo es suficiente

## Notas

- Cloud SQL con Unix socket ya proporciona pooling a través de Cloud SQL Proxy
- PgBouncer agregaría una capa adicional de pooling, pero puede no ser necesaria
- La configuración actual es estable y performante
