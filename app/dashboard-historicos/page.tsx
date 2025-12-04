"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"
import ReactSelect from 'react-select'

import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { authService } from "@/services/authService"
import { useUserAccess } from "@/hooks/useUserAccess"

// Interfaces
interface User {
  id: string
  username: string
  email?: string
  puesto?: string
  role?: string
  verificado?: boolean
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
    comentarios_globales?: string
  }
}

export default function HistoricosPage() {
  const router = useRouter()
  const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null

  // Use the reusable hook for user access
  const {
    users,
    plants,
    systems,
    selectedUser,
    selectedPlant,
    selectedSystem,
    userRole,
    loading,
    error,
    setSelectedSystem,
    handleSelectUser,
    handleSelectPlant
  } = useUserAccess(token)

  // Local state for conditional plants/users
  const [displayedPlants, setDisplayedPlants] = useState<Plant[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);

  // Estados para rango de fechas
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Estados para datos históricos
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [tolerances, setTolerances] = useState<Tolerance[]>([])
  const [historicalData, setHistoricalData] = useState<HistoricalDataByDate>({})
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState<string | null>(null)

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

  // Load all plants if no user selected
  useEffect(() => {
    async function loadPlants() {
      if (!selectedUser) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/plantas/all`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setDisplayedPlants(data.plantas || data);
          } else if (res.status === 401) {
            authService.logout();
            localStorage.removeItem('Organomex_user');
            router.push('/logout');
            return;
          }
        } catch (err) {
          console.error('Error al cargar todas las plantas:', err);
          setDisplayedPlants([]);
        }
      } else {
        setDisplayedPlants(plants);
      }
    }
    loadPlants();
  }, [selectedUser, plants, token, router]);

  // Load users
  useEffect(() => {
    async function loadUsers() {
      if (selectedPlant) {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USERS_BY_PLANT(selectedPlant.nombre)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setDisplayedUsers(data.usuarios || data);
          } else if (res.status === 401) {
            authService.logout();
            localStorage.removeItem('Organomex_user');
            router.push('/logout');
            return;
          }
        } catch (err) {
          console.error('Error al cargar usuarios por planta:', err);
          setDisplayedUsers([]);
        }
      } else {
        setDisplayedUsers(users);
      }
    }
    loadUsers();
  }, [selectedPlant, users, token, router]);

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
  }, [selectedSystem, token, router])

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

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    if (!selectedSystem || !startDate || !endDate || parameters.length === 0) {
      setHistoricalData({})
      return
    }

    setHistoricalLoading(true)
    setHistoricalError(null)

    try {
      const systemData = systems.find(s => s.id === selectedSystem)
      if (!systemData) return

      // Obtener todas las mediciones del proceso
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS_BY_PROCESS(systemData.nombre)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('Organomex_token');
          localStorage.removeItem('Organomex_user');
          router.push('/logout');
          return;
        }
        throw new Error("No se pudieron cargar las mediciones históricas.")
      }

      const data = await res.json()
      const measurements: HistoricalMeasurement[] = data.mediciones || []

      // Filtrar por rango de fechas
      const filteredMeasurements = measurements.filter((m: HistoricalMeasurement) => {
        const fecha = new Date(m.fecha)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return fecha >= start && fecha <= end
      })

      // Organizar datos por fecha y variable
      const organizedData: HistoricalDataByDate = {}

      filteredMeasurements.forEach((measurement: HistoricalMeasurement) => {
        const fechaStr = new Date(measurement.fecha).toISOString().split('T')[0]
        
        if (!organizedData[fechaStr]) {
          organizedData[fechaStr] = {}
        }

        organizedData[fechaStr][measurement.variable_id] = {
          valor: measurement.valor,
          unidad: measurement.unidad,
          comentarios: measurement.comentarios
        }

        // Si hay comentarios, guardarlos como comentarios globales de la fecha
        if (measurement.comentarios && !organizedData[fechaStr].comentarios_globales) {
          organizedData[fechaStr].comentarios_globales = measurement.comentarios
        }
      })

      setHistoricalData(organizedData)
    } catch (e: any) {
      setHistoricalError(`Error al cargar datos históricos: ${e.message}`)
      console.error(e)
    } finally {
      setHistoricalLoading(false)
    }
  }, [selectedSystem, startDate, endDate, parameters, systems, token, router])

  useEffect(() => {
    if (selectedSystem && startDate && endDate && parameters.length > 0) {
      fetchHistoricalData()
    }
  }, [fetchHistoricalData])

  // Custom handlers
  const handleSelectUserWithReset = useCallback(async (userId: string) => {
    setParameters([])
    setHistoricalData({})
    await handleSelectUser(userId)
  }, [handleSelectUser])

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
        .map(dateData => dateData[param.id]?.valor)
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

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
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
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Históricos de Reportes</h1>
            <p className="text-gray-600">Consulta el historial de reportes por sistema y rango de fechas</p>
          </div>

          {/* Selectores */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Selección de Cliente, Planta y Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cliente</label>
                  <ReactSelect
                    options={displayedUsers.map((user) => ({ value: user.id, label: user.username }))}
                    value={
                      selectedUser
                        ? { value: selectedUser.id, label: selectedUser.username }
                        : null
                    }
                    onChange={(option) => handleSelectUserWithReset(option ? option.value : '')}
                    placeholder="Seleccionar cliente"
                    isClearable
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Planta</label>
                  <ReactSelect
                    options={displayedPlants.map((plant) => ({ value: plant.id, label: plant.nombre }))}
                    value={
                      selectedPlant
                        ? { value: selectedPlant.id, label: selectedPlant.nombre }
                        : null
                    }
                    onChange={(option) => handleSelectPlantWithReset(option ? option.value : '')}
                    placeholder="Seleccionar planta"
                    isClearable
                    isDisabled={!selectedUser}
                    className="w-full"
                  />
                </div>
              </div>

              {selectedPlantData && systems.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Sistema</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {systems.map((system) => (
                      <button
                        key={system.id}
                        onClick={() => handleSystemChange(system.id)}
                        className={`px-4 py-2 text-sm font-medium rounded border ${
                          selectedSystem === system.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {system.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de rango de fechas */}
              {selectedSystem && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-blue-800">Rango de Fechas</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-blue-700 mb-1">
                        Fecha Inicio
                      </label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-blue-700 mb-1">
                        Fecha Fin
                      </label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla Histórica */}
          {selectedSystem && parameters.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Historial de Reportes - {selectedSystemData?.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 bg-white text-sm">
                      <thead>
                        <tr className="bg-blue-800 text-white">
                          <th className="border px-3 py-2 text-left font-semibold sticky left-0 bg-blue-800 z-10">
                            PARAMETROS
                          </th>
                          {parameters.map((param) => (
                            <th key={param.id} className="border px-3 py-2 text-center font-semibold">
                              {param.nombre}
                              <br />
                              <span className="text-xs font-normal">({param.unidad})</span>
                            </th>
                          ))}
                          <th className="border px-3 py-2 text-left font-semibold">COMENTARIOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Fila ALTO */}
                        <tr className="bg-green-100">
                          <td className="border px-3 py-2 font-semibold sticky left-0 bg-green-100 z-10">
                            ALTO
                          </td>
                          {parameters.map((param) => (
                            <td key={param.id} className="border px-3 py-2 text-center">
                              {highLowValues[param.id]?.alto.toFixed(2) || "—"}
                            </td>
                          ))}
                          <td className="border px-3 py-2">—</td>
                        </tr>
                        {/* Fila BAJO */}
                        <tr className="bg-green-100">
                          <td className="border px-3 py-2 font-semibold sticky left-0 bg-green-100 z-10">
                            BAJO
                          </td>
                          {parameters.map((param) => (
                            <td key={param.id} className="border px-3 py-2 text-center">
                              {highLowValues[param.id]?.bajo.toFixed(2) || "—"}
                            </td>
                          ))}
                          <td className="border px-3 py-2">—</td>
                        </tr>
                        {/* Fila RANGOS */}
                        <tr className="bg-blue-800 text-white">
                          <td className="border px-3 py-2 font-semibold sticky left-0 bg-blue-800 z-10">
                            FECHA/RANGOS
                          </td>
                          {parameters.map((param) => (
                            <td key={param.id} className="border px-3 py-2 text-center">
                              {getAcceptableRange(param.id)}
                            </td>
                          ))}
                          <td className="border px-3 py-2">—</td>
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
                              <td className={`border px-3 py-2 font-medium sticky left-0 z-10 ${
                                isEven ? "bg-green-50" : "bg-pink-50"
                              }`}>
                                {formatDate(fecha)}
                              </td>
                              {parameters.map((param) => {
                                const value = dateData[param.id]
                                const valor = value?.valor
                                const isOutOfRange = valor !== undefined && isValueOutOfRange(param.id, valor)
                                
                                return (
                                  <td
                                    key={param.id}
                                    className={`border px-3 py-2 text-center ${
                                      isOutOfRange ? "bg-yellow-300 font-semibold" : ""
                                    }`}
                                  >
                                    {valor !== undefined ? valor.toFixed(2) : "—"}
                                  </td>
                                )
                              })}
                              <td className={`border px-3 py-2 ${
                                isEven ? "bg-green-50" : "bg-pink-50"
                              }`}>
                                {dateData.comentarios_globales || "—"}
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
      </div>
    </ProtectedRoute>
  )
}

