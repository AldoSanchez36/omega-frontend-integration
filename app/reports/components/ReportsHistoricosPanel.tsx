"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Factory,
  LineChart,
  Table2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { buildReportesQueryParams } from "@/lib/report-api-params"
import {
  buildToleranceDataFromRaw,
  formatToleranceRangeDisplay,
  getCellColorFromTolerance,
  getChartLimitLines,
  getChartToleranceBand,
} from "@/lib/tolerance-colors"
import { parseReportDatosJsonb } from "@/lib/report-usuario-display"
import { ParameterChartCard } from "@/app/historicos/components/ParameterChartCard"
import { HistoricalDataTable } from "@/app/historicos/components/HistoricalDataTable"

interface System {
  id: string
  nombre: string
  planta_id?: string
}

interface Parameter {
  id: string
  nombre: string
  unidad: string
  proceso_id?: string
  variable_proceso_id?: string | null
  variables_proceso_id?: string | null
}

interface Tolerance {
  id?: string
  variables_proceso_id?: string | null
  variable_id?: string
  proceso_id?: string
  limite_min?: number
  limite_max?: number
  bien_min?: number | null
  bien_max?: number | null
  usar_limite_min?: boolean
  usar_limite_max?: boolean
}

interface HistoricalDataByDate {
  [fecha: string]: {
    [variableId: string]: {
      valor: number
      unidad: string
      comentarios?: string
    }
  } & {
    comentarios_globales?: string
  }
}

export interface ReportsHistoricosPanelProps {
  plantId: string | null | undefined
  plantName?: string | null
  empresaId?: string | null
  empresaNombre?: string | null
  /** Fecha del reporte (YYYY-MM-DD): ancla el rango histórico */
  reportFecha?: string | null
  /** Nombre de proceso del reporte para preseleccionar */
  preferredSystemName?: string | null
  /** Compacto al embeber dentro del documento del reporte */
  embedded?: boolean
  /** Slot opcional a la derecha del título (ej. checkbox PDF) */
  headerExtra?: React.ReactNode
  userRole?: string
  token?: string | null
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toFixed(2)
}

function formatDate(dateStr: string): string {
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

function formatLongDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function parseCommentDisplay(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "object" && value !== null && "global" in value) {
    const g = (value as { global?: string }).global
    if (typeof g === "string") return g
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as { global?: string }
        if (typeof parsed?.global === "string") return parsed.global
      } catch {
        /* ignore */
      }
    }
    return trimmed || "—"
  }
  return String(value)
}

function toYmdOffsetMonths(base: Date, monthsBack: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() - monthsBack)
  return d.toISOString().split("T")[0]
}

