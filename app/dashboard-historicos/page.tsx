"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"

import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { authService } from "@/services/authService"
import { useEmpresasAccess } from "@/hooks/useEmpresasAccess"
import TabbedSelectorHistoricos from "./components/TabbedSelectorHistoricos"
import { ParameterChartCard } from "./components/ParameterChartCard"
import ScrollArrow from "../dashboard-reportmanager/components/ScrollArrow"

// Interfaces
interface Empresa {
  id: string
  nombre: string
  descripcion?: string
}

interface Plant {
  id: string
  nombre: string
  location?: string
  description?: string
  clientId?: string
  clientName?: string
  status?: string
  createdAt?: string
  mensaje_cliente?: string
  dirigido_a?: string
}

interface System {
  id: string
  nombre: string
  descripcion: string
  planta_id: string
  type?: string
  status?: string
}

interface Parameter {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
  value?: number
  minValue?: number
  maxValue?: number
}

interface Tolerance {
  id: string
  variable_id: string
  proceso_id: string
  limite_min?: number
  limite_max?: number
  unidad?: string
}

interface HistoricalMeasurement {
  fecha: string
  variable_id: string
  variable_nombre: string
  valor: number
  unidad: string
  sistema?: string
  comentarios?: string
  proceso_id: string
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

export default function HistoricosPage() {
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null

  // Use the reusable hook for empresas access
  const {
    empresas,
    plants,
    systems,
    selectedEmpresa,
    selectedPlant,
    selectedSystem,
    userRole,
    loading,
    error,
    setSelectedSystem,
    handleSelectEmpresa,
    handleSelectPlant
  } = useEmpresasAccess(token, {
    autoSelectFirstPlant: false,
    autoSelectFirstSystem: false,
  })

  // Local state for conditional plants/empresas
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
  const [displayedEmpresas, setDisplayedEmpresas] = useState<Empresa[]>([]);

  // Estados para rango de fechas
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Estados para datos históricos
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [tolerances, setTolerances] = useState<Tolerance[]>([])
  const [historicalData, setHistoricalData] = useState<HistoricalDataByDate>({})
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState<string | null>(null)

  // Orden de parámetros por planta
  const [plantOrderVariables, setPlantOrderVariables] = useState<{ id: string; nombre: string; orden: number }[]>([])

  // Calcular fechas por defecto (últimos 12 meses)
  useEffect(() => {
    const today = new Date()
    const endDateDefault = today.toISOString().split('T')[0]
    const startDateDefault = new Date(today)
    startDateDefault.setMonth(today.getMonth() - 12)
    const startDateDefaultStr = startDateDefault.toISOString().split('T')[0]
    
    setStartDate(startDateDefaultStr)
    setEndDate(endDateDefault)
  }, [])

  // Load all plants if no empresa selected
  useEffect(() => {
    let cancelled = false;
    async function loadPlants() {
      if (!selectedEmpresa) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/plantas/all`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setDisplayedPlants(data.plantas || data);
            }
          } else if (res.status === 401) {
            if (!cancelled) {
              authService.logout();
              localStorage.removeItem('Organomex_user');
              router.push('/logout');
            }
            return;
          }
        } catch (err) {
          if (!cancelled) {
            console.error('Error al cargar todas las plantas:', err);
            setDisplayedPlants([]);
          }
        }
      } else {
        if (!cancelled) {
          console.log('🔄 [dashboard-historicos] Updating displayedPlants from hook:', plants.length, 'plants')
          setDisplayedPlants(plants);
        }
      }
    }
    loadPlants();
    return () => {
      cancelled = true;
    };
  }, [selectedEmpresa, plants, token]);

  // Load empresas - siempre mostrar todas las empresas disponibles
  useEffect(() => {
    setDisplayedEmpresas(empresas);
  }, [empresas]);

  // Fetch parameters when system is selected
  const fetchParameters = useCallback(async () => {
    if (!selectedSystem) {
      setParameters([])
      return
    }
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystem)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('Organomex_token');
          localStorage.removeItem('Organomex_user');
          router.push('/logout');
          return;
        }
        throw new Error("No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      setParameters(data.variables || [])
    } catch (e: any) {
      console.error(`Error al cargar parámetros: ${e.message}`)
    }
  }, [selectedSystem, token])

  // Fetch tolerances
  const fetchTolerances = useCallback(async () => {
    if (!selectedSystem || parameters.length === 0) {
      setTolerances([])
      return
    }
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const toleranceData = Array.isArray(data) ? data : data.tolerancias || []
        const systemTolerances = toleranceData.filter((tol: Tolerance) => 
          tol.proceso_id === selectedSystem
        )
        setTolerances(systemTolerances)
      }
    } catch (error) {
      console.error('Error loading tolerances:', error)
    }
  }, [selectedSystem, parameters, token])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  useEffect(() => {
    fetchTolerances()
  }, [fetchTolerances])

  // Cargar orden de variables de la planta
  useEffect(() => {
    if (!selectedPlant?.id || !token) {
      setPlantOrderVariables([])
      return
    }
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(selectedPlant.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && Array.isArray(data.variables)) {
          setPlantOrderVariables(data.variables)
        } else {
          setPlantOrderVariables([])
        }
      })
      .catch(() => { if (!cancelled) setPlantOrderVariables([]) })
    return () => { cancelled = true }
  }, [selectedPlant?.id, token])

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

  // Fetch historical data desde reportes.datos (columna JSON) en lugar de tabla mediciones
  const fetchHistoricalData = useCallback(async () => {
    if (!selectedSystem || !startDate || !endDate || parameters.length === 0) {
      setHistoricalData({})
      return
    }

    setHistoricalLoading(true)
    setHistoricalError(null)

    try {
      const systemData = systems.find((s) => s.id === selectedSystem)
      if (!systemData) return

      // Obtener reportes del usuario (misma API que dashboard)
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
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
      const reportes: any[] = data.reportes || []

      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      // Filtrar reportes por planta del sistema y rango de fechas
      const reportesFiltrados = reportes.filter((report: any) => {
        const plantaId = report.planta_id || report.datos?.plant?.id
        if (plantaId !== systemData.planta_id) return false

        const fechaReporte = report.datos?.fecha || report.fecha || report.created_at
        if (!fechaReporte) return false

        const fecha = new Date(fechaReporte)
        return !isNaN(fecha.getTime()) && fecha >= start && fecha <= end
      })

      // Construir organizedData desde reportes.datos.parameters[systemName][paramName]
      const organizedData: HistoricalDataByDate = {}

      reportesFiltrados.forEach((report: any) => {
        const datos = report.datos || report.reportSelection || {}
        const fechaReporte = datos.fecha || report.fecha || report.created_at
        const fechaStr =
          typeof fechaReporte === "string"
            ? fechaReporte.split("T")[0]
            : new Date(fechaReporte).toISOString().split("T")[0]

        if (!organizedData[fechaStr]) {
          organizedData[fechaStr] = {}
        }

        const paramsForSystem = datos.parameters?.[systemData.nombre] || {}
        const parameterComments = datos.parameterComments || {}

        parameters.forEach((param) => {
          const paramData = paramsForSystem[param.nombre]
          const valor = paramData?.valor ?? paramData?.value
          if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return

          organizedData[fechaStr][param.id] = {
            valor: Number(valor),
            unidad: paramData?.unidad ?? param.unidad ?? "",
            comentarios: parameterComments[param.nombre] ?? parameterComments[param.id] ?? datos.comentarios ?? "",
          }
        })

        if (datos.comentarios != null && datos.comentarios !== "" && !organizedData[fechaStr].comentarios_globales) {
          const raw = datos.comentarios
          const normalized =
            typeof raw === "string" && raw.trim().startsWith("{")
              ? (() => {
                  try {
                    const p = JSON.parse(raw) as { global?: string }
                    return typeof p?.global === "string" ? p.global : raw
                  } catch {
                    return raw
                  }
                })()
              : typeof raw === "object" && raw !== null && "global" in raw && typeof (raw as { global?: string }).global === "string"
                ? (raw as { global: string }).global
                : String(raw)
          organizedData[fechaStr].comentarios_globales = normalized
        }
      })

      setHistoricalData(organizedData)
    } catch (e: any) {
      setHistoricalError(`Error al cargar datos históricos: ${e.message}`)
      console.error(e)
    } finally {
      setHistoricalLoading(false)
    }
  }, [selectedSystem, startDate, endDate, parameters, systems, token])

  useEffect(() => {
    if (selectedSystem && startDate && endDate && parameters.length > 0) {
      fetchHistoricalData()
    }
  }, [fetchHistoricalData])

  // Custom handlers
  const handleSelectEmpresaWithReset = useCallback(async (empresaId: string) => {
    setParameters([])
    setHistoricalData({})
    await handleSelectEmpresa(empresaId)
  }, [handleSelectEmpresa])

  const handleSelectPlantWithReset = useCallback(async (plantId: string) => {
    setParameters([])
    setHistoricalData({})
    await handleSelectPlant(plantId)
  }, [handleSelectPlant])

  const handleSystemChange = useCallback((systemId: string) => {
    setHistoricalData({})
    setSelectedSystem(systemId)
  }, [setSelectedSystem])

  // Helper functions para obtener valores de tolerancia
  const getToleranceForParameter = (parameterId: string): Tolerance | undefined => {
    return tolerances.find(tol => tol.variable_id === parameterId)
  }

  const getMinMaxForParameter = (parameterId: string): { min: number | undefined, max: number | undefined } => {
    const tolerance = getToleranceForParameter(parameterId)
    return {
      min: tolerance?.limite_min,
      max: tolerance?.limite_max
    }
  }

  // Calcular valores ALTO y BAJO para cada parámetro
  const getHighLowValues = () => {
    const highLow: { [key: string]: { alto: number, bajo: number } } = {}
    
    parameters.forEach(param => {
      const values = Object.values(historicalData)
        .map(dateData => {
          const paramData = dateData[param.id]
          return paramData && typeof paramData === 'object' && 'valor' in paramData ? paramData.valor : undefined
        })
        .filter((val): val is number => val !== undefined)
      
      if (values.length > 0) {
        highLow[param.id] = {
          alto: Math.max(...values),
          bajo: Math.min(...values)
        }
      } else {
        highLow[param.id] = { alto: 0, bajo: 0 }
      }
    })
    
    return highLow
  }

  const highLowValues = getHighLowValues()

  // Calcular valores PROMEDIO para cada parámetro
  const getAverageValues = () => {
    const averages: { [key: string]: number } = {}
    
    parameters.forEach(param => {
      const values = Object.values(historicalData)
        .map(dateData => {
          const paramData = dateData[param.id]
          return paramData && typeof paramData === 'object' && 'valor' in paramData ? paramData.valor : undefined
        })
        .filter((val): val is number => val !== undefined)
      
      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + val, 0)
        averages[param.id] = sum / values.length
      } else {
        averages[param.id] = 0
      }
    })
    
    return averages
  }

  const averageValues = getAverageValues()

  // Verificar si un valor está fuera de rango
  const isValueOutOfRange = (parameterId: string, value: number): boolean => {
    const { min, max } = getMinMaxForParameter(parameterId)
    if (min !== undefined && value < min) return true
    if (max !== undefined && value > max) return true
    return false
  }

  // Obtener rango aceptable para un parámetro
  const getAcceptableRange = (parameterId: string): string => {
    const { min, max } = getMinMaxForParameter(parameterId)
    if (min !== undefined && max !== undefined) {
      return `${min} - ${max}`
    } else if (min !== undefined) {
      return `Min ${min}`
    } else if (max !== undefined) {
      return `Max ${max}`
    }
    return "—"
  }

  // Ordenar fechas
  const sortedDates = Object.keys(historicalData).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  )

  // Serie por parámetro para los gráficos: valor vs fecha del reporte (solo sistema seleccionado)
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

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  // Extraer texto de comentario: si viene como JSON {"global":"..."} mostrar solo el valor, sino el string directo
  const parseCommentDisplay = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "object" && value !== null && "global" in value && typeof (value as { global?: string }).global === "string") {
      return (value as { global: string }).global
    }
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed) as { global?: string }
          if (typeof parsed?.global === "string") return parsed.global
        } catch {
          /* no es JSON válido, devolver tal cual */
        }
      }
      return trimmed || "—"
    }
    return String(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const selectedPlantData = plants.find((p) => p.id === selectedPlant?.id)
  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />
        <div className="max-w-[1600px] mx-auto py-6 px-2 sm:px-4 lg:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Históricos de Reportes</h1>
            <p className="text-gray-600">Consulta el historial de reportes por sistema y rango de fechas</p>
          </div>

          {/* Selectores con pestañas */}
          <TabbedSelectorHistoricos
            displayedEmpresas={displayedEmpresas}
            displayedPlants={selectedEmpresa ? plants : displayedPlants}
            systems={systems}
            selectedEmpresa={selectedEmpresa}
            selectedPlant={selectedPlant}
            selectedSystem={selectedSystem}
            selectedSystemData={selectedSystemData}
            handleSelectEmpresa={handleSelectEmpresaWithReset}
            handleSelectPlant={handleSelectPlantWithReset}
            setSelectedSystem={handleSystemChange}
            plantName={selectedPlantData?.nombre || ""}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          {/* Gráficos por parámetro del sistema seleccionado (entre filtros y tabla) */}
          {selectedSystem && parameters.length > 0 && !historicalLoading && !historicalError && sortedDates.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Gráficos por parámetro - {selectedSystemData?.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedParameters.map((param) => (
                    <ParameterChartCard
                      key={param.id}
                      param={{ id: param.id, nombre: param.nombre, unidad: param.unidad }}
                      data={chartSeriesByParam[param.id] ?? []}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla Histórica */}
          {selectedSystem && parameters.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Historial de Reportes - {selectedSystemData?.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                {historicalLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : historicalError ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-700">{historicalError}</p>
                  </div>
                ) : sortedDates.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No se encontraron datos históricos para el rango de fechas seleccionado.
                  </div>
                ) : (
                  <div className="w-full">
                    <table className="w-full border border-gray-300 bg-white text-xs table-fixed">
                      <thead>
                        <tr className="bg-blue-800 text-white">
                          <th className="border px-2 py-2 text-left font-semibold w-24">
                            PARAMETROS
                          </th>
                          {sortedParameters.map((param) => (
                            <th key={param.id} className="border px-1 py-2 text-center font-semibold">
                              <div className="text-xs">{param.nombre}</div>
                              <div className="text-xs font-normal">({param.unidad})</div>
                            </th>
                          ))}
                          <th className="border px-2 py-2 text-left font-semibold w-32">COMENTARIOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Fila ALTO */}
                        <tr className="bg-green-100">
                          <td className="border px-2 py-2 font-semibold bg-green-100">
                            ALTO
                          </td>
                          {sortedParameters.map((param) => (
                            <td key={param.id} className="border px-1 py-2 text-center text-xs">
                              {highLowValues[param.id]?.alto.toFixed(2) || "—"}
                            </td>
                          ))}
                          <td className="border px-2 py-2 text-xs">—</td>
                        </tr>
                        {/* Fila BAJO */}
                        <tr className="bg-green-100">
                          <td className="border px-2 py-2 font-semibold bg-green-100">
                            BAJO
                          </td>
                          {sortedParameters.map((param) => (
                            <td key={param.id} className="border px-1 py-2 text-center text-xs">
                              {highLowValues[param.id]?.bajo.toFixed(2) || "—"}
                            </td>
                          ))}
                          <td className="border px-2 py-2 text-xs">—</td>
                        </tr>
                        {/* Fila PROMEDIO */}
                        <tr className="bg-green-100">
                          <td className="border px-2 py-2 font-semibold bg-green-100">
                            PROMEDIO
                          </td>
                          {sortedParameters.map((param) => (
                            <td key={param.id} className="border px-1 py-2 text-center text-xs">
                              {averageValues[param.id] && averageValues[param.id] > 0 
                                ? averageValues[param.id].toFixed(2) 
                                : "—"}
                            </td>
                          ))}
                          <td className="border px-2 py-2 text-xs">—</td>
                        </tr>
                        {/* Fila RANGOS */}
                        <tr className="bg-blue-800 text-white">
                          <td className="border px-2 py-2 font-semibold bg-blue-800">
                            FECHA/RANGOS
                          </td>
                          {sortedParameters.map((param) => (
                            <td key={param.id} className="border px-1 py-2 text-center text-xs">
                              {getAcceptableRange(param.id)}
                            </td>
                          ))}
                          <td className="border px-2 py-2 text-xs">—</td>
                        </tr>
                        {/* Filas de datos por fecha */}
                        {sortedDates.map((fecha, index) => {
                          const dateData = historicalData[fecha]
                          const isEven = index % 2 === 0
                          return (
                            <tr
                              key={fecha}
                              className={isEven ? "bg-green-50" : "bg-pink-50"}
                            >
                              <td className={`border px-2 py-2 font-medium text-xs ${
                                isEven ? "bg-green-50" : "bg-pink-50"
                              }`}>
                                {formatDate(fecha)}
                              </td>
                              {sortedParameters.map((param) => {
                                const value = dateData[param.id]
                                const valor = value && typeof value === 'object' && 'valor' in value ? value.valor : undefined
                                const isOutOfRange = valor !== undefined && isValueOutOfRange(param.id, valor)
                                
                                return (
                                  <td
                                    key={param.id}
                                    className={`border px-1 py-2 text-center text-xs ${
                                      isOutOfRange ? "bg-yellow-300 font-semibold" : ""
                                    }`}
                                  >
                                    {valor !== undefined ? valor.toFixed(2) : "—"}
                                  </td>
                                )
                              })}
                              <td className={`border px-2 py-2 text-xs ${
                                isEven ? "bg-green-50" : "bg-pink-50"
                              }`}>
                                {parseCommentDisplay(dateData.comentarios_globales)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedSystem && parameters.length === 0 && !historicalLoading && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  No hay parámetros disponibles para este sistema.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        <ScrollArrow />
      </div>
    </ProtectedRoute>
  )
}

