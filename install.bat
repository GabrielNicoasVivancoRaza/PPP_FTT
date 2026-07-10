@echo off
echo.
echo 🎵 Instalación del Sistema de Boletos Shakira 8 Noviembre 🎵
echo =============================================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado. Por favor instale Node.js 16+ primero.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js encontrado: %NODE_VERSION%

REM Instalar dependencias del backend
echo.
echo 📦 Instalando dependencias del backend...
cd backend
if exist package.json (
    call npm install
    echo ✅ Backend dependencies instaladas
) else (
    echo ❌ package.json no encontrado en backend/
    pause
    exit /b 1
)

REM Instalar dependencias del frontend
echo.
echo 📦 Instalando dependencias del frontend...
cd ..\frontend
if exist package.json (
    call npm install
    echo ✅ Frontend dependencies instaladas
) else (
    echo ❌ package.json no encontrado en frontend/
    pause
    exit /b 1
)

cd ..

echo.
echo 🎉 Instalación completada!
echo.
echo Para ejecutar el sistema:
echo.
echo Backend (Terminal 1):
echo   cd backend
echo   npm run dev
echo.
echo Frontend (Terminal 2):
echo   cd frontend
echo   npm run dev
echo.
echo Usuario por defecto:
echo   Usuario: admin@shakira.com
echo   Contraseña: FTT2025
echo.
echo ¡El sistema estará disponible en http://localhost:5173!
echo.
pause
