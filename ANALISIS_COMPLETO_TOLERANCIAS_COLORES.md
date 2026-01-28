# Análisis Completo: Tolerancias y Colores en Reports

## 🔍 Problema Identificado

Hay una **discrepancia en las estructuras de datos** entre cómo se guardan las tolerancias y cómo se esperan en `reports/page.tsx`.

## 📊 Estructuras de Datos

### 1. En `hooks/useMeasurements.ts` (ReportData interface)
```typescript
variablesTolerancia: {
  [parameterId: string]: {  // ESTRUCTURA PLANA
    nombre: string;
    limite_min: number | null;
    limite_max: number | null;
    bien_min: number | null;
    bien_max: number | null;
    usar_limite_min: boolean;
    usar_limite_max: boolean;
  };
}
```

**Cómo se guarda:**
```typescript
reportData.variablesTolerancia[param.id] = toleranceData;
reportData.variablesTolerancia[param.nombre] = toleranceData;
```

### 2. En `app/reports/page.tsx` (ReportSelection interface)
```typescript
variablesTolerancia: {
  [systemName: string]: {  // ESTRUCTURA ANIDADA (por sistema)
    [parameterId: string]: {
      limite_min: number | null;
      limite_max: number | null;
      bien_min: number | null;
      bien_max: number | null;
      usar_limite_min: boolean;
      usar_limite_max: boolean;
    };
  };
}
```

**Pero en el código se busca como estructura plana:**
```typescript
const tolerances = reportSelection?.variablesTolerancia || {};
// Busca directamente por key, no por systemName[parameterId]
if (tolerances[variable]) {
  tolerance = tolerances[variable];
}
```

## 🔄 Flujo Actual

### Paso 1: Guardado en `useMeasurements.ts`
1. Se obtienen tolerancias del backend: `GET /api/variables-tolerancia`
2. Se guardan en estructura **PLANA**: `{ [paramId]: {...}, [paramNombre]: {...} }`
3. Se guarda en `localStorage` como `reportSelection`

### Paso 2: Lectura en `reports/page.tsx`
1. Se lee desde `localStorage`
2. Se busca en estructura **PLANA** (aunque la interfaz dice anidada)
3. Se aplican colores si se encuentra la tolerancia

## ⚠️ Problemas Potenciales

1. **Discrepancia de interfaces**: La interfaz `ReportSelection` dice que es anidada, pero el código la trata como plana
2. **Búsqueda puede fallar**: Si la estructura real es diferente a la esperada
3. **Falta de fallback**: Si no hay tolerancias en `localStorage`, no hay forma de obtenerlas

## ✅ Solución Implementada Actualmente

El código actual en `reports/page.tsx` busca en estructura plana:
- Primero por nombre de variable (key directo)
- Luego en todos los valores por nombre
- Finalmente con búsqueda case-insensitive

Esto debería funcionar si las tolerancias se guardaron correctamente en `useMeasurements.ts`.

## 🔧 Verificaciones Necesarias

1. ✅ Verificar que `useMeasurements.ts` guarde las tolerancias correctamente
2. ✅ Verificar que la búsqueda en `reports/page.tsx` funcione
3. ⚠️ **PENDIENTE**: Agregar fallback para obtener tolerancias del backend si no están en `localStorage`
4. ⚠️ **PENDIENTE**: Corregir la interfaz `ReportSelection` para que coincida con la estructura real

## 📝 Recomendaciones

1. **Unificar las interfaces**: Hacer que ambas interfaces usen la misma estructura
2. **Agregar fallback**: Si no hay tolerancias en `localStorage`, obtenerlas del backend
3. **Mejorar logs**: Agregar más información de debugging para identificar problemas
