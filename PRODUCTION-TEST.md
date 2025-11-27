# Prueba de Sincronización de Cache en Producción

## Objetivo
Verificar que las actualizaciones en modales se reflejen instantáneamente en las tablas sin recargar la página.

## Pasos de Prueba

### 1. Abrir DevTools
- Presiona `F12` (Windows/Linux) o `Cmd+Option+I` (Mac)
- Ve a la pestaña **Console**
- Ve a la pestaña **Network**

### 2. Cargar la página de Controles
1. Navega a `/controls` en producción
2. En **Network**, busca la petición `GET /api/controls?limit=50&offset=0&paginate=true`
3. Debería retornar `200 OK`

### 3. Monitorear React Query en tiempo real
Ejecuta este código en la consola DESPUÉS de que la página cargue:

```javascript
// Espera 2 segundos para que React Query cargue los datos
setTimeout(() => {
  const cache = JSON.parse(localStorage.getItem('REACT_QUERY_OFFLINE_CACHE') || '{}');
  console.log('=== REACT QUERY CACHE ===');
  console.log('Cache keys:', Object.keys(cache.clientState?.queries || {}));
  console.log('Full cache:', cache);
}, 2000);
```

### 4. Prueba de Sincronización Real

**PASO A PASO:**

1. **Abre un control** (click en cualquier fila)
2. **Click en "Asociar Riesgo"**
3. **Selecciona un riesgo** del dropdown
4. **Click en "Asociar"**
5. **NO CIERRES EL MODAL**
6. **Mira la tabla de fondo** → Debería mostrar el nuevo conteo de riesgos INSTANTÁNEAMENTE
7. En **Network**, verás:
   - `POST /api/risks/{id}/controls` → 200 OK
   - `GET /api/controls?limit=50&offset=0&paginate=true` → 200 OK (refetch automático)

### 5. Verificar errores

En la **Console**, busca:
- ❌ Errores rojos relacionados con "query" o "cache"
- ❌ Mensajes sobre "cache key mismatch"
- ✅ NO debería aparecer ningún error de React Query

### 6. Verificar las claves de cache

Ejecuta este código DESPUÉS de asociar el riesgo:

```javascript
// Ver las claves de cache después de la mutación
const queryClient = window.__REACT_QUERY_DEVTOOLS_INSTANCE__?.getQueryCache();
const queries = queryClient?.getAll() || [];

console.log('=== QUERIES ACTIVAS ===');
queries.forEach(query => {
  console.log('Key:', JSON.stringify(query.queryKey));
  console.log('State:', query.state.status);
  console.log('---');
});
```

### 7. Resultados Esperados

✅ **CORRECTO:**
- La tabla se actualiza sin cerrar el modal
- No hay errores en la consola
- Las claves de cache tienen formato estable:
  ```
  ["/api/controls","paginated","{\"limit\":50,\"offset\":0,\"paginate\":true}"]
  ```

❌ **INCORRECTO (bug no resuelto):**
- Necesitas cerrar el modal para ver cambios
- Aparecen errores de "cache key mismatch"
- Las claves de cache tienen orden diferente de parámetros

## Comandos Útiles para Debugging

```javascript
// Limpiar cache y probar desde cero
localStorage.clear();
sessionStorage.clear();
location.reload();

// Ver estado de React Query
console.log(window.__REACT_QUERY_DEVTOOLS_INSTANCE__);

// Ver peticiones de red pendientes
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/'))
  .forEach(r => console.log(r.name, r.duration + 'ms'));
```

## Notas

- Los warnings de accesibilidad (`aria-hidden`) son separados y no afectan la funcionalidad
- El cache vacío al inicio es normal
- React Query solo persiste cache si está configurado explícitamente
