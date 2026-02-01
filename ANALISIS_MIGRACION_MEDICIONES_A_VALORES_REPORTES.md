# Análisis: Migración de tabla "mediciones" a columna "valores" (JSON) en tabla "reportes"

## Resumen ejecutivo

Este documento analiza las **implicaciones** de eliminar la tabla `mediciones` y almacenar los valores por parámetro en una columna nueva `valores` (JSON) en la tabla `reportes`. **No se realizan cambios en el código**; solo se describe el impacto en frontend, backend y base de datos.

---

## 1. Situación actual

### 1.1 Modelo de datos

| Entidad | Uso |
|--------|-----|
| **reportes** | Contiene `datos` (JSONB) con snapshot del reporte: `parameters` (valores por sistema/parámetro), `variablesTolerancia`, `parameterComments`, `plant`, `user`, etc. **No hay columna `valores`**; los valores ya viven dentro de `datos.parameters`. |
| **mediciones** | Tabla independiente: cada fila = un punto de medición (`fecha`, `valor`, `variable_id`, `proceso_id`, `sistema`, `comentarios`). **No tiene `reporte_id`**. La relación con reportes es implícita (misma fecha, proceso, variable). |

### 1.2 Flujo actual de guardado

1. **Frontend (reports/page.tsx)**  
   - Usuario guarda reporte → `POST /api/reportes` con payload que incluye `plant`, `parameters`, `variablesTolerancia`, `comentarios`, `fecha`, etc.  
   - El backend guarda en `reportes` con `datos` = ese objeto (incluyendo `parameters` con los valores).  
   - **Después**, el frontend hace **N** llamadas `POST /api/mediciones` (una por cada valor por parámetro/sistema) para “replicar” esos valores en la tabla `mediciones`.

2. **Dashboard-reportmanager**  
   - `useMeasurements` solo construye el objeto del reporte (parameters, tolerances) y lo guarda en localStorage / llama `onSaveSuccess`. **No llama a `/api/mediciones`**.

Conclusión: los valores del reporte **ya se guardan en `reportes.datos`**. La tabla `mediciones` se usa como **serie temporal** para consultas por proceso, variable, cliente, usuario, etc. (históricos, gráficos, tablas).

---

## 2. Implicaciones si se elimina la tabla "mediciones"

### 2.1 Cambio conceptual

- **Hoy**: Dos fuentes de verdad para “valores”:  
  - Snapshot del reporte → `reportes.datos` (parameters).  
  - Serie temporal → tabla `mediciones`.
- **Después**: Una sola fuente → `reportes` (por ejemplo columna `valores` JSON o reutilizar `datos`).  
  - El “histórico” pasaría a ser **agregación sobre reportes** (por fecha, proceso, planta), extrayendo valores del JSON.

### 2.2 Ventajas

- Un solo lugar donde se escriben los valores (al guardar el reporte).
- No duplicar lógica de guardado (eliminar los N `POST /api/mediciones`).
- Menos tablas y menos rutas/controladores de mediciones.
- Consultas históricas alineadas con lo que realmente se reporta (cada reporte = una fecha/snapshot).

### 2.4 Estructura actual vs. propuesta (parameter_id vs. nombre)

**Hoy la página hace las dos cosas, según el contexto:**

| Contexto | Dónde se guarda / de dónde viene | Cómo se busca al cargar |
|----------|----------------------------------|--------------------------|
| **Snapshot del reporte** (valores del día guardados en `reportes.datos`) | `reportes.datos.parameters` = `{ [systemName]: { [parameterName]: { valor, unidad, ... } } }` | Por **nombre del parámetro** (y nombre del sistema). Ej.: `reportSelection.parameters[systemName][variableName]`, donde `variableName` es "Cloruros", etc. **No** se usa `parameter_id` para este snapshot. |
| **Datos históricos** (tabla por fechas) | API mediciones → se construye `historicalData[fecha][variable_id]` = `{ valor, unidad, comentarios }` | Por **variable_id** (param.id). Ej.: `dateData[param.id]`, `highLowValues[param.id]`. La lista de parámetros viene de la API (id, nombre, unidad) y se busca por id. |

