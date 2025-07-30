# Mobile Waiter - Aplicación React Native para Camareros

Esta es la aplicación móvil React Native para camareros del sistema GastronFlow. Permite gestionar mesas, tomar pedidos, procesar pagos y manejar alertas en tiempo real. **Optimizada para iPad 13 Pro** con layout adaptativo.

## 🚀 Características Principales

### 📱 Gestión de Mesas
- **Vista general**: Muestra todas las mesas del restaurante con su estado actual
- **Estados de mesa**: Libre, Ocupada, Reservada
- **Información detallada**: Capacidad, tiempo ocupado, camarero asignado, cuenta total
- **Filtros**: Filtrar mesas por estado (Todas, Libres, Ocupadas, Reservadas)
- **Layout adaptativo**: Optimizado para iPad con panel lateral y mapa de mesas expandido

### 🔔 Sistema de Alertas
- **Alertas en tiempo real**: Pedidos listos, solicitudes de cuenta, asistencia necesaria
- **Prioridades**: Alta, media, baja
- **Resolución**: Los camareros pueden marcar alertas como resueltas
- **Indicadores visuales**: Mesas con alertas se destacan con bordes rojos
- **Panel compacto**: En iPad, las alertas se muestran en un panel lateral más pequeño

### 🍽️ Gestión de Pedidos
- **Menú interactivo**: Categorías de productos (Entrantes, Platos principales, Postres)
- **Selección de productos**: Añadir/quitar items con controles de cantidad
- **Resumen del pedido**: Vista previa antes de confirmar
- **Confirmación**: Envío del pedido al sistema
- **Layout de dos columnas**: En iPad, los productos se muestran en grid de 2 columnas

### 💳 Procesamiento de Pagos
- **Pagos completos**: Libera la mesa automáticamente
- **Pagos parciales**: Mantiene la mesa ocupada con indicador
- **Seguimiento**: Muestra cantidad pagada vs total pendiente

### 👥 Asignación de Mesas
- **Selección de comensales**: 2, 4, 6 u 8 personas
- **Confirmación de llegada**: Para mesas reservadas
- **Gestión de ocupación**: Control de tiempo y estado

## 🖥️ Optimizaciones para iPad 13 Pro

### Layout Adaptativo
- **Panel lateral**: Alertas y filtros en panel izquierdo compacto (300px)
- **Mapa expandido**: Mesas en grid de 4 columnas para máximo aprovechamiento
- **Tipografía escalada**: Tamaños de fuente optimizados para pantalla grande
- **Espaciado mejorado**: Padding y márgenes adaptados para iPad

### Diseño Responsivo
- **Detección automática**: Detecta automáticamente si es iPad (ancho ≥ 768px)
- **Grid adaptativo**: 4 columnas en iPad, 2 en móvil
- **Iconos escalados**: Tamaños de iconos optimizados para pantalla táctil grande
- **Controles táctiles**: Botones y controles de tamaño adecuado para iPad

### Experiencia de Usuario
- **Navegación fluida**: Transiciones suaves entre vistas
- **Feedback visual**: Estados claros y confirmaciones
- **Accesibilidad**: Contraste y tamaños optimizados para pantalla grande

## 🛠️ Tecnologías Utilizadas

- **React Native**: Framework principal
- **Expo**: Herramientas de desarrollo
- **TypeScript**: Tipado estático
- **Ionicons**: Iconografía
- **React Hooks**: Gestión de estado
- **Dimensions API**: Detección de tamaño de pantalla

## 📦 Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Ejecutar en iOS
npm run ios

# Ejecutar en iPad
# Conectar iPad y ejecutar desde Xcode o Expo Go
```

## 📱 Especificaciones Técnicas iPad 13 Pro

### Dimensiones
- **Resolución**: 2732 x 2048 pixels
- **Densidad**: 264 PPI
- **Aspecto**: 4:3
- **Detección**: Ancho ≥ 768px

### Optimizaciones Visuales
- **Grid de mesas**: 4 columnas para máximo aprovechamiento
- **Panel lateral**: 300px de ancho fijo
- **Tipografía**: Escalada para pantalla grande
- **Iconos**: Tamaños optimizados para táctil

### Rendimiento
- **FlatList optimizado**: Para listas largas de mesas
- **Scroll virtual**: Para mejor rendimiento
- **Lazy loading**: Carga bajo demanda

## 🎯 Características de UX/UI

### Diseño Responsivo
- **iPad**: Layout de dos paneles (lateral + principal)
- **Móvil**: Layout vertical optimizado
- **Grid adaptativo**: 4 columnas en iPad, 2 en móvil
- **Scroll optimizado**: Horizontal para filtros, vertical para contenido

### Interacciones Fluidas
- Animaciones suaves
- Feedback táctil optimizado para iPad
- Estados de carga
- Confirmaciones visuales

### Accesibilidad
- Contraste adecuado
- Tamaños de texto legibles en pantalla grande
- Iconografía clara y escalada
- Navegación intuitiva

### Optimizaciones iPad
- **Panel lateral compacto**: 300px de ancho para alertas y filtros
- **Mapa de mesas expandido**: Máximo aprovechamiento del espacio
- **Tipografía escalada**: Títulos 32px, subtítulos 16px
- **Controles táctiles**: Botones de 40px en iPad vs 32px en móvil
- **Espaciado mejorado**: Padding de 24px vs 16px en móvil

## 🔮 Próximas Mejoras

- [ ] Integración con backend real
- [ ] Notificaciones push
- [ ] Sincronización en tiempo real
- [ ] Modo offline
- [ ] Personalización de menús
- [ ] Reportes y estadísticas
- [ ] Gestión de reservas
- [ ] Integración con sistemas de pago
- [ ] Soporte para múltiples pantallas
- [ ] Modo landscape optimizado

## 🤝 Contribución

Para contribuir al desarrollo:

1. Crear una rama para tu feature
2. Implementar los cambios
3. Probar en dispositivos reales (iPad y móvil)
4. Crear un pull request

## 📞 Soporte

Para soporte técnico o preguntas sobre la aplicación, contactar al equipo de desarrollo de GastronFlow.