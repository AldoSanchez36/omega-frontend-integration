# Proceso Lógico para Obtener `variables_proceso_id`

## 📋 Resumen del Flujo

El `variables_proceso_id` es el ID de la relación en la tabla `variables_procesos` que conecta una variable específica con un proceso específico. Este ID es necesario para crear/actualizar tolerancias.

---

## 🔄 Flujo Completo Paso a Paso

### **Paso 1: Selección del Contexto**
```
Usuario selecciona:
1. Empresa (ej: Cryoinfra)
2. Planta (ej: Hidrógeno)  
3. Proceso/Sistema (ej: AGUA CEA)
```

**Estado resultante:**
- `selectedEmpresa` = ID de la empresa
- `selectedPlant` = ID de la planta
- `selectedSystemId` = ID del proceso (ej: "AGUA CEA")

---

### **Paso 2: Carga de Parámetros del Proceso**

Cuando se selecciona un proceso, se ejecuta `fetchParameters()`:

```typescript
// Frontend: app/dashboard-agregarsistema/page.tsx
const fetchParameters = async () => {
  // 1. Hace petición al backend
  GET /api/variables/proceso/{selectedSystemId}
  
  // 2. El backend ejecuta VariablesSQL.obtenerPorProceso(proceso_id)
}
```

**En el Backend (`VariablesSQL.obtenerPorProceso`):**

```javascript
// Backend: models/VariablesSQL.js

1. Consulta la tabla variables_procesos:
   SELECT variable_id, orden 
   FROM variables_procesos
   WHERE proceso_id = {proceso_id}
   AND fecha_desasociacion IS NULL

2. Obtiene los IDs de las variables relacionadas

3. Consulta las variables completas:
   SELECT * FROM variables
   WHERE id IN (variable_ids)

4. 🔑 OBTIENE LOS IDs DE variables_procesos:
   SELECT id, variable_id, proceso_id, orden
   FROM variables_procesos
   WHERE proceso_id = {proceso_id}
   AND variable_id IN (variable_ids)
   AND fecha_desasociacion IS NULL

5. Mapea cada variable con su variable_proceso_id:
   {
     ...variable,
     orden: relacion.orden,
     variable_proceso_id: relacionCompleta.id  // ← AQUÍ SE OBTIENE
   }
```

**Respuesta del Backend:**
```json
{
  "ok": true,
  "variables": [
    {
      "id": "variable-ph-id",
      "nombre": "pH",
      "unidad": "",
      "orden": 1,
      "variable_proceso_id": "vp-id-123"  // ← Este es el ID que necesitamos
    },
    {
      "id": "variable-conductividad-id",
      "nombre": "Conductividad",
      "unidad": "μs/cm",
      "orden": 2,
      "variable_proceso_id": "vp-id-456"
    }
  ]
}
```

---

### **Paso 3: Mapeo en el Frontend**

El frontend recibe la respuesta y mapea los parámetros:

```typescript
// Frontend: fetchParameters()
const data = await res.json()

const mappedParams = (data.variables || []).map((p: any) => {
  // Intenta múltiples nombres posibles del campo
  const variableProcesoId = 
    p.variable_proceso_id ??           // Nombre esperado
    p.variables_procesos_id ??          // Variante 1
    p.id_variables_procesos ??          // Variante 2
    p.variable_proceso?.id ??           // Objeto anidado
    null

  return {
    ...p,
    orden: p.orden ?? null,
    variable_proceso_id: variableProcesoId,  // ← Se guarda en el estado
    // ... otros campos
  }
})

setParameters(mappedParams)  // ← Se guarda en el estado React
```

**Estado resultante:**
```typescript
parameters = [
  {
    id: "variable-ph-id",
    nombre: "pH",
    variable_proceso_id: "vp-id-123",  // ← Disponible aquí
    proceso_id: "proceso-agua-cea-id",
    orden: 1
  },
  // ...
]
```

---

### **Paso 4: Al Guardar una Tolerancia**

Cuando el usuario hace clic en "Guardar" para una tolerancia:

```typescript
// Frontend: handleTolSave(variableId)
const handleTolSave = async (variableId: string) => {
  
  // 1. Busca el parámetro en el estado local
  const param = parameters.find(p => p.id === variableId)
  
  // 2. Obtiene el variable_proceso_id del parámetro
  let variableProcesoId = param.variable_proceso_id
  
  // 3. Si no está disponible, intenta obtenerlo:
  
  // Opción A: Recargar desde el backend
  if (!variableProcesoId) {
    const res = await fetch(`/api/variables/proceso/${selectedSystemId}`)
    const data = await res.json()
    const paramFromBackend = data.variables.find(p => p.id === variableId)
    variableProcesoId = paramFromBackend.variable_proceso_id
  }
  
  // Opción B: Consultar endpoint de filtros
  if (!variableProcesoId) {
    const filterRes = await fetch(
      `/api/variables-tolerancia/filtros?variable_id=${variableId}&proceso_id=${selectedSystemId}`
    )
    // ...
  }
  
  // 4. Valida que existe
  if (!variableProcesoId) {
    // Muestra error: "El campo variables_proceso_id es obligatorio"
    return
  }
  
  // 5. Prepara los datos para enviar
  const tol = {
    variable_proceso_id: variableProcesoId,  // ← Se envía al backend
    bien_min: ...,
    bien_max: ...,
    // ...
  }
  
  // 6. Envía al backend
  POST /api/variables-tolerancia
  {
    "variable_proceso_id": "vp-id-123",
    "bien_min": 7,
    "bien_max": 8,
    // ...
  }
}
```

