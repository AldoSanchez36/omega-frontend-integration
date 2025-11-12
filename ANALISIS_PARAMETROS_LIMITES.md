# Análisis de Estructura: Parámetros y Límites

## 📋 Resumen Ejecutivo

Este documento analiza la estructura actual de parámetros (variables) y límites (tolerancias) en el sistema, identificando las relaciones, restricciones y problemas encontrados.

---

## 🗄️ Estructura de Base de Datos

### 1. Tabla `variables` (Parámetros)

**Campos principales:**
- `id` (uuid, PK)
- `nombre` (text, NOT NULL)
- `unidad` (text, NOT NULL)

**Relaciones:**
- **Muchos a Muchos con `procesos`**: Tabla intermedia `variables_procesos`
  - `variable_id` → `variables.id`
  - `proceso_id` → `procesos.id`
  - Campo `fecha_desasociacion` para soft delete

---

### 2. Tabla `variables_tolerancia` (Límites)

**Campos principales:**
- `id` (uuid, PK)
- `variable_id` (uuid, FK → `variables.id`, NOT NULL) ⚠️
- `proceso_id` (uuid, FK → `procesos.id`, NOT NULL)
- `planta_id` (uuid, FK → `plantas.id`, NOT NULL)
- `cliente_id` (uuid, FK → `usuarios.id`, NOT NULL)
- `bien_min` (double precision, NOT NULL)
- `bien_max` (double precision, NOT NULL)
- `limite_min` (double precision, nullable)
- `limite_max` (double precision, nullable)
- `usar_limite_min` (boolean, default: false)
- `usar_limite_max` (boolean, default: false)

**Relaciones con Foreign Keys:**
- ✅ `variable_id` → `variables.id` (CON RESTRICCIÓN)
- ✅ `proceso_id` → `procesos.id`
- ✅ `planta_id` → `plantas.id`
- ✅ `cliente_id` → `usuarios.id`

---

### 3. Tabla `formulas`

**Campos principales:**
- `id` (uuid, PK)
- `nombre` (text, NOT NULL)
- `expresion` (text, NOT NULL)
- `proceso_id` (uuid, FK → `procesos.id`, NOT NULL)
- `creador_id` (uuid)
- `variables_usadas` (array, NOT NULL) - Array de nombres de variables
- `variable_resultado_id` (uuid) - ID de la variable que recibe el resultado

**Relaciones:**
- ✅ `proceso_id` → `procesos.id` (CON RESTRICCIÓN)
- ⚠️ `variable_resultado_id` → `variables.id` (SIN RESTRICCIÓN FK en BD)

---

### 4. Tabla `mediciones`

**Campos relevantes:**
- `variable_id` (uuid, FK → `variables.id`) ⚠️

**Relaciones:**
- ✅ `variable_id` → `variables.id` (CON RESTRICCIÓN)

---

## 🔍 Análisis de Restricciones de Eliminación

### Función: `eliminarVariable(id)` en `VariablesSQL.js`

```javascript
static async eliminarVariable(id) {
    // ✅ Verifica mediciones asociadas
    const { data: mediciones } = await supabase
        .from('mediciones')
        .select('id')
        .eq('variable_id', id)
        .limit(1);

    if (mediciones && mediciones.length > 0) {
        return false; // ❌ Bloquea eliminación
    }

    // ⚠️ NO verifica tolerancias asociadas
    // ⚠️ NO verifica fórmulas que usan esta variable como resultado
    
    // Intenta eliminar
    const { error } = await supabase
        .from('variables')
        .delete()
        .eq('id', id);
    
    // ❌ Si hay tolerancias, la BD rechazará por FK constraint
    // ❌ Pero el código no maneja este error específicamente
}
```

**Problemas identificados:**

1. ❌ **No verifica tolerancias antes de eliminar**
   - Si existe una tolerancia asociada, la base de datos rechazará la eliminación por foreign key constraint
   - El código no captura este error específico
   - El mensaje de error genérico no es claro para el usuario

