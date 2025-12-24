# Troubleshooting: Eventos de Riesgo No Muestran Datos

## Problema
La página de eventos de riesgo muestra "No hay datos para mostrar" aunque debería haber eventos.

## Soluciones Implementadas

### 1. Fallback a Tabla Directa
Si la vista materializada `risk_events_list_view` no existe, el sistema ahora usa la tabla `risk_events` directamente.

### 2. Logs de Debug
- Logs en consola del navegador (F12 → Console)
- Logs en servidor mostrando tiempo de queries y errores

## Cómo Diagnosticar

### Paso 1: Verificar Logs del Navegador

Abre DevTools (F12) → Console y busca:
```
[DEBUG] Risk events response: { eventsCount: 0, total: 0 }
[ERROR] Failed to fetch risk events: ...
```

### Paso 2: Verificar Logs del Servidor

Busca en los logs del servidor:
```
[PERF] /api/pages/risk-events data fetch: 150ms (events: 0, total: 0)
[WARN] risk_events_list_view does not exist, falling back to risk_events table
[ERROR] /api/pages/risk-events failed: ...
```

### Paso 3: Verificar si Hay Eventos en la Base de Datos

```sql
-- Verificar si hay eventos
SELECT COUNT(*) FROM risk_events WHERE deleted_at IS NULL;

-- Si hay eventos, verificar la vista materializada
SELECT COUNT(*) FROM risk_events_list_view;
```

### Paso 4: Verificar si la Vista Materializada Existe

```sql
-- Verificar si la vista existe
SELECT 1 FROM pg_matviews WHERE matviewname = 'risk_events_list_view';

-- Si no existe, crearla
-- Ejecuta: npm run apply-risk-events-list-view
```

## Soluciones

### Si la Vista No Existe

1. **Ejecutar migración:**
   ```bash
   npm run apply-risk-events-list-view
   ```

2. **O manualmente en SQL:**
   ```sql
   -- Ver el archivo de migración
   cat migrations/create-risk-events-list-view.sql
   -- Luego ejecutar el contenido en tu base de datos
   ```

### Si Hay Eventos pero No se Muestran

1. **Verificar que el endpoint responde:**
   ```bash
   curl http://localhost:5000/api/pages/risk-events?limit=25&offset=0 \
     -H "Cookie: session=..."
   ```

2. **Verificar estructura de respuesta:**
   La respuesta debe tener:
   ```json
   {
     "riskEvents": {
       "data": [...],
       "pagination": { "total": 0, ... }
     },
     "counts": {...},
     "catalogs": {...}
   }
   ```

3. **Verificar que el frontend está parseando correctamente:**
   - Abre DevTools → Network
   - Busca la request a `/api/pages/risk-events`
   - Verifica la respuesta JSON

### Si No Hay Eventos en la Base de Datos

1. **Crear un evento de prueba:**
   - Usa el botón "+ Nuevo Evento" en la interfaz
   - O crea uno directamente en la base de datos

2. **Verificar que los eventos no están eliminados:**
   ```sql
   SELECT * FROM risk_events WHERE deleted_at IS NULL LIMIT 5;
   ```

## Verificación Rápida

1. **Abre DevTools (F12)**
2. **Ve a Console**
3. **Recarga la página**
4. **Busca estos logs:**
   - `[DEBUG] Risk events response:` - Muestra cuántos eventos se recibieron
   - `[ERROR]` - Muestra errores si los hay

5. **Ve a Network**
6. **Busca la request a `/api/pages/risk-events`**
7. **Verifica:**
   - Status: 200 OK
   - Response: JSON con estructura correcta
   - `riskEvents.data`: Array con eventos (puede estar vacío si no hay eventos)

## Próximos Pasos

Si después de verificar todo lo anterior sigue sin mostrar datos:

1. Verifica los logs del servidor para errores específicos
2. Verifica que la base de datos tiene eventos
3. Verifica que la vista materializada existe y está actualizada
4. Verifica que el frontend está parseando correctamente la respuesta