Por tanto: **el snapshot del reporte hoy no registra ni busca por `parameter_id`**; registra y busca por **nombre del sistema + nombre del parámetro**. Si el JSON nuevo debe registrar **parameter_id** y el valor para buscarlo así al cargar, sería un **cambio** respecto al comportamiento actual del snapshot: la página tendría que dejar de usar `systemData[variableName]` y usar algo como `valores[param.id]` o `valores[sistemaId][param.id]`, teniendo la lista de parámetros (id, nombre, unidad) al cargar (como ya hace para la tabla histórica).

**Ventaja de usar parameter_id en el JSON:** estable ante cambios de nombre del parámetro; consistente con cómo se manejan los datos históricos (por id). **Ajuste en frontend:** al mostrar el snapshot del reporte, construir/obtener la lista de parámetros (id, nombre, unidad) y buscar el valor con `valores[param.id]` (o por sistema + param.id según la estructura que se defina).

---

### 2.5 Estructura propuesta con `variables_proceso_id`

El ID de la tabla **variables_procesos** (en el código se usa `variable_proceso_id` o `variables_proceso_id`) identifica de forma única la relación **variable + proceso**. Por tanto **una sola clave** equivale a la búsqueda doble (parámetro + sistema): no hace falta guardar sistema y parámetro por separado.

**Formato JSON viable para `reportes.valores` (o dentro de `reportes.datos`):**

```json
{
  "valores": [
    {
      "variables_proceso_id": "uuid-de-la-relacion-variable-proceso",
      "valor": 12.5,
      "unidad": "mg/L",
      "fecha": "2025-02-01",
      "comentarios": "opcional"
    }
  ]
}
```

- **variables_proceso_id**: ID del registro en `variables_procesos` (par variable + proceso). El backend ya lo devuelve al listar variables por proceso (`VARIABLES_BY_SYSTEM` → `variables_proceso_id` en cada variable).
- **valor**, **unidad**, **fecha**, **comentarios**: datos de la medición. La **fecha** puede ser la del reporte o una fecha de registro por valor si se requiere.

**Al guardar:** por cada parámetro con valor, se toma `param.variable_proceso_id` (o `param.variables_proceso_id`) de la respuesta del API y se arma un objeto como el de arriba. Solo incluir entradas donde `variable_proceso_id` esté definido.

**Al cargar:** se obtiene la lista de parámetros del sistema (con `variable_proceso_id`). Por cada parámetro, valor = `valores.find(v => v.variables_proceso_id === param.variable_proceso_id)` (o un mapa `valores[variables_proceso_id]`).

**Ventajas:** una sola clave por medición, sin duplicar sistema/parámetro; estable ante cambios de nombre; coherente con el modelo de BD (variables_procesos). **Requisito:** que al cargar parámetros (reportes o dashboard) la API siempre devuelva `variable_proceso_id` para cada variable.

---

### 2.6 Desventajas / riesgos

- **Rendimiento**: Consultas “todas las mediciones del proceso X” o “de la variable Y en el tiempo” hoy son filtros por columnas indexadas en `mediciones`. Con datos en JSON en `reportes`, haría falta:
  - Escanear reportes por `planta_id` / proceso (si se guarda proceso en reporte) y rango de fechas.
  - Parsear JSON por cada fila.
  - Posible necesidad de índices GIN sobre el JSON o vistas materializadas para no degradar con mucho volumen.
- **Estructura del JSON**: Hay que definir y mantener un formato estable para `valores` (o uso de `datos.parameters`) para no romper frontend y reportes existentes.
- **Eliminación de variables**: Hoy `VariablesSQL.eliminarVariable` comprueba si existe alguna fila en `mediciones` con ese `variable_id`. Esa validación tendría que pasar a “existe algún reporte cuyo JSON referencia esa variable”.
- **Compatibilidad con datos antiguos**: Si ya hay muchas filas en `mediciones`, habría que decidir: migrar a reportes (complejo, porque no hay `reporte_id` en mediciones) o dejar de usar esos históricos.

---

## 3. Backend (OmegaBackend) – Ajustes requeridos

### 3.1 Base de datos (DB)

| Archivo / Área | Ajuste |
|----------------|--------|
| **Nueva columna o convención** | Añadir columna `valores` (JSONB) en `reportes` **o** seguir usando `datos.parameters` como “valores” del reporte. Si se añade `valores`, definir si reemplaza o complementa la información dentro de `datos`. |
| **Migración** | Script de migración: añadir `valores` si se usa; opcionalmente migrar datos desde `mediciones` a reportes (solo si se define criterio de asociación reporte–medición). |
| **Eliminación de tabla** | Script para eliminar tabla `mediciones` una vez que todo el código deje de usarla. |

