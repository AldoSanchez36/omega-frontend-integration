# Análisis: Modificación de Permisos por Empresa y Planta

## 📋 Requisitos

### Roles y Accesos:
1. **Admin**: Acceso a todas las empresas y sus respectivas plantas
2. **Analista/Cliente**: Acceso solo a su empresa específica, y opcionalmente a una planta específica

## 🗄️ Estructura de Base de Datos

### Tablas Relevantes:
1. **`usuarios`**: Tiene campo `empresa` (string) que identifica a qué empresa pertenece el usuario
2. **`empresas`**: Tabla de empresas con `id` y `nombre`
3. **`plantas`**: Tiene `empresa_id` (FK a `empresas.id`)
4. **`usuarios_plantas`**: Tabla de permisos específicos por planta
   - `usuario_id` (FK a `usuarios.id`)
   - `planta_id` (FK a `plantas.id`)
   - `puede_ver` (boolean)
   - `puede_editar` (boolean)

## 🔍 Lógica Propuesta

### Para Admin:
1. **Selector de Empresa**: Mostrar todas las empresas del sistema
2. **Selector de Planta**: Mostrar todas las plantas de la empresa seleccionada
3. **Permisos**: Asignar permisos de "Ver" y "Editar" para la planta seleccionada
4. **Almacenamiento**: Usar tabla `usuarios_plantas` para guardar permisos específicos

### Para Analista/Cliente:
1. **Selector de Empresa**: 
   - Mostrar solo la empresa del usuario que se está editando (campo `empresa` del usuario)
   - Si el usuario no tiene empresa asignada, mostrar mensaje de advertencia
2. **Selector de Planta**: 
   - Mostrar todas las plantas de la empresa del usuario
   - Opcionalmente, permitir seleccionar una planta específica si se habilita la opción
3. **Permisos**: Asignar permisos de "Ver" y "Editar" para la planta seleccionada
4. **Almacenamiento**: Usar tabla `usuarios_plantas` para guardar permisos específicos

## ✅ Confirmación de Lógica

**¿Es correcto usar `usuarios_plantas` para permisos específicos de planta?**

**Sí, es correcto.** La tabla `usuarios_plantas` es la tabla adecuada porque:
- Ya existe en el sistema
- Tiene los campos necesarios: `usuario_id`, `planta_id`, `puede_ver`, `puede_editar`
- El backend ya tiene endpoints para gestionar estos permisos:
  - `POST /api/accesos/plantas/asignar` - Asignar permisos
  - `GET /api/accesos/plantas/usuario/:userId` - Obtener permisos del usuario
  - `PATCH /api/accesos/plantas/actualizar` - Actualizar permisos
  - `DELETE /api/accesos/plantas/revocar` - Revocar permisos

## 🔄 Flujo de Implementación

### Frontend (`app/users-management/page.tsx`):

1. **Agregar estados para Empresa**:
   - `empresasModal`: Lista de empresas disponibles
   - `empresaSeleccionadaModal`: Empresa seleccionada en el modal

2. **Modificar lógica de carga de plantas**:
   - Si es admin: Cargar todas las empresas, luego plantas por empresa seleccionada
   - Si es analista/cliente: Cargar solo la empresa del usuario, luego plantas de esa empresa

3. **Agregar selector de Empresa en el modal**:
   - Mostrar antes del selector de Planta
   - Filtrar plantas según empresa seleccionada

4. **Mantener lógica de permisos existente**:
   - Los permisos ya se guardan en `usuarios_plantas` mediante `POST /api/accesos/plantas/asignar`

### Backend (Verificación):

- ✅ Endpoint `/api/empresas/all` existe para obtener todas las empresas
- ✅ Endpoint `/api/plantas/empresa/:empresaId` existe para obtener plantas por empresa
- ✅ Endpoint `/api/accesos/plantas/asignar` existe para asignar permisos
- ✅ Tabla `usuarios_plantas` existe y tiene la estructura correcta

## ✅ Implementación Realizada

### Cambios en Frontend (`app/users-management/page.tsx`):

1. **Estados agregados**:
   - `empresasModal`: Lista de empresas disponibles en el modal
   - `empresaSeleccionadaModal`: Empresa seleccionada en el modal

2. **Lógica de carga de empresas**:
   - **Admin**: Carga todas las empresas del sistema usando `/api/empresas/all`
   - **Analista/Cliente**: Carga solo la empresa del usuario seleccionado (buscando por nombre en el campo `empresa` del usuario)

3. **Lógica de carga de plantas**:
   - Se carga después de seleccionar una empresa
   - Usa el endpoint `/api/plantas/empresa/:empresaId` para obtener plantas filtradas por empresa

4. **UI del modal**:
   - Agregado selector de Empresa antes del selector de Planta
   - El selector de Empresa está deshabilitado para analistas/clientes (solo pueden ver su empresa)
   - Mensajes informativos:
     - Admin: Informa que puede asignar permisos a cualquier empresa
     - Analista/Cliente sin empresa: Advertencia de que el usuario no tiene empresa asignada

5. **Validaciones**:
   - El botón "Guardar Permisos" se deshabilita si no hay empresa seleccionada, plantas disponibles, o planta seleccionada

6. **Permisos específicos por planta**:
   - Los permisos se siguen guardando en la tabla `usuarios_plantas` mediante `POST /api/accesos/plantas/asignar`
   - La lógica existente de permisos (`puede_ver`, `puede_editar`) se mantiene intacta

## 📝 Notas Importantes

1. **Campo `empresa` en usuarios**: Actualmente es un string (nombre de empresa), no un ID. Esto podría causar problemas si:
   - El nombre de la empresa cambia
   - Hay inconsistencias en los nombres
   - **Recomendación**: Considerar migrar a `empresa_id` (FK) en el futuro
   - **Nota**: La implementación actual busca la empresa por nombre, lo cual funciona pero es menos robusto que usar un ID

2. **Permisos por defecto**: Si un usuario no tiene permisos específicos en `usuarios_plantas`, el sistema debería:
   - Para admin: Permitir acceso a todo
   - Para analista/cliente: Denegar acceso (o usar lógica basada en `empresa` del usuario)

3. **Validación**: Antes de asignar permisos, validar que:
   - La planta pertenece a la empresa del usuario (si no es admin)
   - El usuario tiene permisos para asignar permisos (solo admin puede asignar a cualquier usuario)
   - **Nota**: La validación de que la planta pertenece a la empresa se hace automáticamente porque solo se muestran plantas de la empresa seleccionada

## 🔄 Flujo Completo

1. **Admin abre modal de permisos**:
   - Se cargan todas las empresas del sistema
   - Admin selecciona una empresa
   - Se cargan las plantas de esa empresa
   - Admin selecciona una planta
   - Se cargan los sistemas de esa planta
   - Admin asigna permisos (Ver/Editar)
   - Se guarda en `usuarios_plantas`

2. **Analista/Cliente (con empresa asignada)**:
   - Se carga solo la empresa del usuario
   - Se cargan las plantas de esa empresa
   - Se selecciona una planta (opcionalmente, puede ser específica)
   - Se asignan permisos (Ver/Editar)
   - Se guarda en `usuarios_plantas`

3. **Analista/Cliente (sin empresa asignada)**:
   - Se muestra mensaje de advertencia
   - No se pueden asignar permisos hasta que se asigne una empresa al usuario
