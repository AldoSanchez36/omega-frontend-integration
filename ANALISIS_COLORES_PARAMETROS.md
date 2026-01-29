# Análisis: Definición de Colores en Dashboard Report Manager

## Ubicación
**Archivo:** `app/dashboard-reportmanager/components/ParametersComponents/ParametersVariableList.tsx`

## Función Principal: `getInputColor`

### Parámetros
- `parameterId: string` - ID del parámetro
- `value: number | undefined` - Valor numérico ingresado

### Retorna
- `string` - Código hexadecimal del color:
  - `#FFC6CE` - Rojo (fuera de rango)
  - `#FFEB9C` - Amarillo (cerca del límite)
  - `#C6EFCE` - Verde (dentro del rango óptimo)
  - `''` (string vacío) - Sin color (sin tolerancia definida)

## Lógica de Decisión de Colores

### Pre-validaciones
1. **Si `value` es `undefined` o `null`** → Retorna `#FFC6CE` (rojo)
2. **Si no existe `tolerancia` para el `parameterId`** → Retorna `''` (sin color)
3. **Si el valor no es un número válido** → Retorna `''` (sin color)

### Variables Extraídas de la Tolerancia
```typescript
const usarLimiteMin = !!tolerancia.usar_limite_min;  // Boolean: si se usa límite mínimo crítico
const usarLimiteMax = !!tolerancia.usar_limite_max;  // Boolean: si se usa límite máximo crítico
const bienMin = tolerancia.bien_min;                 // Número: límite mínimo del rango "bien"
const bienMax = tolerancia.bien_max;                 // Número: límite máximo del rango "bien"
const limiteMin = tolerancia.limite_min;             // Número: límite mínimo crítico
const limiteMax = tolerancia.limite_max;             // Número: límite máximo crítico
```

## Orden de Evaluación (Prioridad)

### CASO 1: Límites Críticos (ROJO) - Máxima Prioridad
**Se evalúa PRIMERO, antes que cualquier otro caso**

```typescript
// Si está habilitado limite_min y el valor es menor
if (usarLimiteMin && limite_min !== null && limite_min !== undefined) {
  if (numValue < limite_min) {
    return '#FFC6CE'; // ROJO - fuera del límite crítico mínimo
  }
}

// Si está habilitado limite_max y el valor es mayor
if (usarLimiteMax && limite_max !== null && limite_max !== undefined) {
  if (numValue > limite_max) {
    return '#FFC6CE'; // ROJO - fuera del límite crítico máximo
  }
}
```

**Ejemplo:** Si `limite_min = 7` y `value = 5` → **ROJO** (5 < 7)

---

### CASO 2: Excede bien_max sin bien_min (ROJO o VERDE)
**Solo se evalúa si NO hay `bien_min` pero SÍ hay `bien_max`**

```typescript
if ((bienMin === null || bienMin === undefined) && 
    bienMax !== null && bienMax !== undefined) {
  if (numValue > bienMax) {
    return '#FFC6CE'; // ROJO - excede el máximo
  }
  return '#C6EFCE'; // VERDE - dentro del rango aceptable
}
```

**Ejemplo:** 
- `bien_max = 400`, `value = 500` → **ROJO** (500 > 400)
- `bien_max = 400`, `value = 34` → **VERDE** (34 < 400)

---

### CASO 3: Por debajo de bien_min sin bien_max (ROJO o VERDE)
**Solo se evalúa si NO hay `bien_max` pero SÍ hay `bien_min`**

```typescript
if ((bienMax === null || bienMax === undefined) && 
    bienMin !== null && bienMin !== undefined) {
  if (numValue < bienMin) {
    return '#FFC6CE'; // ROJO - por debajo del mínimo
  }
  return '#C6EFCE'; // VERDE - dentro del rango aceptable
}
```

**Ejemplo:**
- `bien_min = 7`, `value = 5` → **ROJO** (5 < 7)
- `bien_min = 7`, `value = 8` → **VERDE** (8 >= 7)

---

### CASO 4: Ambos bienMin y bienMax sin límites críticos (ROJO o VERDE)
**Solo se evalúa si NO se usan límites críticos pero SÍ hay ambos `bien_min` y `bien_max`**

```typescript
if (!usarLimiteMin && !usarLimiteMax && 
    bienMin !== null && bienMin !== undefined && 
    bienMax !== null && bienMax !== undefined) {
  if (numValue < bienMin || numValue > bienMax) {
    return '#FFC6CE'; // ROJO - fuera del rango bien
  } else {
    return '#C6EFCE'; // VERDE - dentro del rango bien
  }
}
```

