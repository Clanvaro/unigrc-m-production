# UNIGRC-M

Sistema de Gestión de Riesgos y Cumplimiento (GRC) - Plataforma Unigrc

## 🚀 Características Principales

- **Gestión de Riesgos:** Identificación, evaluación y mitigación de riesgos
- **Sistema de Auditoría:** Planificación y ejecución de auditorías
- **Cumplimiento Normativo:** Seguimiento de regulaciones y controles
- **Canal de Denuncias:** Sistema de reporte y seguimiento
- **Dashboard Analítico:** Visualización de métricas y KPIs

## 📚 Documentación

### Documentación Técnica
- [Arquitectura Técnica](./docs/ARQUITECTURA_TECNICA.md) - Arquitectura completa del sistema
- [Optimización de Performance](./docs/PERFORMANCE-OPTIMIZATION.md) - Guía de optimizaciones
- [Resumen de Optimizaciones](./docs/OPTIMIZATION-SUMMARY.md) - Resumen ejecutivo
- [Optimizaciones Recientes](./OPTIMIZACIONES_PAGE_DATA_LITE.md) - Fix pool starvation y optimizaciones

### Documentación de Endpoints
- [API Risks Page Data Lite](./API_RISKS_PAGE_DATA_LITE.md) - Documentación del endpoint optimizado

### Guías Operacionales
- [Runbook Operacional](./docs/OPERATIONAL_RUNBOOK.md) - Guía de operaciones
- [Guía de Configuración](./docs/GUIA_CONFIGURACION.md) - Configuración del sistema
- [Manual de Instalación](./docs/MANUAL_INSTALACION.md) - Instalación paso a paso

## ⚡ Optimizaciones Recientes (Diciembre 2024)

### Pool Starvation Fix
- **Problema:** Endpoint `/api/risks/page-data-lite` tardaba 88-195s por pool starvation
- **Solución:** Limitación de concurrencia de queries (batches de 2)
- **Resultado:** Reducción a <5s

### Optimización de Agregaciones
- **getRiskStats():** Cambio de cálculo en memoria a agregación SQL
- **Impacto:** Reducción de 5-30s a <100ms

### Monitoreo Mejorado
- Logging detallado de pool metrics (antes/después de queries)
- Logging de Redis (tiempos de get/set)
- Detección automática de pool starvation

## 🔧 Configuración Recomendada

### Cloud Run
```bash
# Concurrency recomendada para pool=4
gcloud run services update unigrc-backend --concurrency=1
```

### Variables de Entorno
```bash
DB_POOL_MAX=4  # Tamaño del pool de conexiones
NODE_ENV=production
IS_GCP_DEPLOYMENT=true
```

## 📖 Más Información

Ver [docs/](./docs/) para documentación completa del sistema.
