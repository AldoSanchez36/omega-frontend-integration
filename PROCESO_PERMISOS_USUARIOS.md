# Proceso de Gestión de Permisos de Usuarios

## Resumen Ejecutivo

El sistema de permisos en `@app/users-management/page.tsx` permite otorgar permisos de **visualización** y/o **edición** a usuarios tipo **analista** o **cliente** para:
- **Empresa completa**: Todas las plantas de una empresa
- **Planta específica**: Una sola planta seleccionada

## Tablas de Base de Datos Utilizadas

### 1. `public.usuarios_plantas`
Esta es la tabla principal donde se registran los permisos. Estructura:
- `id` (uuid): Identificador único del registro
- `usuario_id` (uuid): ID del usuario al que se le otorgan permisos
- `planta_id` (uuid): ID de la planta para la cual se otorgan permisos
- `puede_ver` (boolean): Permiso de visualización (TRUE/FALSE)
- `puede_editar` (boolean): Permiso de edición (TRUE/FALSE)

### 2. `public.usuarios`
Tabla de usuarios que contiene:
- `id` (uuid): Identificador del usuario
- `username` (text): Nombre de usuario
- `email` (text): Correo electrónico
- `puesto` (text): Rol del usuario (`admin`, `analista`, `client`)

### 3. `public.usuarios_empresas` (Referencia)
Tabla que relaciona usuarios con empresas (no se usa directamente en este proceso, pero existe en la BD).

## Flujo del Proceso

### Paso 1: Apertura del Modal de Permisos

**Ubicación en código**: Línea ~179-219

1. El administrador hace clic en el botón "Gestionar Permisos" de un usuario
2. Se abre el modal `showPermissionModal`
3. Se cargan todas las empresas disponibles desde el endpoint:
   ```
   GET /api/empresas/all
   ```
4. Si el usuario ya tiene una empresa asignada, se preselecciona automáticamente

### Paso 2: Selección de Empresa

**Ubicación en código**: Línea ~221-253

1. El administrador selecciona una empresa del dropdown
2. Se actualiza `empresaSeleccionadaModal`
3. Se cargan automáticamente todas las plantas de esa empresa desde:
   ```
   GET /api/plantas/empresa/{empresa_id}
   ```
4. Las plantas se almacenan en `plantasModal`

### Paso 3: Configuración del Tipo de Permiso

**Ubicación en código**: Línea ~88-93 (estados), Línea ~1600-1697 (UI)

El administrador tiene dos opciones:

#### Opción A: Permiso para Toda la Empresa
- **Checkbox**: `permisoEspecificoPlanta = false` (sin marcar)
- **Descripción**: "El usuario tendrá acceso a toda la empresa (todas las plantas y sus sistemas)"
- **Resultado**: Se asignarán permisos a TODAS las plantas de la empresa seleccionada

#### Opción B: Permiso Específico por Planta
- **Checkbox**: `permisoEspecificoPlanta = true` (marcado)
- **Descripción**: Permite seleccionar una planta específica
- **Resultado**: Se asignarán permisos SOLO a la planta seleccionada

### Paso 4: Selección de Permisos (Ver/Editar)

**Ubicación en código**: Línea ~1663-1693

El administrador marca los checkboxes correspondientes:

1. **Permiso para Ver** (`permisoVer`):
   - Permite visualizar datos y reportes
   - Se almacena como `puede_ver: true/false` en la BD

2. **Permiso para Editar** (`permisoEditar`):
   - Permite modificar configuraciones y datos
   - Se almacena como `puede_editar: true/false` en la BD

### Paso 5: Guardado de Permisos

**Ubicación en código**: Línea ~783-888 (`handleGuardarPermisos`)

#### Validaciones Previas:
1. Verifica que haya un usuario seleccionado
2. Verifica que haya una empresa seleccionada
3. Si es permiso específico por planta, verifica que haya una planta seleccionada
4. Si el usuario es `admin`, no se pueden modificar permisos (tienen acceso completo)

#### Proceso de Guardado:

