"use client"

import React, { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export interface ParameterChartDataPoint {
  timestamp: string
  value: number
}

interface ParameterChartCardProps {
  param: { id: string; nombre: string; unidad: string }
  data: ParameterChartDataPoint[]
}

/** Tarjeta con gráfico de línea (valor vs fecha del reporte) y resumen Alto/Prom/Bajo para un parámetro */
export function ParameterChartCard({ param, data }: ParameterChartCardProps) {
  // Todos los hooks deben estar al principio, antes de cualquier early return
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    point: ParameterChartDataPoint
    left: number
    top: number
  } | null>(null)

  // Calcular valores solo si hay datos, pero los hooks ya están declarados
  const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0
  const minValue = data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0
  const avgValue = data.length > 0 ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0
  const valueRange = maxValue - minValue || Math.abs(maxValue) * 0.1 || 1
  const adjustedMin = minValue - valueRange * 0.1
  const adjustedMax = maxValue + valueRange * 0.1
  const adjustedRange = adjustedMax - adjustedMin

  // Dimensiones más grandes para mejor visualización
  const padding = { top: 20, right: -140, bottom: 28, left: -122 }
  const chartHeight = 260
  const chartWidth = 150
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom

  const chartPoints = data.length > 0
    ? data.map((d, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * plotWidth
        const y = padding.top + ((adjustedMax - d.value) / adjustedRange) * plotHeight
        return { x, y, value: d.value, timestamp: d.timestamp }
      })
    : []

  const areaPath =
    chartPoints.length > 0
      ? `M ${chartPoints[0].x} ${chartHeight - padding.bottom} L ${chartPoints.map((p) => `${p.x},${p.y}`).join(" L ")} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight - padding.bottom} Z`
      : ""
  const linePath = chartPoints.length > 0 ? `M ${chartPoints.map((p) => `${p.x},${p.y}`).join(" L ")}` : ""

  const gradientId = `hist-gradient-${param.id}`

  // Los useCallback deben estar después de todos los otros hooks pero antes del early return
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = chartContainerRef.current
      if (!el || chartPoints.length === 0) return
      const rect = el.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const viewBoxX = (localX / rect.width) * chartWidth
      let nearestIdx = 0
      let nearestDist = Math.abs(chartPoints[0].x - viewBoxX)
      chartPoints.forEach((p, i) => {
        const d = Math.abs(p.x - viewBoxX)
        if (d < nearestDist) {
          nearestDist = d
          nearestIdx = i
        }
      })
      const point = data[nearestIdx]
      setTooltip({
        point,
        left: Math.min(localX + 12, rect.width - 140),
        top: Math.max(localY - 32, 4),
      })
    },
    [chartPoints, data, chartWidth]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  // Ahora sí podemos hacer el early return después de todos los hooks
  if (data.length === 0) {
    return (
      <Card className="h-full shadow-sm">
        <CardHeader className="py-2 px-3">
          <div className="flex justify-between items-center">
            <h6 className="mb-0 text-primary font-semibold">{param.nombre}</h6>
            <small className="text-muted">{param.unidad}</small>
          </div>
        </CardHeader>
        <CardContent className="py-3 px-3">
          <div className="flex items-center justify-center py-8 text-muted text-sm">
            No hay datos en el rango seleccionado
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="py-2 px-3">
        <div className="flex justify-between items-center">
          <h6 className="mb-0 text-primary font-semibold">{param.nombre}</h6>
          <small className="text-muted">{param.unidad}</small>
        </div>
      </CardHeader>
      <CardContent className="py-3 px-3">
        <div
          ref={chartContainerRef}
          className="mb-2 relative w-full cursor-crosshair"
          style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {tooltip && (
            <div
              className="absolute z-10 px-3 py-2 rounded-md shadow-lg border bg-white text-sm pointer-events-none"
              style={{
                left: tooltip.left,
                top: tooltip.top,
                minWidth: "120px",
              }}
            >
              <div className="font-medium text-gray-700">
                {tooltip.point.timestamp
                  ? new Date(tooltip.point.timestamp).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </div>
              <div className="text-primary font-semibold mt-0.5">
                {tooltip.point.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {param.unidad}
              </div>
            </div>
          )}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="border rounded bg-gray-50"
            style={{ display: "block", width: "100%", height: "100%" }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#007bff" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#007bff" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#007bff" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((percent) => {
              const y = padding.top + (percent / 100) * plotHeight
              return (
                <line
                  key={`grid-${percent}`}
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#f0f0f0"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                />
              )
            })}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#007bff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {chartPoints.map((point, i) => {
              const fechaLabel = point.timestamp
                ? new Date(point.timestamp).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : ""
              return (
                <g key={i}>
                  <title>{`${fechaLabel}: ${point.value.toFixed(2)} ${param.unidad}`}</title>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#007bff"
                    stroke="white"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                  />
                </g>
              )
            })}
            {[adjustedMin, (adjustedMin + adjustedMax) / 2, adjustedMax].map((val, i) => {
              const y = padding.top + ((adjustedMax - val) / adjustedRange) * plotHeight
              return (
                <text
                  key={`y-${i}`}
                  x={padding.left - 4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#374151"
                  fontWeight="500"
                >
                  {val.toFixed(2)}
                </text>
              )
            })}
            {chartPoints.length > 0 &&
              [0, Math.floor(chartPoints.length / 2), chartPoints.length - 1]
                .filter((i) => i >= 0 && i < chartPoints.length)
                .map((idx) => {
                  const p = chartPoints[idx]
                  const fechaLabel = p.timestamp
                    ? new Date(p.timestamp).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })
                    : ""
                  return (
                    <text
                      key={`x-${idx}`}
                      x={p.x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#374151"
                      fontWeight="500"
                    >
                      {fechaLabel}
                    </text>
                  )
                })}
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2">
          <div
            className="p-2 rounded shadow-sm"
            style={{ backgroundColor: "#d4edda", border: "1px solid #c3e6cb" }}
          >
            <div className="font-bold text-dark text-sm">{maxValue.toFixed(2)}</div>
            <div className="text-muted text-xs">Alto</div>
          </div>
          <div
            className="p-2 rounded shadow-sm"
            style={{ backgroundColor: "#cce5ff", border: "1px solid #b3d9ff" }}
          >
            <div className="font-bold text-dark text-sm">{avgValue.toFixed(2)}</div>
            <div className="text-muted text-xs">Prom</div>
          </div>
          <div
            className="p-2 rounded shadow-sm"
            style={{ backgroundColor: "#f8d7da", border: "1px solid #f5c6cb" }}
          >
            <div className="font-bold text-dark text-sm">{minValue.toFixed(2)}</div>
            <div className="text-muted text-xs">Bajo</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
