# Plan de Rollback: Cloud Storage + CDN → Firebase Hosting

Este documento describe el procedimiento para revertir la migración de Cloud Storage + CDN de vuelta a Firebase Hosting si es necesario.

## Cuándo Hacer Rollback

Considera hacer rollback si:

- El sitio no carga después del cambio DNS
- Errores críticos que no se pueden resolver rápidamente
- Performance significativamente peor que Firebase Hosting
- Problemas de seguridad o CORS que no se pueden resolver
- Certificado SSL no funciona correctamente

## Procedimiento de Rollback

### Paso 1: Revertir DNS (CRÍTICO - Hacer Primero)

**Tiempo estimado**: 5-15 minutos

1. **Inicia sesión en GoDaddy**
   - Ve a **Mis Productos** → **DNS**
   - Busca el dominio `unigrc.app`

2. **Cambiar registro DNS**
   - Encuentra el registro para `cl`
   - **Cambiar de vuelta** a Firebase Hosting:
     ```
     Tipo: CNAME
     Nombre: cl
     Valor: [valor original de Firebase Hosting]
     TTL: 300
     ```
   - El valor original debería ser algo como: `unigrc-m.web.app.` o similar

3. **Guardar cambios**

### Paso 2: Verificar Propagación DNS

**Tiempo estimado**: 5-15 minutos

```bash
# Verificar DNS
dig cl.unigrc.app +short

# Debe mostrar IPs de Firebase Hosting, no del Load Balancer
```

Espera hasta que el DNS se propague completamente.

### Paso 3: Verificar que Firebase Hosting Funciona

**Tiempo estimado**: 5 minutos

1. **Acceder al sitio**
   - `https://cl.unigrc.app`
   - Debe cargar desde Firebase Hosting

2. **Verificar funcionalidad básica**
   - Login funciona
   - Navegación funciona
   - API calls funcionan

### Paso 4: Notificar al Equipo

**Tiempo estimado**: 5 minutos

- Informar al equipo que se hizo rollback
- Explicar el motivo
- Documentar el problema encontrado

### Paso 5: Investigar Problema

**Tiempo estimado**: Variable

1. **Revisar logs del Load Balancer**
   ```bash
   gcloud logging read "resource.type=http_load_balancer" \
     --limit=50 \
     --project=unigrc-m
   ```

2. **Revisar configuración**
   - Verificar que todos los recursos están configurados correctamente
   - Verificar certificado SSL
   - Verificar CORS

3. **Identificar causa raíz**
   - Documentar el problema
   - Crear plan para corregirlo

## Rollback Parcial

Si solo necesitas rollback parcial (por ejemplo, mantener Cloud Storage pero usar Firebase Hosting como proxy):

1. **Mantener Cloud Storage**
   - Los archivos ya están desplegados
   - No es necesario eliminarlos

2. **Usar Firebase Hosting como proxy**
   - Firebase Hosting puede servir desde Cloud Storage
   - Requiere configuración adicional en `firebase.json`

## Prevención de Problemas

Para evitar necesidad de rollback:

1. **Testing exhaustivo en staging**
   - Probar todos los casos de uso
   - Verificar edge cases

2. **Monitoreo activo**
   - Configurar alertas
   - Monitorear métricas en tiempo real

3. **Plan de comunicación**
   - Informar al equipo sobre la migración
   - Tener contacto de emergencia disponible

4. **Ventana de mantenimiento**
   - Considerar hacer la migración en horario de bajo tráfico
   - Tener equipo disponible para responder problemas

## Checklist de Rollback

- [ ] DNS revertido a Firebase Hosting
- [ ] Propagación DNS verificada
- [ ] Sitio funciona en Firebase Hosting
- [ ] Equipo notificado
- [ ] Problema documentado
- [ ] Plan de corrección creado

## Comandos Útiles

```bash
# Verificar DNS actual
dig cl.unigrc.app +short

# Ver logs de Load Balancer
gcloud logging read "resource.type=http_load_balancer" \
  --limit=50 \
  --project=unigrc-m

# Ver estado del certificado SSL
gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="value(managed.status)" \
  --project=unigrc-m

# Verificar configuración del Load Balancer
gcloud compute url-maps describe unigrc-frontend-url-map \
  --global \
  --project=unigrc-m
```

## Notas Importantes

- **TTL bajo**: Mantener TTL bajo (300s) durante la migración permite rollback rápido
- **Firebase Hosting**: Mantener Firebase Hosting activo durante al menos 1 semana después de la migración
- **Documentación**: Documentar cualquier problema encontrado para futuras migraciones
- **Comunicación**: Mantener al equipo informado sobre el estado del rollback

