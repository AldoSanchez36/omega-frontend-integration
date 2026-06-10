export interface ToleranceData {
  nombre: string
  variables_proceso_id?: string | null
  limite_min: number | null
  limite_max: number | null
  bien_min: number | null
  bien_max: number | null
  usar_limite_min: boolean
  usar_limite_max: boolean
}

export type VariablesToleranciaStore = Record<string, unknown>

function isToleranceShape(value: unknown): value is ToleranceData {
  return Boolean(value && typeof value === "object" && "nombre" in (value as object))
}

/** Estructura anidada: { [systemName]: { [variables_proceso_id]: ToleranceData } } */
export function isNestedToleranciaStore(store: VariablesToleranciaStore): boolean {
  const values = Object.values(store)
  if (values.length === 0) return false
  return values.some((v) => v && typeof v === "object" && !isToleranceShape(v))
}

export function getVariablesProcesoIdFromParam(param: {
  variables_proceso_id?: string | null
  variable_proceso_id?: string | null
}): string | null {
  const id = param.variables_proceso_id ?? param.variable_proceso_id ?? null
  return id == null || id === "" ? null : String(id)
}

export function buildToleranceDataFromRaw(
  raw: Record<string, unknown>,
  paramNombre: string,
  options?: {
    variables_proceso_id?: string | null
    limitsState?: { limite_min?: boolean; limite_max?: boolean }
  }
): ToleranceData {
  const usarLimiteMin =
    options?.limitsState?.limite_min ??
    (raw.usar_limite_min === true || raw.usar_limite_bajo === true)
  const usarLimiteMax =
    options?.limitsState?.limite_max ??
    (raw.usar_limite_max === true || raw.usar_limite_alto === true)

  return {
    nombre: paramNombre,
    variables_proceso_id:
      options?.variables_proceso_id ??
      (raw.variables_proceso_id != null ? String(raw.variables_proceso_id) : null),
    limite_min: usarLimiteMin ? ((raw.limite_min as number | null) ?? null) : null,
    limite_max: usarLimiteMax ? ((raw.limite_max as number | null) ?? null) : null,
    bien_min: (raw.bien_min as number | null) ?? null,
    bien_max: (raw.bien_max as number | null) ?? null,
    usar_limite_min: usarLimiteMin,
    usar_limite_max: usarLimiteMax,
  }
}

export function indexTolerancesByVariablesProcesoId(
  rows: unknown[]
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const vpId = (row as { variables_proceso_id?: string }).variables_proceso_id
    if (vpId) map.set(String(vpId), row as Record<string, unknown>)
  }
  return map
}

/**
 * Resuelve tolerancia para una celda del reporte.
 * Prioridad: anidado por sistema + variables_proceso_id → legacy plano.
 */
export function resolveReportTolerance(
  store: VariablesToleranciaStore | null | undefined,
  systemName: string,
  options: {
    variableName?: string
    variablesProcesoId?: string | null
  }
): ToleranceData | null {
  if (!store || typeof store !== "object") return null

  const vpId = options.variablesProcesoId?.trim() || null
  const variableName = options.variableName?.trim() || ""

  if (isNestedToleranciaStore(store)) {
    const systemBucket = store[systemName]
    if (systemBucket && typeof systemBucket === "object") {
      const bucket = systemBucket as Record<string, unknown>
      if (vpId && isToleranceShape(bucket[vpId])) return bucket[vpId]
      if (variableName && isToleranceShape(bucket[variableName])) return bucket[variableName]

      const byName = Object.values(bucket).find(
        (tol) =>
          isToleranceShape(tol) &&
          tol.nombre.trim().toLowerCase() === variableName.toLowerCase()
      )
      if (byName) return byName
    }

    for (const bucket of Object.values(store)) {
      if (!bucket || typeof bucket !== "object" || isToleranceShape(bucket)) continue
      const nested = bucket as Record<string, unknown>
      if (vpId && isToleranceShape(nested[vpId])) return nested[vpId]
    }
  }

  const flat = store as Record<string, unknown>
  if (vpId && isToleranceShape(flat[vpId])) return flat[vpId]
  if (variableName && isToleranceShape(flat[variableName])) return flat[variableName]

  const legacyByName = Object.values(flat).find(
    (tol) =>
      isToleranceShape(tol) &&
      variableName &&
      tol.nombre.trim().toLowerCase() === variableName.toLowerCase()
  )
  return legacyByName ?? null
}

/**
 * Color de celda según tolerancia.
 * Verde = rango bien | Amarillo = advertencia | Rojo = fuera de crítico/bien | '' = sin límites
 */
export function getCellColorFromTolerance(
  value: unknown,
  tolerance: ToleranceData | null | undefined
): string {
  if (value === undefined || value === null || value === "") return ""
  const valor = typeof value === "number" ? value : parseFloat(String(value))
  if (!Number.isFinite(valor) || !tolerance) return ""

  const bien_min = tolerance.bien_min
  const bien_max = tolerance.bien_max
  const limite_min = tolerance.limite_min
  const limite_max = tolerance.limite_max
  const usar_limite_min = tolerance.usar_limite_min === true
  const usar_limite_max = tolerance.usar_limite_max === true

  const hasAnyLimit =
    (usar_limite_min && limite_min != null) ||
    (usar_limite_max && limite_max != null) ||
    bien_min != null ||
    bien_max != null
  if (!hasAnyLimit) return ""

  if (usar_limite_min && limite_min != null && valor < limite_min) return "#FFC6CE"
  if (usar_limite_max && limite_max != null && valor > limite_max) return "#FFC6CE"

  if (
    usar_limite_min &&
    limite_min != null &&
    bien_min != null &&
    valor >= limite_min &&
    valor < bien_min
  ) {
    return "#FFEB9C"
  }
  if (
    usar_limite_max &&
    limite_max != null &&
    bien_max != null &&
    valor > bien_max &&
    valor <= limite_max
  ) {
    return "#FFEB9C"
  }

  if (bien_min != null && bien_max != null) {
    if (valor >= bien_min && valor <= bien_max) return "#C6EFCE"
    return "#FFC6CE"
  }

  if (bien_min == null && bien_max != null) {
    return valor > bien_max ? "#FFC6CE" : "#C6EFCE"
  }

  if (bien_max == null && bien_min != null) {
    return valor < bien_min ? "#FFC6CE" : "#C6EFCE"
  }

  return ""
}

export function formatToleranceRangeDisplay(tolerance: ToleranceData | null): string {
  if (!tolerance) return "—"

  const usarLimiteMin = tolerance.usar_limite_min
  const usarLimiteMax = tolerance.usar_limite_max

  if (usarLimiteMin || usarLimiteMax) {
    const min = usarLimiteMin ? tolerance.limite_min : null
    const max = usarLimiteMax ? tolerance.limite_max : null
    if (min != null && max != null) return `${min} - ${max}`
    if (min != null) return `Min ${min}`
    if (max != null) return `Max ${max}`
  }

  const { bien_min, bien_max } = tolerance
  if (bien_min != null && bien_max != null) return `${bien_min} - ${bien_max}`
  if (bien_min != null) return `Min ${bien_min}`
  if (bien_max != null) return `Max ${bien_max}`
  return "—"
}
