# Fix Completo: PgBouncer con SCRAM-SHA-256 Authentication

## ✅ Solución Implementada

### Problema
PgBouncer no podía conectarse a Cloud SQL porque Cloud SQL usa **SCRAM-SHA-256** authentication, y la configuración inicial no estaba correcta.

### Solución

1. **Configurar `auth_type = scram-sha-256`** en `pgbouncer.ini`
2. **Usar password en texto plano** en `userlist.txt` (necesario para conexiones backend)
3. **NO incluir password** en la configuración `[databases]`

### Configuración Final

**`/etc/pgbouncer/pgbouncer.ini`:**
```ini
[databases]
unigrc_db = host=10.31.0.3 port=5432 dbname=unigrc_db user=unigrc_user

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_round_robin = 1
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
admin_users = pgbouncer
stats_users = pgbouncer
pidfile = /var/run/postgresql/pgbouncer.pid
logfile = /var/log/pgbouncer/pgbouncer.log
```

**`/etc/pgbouncer/userlist.txt`:**
```
"unigrc_user" "PASSWORD_EN_TEXTO_PLANO"
"pgbouncer" "pgbouncer"
```

**Servicio systemd (`/etc/systemd/system/pgbouncer.service`):**
```ini
[Unit]
Description=PgBouncer connection pooler
After=network.target

[Service]
Type=forking
User=postgres
Group=postgres
WorkingDirectory=/home/postgres
Environment="PGPASSFILE=/home/postgres/.pgpass"
Environment="HOME=/home/postgres"
ExecStart=/usr/sbin/pgbouncer -d /etc/pgbouncer/pgbouncer.ini
ExecReload=/bin/kill -HUP $MAINPID
PIDFile=/var/run/postgresql/pgbouncer.pid
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Puntos Clave

1. **`auth_type = scram-sha-256`**: Necesario para que PgBouncer maneje SCRAM correctamente
2. **Password en texto plano en `userlist.txt`**: PgBouncer necesita el password en texto plano para conectarse al backend (no puede usar SCRAM hashes para conexiones salientes)
3. **NO incluir password en `[databases]`**: El password debe estar solo en `userlist.txt`
4. **`.pgpass` file**: Opcional pero útil para debugging y conexiones directas

## Verificación

```bash
# Ver logs de PgBouncer
sudo tail -f /var/log/pgbouncer/pgbouncer.log

# Buscar conexiones exitosas
grep "new connection to server" /var/log/pgbouncer/pgbouncer.log

# Verificar estado
sudo systemctl status pgbouncer

# Probar conexión desde Cloud Run
gcloud run services logs read unigrc-backend --region=southamerica-west1 --limit=50 | grep "New database connection"
```

## Estado

✅ **PgBouncer configurado correctamente**  
✅ **Conexiones exitosas a Cloud SQL**  
✅ **SCRAM-SHA-256 funcionando**  
✅ **Cloud Run puede conectarse a través de PgBouncer**

---

**Fecha:** 16 de Diciembre, 2025  
**Versión PgBouncer:** 1.16.1  
**Cloud SQL Auth:** scram-sha-256
