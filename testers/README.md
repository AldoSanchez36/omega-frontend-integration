# 🧪 Dashboard Testing Suite

Este directorio contiene scripts de testing para verificar la conectividad y funcionalidad de todos los endpoints utilizados en el dashboard de Omega Frontend Integration.

## 📁 Archivos

- `testend-dashboard.js` - Script principal de testing con todas las funciones
- `run-dashboard-tests.js` - Script de ejecución con opciones de línea de comandos
- `README.md` - Esta documentación
- `dashboard-test-report.json` - Reporte generado después de ejecutar los tests (se crea automáticamente)

## 🚀 Uso Rápido

### Ejecutar tests básicos
```bash
node testers/run-dashboard-tests.js
```

### Ejecutar con configuración personalizada
```bash
node testers/run-dashboard-tests.js --url http://localhost:3000 --email admin@example.com --password admin123
```

### Ejecutar en modo verbose
```bash
node testers/run-dashboard-tests.js --verbose
```

## 📋 Endpoints Probados

### 🔐 Autenticación
- `POST /api/auth/login` - Login de usuario

### 📊 Dashboard
- `GET /api/dashboard/resumen` - Resumen del dashboard (usuario)
- `GET /api/dashboard/resumen-admin` - Resumen del dashboard (admin)

### 🏭 Plantas
- `GET /api/plantas/accesibles` - Plantas accesibles por el usuario
- `GET /api/plantas/all` - Todas las plantas

### ⚙️ Sistemas/Procesos
- `GET /api/procesos` - Todos los procesos
- `GET /api/procesos/planta/{plantId}` - Procesos por planta

### 📈 Variables
- `GET /api/variables` - Todas las variables
- `GET /api/variables/proceso/{systemId}` - Variables por sistema

### 📋 Reportes
- `GET /api/reportes` - Todos los reportes
- `GET /api/reportes/dashboard` - Reportes del dashboard
- `GET /api/reportes/usuario/{userId}` - Reportes por usuario

### 📊 Datos Históricos
- `GET /api/mediciones/proceso/{processName}` - Mediciones por proceso
- `GET /api/mediciones/variable/{variableName}` - Mediciones por variable

## ⚙️ Configuración

### Variables de Entorno

```bash
# URL del API
NEXT_PUBLIC_API_URL=http://localhost:4000

# Credenciales de prueba
TEST_EMAIL=admin@example.com
TEST_PASSWORD=admin123
TEST_USERNAME=admin

# Configuración de timeouts
TEST_TIMEOUT=10000
TEST_MAX_RETRIES=3
```

### Opciones de Línea de Comandos

| Opción | Descripción | Default |
|--------|-------------|---------|
| `--url` | URL del API | `http://localhost:4000` |
| `--email` | Email de prueba | `admin@example.com` |
| `--password` | Password de prueba | `admin123` |
| `--timeout` | Timeout en ms | `10000` |
| `--verbose` | Modo verbose | `false` |
| `--quiet` | Modo silencioso | `false` |
| `--help` | Mostrar ayuda | - |

## 📊 Reportes

Después de ejecutar los tests, se genera un archivo `dashboard-test-report.json` con información detallada:

```json
{
  "summary": {
    "total": 15,
    "successful": 12,
    "failed": 3,
    "duration": 5432,
    "successRate": 80.0
  },
  "categories": {
    "Authentication": { "total": 1, "successful": 1, "failed": 0 },
    "Dashboard": { "total": 2, "successful": 2, "failed": 0 },
    "Plants": { "total": 2, "successful": 1, "failed": 1 }
  },
  "results": [...]
}
```

## 🔧 Personalización

### Agregar Nuevos Tests

Para agregar nuevos endpoints a probar, edita `testend-dashboard.js`:

```javascript
// En el método testDashboardEndpoints()
const dashboardTests = [
  // ... tests existentes
  {
    name: 'Nuevo Endpoint',
    endpoint: '/api/nuevo-endpoint',
    category: 'Nueva Categoría'
  }
];
```

### Modificar Configuración de Prueba

Edita las constantes en la parte superior de `testend-dashboard.js`:

```javascript
const TEST_CONFIG = {
  TEST_USER: {
    email: "tu-email@example.com",
    password: "tu-password",
    username: "tu-username"
  },
  TIMEOUT: 15000, // 15 segundos
  MAX_RETRIES: 5
};
```

## 🐛 Troubleshooting

### Error: "No authentication token available"
- Verifica que las credenciales de prueba sean correctas
- Asegúrate de que el endpoint de login esté funcionando

### Error: "Request timeout"
- Aumenta el timeout con `--timeout 20000`
- Verifica que el API esté funcionando y sea accesible

### Error: "Connection refused"
- Verifica que el API esté ejecutándose
- Comprueba la URL del API con `--url`

## 📝 Logs

El script genera logs con colores para facilitar la lectura:

- 🔵 **Azul**: Información general
- 🟢 **Verde**: Tests exitosos
- 🔴 **Rojo**: Tests fallidos
- 🟡 **Amarillo**: Advertencias
- 🔵 **Cian**: Información de tests

## 🤝 Contribuir

Para agregar nuevos tests o mejorar la funcionalidad:

1. Edita `testend-dashboard.js` para agregar nuevos métodos de test
2. Actualiza `run-dashboard-tests.js` si necesitas nuevas opciones
3. Actualiza esta documentación
4. Prueba tus cambios con diferentes configuraciones

## 📞 Soporte

Si encuentras problemas o necesitas ayuda:

1. Revisa los logs de error
2. Verifica la configuración del API
3. Comprueba que las credenciales sean correctas
4. Revisa la conectividad de red