No hay archivos concretos en `DB/` que referencien la estructura de `mediciones`; la lógica está en modelos.

### 3.2 Modelos (models)

| Archivo | Cambio |
|---------|--------|
| **MedicionesSQL.js** | **Eliminar o deprecar**: toda la clase deja de usarse si se elimina la tabla. |
| **ReportesSQL.js** | Incluir en `crear` y `actualizar` el campo `valores` (JSON) si se usa columna nueva; o documentar que los valores van en `datos.parameters`. Añadir métodos opcionales para “obtener valores históricos” agregando desde reportes por planta/proceso y rango de fechas (ver 3.4). |
| **VariablesSQL.js** | En `eliminarVariable`: sustituir la comprobación actual sobre `mediciones` por una que revise si algún reporte (en `datos` o `valores`) referencia esa variable (por ejemplo búsqueda en JSON o en una vista). |

### 3.3 Controladores (controllers)

| Archivo | Cambio |
|---------|--------|
| **mediciones.js** | **Eliminar o reemplazar**: todas las funciones que leen/escriben la tabla `mediciones` (crear, obtener por id, por variable, por proceso, por sistema, por cliente, por usuario/proceso/variable, etc.). |
| **reportes.js** | En `crearReporte` y `actualizarReporte`: aceptar y guardar `valores` en el reporte (o seguir guardando todo en `datos`). Dejar de depender de que el frontend llame a `/api/mediciones` después. |
| **variables.js** | Donde se devuelve “no se puede eliminar la variable porque tiene mediciones asociadas”, cambiar a “tiene reportes que la referencian en valores/datos”. |

### 3.4 Rutas (routes)

| Archivo | Cambio |
|---------|--------|
| **mediciones.js** | Eliminar todas las rutas de `/api/mediciones` (GET/POST/PATCH/DELETE y todas las variantes por variable, proceso, sistema, cliente, usuario). |
| **index.js** | Quitar `app.use('/api/mediciones', ...)` o redirigir a un nuevo controlador que sirva “histórico” desde reportes (ver abajo). |

**Nuevos endpoints (recomendado)** si se quiere mantener la misma “forma” de consumo en el frontend:

- **Histórico por proceso**: p. ej. `GET /api/reportes/historico/proceso/:nombreProceso?desde=&hasta=`  
  - Implementación: consultar reportes por planta/proceso y rango de fechas, extraer de `datos` o `valores` y devolver un array tipo `{ mediciones: [ { fecha, variable_id, valor, unidad, comentarios }, ... ] }`.
- **Histórico por variable y proceso**: similar, filtrando dentro del JSON por variable.
- Opcional: mismo para “por cliente” (planta), “por variable”, etc., según lo que hoy usen las pantallas.

Así el frontend puede seguir esperando un objeto con `mediciones` y menos cambios en las páginas.

### 3.5 Middlewares

No hay lógica específica de mediciones en middlewares; solo auth. **No se requieren cambios** en `auth.js` o `validar-campos.js` por este cambio.

---

## 4. Frontend – Ajustes requeridos por página

### 4.1 Constantes (config)

| Archivo | Ajuste |
|---------|--------|
| **config/constants.ts** | Eliminar o marcar como deprecados todos los `API_ENDPOINTS` de mediciones (`MEASUREMENTS`, `MEASUREMENT_BY_ID`, `MEASUREMENTS_BY_VARIABLEID`, `MEASUREMENTS_BY_PROCESS`, etc.). Si el backend expone nuevos endpoints de “histórico” desde reportes, añadir aquí las nuevas constantes (p. ej. `REPORTES_HISTORICO_PROCESO`, etc.). |

### 4.2 app/reports/page.tsx

| Uso actual | Ajuste |
|------------|--------|
| **Guardado** | Tras crear/actualizar el reporte con `POST/PUT /api/reportes`, **eliminar** el bloque que hace múltiples `POST /api/mediciones`. Incluir en el payload del reporte los valores (en `datos.parameters` o en el nuevo campo `valores` que el backend espere). |
| **Datos históricos para PDF / tabla** | Hoy se llama a `MEASUREMENTS_BY_PROCESS(systemInfo.nombre)` y se construye `historicalData` desde `data.mediciones`. Cambiar a un nuevo endpoint de “histórico por proceso” que devuelva el mismo formato (lista de objetos con `fecha`, `variable_id`, `valor`, `unidad`, `comentarios`), o a un endpoint que devuelva reportes y en el frontend mapear `reportes[].datos`/`valores` a ese formato. |
| **Interfaz `HistoricalMeasurement`** | Mantenerla; solo cambiar el origen de los datos (nuevo endpoint o agregación en frontend desde reportes). |

