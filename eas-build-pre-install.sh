#!/bin/bash

# Configurar EAS automáticamente antes del build
echo "Configurando EAS project..."
npx eas-cli@latest init --id 1edfa3ff-5b7e-410f-be06-b590e00b50fa --non-interactive

echo "EAS configurado correctamente"
