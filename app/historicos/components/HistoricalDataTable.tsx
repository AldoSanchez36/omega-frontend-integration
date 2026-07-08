"use client"

import { cn } from "@/lib/utils"

interface HistoricalParameter {
  id: string
  nombre: string
  unidad: string
}

interface HistoricalDateData {
  [key: string]:
    | { valor: number; unidad: string; comentarios?: string }
    | string
    | undefined
  comentarios_globales?: string
}

interface HistoricalDataTableProps<T extends HistoricalParameter = HistoricalParameter> {
  parameters: T[]
  dates: string[]
  dataByDate: Record<string, HistoricalDateData>
  highLowValues: Record<string, { alto: number; bajo: number }>
  averageValues: Record<string, number>
  getAcceptableRange: (parameter: T) => string
  getCellColor: (parameter: T, value: unknown) => string
  formatDate: (dateStr: string) => string
  formatNumber: (value: number | null | undefined) => string
  parseCommentDisplay: (value: unknown) => string
}

const STICKY_COL =
  "sticky left-0 z-10 border-r border-border/50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]"

function getToleranceCellClass(cellColor: string): string {
  switch (cellColor) {
    case "#C6EFCE":
      return "bg-emerald-100/80 text-emerald-950"
    case "#FFC6CE":
      return "bg-rose-100/90 text-rose-950 font-medium"
    case "#FFEB9C":
      return "bg-amber-100/90 text-amber-950 font-medium"
    default:
      return ""
  }
}

function StatCell({ value }: { value: string }) {
  return <span className="tabular-nums font-medium text-foreground/90">{value}</span>
}

export function HistoricalDataTable<T extends HistoricalParameter>({
  parameters,
  dates,
  dataByDate,
  highLowValues,
  averageValues,
  getAcceptableRange,
  getCellColor,
  formatDate,
  formatNumber,
  parseCommentDisplay,
}: HistoricalDataTableProps<T>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/80">Leyenda:</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          En rango
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
          Advertencia
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-800">
          <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden />
          Fuera de rango
        </span>
      </div>

      <div className="rounded-lg border border-border/60 bg-background overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full min-w-max text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-800 text-white">
                <th
                  className={cn(
                    STICKY_COL,
                    "z-30 bg-slate-800 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide min-w-[6.5rem]"
                  )}
                >
                  Parámetros
                </th>
                {parameters.map((param) => (
                  <th
                    key={param.id}
                    className="px-2 py-2.5 text-center text-[11px] font-semibold min-w-[4.5rem] border-l border-white/10"
                  >
                    <div className="leading-tight">{param.nombre}</div>
                    {param.unidad?.trim() && (
                      <div className="mt-0.5 text-[10px] font-normal text-slate-300">
                        ({param.unidad})
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold min-w-[8rem] border-l border-white/10">
                  Comentarios
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Resumen estadístico */}
              <tr className="bg-emerald-50/90 border-b border-emerald-100">
                <td
                  className={cn(
                    STICKY_COL,
                    "bg-emerald-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-900"
                  )}
                >
                  Alto
                </td>
                {parameters.map((param) => (
                  <td key={param.id} className="px-2 py-2 text-center border-l border-emerald-100/80">
                    <StatCell value={highLowValues[param.id]?.alto.toFixed(2) ?? "—"} />
                  </td>
                ))}
                <td className="px-3 py-2 text-muted-foreground border-l border-emerald-100/80">—</td>
              </tr>

              <tr className="bg-rose-50/90 border-b border-rose-100">
                <td
                  className={cn(
                    STICKY_COL,
                    "bg-rose-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-900"
                  )}
                >
                  Bajo
                </td>
                {parameters.map((param) => (
                  <td key={param.id} className="px-2 py-2 text-center border-l border-rose-100/80">
                    <StatCell value={highLowValues[param.id]?.bajo.toFixed(2) ?? "—"} />
                  </td>
                ))}
                <td className="px-3 py-2 text-muted-foreground border-l border-rose-100/80">—</td>
              </tr>

              <tr className="bg-sky-50/90 border-b border-sky-100">
                <td
                  className={cn(
                    STICKY_COL,
                    "bg-sky-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-sky-900"
                  )}
                >
                  Promedio
                </td>
                {parameters.map((param) => (
                  <td key={param.id} className="px-2 py-2 text-center border-l border-sky-100/80">
                    <StatCell
                      value={
                        averageValues[param.id] && averageValues[param.id] > 0
                          ? averageValues[param.id].toFixed(2)
                          : "—"
                      }
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-muted-foreground border-l border-sky-100/80">—</td>
              </tr>

              {/* Rangos aceptables */}
              <tr className="bg-slate-100 border-b-2 border-slate-200">
                <td
                  className={cn(
                    STICKY_COL,
                    "bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                  )}
                >
                  Fecha / Rangos
                </td>
                {parameters.map((param) => (
                  <td
                    key={param.id}
                    className="px-2 py-2 text-center text-[11px] font-medium text-slate-700 border-l border-slate-200/80"
                  >
                    {getAcceptableRange(param)}
                  </td>
                ))}
                <td className="px-3 py-2 text-muted-foreground border-l border-slate-200/80">—</td>
              </tr>

              {/* Datos por fecha */}
              {dates.map((fecha, index) => {
                const dateData = dataByDate[fecha]
                const isEven = index % 2 === 0
                const rowBg = isEven ? "bg-white" : "bg-slate-50/60"

                return (
                  <tr
                    key={fecha}
                    className={cn("border-b border-border/40 transition-colors hover:bg-muted/40", rowBg)}
                  >
                    <td
                      className={cn(
                        STICKY_COL,
                        rowBg,
                        "px-3 py-2 text-[11px] font-semibold text-foreground whitespace-nowrap"
                      )}
                    >
                      {formatDate(fecha)}
                    </td>
                    {parameters.map((param) => {
                      const raw = dateData[param.id]
                      const valor =
                        raw && typeof raw === "object" && "valor" in raw ? raw.valor : undefined
                      const cellColor = getCellColor(param, valor)
                      const toneClass = getToleranceCellClass(cellColor)

                      return (
                        <td
                          key={param.id}
                          className={cn(
                            "px-2 py-2 text-center border-l border-border/30 tabular-nums",
                            toneClass
                          )}
                        >
                          {formatNumber(valor)}
                        </td>
                      )
                    })}
                    <td
                      className={cn(
                        "px-3 py-2 text-[11px] text-muted-foreground border-l border-border/30 max-w-[12rem] truncate",
                        rowBg
                      )}
                      title={parseCommentDisplay(dateData.comentarios_globales)}
                    >
                      {parseCommentDisplay(dateData.comentarios_globales)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