function parseReportAnchorDate(reportFecha?: string | null): Date {
  if (reportFecha) {
    const d = new Date(`${String(reportFecha).split("T")[0]}T12:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

/**
 * Históricos embebidos en /reports: misma planta del documento,
 * rango anclado a la fecha del reporte, proceso preferido del reporte.
 */
export function ReportsHistoricosPanel({
  plantId,
  plantName,
  empresaId,
  empresaNombre,
  reportFecha,
  preferredSystemName,
  embedded = false,
  headerExtra,
  userRole = "user",
  token,
}: ReportsHistoricosPanelProps) {
  const router = useRouter()
  const [systems, setSystems] = useState<System[]>([])
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [tolerances, setTolerances] = useState<Tolerance[]>([])
  const [plantOrderVariables, setPlantOrderVariables] = useState<
    { id: string; nombre: string; orden: number }[]
  >([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [historicalData, setHistoricalData] = useState<HistoricalDataByDate>({})
  const [loadingSystems, setLoadingSystems] = useState(false)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(true)
  const [activePreset, setActivePreset] = useState<"1m" | "2m" | "3m" | "custom">("3m")

  useEffect(() => {
    const endBase = parseReportAnchorDate(reportFecha)
    const end = endBase.toISOString().split("T")[0]
    setEndDate(end)
    setStartDate(toYmdOffsetMonths(endBase, 3))
    setActivePreset("3m")
  }, [reportFecha])

  const applyPreset = useCallback(
    (preset: "1m" | "2m" | "3m") => {
      const endBase = parseReportAnchorDate(reportFecha)
      const end = endBase.toISOString().split("T")[0]
      const months = preset === "1m" ? 1 : preset === "2m" ? 2 : 3
      setStartDate(toYmdOffsetMonths(endBase, months))
      setEndDate(end)
      setActivePreset(preset)
    },
    [reportFecha]
  )

  useEffect(() => {
    if (!plantId || !token) {
      setSystems([])
      setSelectedSystem("")
      return
    }

    let cancelled = false
    setLoadingSystems(true)
    fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(plantId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem("Organomex_token")
          localStorage.removeItem("Organomex_user")
          router.push("/logout")
          return
        }
        if (!res.ok) throw new Error("No se pudieron cargar los procesos")
        const data = await res.json()
        if (cancelled) return
        const list: System[] = data.procesos || data.systems || data || []
        setSystems(Array.isArray(list) ? list : [])
        setSelectedSystem((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev
          const preferred = preferredSystemName?.trim().toLowerCase()
          if (preferred) {
            const match = list.find((s) => s.nombre?.trim().toLowerCase() === preferred)
            if (match) return match.id
          }
          return list[0]?.id ?? ""
        })
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setSystems([])
          setSelectedSystem("")
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSystems(false)
      })

    return () => {
      cancelled = true
    }
  }, [plantId, token, router, preferredSystemName])

  useEffect(() => {
    if (!plantId || !token) {
      setPlantOrderVariables([])
      return
    }
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(plantId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setPlantOrderVariables(
          data.ok && Array.isArray(data.variables) ? data.variables : []
        )
      })
      .catch(() => {
        if (!cancelled) setPlantOrderVariables([])
      })
    return () => {
      cancelled = true
    }
  }, [plantId, token])

  useEffect(() => {
    if (!selectedSystem || !token) {
      setParameters([])
      return
    }
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystem)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar parámetros")
        const data = await res.json()
        if (!cancelled) setParameters(data.variables || [])
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setParameters([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedSystem, token])

  useEffect(() => {
    if (!selectedSystem || parameters.length === 0 || !token) {
      setTolerances([])
      return
    }
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        const toleranceData = Array.isArray(data) ? data : data.tolerancias || []
        if (cancelled) return
        setTolerances(
          toleranceData.filter((tol: Tolerance) => {
            if (tol.proceso_id == null) return true
            return String(tol.proceso_id) === String(selectedSystem)
          })
        )
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [selectedSystem, parameters, token])

  const fetchHistoricalData = useCallback(async () => {
    if (!plantId || !selectedSystem || !startDate || !endDate || parameters.length === 0 || !token) {
      setHistoricalData({})
      return
    }

    const systemData = systems.find((s) => s.id === selectedSystem)
    if (!systemData) return

    setHistoricalLoading(true)
    setHistoricalError(null)

    try {
      const histParams = buildReportesQueryParams({
        userRole,
        view: "full",
        startDate,
        endDate,
        planta_id: plantId,
      })

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}?${histParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("Organomex_token")
          localStorage.removeItem("Organomex_user")
          router.push("/logout")
          return
        }
        throw new Error("No se pudieron cargar los reportes.")
      }

      const data = await res.json()
      const reportes: unknown[] = data.reportes || []
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const reportesFiltrados = reportes.filter((report: any) => {
        const reportePlantaId = report.planta_id || report.datos?.plant?.id
        if (String(reportePlantaId) !== String(plantId)) return false
        const datos = parseReportDatosJsonb(report as Record<string, unknown>)
        const fechaReporte = datos.fecha || report.fecha || report.created_at
        if (!fechaReporte) return false
        const fecha = new Date(String(fechaReporte))
        return !isNaN(fecha.getTime()) && fecha >= start && fecha <= end
      })

      const organizedData: HistoricalDataByDate = {}

      reportesFiltrados.forEach((report: any) => {
        const datos = parseReportDatosJsonb(report as Record<string, unknown>)
        const fechaReporte = datos.fecha || report.fecha || report.created_at
        const fechaStr =
          typeof fechaReporte === "string"
            ? fechaReporte.split("T")[0]
            : new Date(fechaReporte).toISOString().split("T")[0]

        if (!organizedData[fechaStr]) organizedData[fechaStr] = {}

        const parametersBySystem = (datos.parameters || {}) as Record<
          string,
          Record<string, { valor?: number; value?: number; unidad?: string }>
        >
        const paramsForSystem = parametersBySystem[systemData.nombre] || {}
        const parameterComments = (datos.parameterComments || {}) as Record<string, string>

        parameters.forEach((param) => {
          const paramData = paramsForSystem[param.nombre]
          const valor = paramData?.valor ?? paramData?.value
          if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return
          organizedData[fechaStr][param.id] = {
            valor: Number(valor),
            unidad: paramData?.unidad ?? param.unidad ?? "",
            comentarios:
              parameterComments[param.nombre] ??
              parameterComments[param.id] ??
              (typeof datos.comentarios === "string" ? datos.comentarios : "") ??
              "",
          }
        })

        if (
          datos.comentarios != null &&
          datos.comentarios !== "" &&
          !organizedData[fechaStr].comentarios_globales
        ) {
          organizedData[fechaStr].comentarios_globales = parseCommentDisplay(datos.comentarios)
        }
      })

      setHistoricalData(organizedData)
    } catch (e: any) {
      setHistoricalError(`Error al cargar datos históricos: ${e.message}`)
      setHistoricalData({})
    } finally {
      setHistoricalLoading(false)
    }
  }, [
    plantId,
    selectedSystem,
    startDate,
    endDate,
    parameters,
    systems,
    token,
    userRole,
    router,
  ])

  useEffect(() => {
    if (selectedSystem && startDate && endDate && parameters.length > 0) {
      fetchHistoricalData()
    }
  }, [fetchHistoricalData, selectedSystem, startDate, endDate, parameters.length])

  const sortedParameters = useMemo(() => {
    if (plantOrderVariables.length === 0) return parameters
    const orderMap = new Map(plantOrderVariables.map((v, i) => [v.id, i]))
    return [...parameters].sort((a, b) => {
      const ia = orderMap.get(a.id) ?? 9999
      const ib = orderMap.get(b.id) ?? 9999
      if (ia !== ib) return ia - ib
      return (a.nombre || "").localeCompare(b.nombre || "")
    })
  }, [parameters, plantOrderVariables])

  const sortedDates = useMemo(
    () => Object.keys(historicalData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [historicalData]
  )

  const chartSeriesByParam = useMemo(() => {
    const out: Record<string, { timestamp: string; value: number }[]> = {}
    sortedParameters.forEach((param) => {
      out[param.id] = sortedDates
        .map((fecha) => {
          const v = historicalData[fecha]?.[param.id]?.valor
          if (v === undefined || v === null || Number.isNaN(Number(v))) return null
          return { timestamp: fecha, value: Number(v) }
        })
        .filter((d): d is { timestamp: string; value: number } => d != null)
    })
    return out
  }, [sortedParameters, sortedDates, historicalData])

  const getTargetVariablesProcesoId = (parameter: Parameter): string | null => {
    const id = parameter.variable_proceso_id ?? parameter.variables_proceso_id ?? null
    return id == null || id === "" ? null : String(id)
  }

  const getToleranceForParameter = (parameter: Parameter): Tolerance | undefined => {
    const targetId = getTargetVariablesProcesoId(parameter)
    if (!targetId) return undefined
    return tolerances.find((tol) => String(tol.variables_proceso_id ?? "") === targetId)
  }

  const getHistoricalCellColor = (parameter: Parameter, value: unknown): string => {
    const tol = getToleranceForParameter(parameter)
    if (!tol) return ""
    const toleranceData = buildToleranceDataFromRaw(
      tol as unknown as Record<string, unknown>,
      parameter.nombre,
      { variables_proceso_id: getTargetVariablesProcesoId(parameter) }
    )
    return getCellColorFromTolerance(value, toleranceData)
  }

  const getAcceptableRange = (parameter: Parameter): string => {
    const tol = getToleranceForParameter(parameter)
    if (!tol) return "—"
    const toleranceData = buildToleranceDataFromRaw(
      tol as unknown as Record<string, unknown>,
      parameter.nombre,
      { variables_proceso_id: getTargetVariablesProcesoId(parameter) }
    )
    return formatToleranceRangeDisplay(toleranceData)
  }

  const highLowValues = useMemo(() => {
    const highLow: Record<string, { alto: number; bajo: number }> = {}
    parameters.forEach((param) => {
      const values = Object.values(historicalData)
        .map((dateData) => {
          const paramData = dateData[param.id]
          return paramData && typeof paramData === "object" && "valor" in paramData
            ? paramData.valor
            : undefined
        })
        .filter((val): val is number => val !== undefined)
      highLow[param.id] =
        values.length > 0
          ? { alto: Math.max(...values), bajo: Math.min(...values) }
          : { alto: 0, bajo: 0 }
    })
    return highLow
  }, [parameters, historicalData])

  const averageValues = useMemo(() => {
    const averages: Record<string, number> = {}
    parameters.forEach((param) => {
      const values = Object.values(historicalData)
        .map((dateData) => {
          const paramData = dateData[param.id]
          return paramData && typeof paramData === "object" && "valor" in paramData
            ? paramData.valor
            : undefined
        })
        .filter((val): val is number => val !== undefined)
      averages[param.id] =
        values.length > 0 ? values.reduce((acc, val) => acc + val, 0) / values.length : 0
    })
    return averages
  }, [parameters, historicalData])

  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  const paramsWithData = useMemo(
    () => sortedParameters.filter((p) => (chartSeriesByParam[p.id]?.length ?? 0) > 0).length,
    [sortedParameters, chartSeriesByParam]
  )

  if (!plantId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <Factory className="mx-auto mb-3 h-8 w-8 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            No hay planta asociada al reporte. No se pueden cargar históricos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? "bg-transparent" : "bg-gradient-to-b from-slate-100 via-slate-50 to-white"}>
      <div className={embedded ? "px-0 py-0" : "mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-6"}>
        <section
          className={`mb-5 overflow-hidden border border-slate-200/80 bg-white shadow-sm ${
            embedded ? "rounded-xl" : "rounded-2xl"
          }`}
        >
          <div className={`relative ${embedded ? "px-4 py-4 sm:px-5" : "px-5 py-5 sm:px-7 sm:py-6"}`}>
            {!embedded && (
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.55]"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(37,99,235,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(14,165,233,0.08), transparent 50%)",
                }}
              />
            )}
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                    <Activity className="h-3.5 w-3.5" />
                    {embedded ? "Tendencias e historial" : "Históricos del reporte"}
                  </span>
                  {headerExtra}
                </div>
                <h2
                  className={`truncate font-semibold tracking-tight text-slate-900 ${
                    embedded ? "text-lg" : "text-xl sm:text-2xl"
                  }`}
                >
                  {embedded
                    ? `Hasta ${formatLongDate(reportFecha)}`
                    : plantName || "Planta"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {empresaNombre ? (
                    <>
                      <span className="font-medium text-slate-800">{empresaNombre}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                    </>
                  ) : null}
                  {plantName ? (
                    <>
                      <span className="font-medium text-slate-800">{plantName}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                    </>
                  ) : null}
                  Mismos datos del reporte, con límites y rango ajustable
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold tabular-nums text-slate-900">
                    {historicalLoading ? "…" : sortedDates.length}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Fechas</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold tabular-nums text-slate-900">
                    {historicalLoading ? "…" : paramsWithData}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Variables</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold tabular-nums text-slate-900">
                    {systems.length}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">Procesos</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="reports-hist-system" className="text-xs text-slate-600">
                    Proceso
                  </Label>
                  <Select
                    value={selectedSystem || undefined}
                    onValueChange={(v) => {
                      setHistoricalData({})
                      setSelectedSystem(v)
                    }}
                    disabled={loadingSystems || systems.length === 0}
                  >
                    <SelectTrigger id="reports-hist-system" className="bg-white">
                      <SelectValue
                        placeholder={loadingSystems ? "Cargando…" : "Seleccionar proceso"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reports-hist-start" className="text-xs text-slate-600">
                    Desde
                  </Label>
                  <Input
                    id="reports-hist-start"
                    type="date"
                    className="bg-white"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setActivePreset("custom")
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reports-hist-end" className="text-xs text-slate-600">
                    Hasta
                  </Label>
                  <Input
                    id="reports-hist-end"
                    type="date"
                    className="bg-white"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setActivePreset("custom")
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Rango
                </span>
                {(
                  [
                    ["1m", "1 mes"],
                    ["2m", "2 meses"],
                    ["3m", "3 meses"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={activePreset === key ? "default" : "outline"}
                    className={
                      activePreset === key
                        ? "h-8 bg-slate-900 text-white hover:bg-slate-800"
                        : "h-8 border-slate-300 bg-white text-slate-700"
                    }
                    onClick={() => applyPreset(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {selectedSystem && parameters.length > 0 && (
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-sky-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Tendencias — {selectedSystemData?.nombre}
                </h3>
              </div>
              {sortedDates.length > 0 && (
                <p className="text-xs text-slate-500">
                  {formatDate(sortedDates[0])} → {formatDate(sortedDates[sortedDates.length - 1])}
                </p>
              )}
            </div>

            {historicalLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
              </div>
            ) : historicalError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {historicalError}
              </div>
            ) : sortedDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                <LineChart className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">Sin puntos en este rango</p>
                <p className="mt-1 text-xs text-slate-500">
                  Prueba ampliar el periodo o cambiar de proceso.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedParameters.map((param) => {
                  const tol = getToleranceForParameter(param)
                  const toleranceData = tol
                    ? buildToleranceDataFromRaw(
                        tol as unknown as Record<string, unknown>,
                        param.nombre,
                        { variables_proceso_id: getTargetVariablesProcesoId(param) }
                      )
                    : null
                  return (
                    <ParameterChartCard
                      key={param.id}
                      param={{ id: param.id, nombre: param.nombre, unidad: param.unidad }}
                      data={chartSeriesByParam[param.id] ?? []}
                      limitLines={getChartLimitLines(toleranceData)}
                      toleranceBand={getChartToleranceBand(toleranceData)}
                    />
                  )
                })}
              </div>
            )}
          </section>
        )}

        {selectedSystem &&
          parameters.length > 0 &&
          !historicalLoading &&
          !historicalError &&
          sortedDates.length > 0 && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50/80 sm:px-5"
                onClick={() => setShowTable((v) => !v)}
                aria-expanded={showTable}
              >
                <div className="flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-900">
                    Detalle tabular — {selectedSystemData?.nombre}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {sortedDates.length} filas
                  </span>
                </div>
                {showTable ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {showTable && (
                <div className="px-2 py-4 sm:px-4">
                  <HistoricalDataTable
                    parameters={sortedParameters}
                    dates={sortedDates}
                    dataByDate={historicalData}
                    highLowValues={highLowValues}
                    averageValues={averageValues}
                    getAcceptableRange={getAcceptableRange}
                    getCellColor={getHistoricalCellColor}
                    formatDate={formatDate}
                    formatNumber={formatNumber}
                    parseCommentDisplay={parseCommentDisplay}
                  />
                </div>
              )}
            </section>
          )}

        {selectedSystem && parameters.length === 0 && !historicalLoading && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-center text-sm text-slate-500">
                No hay parámetros disponibles para este proceso.
              </p>
            </CardContent>
          </Card>
        )}

        {!selectedSystem && !loadingSystems && systems.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-center text-sm text-slate-500">
                Esta planta no tiene procesos/sistemas configurados.
              </p>
            </CardContent>
          </Card>
        )}

        {empresaId ? <span className="sr-only">empresa_id: {empresaId}</span> : null}
      </div>
    </div>
  )
}
