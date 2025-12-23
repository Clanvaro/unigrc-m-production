#!/bin/bash
# Script para instalar k6 en diferentes sistemas operativos

set -e

echo "🔧 Instalando k6 para pruebas de estrés..."
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "📦 Detectado: macOS"
    if command -v brew &> /dev/null; then
        echo "Instalando con Homebrew..."
        brew install k6
    else
        echo "❌ Homebrew no está instalado."
        echo "Instala Homebrew primero: https://brew.sh"
        echo "O descarga k6 desde: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "📦 Detectado: Linux"
    if command -v apt-get &> /dev/null; then
        echo "Instalando con apt (Debian/Ubuntu)..."
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9B
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif command -v yum &> /dev/null; then
        echo "Instalando con yum (RHEL/CentOS)..."
        sudo yum install https://dl.k6.io/rpm/repo.rpm
        sudo yum install k6
    else
        echo "❌ Gestor de paquetes no reconocido."
        echo "Visita: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "📦 Detectado: Windows"
    if command -v choco &> /dev/null; then
        echo "Instalando con Chocolatey..."
        choco install k6
    else
        echo "❌ Chocolatey no está instalado."
        echo "Instala Chocolatey primero: https://chocolatey.org"
        echo "O descarga k6 desde: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
else
    echo "❌ Sistema operativo no soportado: $OSTYPE"
    echo "Visita: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

echo ""
echo "✅ k6 instalado correctamente!"
echo ""
echo "Verificar instalación:"
k6 version
echo ""
echo "📚 Próximos pasos:"
echo "   npm run stress:install-check  # Verificar que k6 esté instalado"
echo "   npm run stress:basic           # Ejecutar prueba básica"
echo "   npm run stress:critical        # Ejecutar prueba de endpoints críticos"
echo ""
