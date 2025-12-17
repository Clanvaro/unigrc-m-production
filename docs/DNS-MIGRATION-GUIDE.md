# Guía de Migración DNS: Firebase Hosting → Cloud Load Balancer

Esta guía describe el proceso paso a paso para migrar el DNS de Firebase Hosting a Google Cloud Load Balancer.

## Prerrequisitos

1. ✅ Load Balancer configurado y funcionando
2. ✅ Certificado SSL activo para `cl.unigrc.app`
3. ✅ Frontend desplegado en Cloud Storage
4. ✅ Testing completo en staging

## Paso 1: Obtener IP del Load Balancer

```bash
# Obtener IP del Load Balancer HTTPS
gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
  --global \
  --format="value(IPAddress)" \
  --project=unigrc-m
```

Guarda esta IP, la necesitarás para configurar el DNS.

## Paso 2: Verificar que el Load Balancer funciona

Antes de cambiar el DNS, verifica que puedes acceder al Load Balancer directamente por IP:

```bash
# Obtener IP
LB_IP=$(gcloud compute forwarding-rules describe unigrc-frontend-https-rule \
  --global \
  --format="value(IPAddress)" \
  --project=unigrc-m)

# Probar acceso (puede requerir header Host)
curl -H "Host: cl.unigrc.app" http://$LB_IP
```

## Paso 3: Configurar DNS en GoDaddy

1. Inicia sesión en [GoDaddy](https://www.godaddy.com)
2. Ve a **Mis Productos** → **DNS**
3. Busca el dominio `unigrc.app`
4. Encuentra el registro CNAME para `cl` (subdominio)
5. **Modifica** el registro CNAME:
   - **Tipo**: `CNAME` (o `A` si prefieres usar IP directamente)
   - **Nombre**: `cl`
   - **Valor**: 
     - Si usas CNAME: `[IP del Load Balancer]` (pero CNAME no acepta IPs, usa A record)
     - Si usas A record: La IP obtenida en el Paso 1
   - **TTL**: `300` (5 minutos) para permitir rollback rápido si es necesario

### Opción A: Usar A Record (Recomendado)

```
Tipo: A
Nombre: cl
Valor: [IP del Load Balancer]
TTL: 300
```

### Opción B: Mantener CNAME temporalmente

Si prefieres mantener CNAME durante la transición, puedes crear un registro A temporal:

```
Tipo: A
Nombre: cl-lb (o cualquier nombre temporal)
Valor: [IP del Load Balancer]
TTL: 300
```

Y luego cambiar el CNAME de `cl` para apuntar a `cl-lb.unigrc.app` (pero esto requiere un registro adicional).

## Paso 4: Verificar propagación DNS

Después de cambiar el DNS, verifica la propagación:

```bash
# Verificar DNS
dig cl.unigrc.app +short

# O con nslookup
nslookup cl.unigrc.app
```

La propagación puede tardar desde minutos hasta horas dependiendo del TTL anterior.

## Paso 5: Verificar certificado SSL

Asegúrate de que el certificado SSL está activo:

```bash
gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert \
  --global \
  --format="value(managed.status)" \
  --project=unigrc-m
```

Debe mostrar `ACTIVE`. Si muestra `PROVISIONING`, espera hasta que esté activo.

## Paso 6: Testing post-migración

Después de que el DNS se propague:

1. **Acceder al sitio**: `https://cl.unigrc.app`
2. **Verificar HTTPS**: El certificado SSL debe estar activo
3. **Probar rutas del SPA**: Navegar a diferentes páginas
4. **Probar API**: Verificar que `/api/**` funciona correctamente
5. **Verificar CORS**: Asegurarse de que no hay errores de CORS

## Paso 7: Monitoreo

Monitorea durante 24-48 horas:

- Logs de Cloud Load Balancer
- Métricas de Cloud CDN
- Errores en el frontend
- Tiempos de respuesta

## Rollback

Si necesitas revertir la migración:

1. En GoDaddy, cambia el registro DNS de vuelta a Firebase Hosting:
   ```
   Tipo: CNAME
   Nombre: cl
   Valor: [valor de Firebase Hosting]
   TTL: 300
   ```

2. Espera la propagación DNS (5-15 minutos con TTL bajo)

3. Verifica que el sitio funciona en Firebase Hosting

## Notas Importantes

- **TTL bajo**: Usa TTL de 300 segundos (5 minutos) durante la migración para permitir cambios rápidos
- **Certificado SSL**: Asegúrate de que el certificado está `ACTIVE` antes de cambiar DNS
- **Testing**: Prueba exhaustivamente antes de migrar en producción
- **Monitoreo**: Mantén Firebase Hosting activo durante al menos 1 semana después de la migración

## Troubleshooting

### El certificado SSL no se activa

- Verifica que el DNS apunta correctamente al Load Balancer
- Espera hasta 1 hora (el provisioning puede tardar)
- Verifica los detalles: `gcloud compute ssl-certificates describe cl-unigrc-app-ssl-cert --global`

### El sitio no carga después del cambio DNS

- Verifica la propagación DNS: `dig cl.unigrc.app`
- Verifica que el Load Balancer está funcionando: prueba con IP directa
- Revisa los logs del Load Balancer en Cloud Console

### Errores de CORS

- Verifica la configuración CORS en Cloud Storage
- Verifica que el backend permite requests desde `cl.unigrc.app`
- Revisa `server/security.ts` para configuración CORS

