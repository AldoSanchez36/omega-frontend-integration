# AGENTS.md — Contexto para agentes de IA

> Documento de onboarding para agentes que trabajan en **omega-frontend-integration** (Organomex Frontend).
> Complementa `README.md` (visión de producto) y `CLAUDE.md` (notas de arquitectura).
> Última actualización de contexto de trabajo: **2026-09-22** · rama típica: `post_2_1`

---

## 1. Qué es este proyecto

Frontend de un **sistema industrial de gestión de agua / plantas** (Organomex / Omega):

- Administrar **empresas → plantas → procesos (sistemas) → variables**
- Capturar **mediciones** y generar **reportes PDF**
- Consultar **históricos** y dashboards por rol
- Controlar **quién ve qué** (admin, analista, user, client)

**Stack:** Next.js (App Router) + React + TypeScript + Tailwind + Shadcn/Radix + Bootstrap (legado en tablas) + Recharts/jsPDF.

**Backend relacionado (repo separado):** `OmegaBackend` (Express + Supabase/Postgres). El frontend habla con él vía `API_BASE_URL` y `API_ENDPOINTS` en `config/constants.ts`.

**Auth:** token JWT en `localStorage` (`Organomex_token`, `Organomex_user`). Contexto: `context/UserContext.tsx`. Rutas protegidas: `components/ProtectedRoute.tsx` + `middleware.ts`.

---

## 2. Estructura que importa

```
app/                    # Rutas Next.js App Router
  dashboard/            # Resumen + reportes recientes + charts
  reportmanager/        # Captura de mediciones y armado de reporte
  reports/              # Vista/edición del reporte + export PDF
  reportList/           # Lista de reportes (clientes: solo publicados)
  historicos/           # Series temporales + tabla histórica + límites
  users-management/     # CRUD usuarios / permisos
  agregarsistema/       # Empresas, plantas, procesos, variables, tolerancias
  agregar-formula/      # Fórmulas sobre variables
components/             # UI reutilizable (Navbar, charts, tablas)
  ui/                   # Primitivos Shadcn
hooks/                  # useMeasurements, useEmpresasAccess, useTolerances…
lib/                    # Utilidades de dominio (estatus, tolerancias, fechas, API)
services/               # authService, httpService
config/constants.ts     # Base URL y endpoints
```

### Archivos de dominio clave

| Archivo | Rol |
|---------|-----|
| `lib/report-status.ts` | Estatus de reporte **0 / 1 / 2** (fuente de verdad) |
| `lib/format-report-from-api.ts` | Mapea filas API → filas de dashboard/tablas |
| `lib/tolerance-colors.ts` | Colores de celdas + líneas de límites en charts |
| `lib/load-report-detail.ts` | Hidrata `reportSelection` desde GET `/api/reportes/:id` |
| `lib/date.ts` | Fechas sin desfase de timezone |
| `hooks/useMeasurements.ts` | Arma y guarda `reportSelection` en localStorage |
| `components/SensorTimeSeriesChart.tsx` | Gráficos en `/reports` (también capturados al PDF) |
| `app/historicos/components/ParameterChartCard.tsx` | Gráficos de históricos con toggle de límites |

---

## 3. Roles y visibilidad

| Rol | Acceso típico |
|-----|----------------|
| **admin** | Todo: empresas, usuarios, reportes, sistemas |
| **analista** | Reportes + históricos (acciones rápidas en dashboard) |
| **user** | Operación limitada a plantas asignadas |
| **client** | Solo reportes con **estatus = 2** (completados / visibles) |

Permisos por empresa/planta: `hooks/useEmpresasAccess.ts` y tablas de relación en backend (`usuarios_empresas`, `usuarios_plantas`).

---

## 4. Flujo principal de reportes

1. **`/reportmanager`** — Seleccionar empresa → planta → procesos; capturar valores; elegir **estatus** (0–2); guardar → `localStorage.reportSelection`.
2. **`/reports`** — Revisar tablas/gráficos/comentarios; **guardar** (POST/PUT API) y/o **exportar PDF** (jsPDF + AutoTable + imágenes de charts).
3. **`/dashboard`** / **`/reportList`** — Listar; abrir detalle hidratando JSONB `datos` del reporte.
4. **`/historicos`** — Series por variable con límites de tolerancia.

Los reportes viven en BD (`reportes`): columnas + JSONB `datos` (parameters, tolerancias, usuario, planta, etc.).

---

## 5. Dominio crítico: `estatus` (entero 0–2)

**Ya no es boolean.** Columna BD `reportes.estatus` es `int8`.

| Código | Significado | UI |
|--------|-------------|-----|
| **0** | Pendiente | Default al crear |
| **1** | Listo para publicar | — |
| **2** | Completado | Visible para **clientes** |

