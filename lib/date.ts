export interface FormatCalendarDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string
}

function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number.parseInt(y, 10), Number.parseInt(mo, 10) - 1, Number.parseInt(d, 10))
  return Number.isNaN(date.getTime()) ? null : date
}

export function normalizeToYmd(dateStr: string): string | null {
  const trimmed = String(dateStr ?? "").trim()
  if (!trimmed) return null
  const justDate = trimmed.includes("T") ? trimmed.split("T")[0] : trimmed
  if (/^\d{4}-\d{2}-\d{2}$/.test(justDate)) return justDate
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().split("T")[0]
}

/**
 * Formatea una fecha calendario (YYYY-MM-DD) evitando el desfase UTC de `new Date("YYYY-MM-DD")`.
 * Si llega un ISO con tiempo, usa solo la parte YYYY-MM-DD. En otros formatos, cae al parser nativo.
 */
export function formatCalendarDate(dateStr: string, options: FormatCalendarDateOptions = {}): string {
  const { locale = "es-ES", ...fmt } = options
  const ymd = normalizeToYmd(dateStr)
  if (!ymd) return "—"
  const local = parseYmdLocal(ymd)
  if (local) return local.toLocaleDateString(locale, fmt)
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale, fmt)
}

