# Solución: PgBouncer con SCRAM Authentication (Cloud SQL)

## Problema Actual

PgBouncer no puede conectarse a Cloud SQL porque Cloud SQL usa **SCRAM-SHA-256** authentication, y PgBouncer necesita configuración especial para manejar esto.

**Error:**
```
ERROR: cannot do SCRAM authentication: wrong password type
WARNING: pgbouncer cannot connect to server
```

## Soluciones Probadas

### 1. Usar archivo `.pgpass` ❌ (No funcionó completamente)

PgBouncer debería usar `.pgpass` automáticamente, pero hay problemas con cómo lo lee.

### 2. Solución Recomendada: Usar Cloud SQL Proxy

La mejor solución para Cloud SQL es usar **Cloud SQL Proxy** en lugar de conexión directa por IP privada.

**Ventajas:**
- Maneja SCRAM automáticamente
- Más seguro (Unix sockets)
- Mejor integración con Cloud SQL

**Configuración:**

1. Instalar Cloud SQL Proxy en la VM
2. Configurar PgBouncer para usar Unix socket del proxy
3. Configurar `.pgpass` para el proxy

### 3. Solución Alternativa: Usar conexión directa sin PgBouncer

Si PgBouncer sigue dando problemas, se puede:
- Usar conexión directa a Cloud SQL desde Cloud Run
- Aumentar el pool de conexiones en Cloud Run
- Optimizar queries para reducir necesidad de pooling

## Estado Actual

- ✅ PgBouncer está corriendo
- ✅ `.pgpass` configurado
- ❌ PgBouncer no puede autenticarse con Cloud SQL (SCRAM)
- ⏳ **Recomendación: Implementar Cloud SQL Proxy o usar conexión directa**

## Próximos Pasos

1. **Opción A:** Implementar Cloud SQL Proxy en VM
2. **Opción B:** Volver a conexión directa (temporal) y optimizar pool
3. **Opción C:** Investigar configuración avanzada de PgBouncer para SCRAM
