# Orden de parámetros por planta – Análisis y propuesta

## ¿Es razonable el cambio?

**Sí.** Tiene sentido por:

1. **Un solo lugar de configuración**: El orden se define una vez por planta en lugar de por sistema, evitando tener que repetir el mismo orden en cada proceso.
2. **Vista consistente**: En reportes, dashboard e históricos todas las tablas usan el mismo orden para esa planta.
3. **Casos faltantes**: Si un sistema no tiene un parámetro que sí está en el orden de la planta, se muestra "—" en esa celda; no hace falta ocultar la fila.
4. **Alineado con el backend actual**: Hoy el orden es por sistema (`variables_procesos.orden`). Pasar a orden por planta es una extensión: se añade un orden “maestro” por planta y las pantallas lo consumen.

---

## Estado actual (backend)

- **`variables_procesos`**: tabla intermedia con `(variable_id, proceso_id, orden)`. El `orden` es **por proceso**.
- **`VariablesSQL.obtenerPorProceso(proceso_id)`**: devuelve variables ordenadas por `variables_procesos.orden` de ese proceso.
- **`plantas`**: no tiene campo ni tabla relacionada para orden de variables.
- **Reportes**: guardan `datos.parameters` como `{ [systemName]: { [paramName]: { valor, unidad, ... } } }`; no hay orden explícito, depende del cliente que envía.

Conclusión: el backend **no** tiene hoy “orden por planta”, pero es viable añadirlo sin romper lo existente.

---

## Propuesta de implementación

### 1. Backend

**Opción A – Columna en `plantas` (recomendada)**  
- Añadir en `plantas` un campo **JSONB** `orden_variable_ids`: array de **UUIDs de variables** (no nombres).  
  Ejemplo: `["0f628d17-d78d-4b95-a3d0-aa08af37f9a2", "53440d1d-0c58-48fe-8862-87fb00a67db", ...]`
- **Por qué UUIDs y no nombres** (ej. `[pH_1, TDS_2, ...]`):  
  - Si se renombra una variable, el orden sigue siendo válido.  
  - Los nombres son ambiguos (`pH_1` podría ser nombre o índice).  
  - La tabla `variables` ya tiene `id` como clave; es la referencia estable.
- Al mostrar, el backend o frontend resuelve cada UUID con la tabla `variables` para obtener `nombre` y `unidad`.
- Ventajas: un solo campo, sin tabla nueva, orden estable.  
- Migración: ver `migrations/add_plantas_orden_variables.sql`.

**Opción B – Tabla nueva**  
- Crear `planta_orden_variables(planta_id, variable_id, orden)`.
- Ventajas: normalizado, extensible.  
- Desventaja: más código y migraciones.

Recomendación: **Opción A** para una primera versión.

**Endpoints sugeridos**

- `GET /api/plantas/:plantaId/orden-variables`  
  - Devuelve el orden de la planta como lista de variables, por ejemplo:  
    `[{ id, nombre, unidad, orden }, ...]`  
  - Si la planta no tiene `orden_variable_ids` (o está vacío), el backend puede devolver un fallback: por ejemplo, todas las variables que aparecen en algún proceso de la planta, ordenadas por el `orden` del primer proceso (o por nombre).

- `PUT /api/plantas/:plantaId/orden-variables`  
  - Body: `{ variable_ids: ["uuid1", "uuid2", ...] }`.  
  - Actualiza `plantas.orden_variable_ids` para esa planta.

**Modelo**  
- En `PlantasSQL`:  
  - `obtenerOrdenVariables(planta_id)`  
  - `actualizarOrdenVariables(planta_id, variable_ids)`  
- Las variables se resuelven desde la tabla `variables` por `id`; el orden en el array es el orden de presentación.

---

### 2. Frontend – `dashboard-agregarsistema` (definir orden por planta)

- Con una **planta seleccionada**, añadir una sección tipo **“Orden de parámetros de la planta”** (no por sistema).
- Lista: todas las variables que existen en al menos un sistema de la planta.  
  - Se puede obtener llamando a `GET /api/variables/proceso/:id` por cada proceso de la planta y fusionando por `variable_id`, o mejor: un nuevo endpoint `GET /api/plantas/:plantaId/variables` que devuelva todas las variables de la planta (uniendo todos los procesos).
- UI: lista con botones **Subir / Bajar** (o drag-and-drop) para reordenar.
- Al guardar: llamar a `PUT /api/plantas/:plantaId/orden-variables` con el array de `variable_id` en el orden elegido.
- Si la planta aún no tiene orden guardado, mostrar las variables en el orden actual (p. ej. orden del primer sistema o por nombre) y permitir editarlo.

---

### 3. Frontend – Cargar datos en el orden de la planta

En **reportes**, **dashboard-reportmanager** y **dashboard-historicos** (y cualquier otra vista que muestre tablas por sistema):

1. **Obtener el orden de la planta**  
   - Con el `planta_id` del reporte/contexto, llamar a `GET /api/plantas/:plantaId/orden-variables`.  
   - Resultado: lista ordenada de `{ id, nombre, unidad }` (o al menos `id` y `nombre`).

2. **Renderizar la tabla**  
   - Filas: iterar en el **orden devuelto por la API** (orden de la planta).  
   - Columnas: sistemas (ej. nombres de proceso).  
   - Para cada celda `(variable, sistema)`:  
     - Si `parameters[sistema][variable.nombre]` existe → mostrar el valor.  
     - Si no existe → mostrar **"—"**.

3. **Fallback si no hay orden**  
   - Si el endpoint devuelve vacío o la planta no tiene `orden_variable_ids`:  
     - Usar “todas las variables que aparecen en `parameters`” en un orden determinista (p. ej. orden alfabético de nombre, o orden del primer sistema si está disponible), para no cambiar el comportamiento actual de forma brusca.

Así los datos **siempre se cargan y muestran** según el orden definido por planta; si un sistema no tiene ese parámetro, solo se muestra "—" en esa celda.

---

### 4. Casos borde

| Caso | Sugerencia |
|------|------------|
| Planta sin orden configurado | Fallback: orden por nombre o por orden del primer sistema; en agregarsistema el usuario puede definir el orden cuando quiera. |
| Variable en un sistema pero no en el orden de la planta | Incluirla al final de la lista al mostrar (no ocultar datos). Opcional: en agregarsistema, detectar “variables en sistemas que no están en el orden” y ofrecer añadirlas. |
| Sistema sin un parámetro que sí está en el orden de la planta | Mostrar "—" en esa celda (como indicaste). |

---

## Resumen de viabilidad

- **Backend**: Viable. Añadir `orden_variable_ids` (o tabla equivalente) en plantas y 2 endpoints (GET/PUT orden variables por planta). No obliga a cambiar el modelo de reportes ni de `variables_procesos`.
- **Frontend agregarsistema**: Viable. Nueva sección “Orden de parámetros de la planta” con lista reordenable y guardado vía PUT.
- **Frontend reportes / reportmanager / historicos**: Viable. Usar GET orden-variables por planta y construir filas de la tabla en ese orden; valor o "—" por sistema.

Si quieres, el siguiente paso puede ser bajar esto a tareas concretas (issues o checklist) por backend y por cada página del frontend.
