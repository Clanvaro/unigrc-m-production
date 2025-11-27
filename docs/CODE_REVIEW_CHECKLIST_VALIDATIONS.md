# Code Review Checklist - Validation Module

## ⚠️ CRITICAL: DO NOT BREAK THESE

Este checklist debe ser revisado antes de aprobar cualquier cambio que toque el módulo de validaciones por email.

### 🔴 Critical Database Schema

**¿Se modificó el schema de `audit_logs`?**
- [ ] ✅ La columna `user_id` sigue siendo **nullable**
- [ ] ✅ **NO** se cambió a `notNull()`
- [ ] ✅ **NO** se agregó constraint `NOT NULL`

**Razón:** Las validaciones por email son públicas (sin usuario autenticado) y requieren `userId: null`. Si cambias esto, romperás todas las validaciones por email.

**Test de verificación:** `tests/integration/email-validation.test.ts`

---

### 🔴 Critical Frontend Queries

**¿Se modificaron queries de validación en `risk-validation.tsx`?**
- [ ] ✅ Todos los queries de validación tienen `refetchOnWindowFocus: true`
- [ ] ✅ Todos los queries de validación tienen `staleTime: 0`
- [ ] ✅ Todos los queries de validación tienen `refetchOnMount: true`

**Queries críticos a verificar:**
```typescript
- validatedControls
- observedControls
- rejectedControls
- notifiedControls
- pendingRiskProcessLinks
- validatedActionPlans
- observedActionPlans
- rejectedActionPlans
```

**Razón:** Sin estas configuraciones, los usuarios deben refrescar manualmente la página para ver cambios después de validar desde emails.

---

### 🔴 Critical Backend Endpoints

**¿Se modificó el endpoint `/api/batch-validations/:token`?**
- [ ] ✅ Los audit logs siguen usando `userId: null` para validaciones públicas
- [ ] ✅ **NO** se cambió a usar un string hardcodeado como `"public-validation"`
- [ ] ✅ Las transacciones incluyen tanto UPDATE de entidad como INSERT de audit log

**Código crítico (server/routes.ts ~línea 6863):**
```typescript
await db.insert(auditLogs).values({
  entityType: 'control',
  entityId,
  action: 'batch_email_validation',
  userId: null, // ⚠️ MUST be null, not a string!
  changes: {...}
});
```

---

### 🟡 Important Validations

**¿Se modificó el botón "Reenviar a Validación"?**
- [ ] ✅ Ejecuta `handleResendControl(control)` (no solo `console.log`)
- [ ] ✅ Funciona en pestañas "Observados" y "Rechazados"
- [ ] ✅ Muestra diálogo de confirmación antes de reenviar

**¿Se agregaron nuevos estados de validación?**
- [ ] ✅ Se agregaron a `statusMap` en el endpoint de batch validation
- [ ] ✅ Se agregaron queries correspondientes en el frontend
- [ ] ✅ Se agregaron pestañas en la UI si es necesario

---

## ✅ Pre-Merge Checklist

Antes de hacer merge de cambios en el módulo de validaciones:

1. **Ejecutar tests automatizados:**
   ```bash
   npm run test:integration
   ```
   - [ ] ✅ Todos los tests de `email-validation.test.ts` pasan

2. **Validar schema de base de datos:**
   ```bash
   tsx scripts/validate-database-schema.ts
   ```
   - [ ] ✅ Script pasa sin errores críticos

3. **Verificar actualización automática:**
   - [ ] ✅ Abrir Centro de Validación
   - [ ] ✅ Validar un control desde email (en otra pestaña)
   - [ ] ✅ Regresar a pestaña del Centro de Validación
   - [ ] ✅ Verificar que se actualiza automáticamente (sin F5)

4. **Verificar botón reenviar:**
   - [ ] ✅ Ir a pestaña "Controles Observados"
   - [ ] ✅ Hacer clic en "⋮" de un control
   - [ ] ✅ Seleccionar "Reenviar a Validación"
   - [ ] ✅ Verificar que aparece diálogo de confirmación
   - [ ] ✅ Verificar que se genera nuevo token y envía email

---

## 🚨 Red Flags - Rechazar el PR si ves esto

1. **Schema changes que rompen validaciones:**
   ```typescript
   // ❌ MALO - Rompe validaciones públicas
   userId: varchar("user_id").notNull().references(...)
   
   // ✅ BUENO - Permite validaciones públicas
   userId: varchar("user_id").references(...)
   ```

2. **Audit logs con userId hardcodeado:**
   ```typescript
   // ❌ MALO - Causará constraint violation
   userId: 'public-validation'
   userId: 'system'
   userId: '' 
   
   // ✅ BUENO - Null es válido para validaciones públicas
   userId: null
   ```

3. **Queries sin refetch automático:**
   ```typescript
   // ❌ MALO - Usuario debe refrescar manualmente
   useQuery({ queryKey: ['/api/controls/validation/observed'] })
   
   // ✅ BUENO - Se actualiza automáticamente
   useQuery({ 
     queryKey: ['/api/controls/validation/observed'],
     refetchOnWindowFocus: true,
     staleTime: 0
   })
   ```

4. **Botones con solo console.log:**
   ```typescript
   // ❌ MALO - No hace nada
   onClick={() => console.log('Resend...', id)}
   
   // ✅ BUENO - Ejecuta la acción
   onClick={() => handleResendControl(control)}
   ```

---

## 📝 Notas para Desarrolladores Nuevos

### Context Histórico

**Noviembre 2025:** Se encontró un bug crítico donde controles marcados como "observados" o "rechazados" desde emails no aparecían en la UI.

**Causa raíz:** La tabla `audit_logs` tenía constraint NOT NULL en `user_id`, pero las validaciones por email no tienen un usuario autenticado (son públicas).

**Solución:** Se hizo `user_id` nullable y se actualizaron todos los puntos donde se insertaban audit logs para usar `userId: null` en validaciones públicas.

### ¿Por qué es tan importante?

- **Impacto de usuario:** Si se rompe, los usuarios no pueden validar desde emails
- **Difícil de detectar:** El error solo aparece en producción cuando usuarios reales usan emails
- **Falla silenciosa:** La base de datos rechaza el INSERT pero el usuario ve un error genérico
- **Tests lo previenen:** Los tests de integración detectan esto inmediatamente

### Si algo se rompe

1. Ejecuta: `tsx scripts/validate-database-schema.ts`
2. Revisa: `tests/integration/email-validation.test.ts`
3. Consulta: `replit.md` sección "Audit Logging for Public Validations"
4. Logs: Busca "constraint violation" o "NOT NULL" en logs del servidor

---

## 🔗 Referencias

- **Tests:** `tests/integration/email-validation.test.ts`
- **Schema:** `shared/schema.ts` (línea 7617 - audit_logs.userId)
- **Backend:** `server/routes.ts` (línea 6863 - batch validation endpoint)
- **Frontend:** `client/src/pages/risk-validation.tsx` (queries de validación)
- **Docs:** `replit.md` (sección Email-based Validation Workflow)
- **Script:** `scripts/validate-database-schema.ts`

---

**Última actualización:** Noviembre 2025  
**Mantenedor:** Ver git blame para cambios recientes
