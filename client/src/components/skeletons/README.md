# Skeleton Components

Componentes de carga reutilizables para Unigrc.

## Componentes Disponibles

### TableSkeleton
Skeleton para tablas de datos con filas y columnas personalizables.

```tsx
import { TableSkeleton } from '@/components/skeletons';

// Uso básico (5 filas x 6 columnas por defecto)
<TableSkeleton />

// Personalizado
<TableSkeleton rows={3} columns={4} />
```

**Props:**
- `rows?: number` - Número de filas (default: 5)
- `columns?: number` - Número de columnas (default: 6)

### CardSkeleton
Skeleton para tarjetas individuales o grids de tarjetas.

```tsx
import { CardSkeleton } from '@/components/skeletons';

// Una sola tarjeta
<CardSkeleton />

// Grid de 4 tarjetas
<CardSkeleton count={4} />
```

**Props:**
- `count?: number` - Número de tarjetas (default: 1)
- Layout automático en grid para `count > 1`

### DashboardSkeleton
Skeleton completo para pantallas de dashboard.

```tsx
import { DashboardSkeleton } from '@/components/skeletons';

// Layout fijo de dashboard
<DashboardSkeleton />
```

**Incluye:**
- 4 tarjetas de métricas (grid 2x2)
- Sección de matriz de riesgo
- Lista de Top 5 riesgos

## Características

✅ **Accesibilidad completa**
- `role="status"` para feedback de loading
- `aria-busy="true"` indica estado de carga
- `aria-label="Cargando..."` para lectores de pantalla

✅ **Responsive Design**
- Scroll horizontal automático en tablas (mobile)
- Grids adaptativos según breakpoints
- Touch targets optimizados

✅ **Theme Aware**
- Funciona con light/dark/high-contrast themes
- Usa design tokens del sistema
- Animación pulse nativa

✅ **Testing**
- Atributos `data-testid` en todos los componentes
- IDs únicos para elementos dinámicos

## Uso en Queries

Ejemplo con React Query:

```tsx
import { useQuery } from '@tanstack/react-query';
import { TableSkeleton } from '@/components/skeletons';

function RisksTable() {
  const { data: risks, isLoading } = useQuery({
    queryKey: ['/api/risks'],
  });

  if (isLoading) {
    return <TableSkeleton rows={10} columns={7} />;
  }

  return (
    <Table>
      {/* render data */}
    </Table>
  );
}
```

## Import Barrel

```tsx
// Import individual
import { TableSkeleton } from '@/components/skeletons';

// Import múltiple
import { TableSkeleton, CardSkeleton, DashboardSkeleton } from '@/components/skeletons';
```