- Frontend: `lib/report-status.ts` (`normalizeReportStatus`, `resolveReportPublicationStatus`, `isReportVisibleToClient`).
- Envío al backend: campo **`estatus`** (integer), no `estado` string ni boolean.
- PATCH: `PATCH /api/reportes/:id/estatus` con `{ estatus: 0|1|2 }`.
- Backend (`OmegaBackend`): `ReportesSQL.normalizeEstatus()`, filtros de cliente con `estatus = 2`.
- Listados cliente (`reportList`, queries client): solo **2**.
- Dashboard admin: muestra todos los estados vía badges; **no edita** estatus (edición en reportmanager).

Compatibilidad: `true` legacy → 2; `false` → 0. Puede existir override local en `localStorage` key `omega_report_publication_status`.

---

## 6. Dominio crítico: tolerancias / límites / colores

Tolerancias ligadas a **`variables_proceso_id`** (no solo `variable_id`).

Campos típicos:

- `limite_min` / `limite_max` — límites **críticos** (exteriores, rojos)
- `bien_min` / `bien_max` — rango **interno** / “bien” (verdes)
- `usar_limite_min` / `usar_limite_max` — si el crítico está activo

Utilidad: `lib/tolerance-colors.ts` → colores de celdas en tablas y `getChartLimitLines` / `getChartToleranceBand` para charts.

### Históricos — toggle “Límites”

En `ParameterChartCard`:

- Toggle OFF → oculta **solo límites internos** (líneas verdes + banda “rango bien”).
- Límites **críticos exteriores (rojos) siempre visibles**.

---

## 7. Trabajo reciente (contexto de sesiones)

Resumen de lo ya implementado / acordado (no rehacer sin necesidad):

### Estatus de reportes (0–2)
- Refactor de boolean → integer en front y back.
- Selectores en `reportmanager`; lectura en dashboard, reportList, TabbedSelector.
- Candado booleano de “visible/oculto” sustituido por el flujo de estatus numérico.

### Reportes / PDF (`/reports`)
- Contorno sólido en gráficos (`SensorTimeSeriesChart` + rect en jsPDF).
- Fechas de charts acotadas a la fecha del reporte.
- Grid de charts más oscuro; PDF sin comentarios bajo gráficos en ciertos flujos; tabla de límites con encabezado de sistema (colSpan); “Empresa: Servicio {nombre}”.
- Últimos ~15 puntos hasta la fecha del reporte en charts PDF.

### Históricos
- Líneas de límites críticos + banda bien; toggle solo para internos.
- Tabla `HistoricalDataTable.tsx`; mejoras visuales.

### Dashboard / roles
- Analistas: acciones rápidas Reportes + Históricos.
- Reportes recientes con badges de estatus 0–2.

### Performance / API (sesión anterior)
- Listados summary sin JSONB pesado; paginación; counts; menos N+1 en usuarios.

### Users management
- Empresa como dropdown; `@` permitido; limpiar form al crear.

### Backend (`OmegaBackend`) — si tocas persistencia de reportes
- `models/ReportesSQL.js`, `controllers/reportes.js`, `routes/reportes.js`
- Crear/actualizar aceptan `estatus` 0–2; clientes filtran `estatus = 2`.

---

## 8. Convenciones para el agente

1. **Responder en español** (regla del usuario).
2. **No commits** salvo que el usuario lo pida explícitamente.
3. Cambios **mínimos y enfocados**; no refactors colaterales ni docs no pedidas.
4. Respetar patrones existentes (Tailwind + Shadcn; a veces Bootstrap en tablas legacy).
5. Preferir utilidades en `lib/` antes de duplicar lógica de estatus, fechas o tolerancias.
6. Al tocar reportes: verificar **front + back + filtrado cliente** si cambia `estatus` o `datos`.
7. PDF: los charts se exportan desde refs de `SensorTimeSeriesChart` (`exportAsImage`); cambios visuales del chart suelen reflejarse en PDF.
8. Fechas: usar helpers de `lib/date.ts` para evitar bugs de timezone (México).

---

## 9. Cómo arrancar (dev)

```bash
npm install
npm run dev
```

Node **22.x**. Variables / base API: revisar `config/constants.ts` y entorno local.

Tests de páginas (Node scripts en `testers/`):

```bash
npm run test:pages
npm run test:reportmanager
```

---

## 10. Checklist rápido al tocar una feature

- [ ] ¿Afecta visibilidad de clientes? Revisar filtro `estatus === 2`.
- [ ] ¿Cambia payload de reporte? Revisar POST/PUT en `/reports` y `ReportesSQL.crear/actualizar`.
- [ ] ¿Colores/límites? Usar `lib/tolerance-colors.ts` y `variables_proceso_id`.
- [ ] ¿Charts en PDF? Probar captura desde `SensorTimeSeriesChart`.
- [ ] ¿Históricos? Respeta: críticos siempre ON; toggle solo internos.

---

## 11. Referencias útiles en repo

- `README.md` — overview de producto y páginas
- `CLAUDE.md` — diagrama/arquitectura (CodeViz)
- `FLUJO_TOLERANCIAS.md`, `ANALISIS_*` — análisis de dominio (pueden estar parcialmente desactualizados; priorizar código)
- `docs/ORDEN_PARAMETROS_POR_PLANTA.md` — orden de parámetros

Si este archivo y el código discrepan, **gana el código**.
