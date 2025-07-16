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
- `/dashboard-parameters`: Gestión y visualización de parámetros industriales.
- `/dashboard-agregarsistema`: Agregar nuevos sistemas industriales.
- `/dashboard-agregarplanta`: Agregar nuevas plantas industriales.

### 3. **Reportes**
- `/dashboard-reportList`:  
  - Lista de reportes PDF generados.
  - Filtro por fecha.
  - Acciones: ver y descargar (con íconos profesionales).
- `/dashboard-reportmanager`:  
  - Gestión avanzada de reportes.
  - Visualización de tablas de medidas (`MesureTable`) y gráficos de series temporales (`SensorTimeSeriesChart`).
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

---

## 🔒 Seguridad y UX

- **Rutas protegidas**: Solo usuarios autenticados pueden acceder a páginas sensibles.
- **Role-based UI**: La interfaz y las acciones disponibles cambian según el rol .
- **Logout robusto**: Limpieza de sesión y redirección segura, sin loops infinitos.
- **Feedback visual**: Mensajes claros de carga, error y éxito.

---

## 🛠️ Buenas Prácticas

- Uso de contextos y hooks para manejo de usuario y lógica compartida.
- Componentes UI desacoplados y reutilizables.
- Estilo moderno con Tailwind y componentes tipo V0/shadcn.
- Internacionalización preparada (archivos en Elements/).

---

## 📡 Integración con Backend

- El frontend se conecta a un backend Express (por defecto en `http://localhost:4000`).
- Endpoints principales:
  - `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
  - `/api/plantas/crear`, `/api/plantas/mis-plantas/:userId`
  - `/api/reportes`, `/api/reportes/usuario/:userId`
  - `/api/procesos/crear`, `/api/procesos/planta/:plantaId`
  - `/api/variables/crear`, `/api/variables/proceso/:procesoId`
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

## 📝 Cambios recientes

### Tabla de Reportes PDF

- La página de reportes (`/dashboard-reportList`) ahora muestra una tabla moderna con los siguientes campos:
  - **Título**
  - **Planta**
  - **Sistema**
  - **Estado**
  - **Fecha**
  - **Acciones** (ver y descargar)

- Los botones de acción ahora usan íconos profesionales de la librería [lucide-react](https://lucide.dev/):
  - Eye (Ver PDF): Abre el reporte en una nueva pestaña.
  - Download (Descargar PDF): Descarga el archivo PDF.

- Los datos de la tabla se obtienen dinámicamente del backend (`/api/documentos-pdf`).
- El filtro por fecha permite buscar reportes por día de creación.

### Dependencias de íconos

- Se utiliza la librería `lucide-react` para los íconos de acción.
  Si agregas nuevos botones o acciones, usa íconos de esta librería para mantener la coherencia visual.

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

---

## 📱 URLs Importantes

- **Inicio:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **API Backend:** http://localhost:4000

---

¡Tu aplicación debería estar funcionando perfectamente con esta configuración!