Impacto: **alto** (guardado + carga de histórico en la misma página).

### 4.3 app/dashboard/page.tsx

| Uso actual | Ajuste |
|------------|--------|
| **Reconstrucción de reportSelection** | Ya usa `report.datos` (parameters, etc.) y deja `mediciones: []`. No depende de la tabla mediciones para listar reportes. **Ningún cambio** en esa parte. |
| **Gráficos por parámetro (año actual)** | Se usa `MEASUREMENTS_BY_VARIABLE_AND_PROCESS(param.name, system.name)` y se filtra por fechas. Sustituir por un endpoint de histórico “por variable y proceso” (o “por proceso” y filtrar por variable en frontend) que lea desde reportes y devuelva el mismo formato `{ mediciones: [...] }`. |

Impacto: **medio** (solo la parte de datos para gráficos).

### 4.4 app/dashboard-reportmanager/page.tsx

| Uso actual | Ajuste |
|------------|--------|
| **useMeasurements** | No llama a `/api/mediciones` al guardar; solo arma el objeto y llama `onSaveSuccess`. **No cambiar** lógica de guardado aquí. |
| **fetchSistemasForParametro** | Llama a `MEASUREMENTS_BY_VARIABLEID(param.id)` para obtener sistemas (S01, S02, …) a partir de mediciones. Si se elimina la tabla, este dato debe venir de otro lado: p. ej. sistemas definidos por proceso/variables, o un endpoint que devuelva “sistemas con datos” a partir de reportes (por variable_id). |

Impacto: **medio** (origen de “sistemas por parámetro” para el preview).

### 4.5 app/dashboard-historicos/page.tsx

| Uso actual | Ajuste |
|------------|--------|
| **Carga de histórico** | Usa `MEASUREMENTS_BY_PROCESS(systemData.nombre)` y construye `organizedData` por fecha y variable. Sustituir por el nuevo endpoint de “histórico por proceso” (o por reportes filtrados por proceso + rango de fechas) y adaptar la respuesta al mismo formato `{ mediciones: [...] }` para no reescribir toda la lógica de `organizedData`. |

Impacto: **alto** (toda la tabla histórica depende de ese endpoint).

### 4.6 app/dashboard-reportList/page.tsx

| Uso actual | Ajuste |
|------------|--------|
| **reportSelection.mediciones** | Se inicializa `mediciones: []` y hay uso de `reportSelection.mediciones.length` (p. ej. `mediciones_count`). Si en el nuevo modelo “mediciones” ya no existe como lista en el reporte, sustituir por “cantidad de valores” derivada de `reportSelection.parameters` o del nuevo campo `valores`. |

Impacto: **bajo** (solo representación de cantidad o etiquetas).

### 4.7 Componentes compartidos

| Archivo | Uso actual | Ajuste |
|---------|------------|--------|
| **components/MesureTable.tsx** | Varios endpoints: `MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS`, `MEASUREMENTS_BY_VARIABLE_AND_CLIENT`, `MEASUREMENTS_BY_VARIABLE_AND_PROCESS`. Espera `result.mediciones`. | Sustituir llamadas por uno o varios endpoints que devuelvan el mismo formato desde reportes (histórico por variable + proceso/cliente/usuario). |
| **components/MesureTable-fixed-auth.tsx** | Similar: `MEASUREMENTS_BY_VARIABLE_NAME`, `MEASUREMENTS_BY_VARIABLEID`, `MEASUREMENTS_BY_SYSTEM`, `MEASUREMENTS_BY_PROCESS`. | Igual: nuevos endpoints o agregación desde reportes, misma forma de respuesta. |
| **components/SensorTimeSeriesChart.tsx** | `MEASUREMENTS_BY_VARIABLE_AND_CLIENT`, `MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS`, `MEASUREMENTS_BY_VARIABLE_AND_PROCESS`. | Mismo criterio: datos desde “histórico” basado en reportes. |
| **app/dashboard-reportmanager/components/ParametersList.tsx** | Usa `medicionesPreview` (lista de mediciones) para mostrar preview por parámetro/sistema. El origen de `medicionesPreview` viene del hook/estado que se alimenta con datos de la API de mediciones. | Si `medicionesPreview` pasa a alimentarse desde reportes (por ejemplo “últimos valores por variable/sistema” desde histórico), ajustar solo el origen de datos; la UI puede mantenerse. |

