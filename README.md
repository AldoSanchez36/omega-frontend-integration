# Organomex Frontend - Sistema de Gestión Industrial

Este proyecto es un sistema de gestión industrial desarrollado con **Next.js** (React), diseñado para la administración de plantas, sistemas, reportes y usuarios en un entorno industrial moderno.

---

## 🏗️ Estructura General del Proyecto

- **app/**: Todas las páginas y rutas principales de la aplicación (Next.js App Router).
- **components/**: Componentes reutilizables (Navbar, tablas, gráficos, UI, etc).
- **context/**: Contextos de React para manejo global de estado (ej. usuario).
- **hooks/**: Hooks personalizados para lógica reutilizable.
- **services/**: Servicios para llamadas HTTP y lógica de negocio.
- **public/**: Recursos estáticos (imágenes, logos).
- **config/**: Configuración y constantes globales.
- **Elements/**: Archivos de internacionalización y elementos de idioma.

---

## 📄 Páginas y Funcionalidades Principales

### 1. **Autenticación**
- `/login`: Inicio de sesión.
- `/register`: Registro de nuevos usuarios.
- `/logout`: Limpieza de sesión y redirección segura.
- `/forgot-password`: Recuperación de contraseña.

### 2. **Dashboard y Gestión**
- `/dashboard`: Página principal tras login, muestra resumen y accesos rápidos según el rol.
  - `/dashboard/buttons/`: Botones de acciones rápidas, modularizados por rol (admin, user, client).
- `/dashboard-parameters`: Gestión avanzada de parámetros industriales con configuración de tolerancias.
- `/dashboard-agregarsistema`: Agregar nuevos sistemas industriales.
- `/dashboard-agregarplanta`: Agregar nuevas plantas industriales.

### 3. **Reportes**
- `/dashboard-reportList`:  
  - Lista de reportes PDF generados.
  - Filtro por fecha.
  - Acciones: ver y descargar (con íconos profesionales).
- `/dashboard-reportmanager`:  
  - Gestión avanzada de reportes con entrada manual de mediciones.
  - Visualización de tablas de medidas (`MesureTable`) y gráficos de series temporales (`SensorTimeSeriesChart`).
  - Configuración de tolerancias por parámetro.
  - Sistema de mediciones por múltiples sistemas (S01, S02, etc.).
- `/reports`:  
  - Visualización detallada de un reporte específico (accede desde la lista).

### 4. **Gestión de Usuarios**
- `/users-management`:  
  - Administración de usuarios (solo para roles con permisos).

### 5. **Perfil y Configuración**
- `/profile`:  
  - Visualización y edición de perfil de usuario.
- `/settings`:  
  - Configuración general de la cuenta y preferencias.

### 6. **Otras páginas**
- `/about`: Información sobre la aplicación o empresa.
- `/contact`: Formulario de contacto.
- `/agregar-formula`: Página para agregar fórmulas industriales.

---

## 🧩 Componentes Destacados

- **Navbar**: Barra de navegación dinámica según el rol del usuario.
- **MesureTable**: Tabla avanzada para mostrar datos de sensores y estadísticas.
- **SensorTimeSeriesChart**: Gráficos de series temporales para análisis visual.
- **ProtectedRoute**: Componente para proteger rutas según autenticación.
- **Quick Actions**: Botones de acciones rápidas, adaptados al rol.
- **MedicionInputBox**: Componente para entrada manual de mediciones por parámetro.
- **DebugPanel**: Panel de depuración para desarrollo.

---

## 🔒 Seguridad y Control de Acceso

### **Sistema de Roles**
- **Admin**: Acceso completo a todas las funcionalidades
- **User**: Acceso limitado a plantas asignadas, puede configurar parámetros
- **Client**: Acceso solo de lectura a datos de sus plantas

### **Rutas Protegidas**
- Solo usuarios autenticados pueden acceder a páginas sensibles.
- **Role-based UI**: La interfaz y las acciones disponibles cambian según el rol.
- **Botones condicionales**: El botón "⚙️ Configurar Límites" solo aparece para admin y user.
- **Logout robusto**: Limpieza de sesión y redirección segura, sin loops infinitos.
- **Feedback visual**: Mensajes claros de carga, error y éxito.

---

## 🛠️ Arquitectura y Hooks Personalizados

### **useUserAccess Hook**
Hook reutilizable que centraliza toda la lógica de autenticación y acceso:

```typescript
const {
  users, plants, systems,
  selectedUser, selectedPlant, selectedSystem,
  userRole, loading, error,
  handleSelectUser, handleSelectPlant,
  fetchParameters
} = useUserAccess(token, { 
  autoSelectFirstPlant: false, 
  autoSelectFirstSystem: false 
})
```

**Características:**
- Manejo automático de roles (admin, user, client)
- Carga dinámica de plantas según permisos del usuario
- Opciones configurables para selección automática
- Gestión centralizada de estados de carga y error

### **Gestión de Tolerancias**
Sistema completo para configurar límites de parámetros:
- **Límites mínimos y máximos** por parámetro
- **Rangos "Bien"** para valores óptimos
- **Guardado automático** de configuraciones
- **Validación visual** con colores (verde, amarillo)

### **Sistema de Mediciones**
- **Entrada manual** de mediciones por parámetro
- **Múltiples sistemas** (S01, S02, S03, etc.)
- **Previsualización** de datos antes de guardar
- **Validación** de campos requeridos

---

## 🎨 UI/UX Moderna

### **Componentes shadcn/ui**
- Interfaz moderna y consistente
- Componentes accesibles y responsivos
- Tema personalizado con colores corporativos
- Iconografía profesional con Lucide React

### **Experiencia de Usuario**
- **Navegación intuitiva** con breadcrumbs
- **Estados de carga** con spinners
- **Mensajes de error** claros y contextuales
- **Feedback visual** inmediato en todas las acciones
- **Responsive design** para diferentes dispositivos

---

## 📡 Integración con Backend

- El frontend se conecta a un backend Express (por defecto en `http://localhost:4000`).
- Endpoints principales:
  - `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
  - `/api/auth/user-by-name/:username` - Obtener ID de usuario por username
  - `/api/accesos/plantas/usuario/:userId` - Accesos de plantas por usuario
  - `/api/plantas/accesibles` - Plantas accesibles para el usuario
  - `/api/plantas/crear`, `/api/plantas/mis-plantas/:userId`
  - `/api/procesos/planta/:plantaId` - Sistemas por planta
  - `/api/variables/proceso/:procesoId` - Parámetros por sistema
  - `/api/variables-tolerancia` - Gestión de tolerancias
  - `/api/mediciones` - Guardado de mediciones
  - `/api/mediciones/variable/:variableId` - Mediciones por variable
  - `/api/reportes`, `/api/reportes/usuario/:userId`
  - `/api/documentos-pdf` (para reportes PDF)

---

## 🚀 Instalación y Ejecución

1. **Clona o descarga** el proyecto.
2. **Instala dependencias:**
   ```bash
   npm install
   ```
3. **Configura variables de entorno:**
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
   ```
4. **Inicia el backend** (en otra terminal):
   ```bash
   # Ve a tu carpeta del backend y ejecuta:
   npm start
   # o
   node index.js
   ```
5. **Inicia el frontend:**
   ```bash
   npm run dev
   ```
6. **Abre en el navegador:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

---

## 📝 Cambios Recientes y Mejoras

### **Refactorización del Código (v2.0)**
- **Hook reutilizable `useUserAccess`**: Centraliza toda la lógica de autenticación y acceso
- **Eliminación de código duplicado**: Reducción significativa de líneas de código
- **Mejor mantenibilidad**: Cambios en lógica de acceso solo en un lugar
- **Consistencia**: Mismo comportamiento en todas las páginas

### **Sistema de Gestión de Parámetros Avanzado**
- **Configuración de tolerancias**: Límites mínimos, máximos y rangos óptimos
- **Interfaz visual intuitiva**: Colores para identificar rangos (verde=bien, amarillo=límite)
- **Guardado automático**: Configuraciones se guardan inmediatamente
- **Validación en tiempo real**: Feedback visual para valores fuera de rango

### **Sistema de Mediciones Manuales**
- **Entrada por parámetro**: Cada parámetro tiene su propio formulario de medición
- **Múltiples sistemas**: Soporte para S01, S02, S03, etc.
- **Previsualización**: Tabla que muestra datos antes de guardar
- **Validación**: Fecha requerida, valores numéricos validados

### **Control de Acceso Mejorado**
- **Botones condicionales**: "⚙️ Configurar Límites" solo para admin y user
- **Selección automática configurable**: Cada página puede elegir si auto-selecciona plantas
- **Gestión de roles robusta**: Diferentes flujos para admin, user y client

### **Tabla de Reportes PDF Mejorada**
- **Tabla moderna** con campos organizados
- **Íconos profesionales** de Lucide React
- **Filtro por fecha** funcional
- **Acciones directas**: Ver y descargar PDFs

### **Optimizaciones de Rendimiento**
- **Hooks personalizados**: Lógica reutilizable y optimizada
- **Estados locales**: Loading y error específicos por componente
- **Callbacks optimizados**: Uso de useCallback para evitar re-renders innecesarios

---

## 🐛 Solución de Problemas

### Error de CORS
Asegúrate de que tu backend tenga configurado CORS para permitir requests desde el frontend:

```js
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
}));
```

### Error "Cannot connect to backend"
1. Verifica que el backend esté corriendo en puerto 4000
2. Revisa que `.env.local` tenga `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. Reinicia ambos servidores

### Error de puerto ocupado
```bash
# Si el puerto 3000 está ocupado
npm run dev -- -p 3001
# Actualiza .env.local si cambias el puerto del frontend
```

### Problemas con roles de usuario
1. Verifica que el usuario tenga un `puesto` válido en la base de datos
2. Roles válidos: "admin", "user", "client"
3. Revisa los logs del backend para errores de autenticación

---

## 📱 URLs Importantes

- **Inicio:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **Gestión de Parámetros:** http://localhost:3000/dashboard-parameters
- **Gestor de Reportes:** http://localhost:3000/dashboard-reportmanager
- **API Backend:** http://localhost:4000

---

## 🎯 Próximas Posibles Mejoras

- [ ] Exportación de datos a Excel
- [ ] Notificaciones en tiempo real
- [ ] Dashboard con métricas en tiempo real
- [ ] Sistema de alertas automáticas
- [ ] Integración con dispositivos IoT
- [ ] App móvil React Native

---

¡Tu aplicación está funcionando perfectamente con todas las mejoras implementadas! 🚀
