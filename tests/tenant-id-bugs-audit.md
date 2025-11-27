# Auditoría de Bugs: Campos Omitidos en Validación Zod

## Fecha de Auditoría
12 de noviembre de 2025

## Problema General
Varios endpoints agregaban campos como `createdBy` o `updatedBy` ANTES de la validación Zod, pero estos campos estaban marcados en `.omit()` en los schemas, causando que se eliminaran durante `.parse()` y provocando violaciones de constraint NOT NULL en la base de datos.

## Patrón del Bug

### ❌ INCORRECTO (Bug)
```typescript
const data = {
  ...req.body,
  createdBy: userId  // Se agrega ANTES de .parse()
};
const validated = insertSchema.parse(data); // Zod ELIMINA createdBy porque está en .omit()
await storage.create(validated); // ERROR: createdBy es NULL
```

### ✅ CORRECTO (Fix)
```typescript
const validated = insertSchema.parse(req.body); // Validar primero
const data = { ...validated, createdBy: userId }; // Agregar DESPUÉS
await storage.create(data); // ✅ createdBy está presente
```

## Bugs Encontrados y Corregidos

### 1. POST /api/action-plans ✅ CORREGIDO
**Archivo:** `server/routes.ts` línea 5940
**Schema:** `insertActionSchema` (omite `createdBy`)
**Síntoma:** Error 400 "No se pudo crear el plan de acción"
**Error DB:** `null value in column "created_by" of relation "actions" violates not-null constraint`

**Fix aplicado:**
```diff
- const processedData = { ...fields, createdBy: userId };
- const validatedData = insertActionSchema.parse(processedData);
- await storage.createAction(await withTenantId(req, validatedData));
+ const validatedData = insertActionSchema.parse(processedData);
+ const actionData = { ...validatedData, createdBy: userId };
+ await storage.createAction(await withTenantId(req, actionData));
```

---

### 2. POST /api/gerencias ✅ CORREGIDO
**Archivo:** `server/routes.ts` línea 11717
**Schema:** `insertGerenciaSchema` (omite `createdBy`)
**Síntoma Potencial:** Error al crear nuevas gerencias/subgerencias

**Fix aplicado:**
```diff
- const validatedData = insertGerenciaSchema.parse({
-   ...req.body,
-   createdBy: userId
- });
+ const validatedData = insertGerenciaSchema.parse(req.body);
+ const gerenciaData = { ...validatedData, createdBy: userId };
+ const gerencia = await storage.createGerencia(await withTenantId(req, gerenciaData));
```

---

### 3. PATCH /api/gerencias/:id ✅ CORREGIDO
**Archivo:** `server/routes.ts` línea 11741
**Schema:** `insertGerenciaSchema` (omite `updatedBy`)
**Síntoma Potencial:** Campo `updated_by` quedando NULL al actualizar gerencias

**Fix aplicado:**
```diff
- const validatedData = insertGerenciaSchema.partial().parse({
-   ...req.body,
-   updatedBy: userId
- });
+ const validatedData = insertGerenciaSchema.partial().parse(req.body);
+ const gerenciaData = { ...validatedData, updatedBy: userId };
+ const gerencia = await storage.updateGerencia(req.params.id, gerenciaData, tenantId);
```

---

### 4. POST /api/objetivos-estrategicos ✅ CORREGIDO
**Archivo:** `server/routes.ts` línea 12002
**Schema:** `insertObjetivoEstrategicoSchema` (omite `createdBy`)
**Síntoma Potencial:** Error al crear nuevos objetivos estratégicos

**Fix aplicado:**
```diff
- const validatedData = insertObjetivoEstrategicoSchema.parse({
-   ...req.body,
-   createdBy: userId
- });
+ const validatedData = insertObjetivoEstrategicoSchema.parse(req.body);
+ const objetivoData = { ...validatedData, createdBy: userId };
+ const objetivo = await storage.createObjetivoEstrategico(await withTenantId(req, objetivoData));
```

---