**Caso 1: Permiso Específico por Planta** (Línea ~823-846)
```javascript
if (permisoEspecificoPlanta) {
  const payload = {
    usuario_id: usuarioId,
    planta_id: plantaSeleccionadaModal,
    puede_ver: permisoVer,
    puede_editar: permisoEditar
  };
  
  // POST a /api/accesos/plantas/asignar
  fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ASSIGN_ACCESS}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

**Caso 2: Permiso para Toda la Empresa** (Línea ~847-876)
```javascript
else {
  // Obtener IDs de todas las plantas de la empresa
  const plantasIds = plantasModal.map((p: any) => p.id ?? p._id);
  
  // Crear una petición POST para CADA planta
  const promises = plantasIds.map((plantaId: string) => 
    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ASSIGN_ACCESS}`, {
      method: "POST",
      body: JSON.stringify({
        usuario_id: usuarioId,
        planta_id: plantaId,
        puede_ver: permisoVer,
        puede_editar: permisoEditar
      })
    })
  );
  
  // Ejecutar todas las peticiones en paralelo
  await Promise.all(promises);
}
```

## Endpoint del Backend

**Endpoint utilizado**: `POST /api/accesos/plantas/asignar`

**Payload esperado**:
```json
{
  "usuario_id": "uuid-del-usuario",
  "planta_id": "uuid-de-la-planta",
  "puede_ver": true/false,
  "puede_editar": true/false
}
```

**Acción en BD**: 
- El backend recibe este payload
- Inserta o actualiza un registro en `public.usuarios_plantas`
- Si ya existe un registro para ese `usuario_id` + `planta_id`, lo actualiza
- Si no existe, crea un nuevo registro

## Carga de Permisos Existentes

**Ubicación en código**: Línea ~256-287

Cuando se selecciona una planta específica (`permisoEspecificoPlanta = true`), el sistema carga los permisos existentes:

1. Se hace una petición a:
   ```
   GET /api/accesos/plantas/usuario/{usuario_id}
   ```
2. Se obtiene la lista de plantas con permisos del usuario
3. Se busca la planta seleccionada en esa lista
4. Se pre-marcan los checkboxes `permisoVer` y `permisoEditar` según los valores existentes

## Restricciones y Validaciones

1. **Usuarios Admin**: No se pueden modificar permisos (tienen acceso completo)
2. **Validación de campos**: Se requiere empresa seleccionada y, si es permiso específico, planta seleccionada
3. **Manejo de errores**: Si alguna petición falla, se muestra un mensaje de error específico

## Ejemplo de Flujo Completo

### Escenario: Otorgar permisos de visualización a un analista para toda una empresa

1. Admin abre modal de "Gestionar Permisos" para usuario "Juan" (analista)
2. Se selecciona empresa "Aluprint"
3. Se cargan automáticamente 3 plantas: "Planta A", "Planta B", "Planta C"
4. **NO** se marca el checkbox "Permiso específico por planta"
5. Se marca el checkbox "Permiso para Ver"
6. **NO** se marca el checkbox "Permiso para Editar"
7. Se hace clic en "Guardar Permisos"
8. El sistema hace 3 peticiones POST en paralelo:
   - `POST /api/accesos/plantas/asignar` con `{usuario_id: "juan-id", planta_id: "planta-a-id", puede_ver: true, puede_editar: false}`
   - `POST /api/accesos/plantas/asignar` con `{usuario_id: "juan-id", planta_id: "planta-b-id", puede_ver: true, puede_editar: false}`
   - `POST /api/accesos/plantas/asignar` con `{usuario_id: "juan-id", planta_id: "planta-c-id", puede_ver: true, puede_editar: false}`
9. Se crean/actualizan 3 registros en `public.usuarios_plantas`
10. Se muestra mensaje: "Permisos asignados para toda la empresa (3 planta(s))"

### Escenario: Otorgar permisos de edición a un cliente para una planta específica

1. Admin abre modal de "Gestionar Permisos" para usuario "María" (cliente)
2. Se selecciona empresa "Aluprint"
3. Se cargan automáticamente 3 plantas
4. **SÍ** se marca el checkbox "Permiso específico por planta"
5. Se selecciona "Planta A" del dropdown
6. Se marca el checkbox "Permiso para Ver"
7. Se marca el checkbox "Permiso para Editar"
8. Se hace clic en "Guardar Permisos"
9. El sistema hace 1 petición POST:
   - `POST /api/accesos/plantas/asignar` con `{usuario_id: "maria-id", planta_id: "planta-a-id", puede_ver: true, puede_editar: true}`
10. Se crea/actualiza 1 registro en `public.usuarios_plantas`
11. Se muestra mensaje: "Permisos asignados para la planta específica"

## Notas Importantes

1. **No se usa `usuarios_empresas`**: Aunque esta tabla existe en la BD, el proceso actual NO la utiliza. Todos los permisos se registran directamente en `usuarios_plantas`.

2. **Permisos a nivel de planta, no de sistema**: El proceso actual otorga permisos a nivel de **planta**, no a nivel de **sistema/proceso** individual.

3. **Actualización vs. Inserción**: El backend decide si actualizar un registro existente o crear uno nuevo basándose en la combinación `usuario_id` + `planta_id`.

4. **Permisos independientes**: Cada combinación usuario-planta tiene sus propios permisos. Un usuario puede tener `puede_ver: true, puede_editar: false` para una planta y `puede_ver: true, puede_editar: true` para otra.

5. **Proceso en paralelo**: Cuando se otorgan permisos para toda la empresa, todas las peticiones se ejecutan en paralelo usando `Promise.all()`, lo que mejora el rendimiento.
