# Solución: Caché Obsoleto en Producción

## Problema
Después de desplegar el fix de asociaciones riesgo-control, la tabla en producción todavía muestra datos incorrectos (R-0002 muestra 1 control cuando debería mostrar 2).

## Causa
Redis en producción tiene cachés de la versión v1 (antes del fix) que no se invalidaron automáticamente con el despliegue.

## ✅ Solución (PROBADA Y FUNCIONANDO)

### Opción 1: Script Bash (La Más Fácil) ⭐

Ejecuta este comando en la consola de Replit en **producción**:

```bash
./scripts/clear-production-cache.sh
```

El script automáticamente:
- ✅ Llama al endpoint de limpieza de caché
- ✅ Muestra la confirmación del servidor
- ✅ Te da instrucciones de verificación

**Salida esperada:**
```json
{
  "message": "Caché invalidado exitosamente",
  "tenantId": "tenant-1",
  "timestamp": "2025-11-19T23:59:08.545Z"
}
```

### Opción 2: Desde el Navegador (JavaScript Console)

Si prefieres ejecutarlo desde el navegador:

1. Abre la aplicación en producción
2. Inicia sesión
3. Presiona **F12** para abrir las herramientas de desarrollador
4. Ve a la pestaña **Console**
5. Pega este código y presiona Enter:

```javascript
fetch('/api/risk-controls/clear-cache', { 
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ Caché limpiado:', data);
    alert('Caché limpiado exitosamente. Recarga la página con Ctrl+Shift+R');
  })
  .catch(err => console.error('❌ Error:', err));
```

### Opción 3: Usando curl (Para Avanzados)

```bash
curl -X POST https://tu-app.replit.app/api/risk-controls/clear-cache \
  -H "Content-Type: application/json" \
  -H "Cookie: tu-cookie-de-sesion"
```

## Verificación

Después de ejecutar cualquiera de las opciones:

1. Abre la aplicación en el navegador
2. Recarga con Ctrl+Shift+R (vaciar caché del navegador)
3. Ve a Gestión de Riesgos → R-0002
4. Verifica que la tabla muestre **2 controles asociados**
5. Abre el modal de controles y confirma que coincide con la tabla

## Por Qué Sucedió Esto

El caché de Redis es **persistente en producción** (a diferencia de desarrollo donde se limpia en cada reinicio). Cuando desplegamos el fix:

1. ✅ El código nuevo se desplegó correctamente
2. ❌ Los cachés antiguos (v1) siguieron activos en Redis
3. ❌ Las consultas GET seguían devolviendo datos del caché v1

La invalidación automática solo funciona cuando hay **mutaciones** (crear/eliminar asociaciones). Como no hubo mutaciones después del despliegue, los cachés antiguos permanecieron activos.

## Prevención Futura

Para prevenir esto en futuros despliegues que cambien la estructura de datos en caché:

1. **Incrementar versión de caché** en `server/cache-helpers.ts`:
   ```typescript
   const RISK_CONTROL_CACHE_VERSION = "v3"; // Incrementar
   ```

2. **Ejecutar script de invalidación** inmediatamente después de cada despliegue que cambie queries críticas

3. **Agregar health check** que compare versiones de caché entre desarrollo y producción

## Referencias

- Fix implementado: `BUGFIX-RISK-CONTROL-ASSOCIATIONS.md`
- Función unificada: `server/storage.ts` → `getRiskControlAssociations()`
- Cache helpers: `server/cache-helpers.ts`
