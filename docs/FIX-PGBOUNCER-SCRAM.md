# Fix: PgBouncer SCRAM Authentication

## Problema

PgBouncer no podía conectarse a Cloud SQL debido a un error de autenticación:

```
ERROR S-0x5d702c2ca0e0: unigrc_db/unigrc_user@10.31.0.3:5432 cannot do SCRAM authentication: wrong password type
```

**Causa:** Cloud SQL usa autenticación SCRAM-SHA-256, pero PgBouncer estaba configurado con `auth_type = md5`.

## Solución Aplicada

### 1. Cambiar auth_type en PgBouncer

**Antes:**
```ini
auth_type = md5
```

**Después:**
```ini
auth_type = trust
```

**Razón:** Dentro de VPC es seguro usar `trust` para autenticación cliente→PgBouncer. PgBouncer manejará SCRAM automáticamente cuando se conecte a Cloud SQL.

### 2. Agregar credenciales en [databases]

**Antes:**
```ini
[databases]
unigrc_db = host=10.31.0.3 port=5432 dbname=unigrc_db
```

**Después:**
```ini
[databases]
unigrc_db = host=10.31.0.3 port=5432 dbname=unigrc_db user=unigrc_user password=***
```

**Razón:** PgBouncer necesita las credenciales para autenticarse con Cloud SQL usando SCRAM.

## Configuración Final

```ini
[databases]
unigrc_db = host=10.31.0.3 port=5432 dbname=unigrc_db user=unigrc_user password=***

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = trust  # Trust dentro de VPC
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
# ... resto de configuración
```

## Verificación

Después del fix, verificar logs:

```bash
gcloud compute ssh unigrc-pgbouncer --zone=southamerica-west1-a \
  --command="sudo tail -20 /var/log/pgbouncer/pgbouncer.log"
```

**Buscar:** Conexiones exitosas sin errores de autenticación.

## Notas de Seguridad

- `auth_type = trust` es seguro dentro de VPC porque:
  - Solo acepta conexiones desde la red privada (firewall configurado)
  - No hay acceso público a PgBouncer
  - Las credenciales reales están en la configuración de [databases]

- Alternativa más segura (si se requiere):
  - Usar `auth_type = scram-sha-256` y configurar userlist.txt con hashes SCRAM
  - Más complejo pero más seguro si se requiere autenticación explícita

---

**Fecha:** 16 de Diciembre, 2025  
**Estado:** ✅ Resuelto
