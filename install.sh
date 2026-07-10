#!/bin/bash

echo "🎵 Instalación del Sistema de Boletos Shakira 8 Noviembre 🎵"
echo "============================================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instale Node.js 16+ primero."
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Instalar dependencias del backend
echo ""
echo "📦 Instalando dependencias del backend..."
cd backend
if [ -f package.json ]; then
    npm install
    echo "✅ Backend dependencies instaladas"
else
    echo "❌ package.json no encontrado en backend/"
    exit 1
fi

# Instalar dependencias del frontend
echo ""
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
if [ -f package.json ]; then
    npm install
    echo "✅ Frontend dependencies instaladas"
else
    echo "❌ package.json no encontrado en frontend/"
    exit 1
fi

cd ..

echo ""
echo "🎉 Instalación completada!"
echo ""
echo "Para ejecutar el sistema:"
echo ""
echo "Backend (Terminal 1):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd frontend" 
echo "  npm run dev"
echo ""
echo "Usuario por defecto:"
echo "  Usuario: admin@shakira.com"
echo "  Contraseña: FTT2025"
echo ""
echo "¡El sistema estará disponible en http://localhost:5173!"