**Ejemplo:**
- `bien_min = 7`, `bien_max = 8`, `value = 5` → **ROJO** (5 < 7)
- `bien_min = 7`, `bien_max = 8`, `value = 7.5` → **VERDE** (7 <= 7.5 <= 8)

---

### CASO 5: Rango de Advertencia (AMARILLO)
**Solo se evalúa si NO se cumplió ningún caso anterior (no está en rojo crítico)**

#### 5.1: Por debajo de bien_min pero por encima de limite_min
```typescript
if (usarLimiteMin && limite_min !== null && limite_min !== undefined) {
  if (numValue >= limite_min && 
      bienMin !== null && bienMin !== undefined && 
      numValue < bienMin) {
    return '#FFEB9C'; // AMARILLO
  }
}
```

**Ejemplo:** 
- `limite_min = 5`, `bien_min = 7`, `value = 6` → **AMARILLO** (5 <= 6 < 7)

#### 5.2: Por encima de bien_max pero por debajo de limite_max
```typescript
if (usarLimiteMax && limite_max !== null && limite_max !== undefined) {
  if (numValue <= limite_max && 
      bienMax !== null && bienMax !== undefined && 
      numValue > bienMax) {
    return '#FFEB9C'; // AMARILLO
  }
}
```

**Ejemplo:**
- `bien_max = 130`, `limite_max = 200`, `value = 150` → **AMARILLO** (130 < 150 <= 200)

---

### CASO 6: Dentro del Rango Óptimo (VERDE)
**Solo se evalúa si NO se cumplió ningún caso anterior**

```typescript
if (bienMin !== null && bienMin !== undefined && 
    bienMax !== null && bienMax !== undefined) {
  if (numValue >= bienMin && numValue <= bienMax) {
    return '#C6EFCE'; // VERDE
  }
}
```

**Ejemplo:**
- `bien_min = 7`, `bien_max = 8`, `value = 7.5` → **VERDE** (7 <= 7.5 <= 8)

---

### CASO 7: Valor por Defecto (VERDE)
**Si no se cumplió ningún caso anterior**

```typescript
return '#C6EFCE'; // Verde por defecto si no hay límites o no se excede el máximo
```

---

## Aplicación del Color en el Componente

### Ubicación en el Código
```typescript
<Input
  type="number"
  placeholder="Valor"
  className="w-[80px] text-sm h-7 ml-1.5 ..."
  style={{
    backgroundColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value),
    borderColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value) 
      ? getInputColor(parameter.id, parameterValues[parameter.id]?.value) 
      : undefined
  }}
  value={parameterValues[parameter.id]?.value ?? ''}
  onChange={e => handleParameterChange(parameter.id, 'value', Number(e.target.value))}
/>
```

### Cómo se Aplica
1. Se llama a `getInputColor()` con el `parameter.id` y el valor actual
2. El resultado se aplica directamente al `style.backgroundColor` del input
3. Si hay color, también se aplica al `borderColor`

---

## Ejemplos Prácticos Basados en la Imagen

### Ejemplo 1: pH = 52 (ROJO)
**Suposición de límites:**
- `limite_min = null` o no usado
- `bien_min = 7`
- `bien_max = 8`
- `limite_max = null` o no usado

**Evaluación:**
- CASO 1: No aplica (no hay límites críticos)
- CASO 4: `52 < 7 || 52 > 8` → **TRUE** → **ROJO** ✅

### Ejemplo 2: Conductividad = 45 (VERDE)
**Suposición de límites:**
- `bien_max = 400`
- `bien_min = null` o no definido

**Evaluación:**
- CASO 2: `45 > 400` → **FALSE** → **VERDE** ✅

### Ejemplo 3: Alcalinidad F = 4 (VERDE)
**Suposición de límites:**
- `bien_max = 30`
- `bien_min = null` o no definido

**Evaluación:**
- CASO 2: `4 > 30` → **FALSE** → **VERDE** ✅

### Ejemplo 4: Alcalinidad M = 458 (ROJO)
**Suposición de límites:**
- `bien_max = 130`
- `bien_min = null` o no definido

**Evaluación:**
- CASO 2: `458 > 130` → **TRUE** → **ROJO** ✅

---

## Resumen de la Lógica

1. **ROJO (#FFC6CE)**: Valor fuera de los límites críticos o del rango "bien"
2. **AMARILLO (#FFEB9C)**: Valor entre límite crítico y rango "bien" (zona de advertencia)
3. **VERDE (#C6EFCE)**: Valor dentro del rango "bien" o por defecto cuando no hay límites

## Importante
- La evaluación es **secuencial** y se detiene en el primer caso que se cumple
- Los límites críticos (`limite_min`/`limite_max`) tienen **prioridad máxima**
- Si no hay tolerancia definida, no se aplica color (string vacío)
