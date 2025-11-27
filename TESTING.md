# 🧪 Sistema de Testing Automatizado - RiskMatrix Pro

Este documento explica cómo usar el framework de testing automatizado implementado con Vitest.

## 📋 Índice

- [Comandos Disponibles](#comandos-disponibles)
- [Estructura de Tests](#estructura-de-tests)
- [Ejecutar Tests](#ejecutar-tests)
- [Interpretar Resultados](#interpretar-resultados)
- [Mejores Prácticas](#mejores-prácticas)

## 🚀 Comandos Disponibles

### Ejecutar todos los tests
```bash
npx vitest run
```

### Ejecutar tests en modo vigilancia (watch mode)
```bash
npx vitest
```
Los tests se ejecutarán automáticamente cuando guardes archivos.

### Ejecutar tests con interfaz UI
```bash
npx vitest --ui
```
Abre una interfaz web interactiva en tu navegador.

### Ejecutar tests con reporte de cobertura
```bash
npx vitest run --coverage
```

### Ejecutar tests específicos por carpeta

**Solo tests de seguridad:**
```bash
npx vitest run tests/security
```

**Solo tests unitarios:**
```bash
npx vitest run tests/unit
```

**Solo tests de integración:**
```bash
npx vitest run tests/integration
```

**Solo tests de API CRUD:**
```bash
npx vitest run tests/api
```

**Solo tests de carga:**
```bash
npx vitest run tests/load
```

**Solo tests funcionales:**
```bash
npx vitest run tests/functional
```

### Ejecutar un archivo específico
```bash
npx vitest run tests/security/password-policy.test.ts
```

### Scripts npm disponibles (alternativa)
```bash
npm run test              # Todos los tests
npm run test:watch        # Modo vigilancia
npm run test:ui          # Interfaz interactiva
npm run test:coverage    # Con cobertura
npm run test:unit        # Solo unitarios
npm run test:integration # Solo integración
npm run test:api         # Solo API
npm run test:load        # Solo carga
npm run test:security    # Solo seguridad
npm run test:functional  # Solo funcionales
```

## 📁 Estructura de Tests

```
tests/
├── setup.ts                          # Configuración global
├── security/                         # Tests de seguridad (Phase 3)
│   ├── password-policy.test.ts      # Políticas de contraseñas
│   ├── account-lockout.test.ts      # Sistema de bloqueo
│   └── session-fingerprinting.test.ts # Fingerprinting de sesiones
├── unit/                             # Tests unitarios
│   ├── validation.test.ts           # Validación y sanitización
│   └── risk-calculations.test.ts    # Cálculos de riesgo
├── integration/                      # Tests de integración E2E
│   ├── auth-api.test.ts             # API de autenticación
│   └── risk-workflow.test.ts        # Flujos completos de gestión de riesgos
├── api/                              # Tests de API CRUD
│   └── crud-operations.test.ts      # Operaciones CRUD completas
├── load/                             # Tests de carga y rendimiento
│   ├── api-performance.test.ts      # Pruebas de carga básicas (MVP)
│   └── performance-enhanced.test.ts # Pruebas optimizadas (Producción)
└── functional/                       # Tests funcionales
    ├── risk-aggregation.test.ts     # Agregación de riesgos
    └── soft-delete.test.ts          # Soft delete y papelera
```

## ✅ Interpretar Resultados

### Ejemplo de Salida Exitosa
```
✓ tests/security/password-policy.test.ts (15)
  ✓ Password Policy Enforcement (8)
    ✓ should reject passwords shorter than minimum length (3ms)
    ✓ should reject passwords without uppercase letters (2ms)
    ✓ should accept strong passwords (1ms)
  ✓ Password Hashing and Verification (4)
  ✓ Password History (3)

Test Files: 6 passed (6)
Tests: 45 passed (45)
Duration: 2.34s
```

### Ejemplo de Fallo
```
✗ tests/security/password-policy.test.ts (1)
  ✗ Password Policy Enforcement
    ✗ should reject weak passwords
      Expected: false
      Received: true
      
Test Files: 1 failed, 5 passed (6)
Tests: 1 failed, 44 passed (45)
```

## 📊 Reporte de Cobertura

Ejecuta con cobertura:
```bash
npx vitest run --coverage
```

Verás un reporte como:
```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   78.5  |   72.3   |   85.1  |   78.2  |
 server/validation           |   92.1  |   88.4   |   95.2  |   91.8  |
  auth-security.ts           |   94.3  |   90.1   |   96.5  |   94.1  |
  session-security.ts        |   89.7  |   86.2   |   93.8  |   89.3  |
-----------------------------|---------|----------|---------|---------|
```

## 🎯 Casos de Uso

### Antes de Hacer Commit
```bash
npx vitest run
```
Verifica que todos los tests pasen antes de hacer commit.

### Mientras Desarrollas una Feature
```bash
npx vitest --watch
```
Los tests se ejecutan automáticamente mientras escribes código.

### Verificar Seguridad
```bash
npx vitest run tests/security
```
Ejecuta solo los tests de seguridad críticos.

### Debugging de Tests
```bash
npx vitest --ui
```
Usa la interfaz web para debugging interactivo.

## 📝 Tests Implementados

### 🔒 Tests de Seguridad (Phase 3)

#### Password Policy (`password-policy.test.ts`)
- ✅ Validación de longitud mínima (12 caracteres)
- ✅ Requerimiento de mayúsculas, minúsculas, números y caracteres especiales
- ✅ Detección de caracteres secuenciales
- ✅ Hashing seguro con bcrypt
- ✅ Verificación de contraseñas
- ✅ Historial de contraseñas (últimas 5)
- ✅ Expiración de contraseñas (90 días)

#### Account Lockout (`account-lockout.test.ts`)
- ✅ Detección de cuentas bloqueadas
- ✅ Validación de períodos de bloqueo
- ✅ Desbloqueo automático tras timeout
- ✅ Cálculo de duración de bloqueo

#### Session Fingerprinting (`session-fingerprinting.test.ts`)
- ✅ Generación de fingerprints consistentes
- ✅ Detección de cambios de IP
- ✅ Detección de cambios de User-Agent
- ✅ Manejo de headers faltantes
- ✅ Detección de tipo de dispositivo (desktop/mobile/tablet)

### 🧪 Tests Unitarios

#### Validation (`validation.test.ts`)
- ✅ Sanitización de valores (HTML, scripts, null bytes)
- ✅ Sanitización de objetos (NoSQL injection, recursive)
- ✅ Sanitización de rutas (path traversal, caracteres peligrosos)
- ✅ Validación de emails (formato correcto)
- ✅ Validación de URLs (protocolos permitidos)
- ✅ Validación de códigos (alfanuméricos, patrones custom)
- ✅ Prevención de SQL injection
- ✅ Prevención de XSS (scripts, event handlers)

#### Risk Calculations (`risk-calculations.test.ts`)
- ✅ Clasificación de niveles de riesgo (Muy Bajo a Muy Alto)
- ✅ Cálculo de riesgo inherente (probabilidad × impacto)
- ✅ Cálculo de riesgo residual (con efectividad de controles)
- ✅ Promedio ponderado de riesgos
- ✅ Velocidad de cambio de riesgo (risk velocity)

### 🔗 Tests de Integración

#### Auth API (`auth-api.test.ts`)
- ✅ Login con credenciales inválidas
- ✅ Login exitoso con datos de usuario
- ✅ Creación de sesiones
- ✅ Invalidación de sesiones en logout

#### Risk Workflow (`risk-workflow.test.ts`)
- ✅ Ciclo completo de vida de riesgos
- ✅ Creación de procesos, riesgos y controles
- ✅ Vinculación de controles a riesgos
- ✅ Cálculo de riesgo residual
- ✅ Creación de planes de acción
- ✅ Registro de eventos de riesgo
- ✅ Evaluación de efectividad de controles
- ✅ Agregación de riesgos (average, weighted, worst case)
- ✅ Planificación de auditorías basada en riesgos
- ✅ Priorización con historial de fraude

### 📡 Tests de API CRUD

#### CRUD Operations (`crud-operations.test.ts`)
- ✅ **Procesos**: Crear, leer, actualizar, soft delete, paginación
- ✅ **Riesgos**: Crear con validación, filtrar por categoría, calcular residual
- ✅ **Controles**: Crear con tipos, vincular a múltiples riesgos, evaluar efectividad
- ✅ **Planes de Acción**: Crear con fecha límite, seguimiento de progreso, detectar vencidos
- ✅ **Eventos de Riesgo**: Registrar materialización, asociar múltiples entidades
- ✅ **Auditorías**: Crear con alcance, agregar hallazgos, seguimiento de progreso
- ✅ **Estructura Organizacional**: Gerencias y Objetivos Estratégicos con códigos únicos
- ✅ **Validación de Datos**: Emails, rangos de fechas, rangos numéricos

### ⚡ Tests de Carga y Rendimiento

#### API Performance (`api-performance.test.ts`)
- ✅ **Autenticación**: Manejo de carga en login (10 conexiones concurrentes)
- ✅ **Concurrencia**: 50 conexiones simultáneas en /auth/check
- ✅ **Riesgos**: GET /api/risks con paginación (20 conexiones)
- ✅ **Agregación**: Cálculos de riesgo bajo carga (15 conexiones)
- ✅ **Dashboard**: Datos de dashboard (30 conexiones)
- ✅ **Analytics**: Consultas de analíticas (20 conexiones)
- ✅ **Queries Complejos**: JOINs múltiples con latencia < 800ms
- ✅ **Operaciones de Escritura**: POST con 5 conexiones
- ✅ **Stress Testing**: Tráfico burst (100 conexiones)
- ✅ **Recuperación**: Validación de recuperación tras alta carga
- ✅ **Rate Limiting**: Verificación de límites de tasa
- ✅ **Throughput**: > 100 req/s para operaciones de lectura
- ✅ **Latencia**: Consistencia bajo carga sostenida

**Métricas Objetivo (MVP):**
- Latencia promedio: < 300ms
- Latencia p99: < 1000ms
- Errores: 0
- Timeouts: 0
- Throughput: > 100 req/s

#### Enhanced Performance (`performance-enhanced.test.ts`) - **PRODUCCIÓN**
- ✅ **Dashboard**: 200 conexiones concurrentes, < 200ms avg, p99 < 600ms
- ✅ **Risk Listing**: 300 conexiones, > 600 req/s throughput
- ✅ **Authentication**: 100 logins concurrentes, < 150ms avg
- ✅ **Analytics**: 150 conexiones, p99 < 800ms para queries complejos
- ✅ **Spike Test**: Burst de 50→500 conexiones con recuperación < 1s
- ✅ **Sustained Load**: 250 conexiones × 20s con rendimiento estable
- ✅ **Error Rate**: < 0.1% en 1000 requests
- ✅ **Throughput Benchmark**: > 1000 req/s en endpoints simples
- ✅ **Memory Efficiency**: < 50MB incremento en 10k requests
- ✅ **Concurrent Writes**: 150 conexiones POST con < 200ms avg

**Métricas Objetivo (Producción Optimizada):**
- Latencia promedio: **< 200ms** ⚡
- Latencia p95: **< 400ms** ⚡
- Latencia p99: **< 600ms** ⚡
- Throughput: **> 500 req/s** (hasta 1000+ req/s) ⚡
- Concurrencia: **200-500 conexiones** ⚡
- Error rate: **< 0.1%** ⚡
- Memory growth: **< 50MB en 10k req** ⚡

### ⚙️ Tests Funcionales

#### Risk Aggregation (`risk-aggregation.test.ts`)
- ✅ Método Average (promedio simple)
- ✅ Método Weighted (promedio ponderado)
- ✅ Método Worst Case (peor escenario)
- ✅ Clasificación de riesgos (Low/Medium/High)

#### Soft Delete (`soft-delete.test.ts`)
- ✅ Marcado de items como eliminados
- ✅ Filtrado de items activos
- ✅ Recuperación de items eliminados (papelera)
- ✅ Restauración de items
- ✅ Eliminación permanente
- ✅ Registro de timestamps de eliminación

## 🔧 Configuración

La configuración se encuentra en:
- `vitest.config.ts` - Configuración principal de Vitest
- `tests/setup.ts` - Setup global para todos los tests

## 🚀 Tests de Performance Optimizados

Para validar optimizaciones de producción:

```bash
# Tests básicos (MVP)
npx vitest run tests/load/api-performance.test.ts

# Tests optimizados (Producción)
npx vitest run tests/load/performance-enhanced.test.ts

# Ambos
npx vitest run tests/load
```

**Antes de optimización:**
- 300ms avg, 1000ms p99, 100 req/s

**Después de optimización:**
- 150-200ms avg, 400-600ms p99, 500-1000+ req/s ✅

## 📚 Mejores Prácticas

1. **Ejecuta tests antes de commits importantes**
   ```bash
   npx vitest run
   ```

2. **Usa watch mode durante desarrollo**
   ```bash
   npx vitest --watch
   ```

3. **Verifica cobertura periódicamente**
   ```bash
   npx vitest run --coverage
   ```

4. **Ejecuta tests específicos para debugging rápido**
   ```bash
   npx vitest run tests/security/password-policy.test.ts
   ```

5. **Usa la UI para debugging visual**
   ```bash
   npx vitest --ui
   ```

## 🚨 Troubleshooting

### Tests no se ejecutan
```bash
# Verifica que Vitest esté instalado
npm list vitest

# Reinstala si es necesario
npm install vitest @vitest/ui happy-dom --save-dev
```

### Problemas con variables de entorno
```bash
# Asegúrate de tener .env configurado
# Los tests usan valores de prueba por defecto si no están definidos
```

### Tests lentos
```bash
# Ejecuta solo los tests necesarios
npx vitest run tests/security  # Solo seguridad
```

## 📞 Soporte

Para más información sobre Vitest, consulta:
- [Documentación oficial de Vitest](https://vitest.dev/)
- [Guía de API](https://vitest.dev/api/)
- [Configuración](https://vitest.dev/config/)