Impacto: **alto** en MesureTable y SensorTimeSeriesChart (varios endpoints); **medio** en ParametersList si se cambia el origen de `medicionesPreview`.

### 4.8 Hooks

| Archivo | Ajuste |
|---------|--------|
| **hooks/useMeasurements.ts** | No llama a la API de mediciones al guardar. Si en algún flujo se rellenara `medicionesPreview` desde `MEASUREMENTS_BY_*`, habría que reemplazar esas llamadas por el nuevo origen (reportes/histórico). Revisar si hay `fetch` a endpoints de mediciones dentro del hook. |

---

## 5. Resumen de impacto por área

| Área | Nivel | Descripción |
|------|--------|-------------|
| **Backend – modelo MedicionesSQL** | Eliminación | Dejar de usar o eliminar el archivo. |
| **Backend – controlador y rutas mediciones** | Eliminación / reemplazo | Eliminar rutas y controlador; opcionalmente nuevos endpoints “histórico” desde reportes. |
| **Backend – ReportesSQL / reportes controller** | Extensión | Aceptar y persistir `valores` (o seguir con `datos`) y, si se ofrece histórico, implementar consultas por proceso/planta/fechas. |
| **Backend – VariablesSQL / variables controller** | Ajuste | Validación de “variable con datos” basada en reportes en lugar de tabla mediciones. |
| **Frontend – app/reports** | Alto | Dejar de hacer N POST a mediciones; obtener histórico desde nuevo endpoint. |
| **Frontend – app/dashboard** | Medio | Gráficos: datos desde nuevo endpoint de histórico. |
| **Frontend – app/dashboard-reportmanager** | Medio | Origen de “sistemas por parámetro” y, si aplica, preview desde reportes. |
| **Frontend – app/dashboard-historicos** | Alto | Toda la carga de datos desde “histórico por proceso”. |
| **Frontend – app/dashboard-reportList** | Bajo | Sustituir uso de `mediciones.length` por lógica sobre parameters/valores. |
| **Frontend – components (MesureTable, SensorTimeSeriesChart, ParametersList)** | Alto / Medio | Sustituir todos los endpoints de mediciones por histórico basado en reportes. |
| **Frontend – config/constants.ts** | Bajo | Sustituir/deprecar endpoints de mediciones; añadir nuevos si aplica. |

---

## 6. Recomendaciones

1. **Definir contrato del JSON**  
   Decidir si se usa `reportes.datos.parameters` como “valores” o una columna `reportes.valores` y documentar el formato (por sistema, por variable_id, unidades, comentarios) para no romper PDF ni vistas.

2. **Introducir endpoints de “histórico” desde reportes**  
   Mantener la misma forma de respuesta (`{ mediciones: [...] }`) donde sea posible para reducir cambios en el frontend (reports, dashboard, dashboard-historicos, componentes).

3. **Migración de datos**  
   Si se quieren conservar históricos ya guardados en `mediciones`, hace falta un criterio para asociar cada fila a un reporte (por ejemplo por fecha + proceso + usuario) y un script de migración; si no, asumir que el histórico “nuevo” empieza con los reportes que tengan `valores`/`datos`.

4. **Rendimiento e índices**  
   Si el volumen de reportes crece, valorar índices GIN sobre el JSON o vistas materializadas para consultas por proceso/planta/fecha antes de eliminar la tabla mediciones.

5. **Orden de implementación sugerido**  
   - Backend: columna/convención `valores` en reportes + endpoints de histórico.  
   - Frontend: cambiar primero el guardado (reports) para que no llame a mediciones; luego sustituir cada consumo de endpoints de mediciones por el nuevo histórico.  
   - Por último: eliminar rutas y controlador de mediciones, modelo MedicionesSQL, y tabla `mediciones`.

---

*Documento generado como análisis previo; no incluye cambios en el código.*
