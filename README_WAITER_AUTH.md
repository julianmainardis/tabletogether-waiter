# 🔐 Autenticación de Waiters - Mobile App

## 📋 **Descripción**

La app mobile de waiters ahora está conectada a la base de datos del backend usando el mismo endpoint de autenticación que la app de cocina (`/admin/auth/login`), pero con validación específica para el rol `admin`.

## 🔧 **Configuración**

### **Variables de Entorno**

La app usa la siguiente configuración por defecto:
- **API URL**: `http://localhost:3000/api` (configurable via `EXPO_PUBLIC_API_URL`)

### **Archivos de Configuración**

- `app.config.ts` - Configuración de Expo
- `services/waiterAuth.ts` - Servicio de autenticación
- `types/` - Tipos TypeScript
- `contexts/WaiterAuthContext.tsx` - Contexto de autenticación

## 🔑 **Autenticación**

### **Endpoint**
```
POST /admin/auth/login
```

### **Validación de Rol**
- ✅ **Permitido**: Usuarios con `role: "admin"`
- ❌ **Denegado**: Usuarios con otros roles (chef, assistant, etc.)

### **Estructura de Respuesta**
```json
{
  "token": "jwt_token_here",
  "expiresAt": "2024-01-01T08:00:00.000Z",
  "user": {
    "id": "user_id",
    "username": "admin",
    "fullName": "Administrator",
    "role": "admin",
    "isActive": true
  }
}
```

## 👥 **Usuarios de Prueba**

### **Credenciales Disponibles**
Basado en la migración de la base de datos:

| Usuario | Contraseña | Rol | Estado |
|---------|------------|-----|--------|
| `admin` | `password` | `admin` | ✅ Activo |

### **Nota Importante**
- Solo usuarios con rol `admin` pueden acceder a la app de waiters
- Los usuarios con rol `chef` o `assistant` serán rechazados

## 🚀 **Funcionalidades**

### **Login**
- ✅ Validación de credenciales
- ✅ Validación de rol `admin`
- ✅ Persistencia de sesión con AsyncStorage
- ✅ Manejo de errores

### **Logout**
- ✅ Cierre de sesión en servidor
- ✅ Limpieza de AsyncStorage
- ✅ Redirección a login

### **Persistencia**
- ✅ Verificación automática de sesión al iniciar
- ✅ Validación de expiración de token
- ✅ Recuperación de datos de usuario

## 🔒 **Seguridad**

### **Validaciones**
- ✅ Verificación de token JWT
- ✅ Validación de expiración
- ✅ Verificación de rol específico
- ✅ Limpieza automática de sesiones expiradas

### **Almacenamiento**
- ✅ AsyncStorage para persistencia local
- ✅ Encriptación de datos sensibles
- ✅ Limpieza automática en logout

## 🛠️ **Uso**

### **1. Configurar API URL**
```bash
# Opción 1: Variable de entorno
export EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Opción 2: Editar app.config.ts
extra: {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
}
```

### **2. Ejecutar la App**
```bash
npm install
npx expo start
```

### **3. Login**
1. Usar credenciales de usuario `admin`
2. La app validará automáticamente el rol
3. Si el rol no es `admin`, se mostrará error

## 📱 **UI/UX**

### **Login Screen**
- ✅ Diseño responsive para tablet
- ✅ Validación en tiempo real
- ✅ Manejo de errores visual
- ✅ Botón de mostrar/ocultar contraseña

### **Header de Usuario**
- ✅ Muestra nombre completo del usuario
- ✅ Muestra rol del usuario
- ✅ Botón de logout
- ✅ Diseño responsive

## 🔄 **Flujo de Autenticación**

1. **Inicio de App**
   - Verificar sesión guardada
   - Si válida → Ir a TableManagement
   - Si inválida → Ir a Login

2. **Login**
   - Validar credenciales
   - Verificar rol `admin`
   - Guardar sesión
   - Redirigir a TableManagement

3. **Logout**
   - Cerrar sesión en servidor
   - Limpiar AsyncStorage
   - Redirigir a Login

## 🐛 **Solución de Problemas**

### **Error: "Acceso denegado"**
- Verificar que el usuario tenga rol `admin`
- Usar credenciales correctas

### **Error: "Credenciales inválidas"**
- Verificar username/password
- Verificar que el usuario esté activo
- Verificar que el backend esté corriendo

### **Error de Conexión**
- Verificar que el backend esté corriendo
- Verificar la URL de la API en `app.config.ts`

### **Error de AsyncStorage**
- Verificar que `@react-native-async-storage/async-storage` esté instalado
- Reiniciar el servidor de desarrollo con `npx expo start --clear`

## 📝 **Notas de Desarrollo**

- La app usa el mismo endpoint que kitchen pero con validación de rol diferente
- La persistencia usa AsyncStorage en lugar de localStorage
- El contexto maneja el estado de autenticación globalmente
- Los tipos están definidos en `types/` con un archivo de índice
- La configuración usa `app.config.ts` para mejor tipado
- **IMPORTANTE**: El rol correcto es `admin`, no `administrator`
- **CREDENCIALES**: Usuario `admin`, contraseña `password` 