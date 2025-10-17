# 🧪 Page Testing Suite

Este directorio contiene scripts de testing individuales para cada página de la aplicación Omega Frontend Integration.

## 📁 Archivos de Testing por Página

### 🧮 Agregar Formula (`/agregar-formula`)
- **Archivo**: `test-agregar-formula.js`
- **Comando**: `npm run test:agregar-formula`
- **Endpoints probados**:
  - `POST /api/formulas/crear` - Crear nueva fórmula

### 👥 Users Management (`/users-management`)
- **Archivo**: `test-users-management.js`
- **Comando**: `npm run test:users-management`
- **Endpoints probados**:
  - `GET /api/auth/users` - Obtener todos los usuarios
  - `GET /api/plantas/allID` - Obtener IDs de plantas
  - `GET /api/plantas/accesibles` - Obtener plantas accesibles
  - `GET /api/procesos/planta/{plantId}` - Obtener procesos por planta
  - `GET /api/accesos/plantas/usuario/{userId}` - Obtener accesos de plantas por usuario
  - `PATCH /api/auth/update/{userId}` - Actualizar usuario
  - `DELETE /api/auth/delete/{userId}` - Eliminar usuario
  - `POST /api/accesos/plantas/asignar` - Asignar acceso a planta

### 📊 Dashboard Parameters (`/dashboard-parameters`)
- **Archivo**: `test-dashboard-parameters.js`
- **Comando**: `npm run test:dashboard-parameters`
- **Endpoints probados**:
  - `PATCH /api/variables/{id}` - Actualizar variable
  - `GET /api/variables` - Obtener todas las variables
  - `POST /api/plantas/crear` - Crear nueva planta
  - `GET /api/variables/proceso/{systemId}` - Obtener variables por sistema
  - `POST /api/procesos/crear` - Crear nuevo proceso
  - `DELETE /api/variables/{variableId}/proceso/{processId}` - Eliminar variable del proceso
  - `POST /api/variables/crear` - Crear nueva variable
  - `GET /api/variables-tolerancia` - Obtener tolerancias
  - `PATCH /api/variables-tolerancia/{id}` - Actualizar tolerancia

### 📋 Dashboard Report Manager (`/dashboard-reportmanager`)
- **Archivo**: `test-dashboard-reportmanager.js`
- **Comando**: `npm run test:dashboard-reportmanager`
- **Endpoints probados**:
  - `GET /api/plantas/all` - Obtener todas las plantas
  - `GET /api/auth/user-by-plant/{plantId}` - Obtener usuarios por planta
  - `GET /api/variables/proceso/{systemId}` - Obtener variables por sistema
  - `GET /api/mediciones/variable-id/{variableId}` - Obtener mediciones por variable

### ⚙️ Dashboard Agregar Sistema (`/dashboard-agregarsistema`)
- **Archivo**: `test-dashboard-agregarsistema.js`
- **Comando**: `npm run test:dashboard-agregarsistema`
- **Endpoints probados**:
  - `PATCH /api/variables/{id}` - Actualizar variable
  - `GET /api/auth/users` - Obtener todos los usuarios
  - `GET /api/plantas/accesibles` - Obtener plantas accesibles
  - `GET /api/procesos/planta/{plantId}` - Obtener procesos por planta
  - `POST /api/plantas/crear` - Crear nueva planta
  - `PATCH /api/plantas/update/{plantId}` - Actualizar planta
  - `GET /api/variables/proceso/{systemId}` - Obtener variables por sistema
  - `DELETE /api/procesos/planta/{plantId}/{processId}` - Eliminar proceso
  - `POST /api/procesos/crear` - Crear nuevo proceso
  - `POST /api/variables/crear` - Crear nueva variable

## 🚀 Uso

### Ejecutar todos los tests de páginas
```bash
npm run test:pages
```

### Ejecutar tests individuales
```bash
# Test de agregar fórmula
npm run test:agregar-formula

# Test de gestión de usuarios
npm run test:users-management

# Test de parámetros del dashboard
npm run test:dashboard-parameters

# Test del report manager
npm run test:dashboard-reportmanager

# Test de agregar sistema
npm run test:dashboard-agregarsistema
```

### Ejecutar directamente con Node
```bash
node testers/test-agregar-formula.js
node testers/test-users-management.js
node testers/test-dashboard-parameters.js
node testers/test-dashboard-reportmanager.js
node testers/test-dashboard-agregarsistema.js
node testers/run-all-page-tests.js
```

## 📊 Reportes

Cada script genera su propio reporte JSON:

- `agregar-formula-test-report.json`
- `users-management-test-report.json`
- `dashboard-parameters-test-report.json`
- `dashboard-reportmanager-test-report.json`
- `dashboard-agregarsistema-test-report.json`
- `consolidated-page-tests-report.json` (reporte consolidado)

## 🎯 Características

### ✅ **Funcionalidades Comunes:**
- **Autenticación automática** con usuario de prueba
- **Logging detallado** con colores
- **Manejo de errores** robusto
- **Timeouts configurables**
- **Reportes JSON** con estadísticas
- **Tracking de conexiones**

### 🔧 **Configuración:**
- **Timeout**: 15 segundos por defecto
- **Credenciales**: `admin@example.com` / `admin123456`
- **API URL**: Configurable via `NEXT_PUBLIC_API_URL`

### 📈 **Métricas de Reporte:**
- Total de tests ejecutados
- Tests exitosos vs fallidos
- Tiempo de ejecución
- Tasa de éxito por categoría
- Detalles de errores

## 🐛 Troubleshooting

### Error: "No authentication token available"
- Verifica que el usuario de prueba exista y esté verificado
- Ejecuta `npm run test:setup` para crear usuarios de prueba

### Error: "Request timeout"
- Aumenta el timeout en la configuración del script
- Verifica que el API esté funcionando

### Error: "Connection refused"
- Verifica que el API esté ejecutándose
- Comprueba la URL del API

## 📝 Logs

Los scripts generan logs con colores para facilitar la lectura:

- 🔵 **Azul**: Información general
- 🟢 **Verde**: Tests exitosos
- 🔴 **Rojo**: Tests fallidos
- 🟡 **Amarillo**: Advertencias
- 🔵 **Cian**: Información de tests

## 🤝 Contribuir

Para agregar nuevos tests o mejorar la funcionalidad:

1. Crea un nuevo archivo `test-nueva-pagina.js`
2. Sigue el patrón de los scripts existentes
3. Agrega el comando al `package.json`
4. Actualiza este README
5. Prueba tus cambios

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de error
2. Verifica la configuración del API
3. Comprueba que las credenciales sean correctas
4. Revisa la conectividad de red
