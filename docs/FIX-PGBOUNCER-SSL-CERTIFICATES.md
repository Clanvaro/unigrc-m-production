# Fix: Configurar PgBouncer con Certificados SSL para Cloud SQL

## Problema

PgBouncer no puede conectarse a Cloud SQL porque Cloud SQL requiere certificados de cliente SSL cuando se conecta por IP privada.

**Error en logs:**
```
ERROR: connection requires a valid client certificate
TLS connect error: failed to load certificate file
```

## Estado Actual

- ✅ PgBouncer está corriendo en VM `unigrc-pgbouncer` (10.194.0.4:6432)
- ✅ SSL configurado en PgBouncer (`server_tls_sslmode = require`)
- ⚠️ Certificados de cliente necesitan ser configurados correctamente
- ⚠️ Cloud SQL requiere certificados de cliente para conexiones por IP

## Solución Temporal

**Usar Cloud SQL directamente (Unix socket) mientras se configura PgBouncer:**

```bash
# PGBOUNCER_URL apunta a Cloud SQL directamente (funciona)
postgresql://unigrc_user:PASSWORD@/unigrc_db?host=/cloudsql/unigrc-m:southamerica-west1:unigrc-db
```

Esto permite que la aplicación funcione mientras se configura PgBouncer correctamente.

## Solución Completa: Configurar Certificados SSL

### Paso 1: Generar Clave Privada y CSR

```bash
# Generar clave privada
openssl genrsa -out /tmp/pgbouncer-key.pem 2048

# Generar Certificate Signing Request (CSR)
openssl req -new -key /tmp/pgbouncer-key.pem -out /tmp/pgbouncer-csr.pem -subj "/CN=pgbouncer"
```

### Paso 2: Crear Certificado de Cliente en Cloud SQL

```bash
# Crear certificado de cliente en Cloud SQL
gcloud sql ssl client-certs create pgbouncer-client-cert /tmp/pgbouncer-csr.pem \
  --instance=unigrc-db \
  --project=unigrc-m
```

### Paso 3: Obtener Certificado Firmado

```bash
# Obtener certificado firmado por Cloud SQL
gcloud sql ssl client-certs describe pgbouncer-client-cert \
  --instance=unigrc-db \
  --project=unigrc-m \
  --format="get(cert)" > /tmp/client-cert.pem
```

### Paso 4: Copiar Certificados a PgBouncer VM

```bash
# Copiar clave privada
cat /tmp/pgbouncer-key.pem | gcloud compute ssh unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --command="sudo tee /etc/pgbouncer/ssl/client-key.pem > /dev/null && \
  sudo chown postgres:postgres /etc/pgbouncer/ssl/client-key.pem && \
  sudo chmod 600 /etc/pgbouncer/ssl/client-key.pem" \
  --project=unigrc-m

# Copiar certificado
cat /tmp/client-cert.pem | gcloud compute ssh unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --command="sudo tee /etc/pgbouncer/ssl/client-cert.pem > /dev/null && \
  sudo chown postgres:postgres /etc/pgbouncer/ssl/client-cert.pem && \
  sudo chmod 600 /etc/pgbouncer/ssl/client-cert.pem" \
  --project=unigrc-m

# Copiar certificado CA del servidor
gcloud sql instances describe unigrc-db \
  --project=unigrc-m \
  --format="get(serverCaCert.cert)" | \
  gcloud compute ssh unigrc-pgbouncer \
  --zone=southamerica-west1-a \
  --command="sudo tee /etc/pgbouncer/ssl/server-ca.pem > /dev/null && \
  sudo chown postgres:postgres /etc/pgbouncer/ssl/server-ca.pem && \
  sudo chmod 600 /etc/pgbouncer/ssl/server-ca.pem" \
  --project=unigrc-m
```

### Paso 5: Configurar PgBouncer

Asegurar que `/etc/pgbouncer/pgbouncer.ini` tiene:

```ini
[pgbouncer]
server_tls_sslmode = require
server_tls_ca_file = /etc/pgbouncer/ssl/server-ca.pem
server_tls_cert_file = /etc/pgbouncer/ssl/client-cert.pem
server_tls_key_file = /etc/pgbouncer/ssl/client-key.pem
```

### Paso 6: Reiniciar PgBouncer

```bash
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo systemctl restart pgbouncer" \
  --project=unigrc-m
```

### Paso 7: Verificar Conexión

```bash
# Probar conexión desde VM
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="PGPASSWORD='PASSWORD' psql -h localhost -p 6432 -U unigrc_user -d unigrc_db -c 'SELECT 1;'" \
  --project=unigrc-m
```

### Paso 8: Actualizar PGBOUNCER_URL

```bash
# Actualizar secret para usar PgBouncer
echo -n "postgresql://unigrc_user:PASSWORD@10.194.0.4:6432/unigrc_db?sslmode=disable" | \
  gcloud secrets versions add PGBOUNCER_URL --data-file=- --project=unigrc-m
```

## Verificación

```bash
# Ver logs de PgBouncer
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo tail -f /var/log/pgbouncer/pgbouncer.log" \
  --project=unigrc-m

# Verificar que no hay errores SSL
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo journalctl -u pgbouncer -n 50 --no-pager | grep -i 'error\|ssl\|tls'" \
  --project=unigrc-m
```

## Notas Importantes

1. **Certificado de Cliente:** Cloud SQL requiere certificados de cliente para conexiones por IP privada cuando SSL está habilitado.

2. **Clave Privada:** La clave privada debe generarse localmente y mantenerse segura. Cloud SQL no almacena la clave privada.

3. **Certificado CA:** El certificado CA del servidor se obtiene de la instancia de Cloud SQL.

4. **Permisos:** Todos los archivos de certificado deben tener permisos 600 y pertenecer al usuario `postgres`.

5. **Alternativa:** Si la configuración de certificados es compleja, se puede usar Cloud SQL directamente (Unix socket) que no requiere certificados.

## Estado

- ⏳ **En progreso:** Configuración de certificados SSL para PgBouncer
- ✅ **Temporal:** Aplicación funciona con Cloud SQL directo (Unix socket)
