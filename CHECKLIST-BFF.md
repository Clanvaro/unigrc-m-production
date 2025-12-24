# Checklist - BFF + Read-Model Implementation

## ✅ Completado

- [x] Función `buildStableCacheKey()` creada
- [x] Servicio `risks-page-service.ts` creado
- [x] Job `refresh-risk-list-view.ts` creado
- [x] Migración SQL `create-risk-list-view.sql` creada
- [x] Script `apply-risk-list-view.ts` creado
- [x] Endpoint `/api/pages/risks` implementado
- [x] Invalidación en mutaciones (POST/PUT/DELETE risks)
- [x] Servicio de refresh integrado en `server/index.ts`
- [x] Documentación creada

## ⏳ Pendiente

- [ ] **Migración SQL ejecutada** ✅ (Usuario confirmó)
- [ ] Verificar migración con `npm run verify-risk-list-view`
- [ ] Reiniciar servidor para activar servicio de refresh
- [ ] Probar endpoint `/api/pages/risks`
- [ ] (Opcional) Actualizar frontend para usar nuevo endpoint
- [ ] Monitorear logs del servicio de refresh
- [ ] Verificar performance vs endpoint legacy

## 🎯 Próximos Pasos Inmediatos

1. **Verificar migración:**
   ```bash
   npm run verify-risk-list-view
   ```

2. **Reiniciar servidor:**
   ```bash
   npm run dev  # o npm start en producción
   ```

3. **Probar endpoint:**
   ```bash
   curl http://localhost:5000/api/pages/risks?limit=25&offset=0
   ```

4. **Verificar logs:**
   - Buscar: `[RiskListViewRefresh] Service started`
   - Buscar: `[PERF] /api/pages/risks COMPLETE`

## 📊 Métricas a Monitorear

- Tiempo de respuesta del endpoint
- Cache hit rate
- Frecuencia de refresh de la vista
- Tiempo de refresh de la vista
- Número de requests vs endpoint legacy

