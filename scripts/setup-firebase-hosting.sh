#!/bin/bash

# Script para configurar Firebase Hosting automáticamente
# Este script automatiza las respuestas de firebase init hosting

set -e  # Exit on error

echo "🚀 Configurando Firebase Hosting para Unigrc..."
echo ""

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado. Instalando..."
    npm install -g firebase-tools
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Verificar autenticación
echo "🔐 Verificando autenticación con Firebase..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  No estás autenticado. Ejecutando firebase login..."
    firebase login
fi

# Seleccionar proyecto
echo "📦 Seleccionando proyecto unigrc-m..."
firebase use unigrc-m || {
    echo "❌ Error al seleccionar proyecto. Verifica que el proyecto existe."
    exit 1
}

# Verificar si Firebase Hosting API está habilitada
echo "🔧 Verificando Firebase Hosting API..."
if ! gcloud services list --enabled --project=unigrc-m 2>/dev/null | grep -q firebasehosting.googleapis.com; then
    echo "📡 Habilitando Firebase Hosting API..."
    gcloud services enable firebasehosting.googleapis.com --project=unigrc-m
fi

# Crear sitio de hosting si no existe
echo "🏗️  Verificando sitio de hosting..."
SITE_ID="unigrc-app"

# Intentar crear el sitio (puede fallar si ya existe, eso está bien)
firebase hosting:sites:create "$SITE_ID" 2>/dev/null || {
    echo "ℹ️  El sitio ya existe o se creará desde la consola web"
}

# Actualizar firebase.json con el siteId si no está presente
if ! grep -q '"site":' firebase.json 2>/dev/null; then
    echo "📝 Actualizando firebase.json con siteId..."
    # Usar Python para actualizar JSON de forma segura
    python3 << 'PYTHON_SCRIPT'
import json
import sys

try:
    with open('firebase.json', 'r') as f:
        config = json.load(f)
    
    if 'hosting' in config:
        if isinstance(config['hosting'], list):
            # Si hosting es una lista, actualizar el primer elemento
            if len(config['hosting']) > 0:
                config['hosting'][0]['site'] = 'unigrc-app'
        else:
            # Si hosting es un objeto
            config['hosting']['site'] = 'unigrc-app'
        
        with open('firebase.json', 'w') as f:
            json.dump(config, f, indent=2)
        print("✅ firebase.json actualizado con siteId")
    else:
        print("⚠️  No se encontró sección 'hosting' en firebase.json")
        sys.exit(1)
except Exception as e:
    print(f"❌ Error actualizando firebase.json: {e}")
    sys.exit(1)
PYTHON_SCRIPT
fi

# Verificar que el build existe
echo "🔨 Verificando build del frontend..."
if [ ! -d "dist/public" ]; then
    echo "📦 El build no existe. Ejecutando build..."
    npm run build
else
    echo "✅ Build encontrado en dist/public"
fi

# Verificar que firebase.json está correcto
echo "✅ Verificando configuración..."
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json no encontrado"
    exit 1
fi

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Si el sitio no se creó automáticamente, créalo desde:"
echo "      https://console.firebase.google.com/project/unigrc-m/hosting"
echo ""
echo "   2. Desplegar a Firebase Hosting:"
echo "      npm run firebase:deploy:hosting"
echo ""
echo "   3. Configurar dominio cl.unigrc.app desde Firebase Console"
echo ""

