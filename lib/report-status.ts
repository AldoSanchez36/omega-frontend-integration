/**
 * Estado de publicación de un reporte (entero 0–2).
 * 0 = Pendiente, 1 = Listo para publicar, 2 = Completado
 */
export type ReportStatusCode = 0 | 1 | 2

/** Alias usado en reportmanager y tablas del dashboard */
export type ReportPublicationStatus = ReportStatusCode

export const REPORT_STATUS_PENDING = 0 as const
export const REPORT_STATUS_READY = 1 as const
export const REPORT_STATUS_COMPLETED = 2 as const

export const REPORT_STATUS_DEFAULT: ReportStatusCode = REPORT_STATUS_PENDING

export const REPORT_STATUS_OPTIONS: ReadonlyArray<{
  value: ReportStatusCode
  label: string
  badgeClass: string
}> = [
  { value: REPORT_STATUS_PENDING, label: "Pendiente", badgeClass: "bg-secondary" },
  { value: REPORT_STATUS_READY, label: "Listo para Publicar", badgeClass: "bg-warning text-dark" },
  { value: REPORT_STATUS_COMPLETED, label: "Completado", badgeClass: "bg-success" },
] as const

const STORAGE_KEY = "omega_report_publication_status"

const STRING_ALIASES: Record<string, ReportStatusCode> = {
  "0": REPORT_STATUS_PENDING,
  pending: REPORT_STATUS_PENDING,
  pendiente: REPORT_STATUS_PENDING,
  "1": REPORT_STATUS_READY,
  ready_to_publish: REPORT_STATUS_READY,
  ready: REPORT_STATUS_READY,
  listo: REPORT_STATUS_READY,
  listo_para_publicar: REPORT_STATUS_READY,
  "listo para publicar": REPORT_STATUS_READY,
  "2": REPORT_STATUS_COMPLETED,
  completed: REPORT_STATUS_COMPLETED,
  completado: REPORT_STATUS_COMPLETED,
  complete: REPORT_STATUS_COMPLETED,
}

export function normalizeReportStatus(raw: unknown): ReportStatusCode {
  if (raw === true) return REPORT_STATUS_COMPLETED
  if (raw === false || raw == null || raw === "") return REPORT_STATUS_DEFAULT

  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 2) {
    return raw as ReportStatusCode
  }

  const key = String(raw).trim().toLowerCase()
  if (key in STRING_ALIASES) return STRING_ALIASES[key]

  const asNum = Number(key)
  if (Number.isInteger(asNum) && asNum >= 0 && asNum <= 2) {
    return asNum as ReportStatusCode
  }

  return REPORT_STATUS_DEFAULT
}

export function isReportVisibleToClient(status: unknown): boolean {
  return normalizeReportStatus(status) === REPORT_STATUS_COMPLETED
}

export function getReportStatusLabel(status: unknown): string {
  const normalized = normalizeReportStatus(status)
  return REPORT_STATUS_OPTIONS.find((o) => o.value === normalized)?.label ?? "Pendiente"
}

export function getReportStatusBadgeClass(status: unknown): string {
  const normalized = normalizeReportStatus(status)
  return (
    REPORT_STATUS_OPTIONS.find((o) => o.value === normalized)?.badgeClass ?? "bg-secondary"
  )
}

export function buildReportStatusStorageKey(input: {
  id?: string | null
  planta_id?: string | null
  fecha?: string | null
}): string | null {
  const id = input.id != null && String(input.id).trim() !== "" ? String(input.id).trim() : null
  if (id) return `id:${id}`

  const planta = input.planta_id != null ? String(input.planta_id).trim() : ""
  const fechaRaw = input.fecha != null ? String(input.fecha).trim() : ""
  const fecha = fechaRaw.includes("T") ? fechaRaw.split("T")[0] : fechaRaw
  if (planta && fecha) return `plant:${planta}|fecha:${fecha}`
  return null
}

function readStatusMap(): Record<string, ReportStatusCode> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, ReportStatusCode> = {}
    Object.entries(parsed).forEach(([key, value]) => {
      out[key] = normalizeReportStatus(value)
    })
    return out
  } catch {
    return {}
  }
}

function writeStatusMap(map: Record<string, ReportStatusCode>) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/** Guarda override local cuando el backend aún no devolvió el estatus actualizado. */
export function setLocalReportStatus(
  input: { id?: string | null; planta_id?: string | null; fecha?: string | null },
  status: ReportStatusCode
) {
  const key = buildReportStatusStorageKey(input)
  if (!key) return
  const map = readStatusMap()
  map[key] = normalizeReportStatus(status)
  writeStatusMap(map)
}

export function getLocalReportStatus(input: {
  id?: string | null
  planta_id?: string | null
  fecha?: string | null
}): ReportStatusCode | null {
  const key = buildReportStatusStorageKey(input)
  if (!key) return null
  const map = readStatusMap()
  const value = map[key]
  return value ?? null
}

/**
 * Resuelve el estatus a mostrar:
 * 1) override local (frontend)
 * 2) campo `estatus` del API (0–2)
 * 3) campos legacy `estado` / `status` en datos JSON
 * 4) default Pendiente (0)
 */
export function resolveReportPublicationStatus(report: {
  id?: string | null
  planta_id?: string | null
  fecha?: string | null
  estatus?: unknown
  estado?: unknown
  status?: unknown
  datos?: { estatus?: unknown; estado?: unknown; status?: unknown; fecha?: string | null } | null
}): ReportStatusCode {
  const fecha =
    report.fecha ??
    (report.datos && typeof report.datos === "object" ? report.datos.fecha : null) ??
    null

  const local = getLocalReportStatus({
    id: report.id,
    planta_id: report.planta_id,
    fecha,
  })
  if (local != null) return local

  if (report.estatus !== undefined && report.estatus !== null) {
    return normalizeReportStatus(report.estatus)
  }

  const fromApi =
    report.estado ??
    report.status ??
    (report.datos && typeof report.datos === "object"
      ? report.datos.estatus ?? report.datos.estado ?? report.datos.status
      : null)

  if (fromApi == null || fromApi === "" || fromApi === "active" || fromApi === "online") {
    return REPORT_STATUS_DEFAULT
  }

  return normalizeReportStatus(fromApi)
}
