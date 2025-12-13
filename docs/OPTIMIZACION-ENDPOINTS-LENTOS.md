# Optimización de Endpoints Lentos

## Problema Identificado

Los endpoints `/api/risks` y `/api/users` estaban tardando aproximadamente **19-20 segundos** en responder, muy por encima del umbral de 3 segundos configurado en el middleware de performance.

### Síntomas
- Errores `504 Gateway Timeout` en el frontend
- Logs mostrando: `Very slow endpoint detected` con duraciones de ~19-20 segundos
- Interface de usuario mostrando estado de carga (skeleton) indefinidamente

## Análisis de la Causa

### Endpoint `/api/risks`
1. **Falta de índices optimizados**: La consulta `getRisksPaginated` realiza dos consultas separadas (COUNT y SELECT) con filtros complejos que no estaban optimizados con índices apropiados.
2. **Consultas secuenciales**: Se ejecutaban dos consultas separadas en lugar de optimizar la consulta única.
3. **Búsquedas de texto sin índices**: Las búsquedas por texto (name, code, description) usaban `LIKE` sin índices de texto completo.

### Endpoint `/api/users`
1. **Falta de índice en `created_at`**: El `ORDER BY created_at` no tenía un índice dedicado.
2. **Consulta sin límite**: Aunque el caché ayuda, en caso de cache miss, la consulta traía todos los usuarios sin límite.

## Soluciones Implementadas

### 1. Índices de Base de Datos

Se creó el archivo `migrations/optimize-slow-endpoints.sql` con los siguientes índices:

#### Para `/api/risks`:
- **`idx_risks_pagination_optimized`**: Índice compuesto para optimizar filtrado y ordenamiento
  ```sql
  (deleted_at, status, created_at DESC) 
  WHERE deleted_at IS NULL AND status != 'deleted'
  ```

- **`idx_risks_search_text`**: Índice GIN para búsquedas de texto completo (name, code, description)

- **`idx_risks_probability_impact`**: Índice compuesto para filtros de probabilidad e impacto

#### Para `/api/users`:
- **`idx_users_created_at`**: Índice para ordenamiento por fecha de creación
- **`idx_users_active_created`**: Índice compuesto para usuarios activos ordenados

### 2. Optimización del Código

#### `getRisksPaginated`:
- Se optimizó el orden de ejecución de las consultas para aprovechar mejor los índices
- Se añadieron logs de rendimiento para monitorear el tiempo de ejecución

#### Endpoint `/api/users`:
- Se añadieron logs de rendimiento
- Se añadió validación de tiempos de ejecución con warnings

## Instrucciones para Aplicar las Optimizaciones

### Paso 1: Ejecutar la Migración SQL

Ejecuta el script de migración en tu base de datos:

```bash
# Para Google Cloud SQL
psql "your-connection-string" -f migrations/optimize-slow-endpoints.sql

# O ejecuta el SQL directamente en la consola de tu base de datos
```

**Importante**: Usa `CONCURRENTLY` para crear los índices sin bloquear la tabla (los índices en el script ya usan esto).

### Paso 2: Verificar que los Índices se Crearon

Ejecuta esta consulta para verificar:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('risks', 'users') 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

Deberías ver los siguientes índices nuevos:
- `idx_risks_pagination_optimized`
- `idx_risks_search_text`
- `idx_risks_probability_impact`
- `idx_users_created_at`
- `idx_users_active_created`

### Paso 3: Reiniciar la Aplicación

Después de crear los índices, reinicia la aplicación para que los cambios surtan efecto:

```bash
# Si estás usando Cloud Run, el reinicio es automático después del despliegue
# Si estás en desarrollo local, reinicia el servidor
```

## Resultados Esperados

Después de aplicar estas optimizaciones, deberías ver:

1. **Tiempos de respuesta mejorados**:
   - `/api/risks`: De ~19 segundos a **< 500ms** (primera consulta) y **< 50ms** (con caché)
   - `/api/users`: De ~19 segundos a **< 200ms** (primera consulta) y **< 50ms** (con caché)

2. **Menos errores 504**: El frontend debería recibir respuestas dentro del timeout

3. **Mejor experiencia de usuario**: La interfaz debería cargar más rápidamente

## Monitoreo

Los logs ahora incluyen información de rendimiento:

```
✅ Successfully fetched X users in Yms
[DB RESULT] /api/risks returned X risks, total=Y in Zms
```

Si ves warnings como:
```
⚠️ Slow getRisksPaginated query: Xms. Check if indexes are properly created.
⚠️ Slow getUsers() query: Xms for Y users
```

Esto indica que los índices no se crearon correctamente o hay un problema con la base de datos.

## Notas Adicionales

- Los índices se crean con `CONCURRENTLY` para no bloquear las tablas durante la creación
- El caché de 2 niveles (memoria + Redis) seguirá funcionando y mejorará aún más el rendimiento en solicitudes subsiguientes
- Los índices parciales (con `WHERE`) son más eficientes en espacio y rendimiento para filtros comunes

## Solución de Problemas

Si después de aplicar las optimizaciones los endpoints siguen siendo lentos:

1. Verifica que los índices se crearon correctamente
2. Ejecuta `VACUUM ANALYZE risks;` y `VACUUM ANALYZE users;` para actualizar estadísticas
3. Verifica los logs para ver si hay consultas específicas que están tardando
4. Considera aumentar el tamaño del pool de conexiones si hay muchas solicitudes concurrentes
