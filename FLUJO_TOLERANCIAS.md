# Flujo de Tolerancias en el Sistema

## Resumen
Las tolerancias **SÍ se obtienen del backend**, pero **NO directamente en `@app/reports/`**. El flujo es el siguiente:

## Flujo Completo

### 1. En `dashboard-reportmanager` (cuando se guardan datos)

**Archivo:** `hooks/useMeasurements.ts`

**Proceso:**
1. Cuando el usuario hace clic en "Guardar Datos" en `dashboard-reportmanager`
2. Se ejecuta `handleSaveData()` en `useMeasurements.ts`
3. **Se hace una llamada al backend** para obtener todas las tolerancias:
   ```typescript
   const tolerancesRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
     headers: { Authorization: `Bearer ${token}` }
   });
   ```
   - **Endpoint:** `/api/variables-tolerancia`
   - **Método:** GET
   - **Headers:** Authorization Bearer token

4. Se procesan las tolerancias obtenidas:
   - Se filtran por `variable_id` y `proceso_id` (sistema)
   - Se guardan en `reportData.variablesTolerancia` tanto por ID como por nombre del parámetro
   - Se incluyen todos los campos: `limite_min`, `limite_max`, `bien_min`, `bien_max`, `usar_limite_min`, `usar_limite_max`

5. **Se guarda en `localStorage`:**
   ```typescript
   localStorage.setItem("reportSelection", JSON.stringify(reportData));
   ```
   - El objeto `reportData` incluye `variablesTolerancia` con todas las tolerancias

### 2. En `reports` (cuando se visualiza el reporte)

**Archivo:** `app/reports/page.tsx`

**Proceso:**
1. Al cargar la página `reports`, se ejecuta un `useEffect`
2. **Se lee desde `localStorage`:**
   ```typescript
   const reportSelectionRaw = localStorage.getItem("reportSelection");
   const parsedReportSelection = reportSelectionRaw ? JSON.parse(reportSelectionRaw) : null;
   ```
3. **NO se hace llamada al backend** para obtener tolerancias
4. Las tolerancias vienen de `parsedReportSelection.variablesTolerancia`
5. Se usan para aplicar colores en la tabla de "Previsualización de Datos Guardados"

## Estructura de Datos

### En `useMeasurements.ts` (cuando se guardan):
```typescript
reportData.variablesTolerancia = {
  [parameterId]: {
    nombre: "pH",
    limite_min: 5,
    limite_max: 9,
    bien_min: 7,
    bien_max: 8,
    usar_limite_min: true,
    usar_limite_max: true
  },
  [parameterName]: {  // También guardado por nombre
    nombre: "pH",
    limite_min: 5,
    limite_max: 9,
    bien_min: 7,
    bien_max: 8,
    usar_limite_min: true,
    usar_limite_max: true
  }
}
```

### En `reports/page.tsx` (cuando se leen):
```typescript
const tolerances = reportSelection?.variablesTolerancia || {};
// Se busca por nombre de variable
const tolerance = tolerances[variable] || 
  Object.values(tolerances).find(tol => tol.nombre === variable);
```

## Puntos Importantes

### ✅ Ventajas de este flujo:
- Las tolerancias se obtienen una sola vez cuando se guardan los datos
- No hay llamadas adicionales al backend al visualizar el reporte
- Los datos están disponibles inmediatamente

### ⚠️ Posibles problemas:
1. **Si las tolerancias no se guardan correctamente en `useMeasurements`:**
   - No estarán disponibles en `reports`
   - Los colores no se aplicarán

2. **Si la estructura cambia entre guardado y lectura:**
   - La búsqueda puede fallar
   - Los colores no se aplicarán

3. **Si se limpia el `localStorage`:**
   - Las tolerancias se perderán
   - Los colores no se aplicarán

## Solución si las tolerancias no están disponibles

Si las tolerancias no están en `localStorage` cuando se carga `reports`, se podría:

1. **Opción 1 (Recomendada):** Asegurar que se guarden correctamente en `useMeasurements`
2. **Opción 2:** Hacer una llamada al backend desde `reports` si no hay tolerancias en `localStorage`
3. **Opción 3:** Obtener las tolerancias directamente desde el backend en `reports` siempre

## Logs para Debugging

### En `useMeasurements.ts`:
- `📊 Obtenidas X tolerancias de la base de datos`
- `💾 [useMeasurements] Tolerancia guardada para [nombre]:`
- `✅ Tolerancias guardadas para X parámetros`

### En `reports/page.tsx`:
- `📊 Reports - Tolerancias recibidas:`
- `📊 Reports - Claves de tolerancias:`
- `🔍 [Reports] Búsqueda de tolerancia para "[variable]":`
- `🎨 [Reports] Color aplicado para [variable]:`
- `⚠️ [Reports] No se encontró tolerancia para [variable]:`

## Conclusión

**Las tolerancias SÍ vienen del backend**, pero se obtienen en `dashboard-reportmanager` cuando se guardan los datos, y luego se almacenan en `localStorage`. En `reports`, solo se leen desde `localStorage`, no se hace llamada al backend.

Si los colores no se aplican, el problema probablemente está en:
1. Las tolerancias no se están obteniendo correctamente del backend en `useMeasurements`
2. Las tolerancias no se están guardando correctamente en `localStorage`
3. La búsqueda de tolerancias en `reports` no está funcionando correctamente
