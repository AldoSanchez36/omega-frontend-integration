export interface FormatCalendarDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string
}

export interface ReportChartDateInput {
  fecha?: string
  generatedDate?: string
  chartStartDate?: string
  chartEndDate?: string
}

export interface ReportChartDateRange {
  startDate: string
  endDate: string
  /** Fecha del reporte (muestra / generación) usada como tope del eje X */
  reportDate: string | null
}

function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number.parseInt(y, 10), Number.parseInt(mo, 10) - 1, Number.parseInt(d, 10))
  return Number.isNaN(date.getTime()) ? null : date
}

function toLocalYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function subtractMonthsFromYmd(ymd: string, months: number): string {
  const parsed = parseYmdLocal(ymd)
  if (!parsed) return ymd
  const copy = new Date(parsed)
  copy.setMonth(copy.getMonth() - months)
  return toLocalYmd(copy)
}

/**
 * Rango de fechas para gráficos de un reporte guardado.
 * El eje X nunca supera la fecha del reporte (`fecha` o `generatedDate`).
 */
export function getReportChartDateRange(input: ReportChartDateInput): ReportChartDateRange {
  const reportDate =
    normalizeToYmd(input.fecha ?? "") ||
    normalizeToYmd(input.generatedDate ?? "") ||
    null

  const savedEnd = normalizeToYmd(input.chartEndDate ?? "")
  const savedStart = normalizeToYmd(input.chartStartDate ?? "")

  let endDate = savedEnd || reportDate
  if (reportDate && endDate && endDate > reportDate) {
    endDate = reportDate
  }
  if (!endDate && reportDate) {
    endDate = reportDate
  }
  if (!endDate) {
    endDate = toLocalYmd(new Date())
  }

  let startDate = savedStart
  if (!startDate) {
    startDate = subtractMonthsFromYmd(endDate, 12)
  }
  if (startDate > endDate) {
    startDate = subtractMonthsFromYmd(endDate, 12)
  }

  return { startDate, endDate, reportDate }
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