---

## 🔍 Puntos Críticos del Proceso

### **1. Obtención Inicial (Backend → Frontend)**
- **Cuándo:** Al seleccionar un proceso y cargar parámetros
- **Dónde:** `VariablesSQL.obtenerPorProceso()` en el backend
- **Cómo:** Consulta `variables_procesos` y mapea el `id` de la relación
- **Resultado esperado:** Cada variable debe tener `variable_proceso_id` en la respuesta

### **2. Almacenamiento (Frontend)**
- **Cuándo:** Después de recibir la respuesta del backend
- **Dónde:** `fetchParameters()` mapea y guarda en `parameters` state
- **Cómo:** Extrae `variable_proceso_id` de la respuesta y lo asigna al parámetro
- **Resultado esperado:** Cada parámetro en `parameters` debe tener `variable_proceso_id`

### **3. Uso al Guardar (Frontend → Backend)**
- **Cuándo:** Usuario hace clic en "Guardar" para una tolerancia
- **Dónde:** `handleTolSave()` busca el `variable_proceso_id` del parámetro
- **Cómo:** 
  1. Busca en el estado local (`param.variable_proceso_id`)
  2. Si no está, recarga desde el backend
  3. Si aún no está, consulta endpoints alternativos
- **Resultado esperado:** Debe tener `variable_proceso_id` antes de enviar

---

## ⚠️ Posibles Problemas

### **Problema 1: Backend no devuelve el campo**
- **Síntoma:** `variable_proceso_id` es `null` en la respuesta
- **Causa:** El backend no está incluyendo el campo en el mapeo
- **Solución:** Verificar que `relacionCompleta?.id` existe en `VariablesSQL.obtenerPorProceso`

### **Problema 2: Nombre del campo diferente**
- **Síntoma:** El campo existe pero con otro nombre
- **Causa:** Inconsistencia en nombres entre backend y frontend
- **Solución:** El frontend ya intenta múltiples nombres (`variable_proceso_id`, `variables_procesos_id`, etc.)

### **Problema 3: Timing/Race Condition**
- **Síntoma:** El parámetro se carga pero `variable_proceso_id` es `null`
- **Causa:** El estado se actualiza antes de que el backend responda completamente
- **Solución:** El código ya tiene fallbacks para recargar si no está disponible

### **Problema 4: Relación no existe en BD**
- **Síntoma:** No hay `variables_procesos` para esa variable+proceso
- **Causa:** La variable no está asociada al proceso en la BD
- **Solución:** Verificar que existe la relación en `variables_procesos`

---

## 🛠️ Debugging

Para diagnosticar el problema, revisa en la consola del navegador:

1. **Al cargar parámetros:**
   ```
   📥 Respuesta completa del backend para proceso {id}
   ```
   - Verifica si `variable_proceso_id` está en la respuesta
   - Verifica qué campos están disponibles

2. **Al guardar tolerancia:**
   ```
   🔍 Guardando tolerancia para {nombre}
   ```
   - Verifica si `variable_proceso_id` está en el parámetro
   - Verifica si se encuentra después de los fallbacks

3. **Si no se encuentra:**
   ```
   ❌ variable_proceso_id NO encontrado
   ```
   - Muestra todos los campos disponibles
   - Ayuda a identificar el problema

---

## ✅ Solución Esperada

El flujo correcto debería ser:

1. Usuario selecciona: **Empresa → Planta → Proceso (AGUA CEA)**
2. Backend devuelve variables con `variable_proceso_id` incluido
3. Frontend mapea y guarda en estado con `variable_proceso_id`
4. Al guardar tolerancia, se obtiene `variable_proceso_id` del estado
5. Se envía al backend con `variable_proceso_id` correcto
6. ✅ Tolerancia guardada exitosamente

---

## 🔧 Si el Problema Persiste

Si después de revisar los logs el `variable_proceso_id` sigue siendo `null`, verifica:

1. **Backend:** ¿Está devolviendo el campo correctamente?
   - Revisar `VariablesSQL.obtenerPorProceso()` línea 323
   - Verificar que `relacionCompleta?.id` existe

2. **Frontend:** ¿Está mapeando correctamente?
   - Revisar `fetchParameters()` línea 1131-1136
   - Verificar que el campo se asigna correctamente

3. **Base de Datos:** ¿Existe la relación?
   - Verificar que existe un registro en `variables_procesos` para esa variable+proceso
   - Verificar que `fecha_desasociacion` es `NULL`
