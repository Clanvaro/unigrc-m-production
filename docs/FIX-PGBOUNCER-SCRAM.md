# Fix: PgBouncer SCRAM Authentication con Cloud SQL

## Problema

PgBouncer no podía conectarse a Cloud SQL porque Cloud SQL usa **SCRAM authentication**, y PgBouncer estaba intentando usar el password en texto plano en la configuración `[databases]`, lo cual no funciona con SCRAM.

**Error en logs:**
```
ERROR S-0x5d702c2ca0e0: unigrc_db/unigrc_user@10.31.0.3:5432 cannot do SCRAM authentication: wrong password type
```

## Solución

Usar archivo `.pgpass` para que PgBouncer pueda autenticarse con Cloud SQL usando SCRAM.

### Pasos Implementados

1. **Crear archivo `.pgpass`** en `/home/postgres/.pgpass`:
   ```
   10.31.0.3:5432:unigrc_db:unigrc_user:PASSWORD
   ```

2. **Configurar permisos:**
   ```bash
   chown postgres:postgres /home/postgres/.pgpass
   chmod 600 /home/postgres/.pgpass
   ```

3. **Actualizar configuración de PgBouncer** para NO incluir password en `[databases]`:
   ```ini
   [databases]
   unigrc_db = host=10.31.0.3 port=5432 dbname=unigrc_db user=unigrc_user
   ```

4. **Configurar servicio systemd** para usar `PGPASSFILE`:
   ```ini
   [Service]
   Environment="PGPASSFILE=/home/postgres/.pgpass"
   ```

## Verificación

```bash
# Verificar que .pgpass existe y tiene permisos correctos
sudo ls -la /home/postgres/.pgpass

# Probar conexión directa desde VM
PGPASSFILE=/home/postgres/.pgpass sudo -u postgres psql -h 10.31.0.3 -p 5432 -U unigrc_user -d unigrc_db -c 'SELECT version();'

# Ver logs de PgBouncer
sudo tail -f /var/log/pgbouncer/pgbouncer.log
```

## Estado

✅ **Fix aplicado**  
✅ **PgBouncer reiniciado**  
⏳ **Verificando conexiones desde Cloud Run**
