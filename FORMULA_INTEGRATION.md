# Integración de Fórmulas en el Sistema de Reportes

## Resumen
Se ha implementado un sistema completo para aplicar fórmulas matemáticas a los valores de parámetros ingresados en el reportmanager, mostrando los resultados calculados en la visualización de reportes.

## Flujo de Implementación

### 1. Creación de Fórmulas (`app/agregar-formula/page.tsx`)
- **Funcionalidad**: Permite a los administradores crear fórmulas matemáticas
- **Proceso**:
  1. Definir variables (x, y, z, etc.)
  2. Construir expresión matemática (ej: `x*3+5`)
  3. Seleccionar variable resultado (ej: pH)
  4. Evaluar con valores de prueba
  5. Guardar en base de datos

### 2. Hook de Fórmulas (`hooks/useFormulas.ts`)
- **Funcionalidad**: Maneja la lógica de fórmulas
- **Características**:
  - Carga fórmulas por sistema/proceso
  - Evaluación segura de expresiones matemáticas
  - Aplicación de fórmulas a parámetros
  - Validación de variables requeridas

### 3. Integración en Guardado (`hooks/useMeasurements.ts`)
- **Funcionalidad**: Aplica fórmulas durante el guardado de datos
- **Proceso**:
  1. Recopila valores de parámetros
  2. Busca fórmulas aplicables por variable resultado
  3. Evalúa fórmulas con valores ingresados
  4. Guarda valores calculados en lugar de originales
  5. Incluye metadatos (valor original, fórmula aplicada)

### 4. Visualización en Reportes (`app/reports/page.tsx`)
- **Funcionalidad**: Muestra valores calculados con información de fórmulas
- **Características**:
  - Valores calculados destacados
  - Indicador visual de fórmula aplicada (🧮)
  - Mostrar valor original y calculado
  - Nombre de la fórmula aplicada

## Estructura de Datos

### Fórmula en Base de Datos
```sql
formulas:
- id (uuid)
- nombre (text) - "Cálculo de pH"
- expresion (text) - "x*3+5"
- proceso_id (uuid) - Sistema asociado
- variables_usadas (array) - ["x"]
- variable_resultado_id (uuid) - Variable que recibe el resultado
```

### Datos en Reporte
```typescript
parameters: {
  [systemName]: {
    [parameterName]: {
      valor: number,           // Valor calculado por fórmula
      unidad: string,
      valorOriginal?: number,  // Valor ingresado originalmente
      formulaAplicada?: string, // Nombre de la fórmula
      calculado?: boolean      // Indica si fue calculado
    }
  }
}
```

## Ejemplo de Uso

### Escenario: pH con Fórmula
1. **Usuario ingresa**: pH = 6
2. **Fórmula aplicada**: `x*3+5` donde x = 6
3. **Resultado calculado**: 6*3+5 = 23
4. **Visualización en reporte**:
   ```
   23 mg/L
   🧮 Cálculo de pH
   Original: 6
   ```

## Seguridad

### Validación de Expresiones
- Solo operadores matemáticos seguros: `+`, `-`, `*`, `/`, `()`
- No permite funciones JavaScript peligrosas
- Validación de caracteres permitidos
- Manejo de errores en evaluación

### Control de Acceso
- Solo administradores pueden crear/editar fórmulas
- Autenticación requerida para todas las operaciones
- Validación de permisos por sistema

## Archivos Modificados

1. **`hooks/useFormulas.ts`** (NUEVO)
   - Hook para manejo de fórmulas
   - Evaluación segura de expresiones
   - Aplicación a parámetros

2. **`hooks/useMeasurements.ts`** (MODIFICADO)
   - Integración de fórmulas en guardado
   - Estructura de datos extendida
   - Lógica de cálculo automático

3. **`app/reports/page.tsx`** (MODIFICADO)
   - Interfaz actualizada para metadatos
   - Visualización mejorada con información de fórmulas
   - Indicadores visuales de valores calculados

## Flujo de Datos

```
Dashboard ReportManager
    ↓ (Usuario ingresa valores)
Valores Originales (pH = 6)
    ↓ (Hook useFormulas)
Aplicación de Fórmulas (x*3+5 = 23)
    ↓ (Hook useMeasurements)
Guardado con Metadatos
    ↓ (localStorage)
Reporte Visualización
    ↓ (app/reports)
Mostrar: 23 mg/L 🧮 Cálculo de pH (Original: 6)
```

## Beneficios

1. **Automatización**: Cálculos automáticos sin intervención manual
2. **Trazabilidad**: Mantiene valor original y muestra fórmula aplicada
3. **Flexibilidad**: Fórmulas reutilizables por sistema
4. **Seguridad**: Evaluación segura de expresiones matemáticas
5. **Usabilidad**: Indicadores visuales claros en reportes

## Próximos Pasos

1. **Testing**: Probar con diferentes fórmulas y escenarios
2. **Validación**: Verificar cálculos con datos reales
3. **Optimización**: Mejorar rendimiento para muchas fórmulas
4. **Documentación**: Guía de usuario para crear fórmulas
5. **Auditoría**: Log de aplicaciones de fórmulas