2. ❌ **No verifica fórmulas que usan la variable**
   - Si una fórmula tiene `variable_resultado_id` apuntando a esta variable, la eliminación puede dejar la fórmula huérfana
   - No hay foreign key constraint, por lo que la BD no lo previene automáticamente

3. ⚠️ **Manejo de errores insuficiente**
   - Solo verifica mediciones
   - No diferencia entre tipos de errores (mediciones vs tolerancias vs fórmulas)

---

## 🔗 Relaciones Identificadas

### Relación: Variable → Tolerancias

**Tipo:** Uno a Muchos (1 variable puede tener múltiples tolerancias)

**Restricción:** ✅ Foreign Key con CASCADE/RESTRICT (depende de configuración BD)

**Comportamiento actual:**
- Si intentas eliminar una variable con tolerancias:
  - La BD rechazará la operación por FK constraint
  - El código retornará `false` pero con mensaje genérico
  - El frontend mostrará: "No se puede eliminar la variable porque tiene mediciones asociadas" (mensaje incorrecto)

---

### Relación: Variable → Fórmulas (como resultado)

**Tipo:** Uno a Muchos (1 variable puede ser resultado de múltiples fórmulas)

**Restricción:** ⚠️ NO hay foreign key constraint en la BD

**Comportamiento actual:**
- Si eliminas una variable que es `variable_resultado_id` de una fórmula:
  - La eliminación se completará sin error
  - La fórmula quedará con `variable_resultado_id` apuntando a un ID inexistente
  - Esto puede causar errores al aplicar fórmulas

---

### Relación: Variable → Mediciones

**Tipo:** Uno a Muchos (1 variable puede tener múltiples mediciones)

**Restricción:** ✅ Foreign Key con CASCADE/RESTRICT

**Comportamiento actual:**
- ✅ Correctamente verificado antes de eliminar
- ✅ Mensaje de error apropiado

---

## 🐛 Problemas Específicos Encontrados

### Problema 1: Eliminación de Variable con Tolerancias

**Síntoma:**
- No puedes eliminar un parámetro si tiene límites asociados
- El mensaje de error es incorrecto o genérico

**Causa raíz:**
```javascript
// En VariablesSQL.js línea 128-159
// Solo verifica mediciones, no tolerancias
```

**Solución recomendada:**
```javascript
static async eliminarVariable(id) {
    // Verificar mediciones
    const { data: mediciones } = await supabase
        .from('mediciones')
        .select('id')
        .eq('variable_id', id)
        .limit(1);
    
    if (mediciones && mediciones.length > 0) {
        return { success: false, reason: 'mediciones' };
    }

    // ✅ AGREGAR: Verificar tolerancias
    const { data: tolerancias } = await supabase
        .from('variables_tolerancia')
        .select('id')
        .eq('variable_id', id)
        .limit(1);
    
    if (tolerancias && tolerancias.length > 0) {
        return { success: false, reason: 'tolerancias' };
    }

    // ✅ AGREGAR: Verificar fórmulas
    const { data: formulas } = await supabase
        .from('formulas')
        .select('id')
        .eq('variable_resultado_id', id)
        .limit(1);
    
    if (formulas && formulas.length > 0) {
        return { success: false, reason: 'formulas' };
    }

    // Proceder con eliminación
    const { error } = await supabase
        .from('variables')
        .delete()
        .eq('id', id);
    
    if (error) {
        return { success: false, reason: 'database_error', error };
    }
    
    return { success: true };
}
```

---

### Problema 2: Edición de Límites en Parámetros con Fórmulas

**Síntoma:**
- A veces no puedes editar los límites de parámetros asociados a fórmulas

**Análisis:**
Revisando el código de `useTolerances.ts` y `dashboard-agregarsistema/page.tsx`:

