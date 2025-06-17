# Omega Frontend - Next.js

Sistema de gestión industrial desarrollado con Next.js 15 y integración completa con el backend de Omega.

## 🌐 Configuración de Puertos

- **Frontend (Next.js):** http://localhost:3000
- **Backend (Express):** http://localhost:4000

## 🚀 Instalación Rápida

1. **Descargar y descomprimir** el proyecto
2. **Instalar dependencias:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar variables de entorno:**
   \`\`\`bash
   # Crear archivo .env.local
   echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
   \`\`\`

4. **Iniciar el backend** (en otra terminal):
   \`\`\`bash
   # Ve a tu carpeta del backend y ejecuta:
   npm start
   # o
   node index.js
   \`\`\`

5. **Iniciar el frontend:**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Abrir en el navegador:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## 🔧 Configuración del Backend

Asegúrate de que tu backend tenga configurado CORS para permitir requests desde el frontend:

\`\`\`javascript
// En tu backend (Express)
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',  // Frontend en desarrollo
    'http://127.0.0.1:3000'   // Alternativa localhost
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
\`\`\`

## 📡 Endpoints Configurados

El frontend está configurado para conectarse a estos endpoints de tu backend:

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/logout` - Cerrar sesión

### Plantas
- `POST /api/plantas/crear` - Crear planta
- `GET /api/plantas/mis-plantas/:userId` - Obtener plantas del usuario

### Reportes
- `POST /api/reportes` - Crear reporte
- `GET /api/reportes/usuario/:userId` - Obtener reportes del usuario

### Procesos y Variables
- `POST /api/procesos/crear` - Crear proceso
- `GET /api/procesos/planta/:plantaId` - Procesos por planta
- `POST /api/variables/crear` - Crear variable
- `GET /api/variables/proceso/:procesoId` - Variables por proceso

## 🔍 Verificar Conexión

Para verificar que la conexión funciona:

1. **Backend corriendo:** Ve a http://localhost:4000 (debería mostrar tu API)
2. **Frontend corriendo:** Ve a http://localhost:3000 (debería mostrar la app)
3. **Prueba login:** Intenta hacer login con credenciales válidas
4. **Revisa consola:** No deberían aparecer errores de CORS

## 🐛 Solución de Problemas

### Error de CORS
\`\`\`javascript
// Agrega esto a tu backend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
\`\`\`

### Error "Cannot connect to backend"
1. Verifica que el backend esté corriendo en puerto 4000
2. Revisa que `.env.local` tenga `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. Reinicia ambos servidores

### Error de puerto ocupado
\`\`\`bash
# Si el puerto 3000 está ocupado
npm run dev -- -p 3001

# Actualiza .env.local si cambias el puerto del frontend
\`\`\`

## 📱 URLs Importantes

- **Inicio:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **API Backend:** http://localhost:4000
- **API Docs:** http://localhost:4000/api (si tienes documentación)

## 🎯 Próximos Pasos

1. Asegúrate de que tu backend esté corriendo
2. Prueba el login con usuarios existentes
3. Verifica que los datos se muestren correctamente
4. Personaliza según tus necesidades

¡Tu aplicación debería estar funcionando perfectamente con esta configuración!
\`\`\`

Archivo de verificación de conexión:
