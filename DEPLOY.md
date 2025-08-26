# 🚀 Guía de Deploy - Mobile Waiter

## Opciones de Deploy

### 1. **EAS Build (Recomendado para Apps Nativas)**

Para crear builds nativos para iOS y Android:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login a Expo
eas login

# Configurar el proyecto
eas build:configure

# Build para Android
npm run build:android

# Build para iOS
npm run build:ios

# Build de preview (para testing)
npm run build:preview
```

### 2. **Expo Go (Desarrollo y Testing)**

Para testing rápido con Expo Go:

```bash
# Iniciar servidor de desarrollo
npm start

# Escanear QR con Expo Go en tu dispositivo
```

### 3. **Web Build (Para Vercel)**

Para deploy en Vercel como aplicación web:

```bash
# Build para web
npm run build:web

# Deploy a Vercel
vercel --prod
```

## Configuración de Entorno

### Variables de Entorno

Crear archivo `.env.local` para desarrollo:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

Para producción, configurar en Vercel:

```env
EXPO_PUBLIC_API_URL=https://gastron-flow-backend.vercel.app/api
```

### Configuración de EAS

El archivo `eas.json` ya está configurado con:

- **development**: Para desarrollo local
- **preview**: Para testing interno
- **production**: Para builds de producción

## Deploy en Vercel

### Opción A: Como Aplicación Web

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Build command: `npm run build:web`
4. Output directory: `dist`

### Opción B: Como API (Backend)

Si necesitas solo el backend, usar el directorio `backend/`

## Distribución de Apps Nativas

### Android

1. Build con EAS: `npm run build:android`
2. Descargar APK/AAB desde Expo
3. Subir a Google Play Store: `npm run submit:android`

### iOS

1. Build con EAS: `npm run build:ios`
2. Descargar IPA desde Expo
3. Subir a App Store: `npm run submit:ios`

## Troubleshooting

### Error de TypeScript en Vercel

Si tienes errores de TypeScript, verificar:

1. `tsconfig.json` está configurado correctamente
2. Todas las dependencias están instaladas
3. No hay imports circulares

### Error de EAS Build

1. Verificar que estás logueado: `eas whoami`
2. Verificar configuración: `eas build:configure`
3. Revisar logs del build en Expo Dashboard

## URLs de Producción

- **Backend**: https://gastron-flow-backend.vercel.app
- **Frontend**: https://gastron-flow-frontend.vercel.app
- **Mobile Web**: https://mobile-waiter.vercel.app (si se deploya como web)

## Notas Importantes

1. **Mobile Waiter** es principalmente una app nativa, no web
2. Para producción real, usar **EAS Build** para crear APK/IPA
3. **Vercel** es mejor para el backend y frontend web
4. **Expo Go** es solo para desarrollo y testing

