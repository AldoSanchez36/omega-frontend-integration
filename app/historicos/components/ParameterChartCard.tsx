"use client"

import React, { useState, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { ChartLimitLine, ChartToleranceBand } from "@/lib/tolerance-colors"

export interface ParameterChartDataPoint {
  timestamp: string
  value: number
}

interface ParameterChartCardProps {
  param: { id: string; nombre: string; unidad: string }
  data: ParameterChartDataPoint[]
  limitLines?: ChartLimitLine[]
  toleranceBand?: ChartToleranceBand | null
}

const CHART_WIDTH = 480
const CHART_HEIGHT = 280
const MARGIN = { top: 20, right: 58, bottom: 44, left: 54 }

const valueToPlotY = (
  value: number,
  yMin: number,
  yMax: number,
  plotTop: number,
  plotHeight: number
) => {
  const range = yMax - yMin || 1
  return plotTop + ((yMax - value) / range) * plotHeight
}

const formatAxisValue = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1000) return value.toFixed(0)
  if (abs >= 100) return value.toFixed(1)
  return value.toFixed(2)
}

const formatShortDate = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })

const formatFullDate = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

/** Tarjeta con gráfico de línea (valor vs fecha del reporte) y resumen Alto/Prom/Bajo para un parámetro */
export function ParameterChartCard({
  param,
  data,
  limitLines = [],
  toleranceBand = null,
}: ParameterChartCardProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const limitValues = limitLines.map((line) => line.value)
  const dataValues = data.map((d) => d.value)
  const allValues = [...dataValues, ...limitValues]
  const dataMax = dataValues.length > 0 ? Math.max(...dataValues) : 0
  const dataMin = dataValues.length > 0 ? Math.min(...dataValues) : 0
  const avgValue =
    dataValues.length > 0 ? dataValues.reduce((sum, v) => sum + v, 0) / dataValues.length : 0

  const { yMin, yMax, yTicks, plotLeft, plotTop, plotWidth, plotHeight } = useMemo(() => {
    const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1
    const minVal = allValues.length > 0 ? Math.min(...allValues) : 0
    const span = maxVal - minVal || Math.abs(maxVal) * 0.1 || 1
    const min = minVal - span * 0.12
    const max = maxVal + span * 0.12
    const ticks = [min, (min + max) / 2, max]

    const left = MARGIN.left
    const top = MARGIN.top
    const width = CHART_WIDTH - MARGIN.left - MARGIN.right
    const height = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

    return { yMin: min, yMax: max, yTicks: ticks, plotLeft: left, plotTop: top, plotWidth: width, plotHeight: height }
  }, [allValues])

  const chartPoints = useMemo(
    () =>
      data.map((d, i) => {
        const x = plotLeft + (i / Math.max(data.length - 1, 1)) * plotWidth
        const y = valueToPlotY(d.value, yMin, yMax, plotTop, plotHeight)
        return { x, y, value: d.value, timestamp: d.timestamp }
      }),
    [data, plotLeft, plotWidth, yMin, yMax, plotTop, plotHeight]
  )

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return ""
    const baseY = plotTop + plotHeight
    return `M ${chartPoints[0].x} ${baseY} L ${chartPoints.map((p) => `${p.x},${p.y}`).join(" L ")} L ${chartPoints[chartPoints.length - 1].x} ${baseY} Z`
  }, [chartPoints, plotTop, plotHeight])

  const linePath = useMemo(
    () => (chartPoints.length > 0 ? `M ${chartPoints.map((p) => `${p.x},${p.y}`).join(" L ")}` : ""),
    [chartPoints]
  )

  const gradientId = `hist-gradient-${param.id.replace(/[^a-zA-Z0-9_-]/g, "")}`
  const bandId = `hist-band-${param.id.replace(/[^a-zA-Z0-9_-]/g, "")}`

  const xLabelIndices = useMemo(() => {
    if (chartPoints.length === 0) return []
    if (chartPoints.length <= 3) return chartPoints.map((_, i) => i)
    return [0, Math.floor(chartPoints.length / 2), chartPoints.length - 1]
  }, [chartPoints])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = chartContainerRef.current
      if (!el || chartPoints.length === 0) return
      const rect = el.getBoundingClientRect()
      const viewBoxX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH
      let nearestIdx = 0
      let nearestDist = Math.abs(chartPoints[0].x - viewBoxX)
      chartPoints.forEach((p, i) => {
        const dist = Math.abs(p.x - viewBoxX)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      })
      setActiveIndex(nearestIdx)
    },
    [chartPoints]
  )

  const handleMouseLeave = useCallback(() => setActiveIndex(null), [])

  const activePoint = activeIndex != null ? chartPoints[activeIndex] : null
  const activeData = activeIndex != null ? data[activeIndex] : null

  if (data.length === 0) {
    return (
      <Card className="h-full shadow-sm border border-border/60">
        <CardHeader className="py-2.5 px-3 border-b border-border/40 bg-muted/30">
          <div className="flex justify-between items-center gap-2">
            <h6 className="mb-0 text-sm font-semibold text-foreground truncate">{param.nombre}</h6>
            <span className="text-xs text-muted-foreground shrink-0">{param.unidad}</span>
          </div>
        </CardHeader>
        <CardContent className="py-6 px-3">
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            No hay datos en el rango seleccionado
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full shadow-sm border border-border/60 overflow-hidden">
      <CardHeader className="py-2.5 px-3 border-b border-border/40 bg-muted/30">
        <div className="flex justify-between items-center gap-2">
          <h6 className="mb-0 text-sm font-semibold text-foreground truncate">{param.nombre}</h6>
          <span className="text-xs text-muted-foreground shrink-0">{param.unidad}</span>
        </div>
      </CardHeader>
      <CardContent className="py-3 px-2 sm:px-3">
        <div
          ref={chartContainerRef}
          className="relative w-full cursor-crosshair select-none"
          style={{ height: `${CHART_HEIGHT}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label={`Gráfico histórico de ${param.nombre}`}
        >
          {activeData && activePoint && (
            <div
              className="absolute z-20 px-2.5 py-1.5 rounded-md shadow-md border border-border/60 bg-background/95 backdrop-blur-sm text-xs pointer-events-none"
              style={{
                left: `${Math.min(Math.max((activePoint.x / CHART_WIDTH) * 100, 8), 72)}%`,
                top: 6,
                minWidth: "7.5rem",
              }}
            >
              <div className="font-medium text-muted-foreground">
                {activeData.timestamp ? formatFullDate(activeData.timestamp) : "—"}
              </div>
              <div className="text-primary font-semibold tabular-nums">
                {activeData.value.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-muted-foreground font-normal">{param.unidad}</span>
              </div>
            </div>
          )}

          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="rounded-md border border-border/50 bg-gradient-to-b from-muted/20 to-background"
            style={{ display: "block" }}
            shapeRendering="geometricPrecision"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Área de trazado */}
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotWidth}
              height={plotHeight}
              fill="white"
              fillOpacity={0.55}
              rx={4}
            />

            {/* Rejilla horizontal */}
            {yTicks.map((tick, i) => {
              const y = valueToPlotY(tick, yMin, yMax, plotTop, plotHeight)
              return (
                <line
                  key={`grid-${i}`}
                  x1={plotLeft}
                  y1={y}
                  x2={plotLeft + plotWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}

            {/* Banda de rango aceptable */}
            {toleranceBand && (
              <rect
                x={plotLeft}
                y={valueToPlotY(toleranceBand.max, yMin, yMax, plotTop, plotHeight)}
                width={plotWidth}
                height={Math.max(
                  valueToPlotY(toleranceBand.min, yMin, yMax, plotTop, plotHeight) -
                    valueToPlotY(toleranceBand.max, yMin, yMax, plotTop, plotHeight),
                  1
                )}
                fill={`url(#${bandId})`}
                pointerEvents="none"
              />
            )}

            {/* Líneas de límite */}
            {limitLines.map((line) => {
              const y = valueToPlotY(line.value, yMin, yMax, plotTop, plotHeight)
              const strokeWidth = line.kind === "critical" ? 2 : 1.75
              return (
                <g key={`limit-${line.label}-${line.value}`}>
                  <line
                    x1={plotLeft}
                    y1={y}
                    x2={plotLeft + plotWidth}
                    y2={y}
                    stroke={line.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={line.strokeDasharray}
                    opacity={line.kind === "critical" ? 0.95 : 0.9}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={plotLeft + plotWidth + 6}
                    y={y + 3.5}
                    fontSize={9}
                    fill={line.color}
                    fontWeight={600}
                    textAnchor="start"
                  >
                    {formatAxisValue(line.value)}
                  </text>
                  <title>{`${line.label}: ${line.value.toFixed(2)} ${param.unidad}`}</title>
                </g>
              )
            })}

            {/* Área bajo la curva */}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

            {/* Línea de datos */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Crosshair en punto activo */}
            {activePoint && (
              <>
                <line
                  x1={activePoint.x}
                  y1={plotTop}
                  x2={activePoint.x}
                  y2={plotTop + plotHeight}
                  stroke="#2563eb"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.45}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={6}
                  fill="#2563eb"
                  fillOpacity={0.15}
                  stroke="none"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4.5}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}

            {/* Puntos de datos (sin activo) */}
            {chartPoints.map((point, i) => {
              if (activeIndex === i) return null
              return (
                <circle
                  key={`pt-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r={3.25}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                >
                  <title>
                    {point.timestamp
                      ? `${formatFullDate(point.timestamp)}: ${point.value.toFixed(2)} ${param.unidad}`
                      : `${point.value.toFixed(2)} ${param.unidad}`}
                  </title>
                </circle>
              )
            })}

            {/* Eje Y */}
            {yTicks.map((tick, i) => {
              const y = valueToPlotY(tick, yMin, yMax, plotTop, plotHeight)
              return (
                <text
                  key={`y-${i}`}
                  x={plotLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#6b7280"
                  fontWeight={500}
                >
                  {formatAxisValue(tick)}
                </text>
              )
            })}

            {/* Eje X */}
            {xLabelIndices.map((idx) => {
              const p = chartPoints[idx]
              if (!p?.timestamp) return null
              return (
                <text
                  key={`x-${idx}`}
                  x={p.x}
                  y={CHART_HEIGHT - 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6b7280"
                  fontWeight={500}
                >
                  {formatShortDate(p.timestamp)}
                </text>
              )
            })}

            {/* Marco del área de trazado */}
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke="#d1d5db"
              strokeWidth={1}
              rx={4}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center mt-2.5">
          <div className="py-2 px-1 rounded-md bg-emerald-50 border border-emerald-200/80">
            <div className="font-semibold text-sm text-emerald-900 tabular-nums">{dataMax.toFixed(2)}</div>
            <div className="text-[11px] text-emerald-700/80">Alto</div>
          </div>
          <div className="py-2 px-1 rounded-md bg-sky-50 border border-sky-200/80">
            <div className="font-semibold text-sm text-sky-900 tabular-nums">{avgValue.toFixed(2)}</div>
            <div className="text-[11px] text-sky-700/80">Prom</div>
          </div>
          <div className="py-2 px-1 rounded-md bg-rose-50 border border-rose-200/80">
            <div className="font-semibold text-sm text-rose-900 tabular-nums">{dataMin.toFixed(2)}</div>
            <div className="text-[11px] text-rose-700/80">Bajo</div>
          </div>
        </div>

        {limitLines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {toleranceBand && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                <span className="h-2 w-3 rounded-sm bg-emerald-400/50 border border-emerald-500/40" aria-hidden />
                Rango bien: {formatAxisValue(toleranceBand.min)} – {formatAxisValue(toleranceBand.max)}
              </span>
            )}
            {limitLines
              .filter((line) => line.kind === "critical")
              .map((line) => (
                <span
                  key={`legend-${line.label}-${line.value}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-800"
                >
                  <span
                    className="inline-block w-3 border-t-2 border-dashed"
                    style={{ borderColor: line.color }}
                    aria-hidden
                  />
                  {line.label}: {formatAxisValue(line.value)}
                </span>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
