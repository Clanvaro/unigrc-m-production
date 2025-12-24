# Optimización de Índices para Matriz de Riesgo

## 📋 Descripción

Este script agrega índices específicos para optimizar la query del endpoint `/api/dashboard/risk-matrix`, que es una de las queries más complejas del sistema.

## 🎯 Objetivo

Reducir el tiempo de carga de la página de matriz de riesgo de **5-10 segundos** a **< 2 segundos** cuando hay cache, y mejorar significativamente el tiempo cuando no hay cache.

## 📊 Índices Creados

### **risk_controls**
- `idx_risk_controls_risk_id_group` - Para GROUP BY risk_id
- `idx_risk_controls_control_id_deleted` - Para JOIN con controls
- `idx_risk_controls_risk_control_composite` - Índice compuesto para optimizar ambos JOINs

### **controls**
- `idx_controls_id_deleted_matrix` - Para JOIN con risk_controls (filtro deleted_at)
- `idx_controls_code` - Para ORDER BY code
- `idx_controls_effect_target` - Para filtrado por effect_target
- `idx_controls_effectiveness_deleted` - Para cálculos de efectividad

### **risk_process_links**
- `idx_risk_process_links_risk_validation` - Para GROUP BY con filtrado de validation_status
- `idx_risk_process_links_risk_created_distinct` - Para DISTINCT ON con ORDER BY

### **risks**
- `idx_risks_matrix_query` - Índice compuesto para filtro + ordenamiento (status, deleted_at, inherent_risk DESC)

## 🚀 Cómo Aplicar

### Opción 1: Usando el script bash (Recomendado)
```bash
./scripts/apply-risk-matrix-indexes.sh
```

### Opción 2: Directamente con psql
```bash
psql $DATABASE_URL -f migrations/optimize-risk-matrix-indexes.sql
```

### Opción 3: Desde Cloud SQL
```bash
gcloud sql connect unigrc-db --user=unigrc_user < migrations/optimize-risk-matrix-indexes.sql
```

## ⚠️ Notas Importantes

1. **CONCURRENTLY**: Todos los índices se crean con `CONCURRENTLY` para evitar bloqueos de tabla
2. **IF NOT EXISTS**: El script verifica si los índices ya existen antes de crearlos
3. **Tiempo de ejecución**: Puede tardar varios minutos dependiendo del tamaño de las tablas
4. **Espacio en disco**: Los índices ocupan espacio adicional (~10-20% del tamaño de las tablas)

## 📈 Impacto Esperado

### Antes de los índices:
- Query sin cache: **5-10 segundos**
- Query con cache: **< 100ms**

### Después de los índices:
- Query sin cache: **1-3 segundos** (mejora de 50-70%)
- Query con cache: **< 100ms** (sin cambio)

## 🔍 Verificación

Para verificar que los índices fueron creados:

```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('risk_controls', 'controls', 'risk_process_links', 'risks')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

## 📝 Query Optimizada

Los índices optimizan específicamente esta query compleja con múltiples CTEs:

```sql
WITH risk_control_factors AS (...),
     control_codes_summary AS (...),
     risk_validation_status AS (...),
     risk_process_primary AS (...)
SELECT ... FROM risks r
WHERE r.status = 'active' AND r.deleted_at IS NULL
ORDER BY r.inherent_risk DESC
```

## 🔄 Mantenimiento

Los índices se mantienen automáticamente por PostgreSQL. No requieren mantenimiento manual, pero es recomendable ejecutar `VACUUM ANALYZE` periódicamente para mantener las estadísticas actualizadas.