1. **Carga de tolerancias:** Se filtran por `variable_id`, `proceso_id`, `planta_id`, `cliente_id`
2. **Guardado de tolerancias:** Requiere todos los filtros para encontrar/crear la tolerancia correcta

**Posibles causas:**
- Si falta alguno de los filtros (planta_id, cliente_id), la búsqueda puede fallar
- Si el parámetro tiene fórmula asociada, puede haber lógica adicional que interfiera

**Código relevante en `useTolerances.ts`:**
```typescript
const handleTolSave = async (variableId: string) => {
    const tolToSave: Tolerance = {
        ...tolData,
        variable_id: variableId,
        proceso_id: selectedSystem,
        planta_id: selectedPlantId,  // ⚠️ Puede ser undefined
        cliente_id: selectedUserId,  // ⚠️ Puede ser undefined
    };
    
    // Busca tolerancia existente con TODOS los filtros
    const tolerancias = await VariablesToleranciaSQL.obtenerPorFiltros({
        variable_id: variableId,
        planta_id: selectedPlantId,  // Si es undefined, la búsqueda falla
        proceso_id: selectedSystem,
        cliente_id: selectedUserId   // Si es undefined, la búsqueda falla
    });
}
```

**Problema identificado:**
- Si `selectedPlantId` o `selectedUserId` son `undefined` o `null`, la búsqueda de tolerancias existentes puede fallar
- Esto impide actualizar tolerancias existentes y puede crear duplicados

---

## 📊 Diferencias: Parámetros con Fórmulas vs Sin Fórmulas

### Parámetros SIN Fórmulas

**Comportamiento normal:**
- ✅ Se pueden crear/editar/eliminar sin restricciones especiales
- ✅ Los límites se pueden editar normalmente
- ✅ La eliminación solo se bloquea por mediciones o tolerancias

### Parámetros CON Fórmulas

**Comportamiento especial:**
- ⚠️ Si el parámetro es `variable_resultado_id` de una fórmula:
  - La eliminación NO está protegida por FK constraint
  - Puede eliminarse dejando la fórmula huérfana
  - Al aplicar la fórmula, puede fallar si la variable no existe

- ⚠️ Si el parámetro está en `variables_usadas` de una fórmula:
  - Solo es un nombre (string), no una referencia FK
  - La eliminación no está protegida
  - La fórmula puede fallar al evaluarse si la variable no existe

**Diferencia clave:**
- Los parámetros con fórmulas NO tienen restricciones adicionales en la BD
- La protección debe implementarse en la lógica de aplicación
- Actualmente NO hay protección

---

## 🔧 Recomendaciones de Mejora

### 1. Mejorar `eliminarVariable()` en `VariablesSQL.js`

```javascript
static async eliminarVariable(id) {
    const checks = {
        mediciones: false,
        tolerancias: false,
        formulas: false
    };

    // Verificar mediciones
    const { data: mediciones } = await supabase
        .from('mediciones')
        .select('id')
        .eq('variable_id', id)
        .limit(1);
    if (mediciones && mediciones.length > 0) {
        checks.mediciones = true;
    }

    // Verificar tolerancias
    const { data: tolerancias } = await supabase
        .from('variables_tolerancia')
        .select('id')
        .eq('variable_id', id)
        .limit(1);
    if (tolerancias && tolerancias.length > 0) {
        checks.tolerancias = true;
    }

    // Verificar fórmulas (como resultado)
    const { data: formulas } = await supabase
        .from('formulas')
        .select('id, nombre')
        .eq('variable_resultado_id', id);
    if (formulas && formulas.length > 0) {
        checks.formulas = true;
        checks.formulasList = formulas; // Para mostrar qué fórmulas usan esta variable
    }

    // Si hay alguna restricción, retornar detalles
    if (checks.mediciones || checks.tolerancias || checks.formulas) {
        return {
            success: false,
            checks,
            message: this.generateErrorMessage(checks)
        };
    }

    // Proceder con eliminación
    const { error } = await supabase
        .from('variables')
        .delete()
        .eq('id', id);
    
    if (error) {
        return { success: false, error };
    }
    
    return { success: true };
}

static generateErrorMessage(checks) {
    const reasons = [];
    if (checks.mediciones) reasons.push('mediciones');
    if (checks.tolerancias) reasons.push('límites de tolerancia');
    if (checks.formulas) {
        const formulasNames = checks.formulasList.map(f => f.nombre).join(', ');
        reasons.push(`fórmulas: ${formulasNames}`);
    }
    return `No se puede eliminar porque tiene ${reasons.join(', ')} asociados`;
}
```

