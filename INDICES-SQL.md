# Comandos SQL para Crear Índices de Performance

## Índices para optimizar `/api/controls/with-details`

Ejecuta estos comandos SQL en tu base de datos:

```sql
-- 1. Índice para filtrado por tipo (crítico para performance)
CREATE INDEX IF NOT EXISTS idx_controls_type ON controls(type);

-- 2. Índice compuesto para combinaciones comunes de filtros (type + status + deleted_at)
CREATE INDEX IF NOT EXISTS idx_controls_type_status_deleted 
  ON controls(type, status, deleted_at);

-- 3. Optimizar búsquedas de owner más reciente en control_owners
-- Este índice ayuda al LEFT JOIN LATERAL en el endpoint controls/with-details
CREATE INDEX IF NOT EXISTS idx_control_owners_control_active_assigned 
  ON control_owners(control_id, is_active, assigned_at DESC) 
  WHERE is_active = true;
```

## Verificar que los índices se crearon correctamente

```sql
-- Verificar índices en controls
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'controls' 
  AND indexname IN ('idx_controls_type', 'idx_controls_type_status_deleted')
ORDER BY indexname;

-- Verificar índice en control_owners
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'control_owners' 
  AND indexname = 'idx_control_owners_control_active_assigned';
```

## Actualizar estadísticas después de crear índices

```sql
ANALYZE controls;
ANALYZE control_owners;
```

## Impacto esperado

- **Antes**: ~5,163ms para filtrar por tipo
- **Después**: <500ms (mejora de ~10x)
