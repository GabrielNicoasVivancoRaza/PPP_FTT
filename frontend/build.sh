#!/bin/bash

# Build script personalizado para Render
echo "Starting custom build for Render..."

# Install dependencies
npm install

# Build the application
npm run build

# Create custom index.html for all routes
echo "Creating SPA routing fallback..."

# Create a simple routing script
cat > dist/404.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=/">
    <title>Redirecting...</title>
</head>
<body>
    <script>
        window.location.href = '/';
    </script>
</body>
</html>
EOF

echo "Build completed successfully!"
