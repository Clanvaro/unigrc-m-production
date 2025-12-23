# Pruebas de Estrés con k6

## ⚠️ Importante: k6 NO afecta la performance de producción

k6 es una herramienta **externa** que se ejecuta desde tu máquina local o CI/CD. Solo envía requests HTTP a tu aplicación, **no modifica ningún código** de tu aplicación. Es completamente seguro usarlo.

## Instalación

### macOS
```bash
brew install k6
```

### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9B
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```bash
# Con Chocolatey
choco install k6

# O descargar desde: https://k6.io/docs/getting-started/installation/
```

### Verificar instalación
```bash
k6 version
```

## Uso

### Ejecutar prueba básica
```bash
npm run stress:basic
```

### Ejecutar prueba de endpoints críticos
```bash
npm run stress:critical
```

### Ejecutar prueba completa
```bash
npm run stress:full
```

### Ejecutar prueba personalizada
```bash
k6 run tests/k6/risks-bootstrap.js --env BASE_URL=https://tu-backend.run.app
```

## Variables de Entorno

- `BASE_URL`: URL del backend a probar (default: http://localhost:5000)
- `VUS`: Número de usuarios virtuales (default: 50)
- `DURATION`: Duración en segundos (default: 30s)

Ejemplo:
```bash
BASE_URL=https://unigrc-backend-7joma3s3xa-tl.a.run.app VUS=100 DURATION=60 npm run stress:critical
```

## Interpretación de Resultados

- **http_req_duration**: Tiempo de respuesta (avg, p95, p99)
- **http_reqs**: Requests por segundo
- **iterations**: Total de iteraciones completadas
- **vus**: Usuarios virtuales activos
- **http_req_failed**: Porcentaje de requests fallidos (debe ser < 1%)

## Objetivos de Performance

- **Latencia promedio**: < 500ms
- **Latencia p95**: < 1,000ms
- **Latencia p99**: < 2,000ms
- **Throughput**: > 100 req/s
- **Error rate**: < 0.1%
