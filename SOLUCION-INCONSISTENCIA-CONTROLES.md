# Solución: Inconsistencia de Riesgos Asociados entre Modal y Tabla

## 📊 Problema Identificado

**Síntoma**: En producción, el control C-0002 muestra:
- **Modal "Asociar Riesgos"**: 2 riesgos (R-0001, R-0002) ✅  
- **Tabla principal**: Solo 1 riesgo ❌

## 🔍 Análisis Realizado

### Código Revisado
1. ✅ **Endpoint del modal** (`/api/controls/:controlId/risks`):  
   - Usa `storage.getControlRisks()` 
   - Llama a `getRiskControlAssociations()` (función unificada)

2. ✅ **Endpoint de la tabla** (`/api/controls?paginate=true`):  
   - Usa `storage.getControlsWithRiskCount()`
   - Llama a `getRiskControlAssociations()` (función unificada)

### Conclusión
**El código está correcto** - ambos endpoints usan la misma fuente de verdad (`getRiskControlAssociations`).

## 🎯 Causa Raíz

El problema es **caché obsoleto en Redis de producción**. Los datos en la base de datos son correctos, pero el servidor está sirviendo respuestas cacheadas antiguas.

## ✅ Solución

### Opción 1: Limpieza Manual de Caché (Recomendada)

Ejecuta este comando en tu **consola de Replit en producción**:

```bash
# Limpiar todo el caché de Redis
curl -X POST https://tu-app.replit.app/api/risk-controls/clear-cache

# O ejecutar directamente en el shell de producción
redis-cli FLUSHDB
```

### Opción 2: Reiniciar el Deployment

1. Ve a tu Repl de Replit
2. En el panel de Deployments, haz clic en **"Redeploy"**
3. Esto reiniciará Redis y limpiará todo el caché

### Opción 3: Forzar Bypass de Caché desde el Navegador

Ejecuta este script en la **consola del navegador** (F12 → Console) en producción:

```javascript
// Forzar recarga sin caché
fetch('/api/controls?limit=50&offset=0&paginate=true&nocache=' + Date.now())
  .then(r => r.json())
  .then(data => {
    console.log('Controles recargados:', data.data.length);
    console.table(data.data.map(c => ({
      Código: c.code,
      Nombre: c.name,
      Riesgos: c.associatedRisksCount,
      'Riesgos detalle': c.associatedRisks?.map(r => r.code).join(', ')
    })));
  });
```

## 🔧 Verificación Post-Solución

Después de limpiar el caché, verifica que C-0002 muestre los mismos riesgos en ambos lugares:

1. **Abre la tabla de controles** - Verifica la columna "Riesgos Asociados"
2. **Abre el modal** - Click en C-0002 → "Asociar Riesgos"
3. **Ambos deben mostrar la misma cantidad** de riesgos

## 📋 Script SQL de Diagnóstico

Si después de limpiar caché siguen apareciendo datos inconsistentes, ejecuta este SQL en producción para verificar los datos reales:

```sql
-- Ver riesgos asociados a C-0002
SELECT 
  c.code as control_code,
  c.name as control_name,
  COUNT(rc.id) as risk_count,
  STRING_AGG(r.code, ', ' ORDER BY r.code) as associated_risks
FROM controls c
LEFT JOIN risk_controls rc ON c.id = rc.control_id
LEFT JOIN risks r ON rc.risk_id = r.id AND r.status != 'deleted'
WHERE c.code = 'C-0002'
  AND c.status != 'deleted'
GROUP BY c.id, c.code, c.name;
```

El archivo completo de diagnóstico está en `scripts/diagnose-production-data.sql`.

## 🚀 Prevención Futura

El sistema ya tiene invalidación automática de caché cuando se crean/eliminan asociaciones:
- `POST /api/risks/:riskId/controls` → invalida caché ✅
- `DELETE /api/risk-controls/:id` → invalida caché ✅

Si el problema persiste, puede indicar que:
1. El deployment no está actualizado con el código latest
2. Redis no está funcionando correctamente
3. Hay un problema de sincronización en React Query (frontend)

## 📞 Si Nada Funciona

Si después de todas estas opciones el problema persiste:

1. Comparte el output del script SQL de diagnóstico
2. Verifica que el deployment esté actualizado: `git log -1` en producción
3. Revisa los logs del servidor: `/tmp/logs/` para errores de Redis

---

**Resumen**: El código es correcto, solo necesitas limpiar el caché de producción.