### 2. Actualizar Controlador `variables.js`

```javascript
const eliminarVariable = async (req, res) => {
  const { id } = req.params;
  const result = await VariablesSQL.eliminarVariable(id);
  
  if (!result.success) {
    return res.status(400).json({ 
      ok: false, 
      msg: result.message || 'No se puede eliminar la variable',
      details: result.checks // Para debugging
    });
  }

  res.status(200).json({ ok: true, msg: 'Variable eliminada correctamente' });
};
```

### 3. Mejorar Manejo de Tolerancias con Filtros Opcionales

En `VariablesToleranciaSQL.js`:

```javascript
static async obtenerPorFiltros({ variable_id, planta_id, proceso_id, cliente_id }) {
    let query = supabase
        .from('variables_tolerancia')
        .select('*')
        .eq('variable_id', variable_id);
    
    // Solo agregar filtros si tienen valor
    if (proceso_id) query = query.eq('proceso_id', proceso_id);
    if (planta_id) query = query.eq('planta_id', planta_id);
    if (cliente_id) query = query.eq('cliente_id', cliente_id);
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error al obtener tolerancia por filtros:', error);
        return null;
    }
    return data;
}
```

### 4. Agregar Foreign Key Constraint para Fórmulas

**Recomendación de migración SQL:**
```sql
-- Agregar foreign key constraint para variable_resultado_id
ALTER TABLE formulas
ADD CONSTRAINT fk_formulas_variable_resultado
FOREIGN KEY (variable_resultado_id)
REFERENCES variables(id)
ON DELETE RESTRICT; -- O CASCADE según el comportamiento deseado
```

---

## 📝 Resumen de Hallazgos

### ✅ Lo que funciona bien:
1. Verificación de mediciones antes de eliminar variables
2. Foreign key constraints en `variables_tolerancia`
3. Estructura de relaciones bien definida

### ❌ Problemas encontrados:
1. **No se verifica tolerancias antes de eliminar variables**
   - La BD rechaza por FK, pero el mensaje es incorrecto
2. **No se verifica fórmulas antes de eliminar variables**
   - Puede dejar fórmulas huérfanas
3. **Manejo de errores insuficiente**
   - No diferencia entre tipos de restricciones
4. **Filtros opcionales en búsqueda de tolerancias**
   - Puede fallar si faltan parámetros
5. **Falta FK constraint para `variable_resultado_id` en fórmulas**

### 🔄 Diferencias Parámetros con/sin Fórmulas:
- **Sin fórmulas:** Comportamiento normal, solo restringido por mediciones/tolerancias
- **Con fórmulas:** 
  - No hay protección adicional en BD
  - Puede eliminarse dejando fórmulas huérfanas
  - La edición de límites puede fallar si faltan filtros

---

## 🎯 Próximos Pasos Recomendados

1. ✅ Implementar verificación de tolerancias en `eliminarVariable()`
2. ✅ Implementar verificación de fórmulas en `eliminarVariable()`
3. ✅ Mejorar mensajes de error específicos
4. ✅ Mejorar manejo de filtros opcionales en tolerancias
5. ✅ Considerar agregar FK constraint para `variable_resultado_id`
6. ✅ Actualizar frontend para mostrar mensajes de error más específicos