### 5. PATCH /api/objetivos-estrategicos/:id ✅ CORREGIDO
**Archivo:** `server/routes.ts` línea 12025
**Schema:** `insertObjetivoEstrategicoSchema` (omite `updatedBy`)
**Síntoma Potencial:** Campo `updated_by` quedando NULL al actualizar objetivos

**Fix aplicado:**
```diff
- const validatedData = insertObjetivoEstrategicoSchema.partial().parse({
-   ...req.body,
-   updatedBy: userId
- });
+ const validatedData = insertObjetivoEstrategicoSchema.partial().parse(req.body);
+ const objetivoData = { ...validatedData, updatedBy: userId };
+ const objetivo = await storage.updateObjetivoEstrategico(req.params.id, objetivoData);
```

---

## Schemas que Omiten createdBy/updatedBy

Los siguientes schemas omiten estos campos y requieren que se agreguen DESPUÉS de la validación:

1. **insertGerenciaSchema** - Omite `createdBy`, `updatedBy`
2. **insertObjetivoEstrategicoSchema** - Omite `createdBy`, `updatedBy`
3. **insertMacroprocesoSchema** - Omite `createdBy`, `updatedBy`
4. **insertProcessSchema** - Omite `createdBy`, `updatedBy`
5. **insertSubprocesoSchema** - Omite `createdBy`, `updatedBy`
6. **baseInsertRiskSchema** - Omite `createdBy`, `updatedBy`
7. **insertControlSchema** - Omite `createdBy`, `updatedBy`
8. **insertActionSchema** - Omite `createdBy`, `updatedBy`
9. **insertActionPlanAccessTokenSchema** - Omite `createdBy`

## Endpoints Verificados (Sin Bug) ✅

Los siguientes endpoints fueron revisados y NO presentan el bug:

- **POST /api/processes** - NO agrega `createdBy` antes de `.parse()` ✅
- **POST /api/risks** - NO agrega `createdBy` antes de `.parse()` ✅
- **POST /api/controls** - NO agrega `createdBy` antes de `.parse()` ✅
- **POST /api/macroprocesos** - NO agrega `createdBy` antes de `.parse()` ✅
- **POST /api/subprocesos** - NO agrega `createdBy` antes de `.parse()` ✅

## Regla General para Prevenir Este Bug

### Al crear un nuevo endpoint POST/PATCH/PUT:

1. **Validar primero, agregar campos auto-generados después:**
   ```typescript
   // ✅ CORRECTO
   const validated = schema.parse(req.body);
   const data = { ...validated, createdBy: userId, tenantId };
   await storage.create(data);
   ```

2. **Verificar el schema:**
   - Si el schema tiene `.omit({ createdBy: true })`, NO agregues `createdBy` antes de `.parse()`
   - Lo mismo aplica para: `updatedBy`, `tenantId`, `id`, `code`, timestamps, etc.

3. **Usar el helper `withTenantId`:**
   - Este helper agrega `tenantId` DESPUÉS, así que es seguro
   - Pero `createdBy` y `updatedBy` deben agregarse manualmente DESPUÉS

## Impacto

- **Severidad:** Alta (errores 400 en producción, operaciones fallidas)
- **Afectación:** Endpoints de creación y actualización
- **Fix:** Completado para todos los casos encontrados
- **Prevención:** Documentado patrón correcto

## Test de Regresión

Verificar que estos endpoints funcionan correctamente:
```bash
# Action Plans
curl -X POST http://localhost:5000/api/action-plans -d '{"name":"Test",...}'

# Gerencias
curl -X POST http://localhost:5000/api/gerencias -d '{"name":"Test Gerencia",...}'
curl -X PATCH http://localhost:5000/api/gerencias/ID -d '{"name":"Updated"}'

# Objetivos Estratégicos
curl -X POST http://localhost:5000/api/objetivos-estrategicos -d '{"name":"Test",...}'
curl -X PATCH http://localhost:5000/api/objetivos-estrategicos/ID -d '{"name":"Updated"}'
```

## Conclusión

Todos los bugs identificados han sido corregidos siguiendo el patrón correcto:
**Validar → Agregar campos omitidos → Crear/Actualizar**

Esta auditoría garantiza que no se repita el problema en otras partes del sistema.
