# Instrucciones para Ejecutar el Script de Fix SPA Routing

## Pasos Rápidos

### 1. Abre la Terminal
- Presiona `Cmd + Espacio` y escribe "Terminal"
- O ve a Aplicaciones > Utilidades > Terminal

### 2. Navega al Proyecto
```bash
cd "/Users/claudiovalencia/Git Hub/unigrc-m-production"
```

### 3. Verifica gcloud CLI
```bash
gcloud --version
```

Si no está instalado:
```bash
# Instalar con Homebrew (si tienes Homebrew)
brew install google-cloud-sdk

# O descargar desde:
# https://cloud.google.com/sdk/docs/install
```

### 4. Autentícate (si es necesario)
```bash
gcloud auth login
```

### 5. Configura el Proyecto
```bash
gcloud config set project unigrc-m
```

### 6. Ejecuta el Script
```bash
./scripts/fix-spa-routing-load-balancer.sh
```

## Si el Script No Funciona

### Error: "gcloud: command not found"
- Instala gcloud CLI (ver paso 3 arriba)

### Error: "Permission denied"
- Verifica que estás autenticado: `gcloud auth list`
- Si no aparece tu cuenta, ejecuta: `gcloud auth login`

### Error: "Project not found"
- Verifica el proyecto: `gcloud config get-value project`
- Si no es `unigrc-m`, ejecuta: `gcloud config set project unigrc-m`

### Error: "Permission denied" al ejecutar el script
- Dale permisos de ejecución:
```bash
chmod +x scripts/fix-spa-routing-load-balancer.sh
```

## Verificar que Funcionó

Después de ejecutar el script, espera 2-3 minutos y prueba:
- Abre: https://cl.unigrc.app/compliance-officers
- Debería cargar el frontend (no error 404)

## Alternativa: Ejecutar desde Cloud Shell

Si prefieres no instalar gcloud en tu máquina, puedes usar Google Cloud Shell:

1. Ve a: https://console.cloud.google.com/
2. Haz clic en el icono de Cloud Shell (terminal) en la parte superior
3. Clona el repositorio:
```bash
git clone https://github.com/Clanvaro/unigrc-m-production.git
cd unigrc-m-production
```
4. Ejecuta el script:
```bash
./scripts/fix-spa-routing-load-balancer.sh
```
