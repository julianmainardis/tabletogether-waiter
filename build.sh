#!/bin/bash

# Configurar EAS automáticamente
echo "Configurando EAS..."
npx eas-cli@latest init --id 1edfa3ff-5b7e-410f-be06-b590e00b50fa --non-interactive

# Hacer el build
echo "Iniciando build de Android..."
npx eas-cli@latest build --platform android --profile production --non-interactive

echo "Build completado!"
