"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/Navbar"
import { DebugPanel } from "@/components/debug-panel"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import { SensorTimeSeriesChart } from "@/components/SensorTimeSeriesChart"
import ProtectedRoute from "@/components/ProtectedRoute"
import MesureTable from "@/components/MesureTable"

// Interfaces
interface User {
  id: string
  username: string
  role: string
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

export default function ReportManager() {
  const router = useRouter()
  // Parámetros de fechas y URL para SensorTimeSeriesChart
  const startDate = "2025-04-04"
  const endDate   = "2025-06-04"
  const apiBase   = "http://localhost:4000"
  const { debugInfo, addDebugLog } = useDebugLogger()
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null

  // State
  const [users, setUsers] = useState<User[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [parameters, setParameters] = useState<Parameter[]>([])

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [parameterValues, setParameterValues] = useState<Record<string, { checked: boolean; value: number }>>({})
  // Determinar el parámetro seleccionado para el gráfico
  const selectedParameters = parameters.filter(param => parameterValues[param.id]?.checked);
  const variablefiltro = selectedParameters.length > 0 ? selectedParameters[0].nombre : "";
  const labelLeftText = selectedParameters.length > 0 ? `${selectedParameters[0].nombre} (${selectedParameters[0].unidad})` : "";
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch Users
  useEffect(() => {
    if (!token) {
      setError("Token de autenticación no encontrado. Por favor, inicie sesión.")
      return
    }
    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("http://localhost:4000/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to fetch users")
        }
        const data = await res.json()
        setUsers(data.usuarios || [])
        if (data.usuarios.length > 0 && !selectedUser) {
          const firstUser = data.usuarios[0]
          setSelectedUser(firstUser)
          handleSelectUser(firstUser.id)
        }
      } catch (e: any) {
        setError(`Error al cargar usuarios: ${e.message}`)
        addDebugLog("error", `Error al cargar usuarios: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token, addDebugLog])

  // Handlers for selection changes
  const handleSelectUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSelectedUser(user)
    setSelectedPlant(null)
    setSelectedSystem("")
    setPlants([])
    setSystems([])
    setParameters([])
    setParameterValues({})

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:4000/api/plantas/accesibles`, {
        headers: { Authorization: `Bearer ${token}`, "x-usuario-id": user.id },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar las plantas para el usuario.")
      }
      const data = await res.json()
      setPlants(data.plantas || [])
      addDebugLog("success", `Cargadas ${data.plantas?.length || 0} plantas para usuario ${user.username}`)
      if (data.plantas.length > 0) {
        const firstPlant = data.plantas[0]
        handleSelectPlant(firstPlant.id)
      } else {
        setSelectedPlant(null)
      }
    } catch (e: any) {
      setError(`Error al cargar plantas: ${e.message}`)
      addDebugLog("error", `Error al cargar plantas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlant = async (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId)
    if (!plant) return

    setSelectedPlant(plant)
    setSelectedSystem("")
    setSystems([])
    setParameters([])
    setParameterValues({})

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:4000/api/procesos/planta/${plant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los sistemas para la planta.")
      }
      const data = await res.json()
      setSystems(data.procesos || [])
      addDebugLog("success", `Cargados ${data.procesos?.length || 0} sistemas para planta ${plant.nombre}`)
      if (data.procesos.length > 0) {
        setSelectedSystem(data.procesos[0].id)
      }
    } catch (e: any) {
      setError(`Error al cargar sistemas: ${e.message}`)
      addDebugLog("error", `Error al cargar sistemas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchParameters = useCallback(async () => {
    if (!selectedSystem) {
      setParameters([])
      setParameterValues({})
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:4000/api/variables/proceso/${selectedSystem}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      setParameters(data.variables || [])
      addDebugLog("success", `Cargados ${data.variables?.length || 0} parámetros para sistema ${selectedSystem}`)
    } catch (e: any) {
      setError(`Error al cargar parámetros: ${e.message}`)
      addDebugLog("error", `Error al cargar parámetros: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedSystem, token, addDebugLog])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  const selectedPlantData = plants.find((p) => p.id === selectedPlant?.id)
  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  const handleParameterChange = (parameterId: string, field: "checked" | "value", value: boolean | number) => {
    setParameterValues((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        [field]: value,
      },
    }))
  }

  const handleSaveData = async () => {
    addDebugLog("info", "Guardando datos de parámetros")

    const selectedParams = Object.entries(parameterValues)
      .filter(([_, data]) => data.checked)
      .map(([id, data]) => ({ id, value: data.value }))

    try {
      // TODO: Implement real API call for saving parameter values
      // const response = await fetch('http://localhost:4000/api/variables/values', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     systemId: selectedSystem,
      //     parameters: selectedParams
      //   })
      // })

      addDebugLog("success", `Guardados ${selectedParams.length} parámetros`)
    } catch (error) {
      addDebugLog("error", `Error guardando datos: ${error}`)
    }
  }

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    const selectedParams = Object.entries(parameterValues)
      .filter(([_, data]) => data.checked)
      .map(([id, data]) => ({ id, value: data.value }))

    try {
      // TODO: Implement real API call for report generation
      // const response = await fetch('http://localhost:4000/api/reports/generate', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     plantId: selectedPlant?.id,
      //     systemId: selectedSystem,
      //     parameters: selectedParams
      //   })
      // })

      addDebugLog("success", "Reporte generado exitosamente")
      router.push("/dashboard")
    } catch (error) {
      addDebugLog("error", `Error generando reporte: ${error}`)
    }
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role="admin" />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestor de Reportes</h1>
            <p className="text-gray-600">Selecciona parámetros y genera reportes personalizados</p>
          </div>

          {/* User and Plant Selectors */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Selección de Usuario y Planta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Usuario</label>
                  <Select value={selectedUser?.id} onValueChange={handleSelectUser}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#f6f6f6] text-gray-900">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Planta</label>
                  <Select value={selectedPlant?.id} onValueChange={handleSelectPlant} disabled={!selectedUser}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar planta" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#f6f6f6] text-gray-900">
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Tabs */}
          {selectedPlantData && systems.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Sistemas de {selectedPlantData.nombre}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedSystem} onValueChange={setSelectedSystem}>
                  <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
                    {systems.map((system) => (
                      <TabsTrigger key={system.id} value={system.id}>
                        {system.nombre}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {systems.map((system) => (
                    <TabsContent key={system.id} value={system.id}>
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">{system.nombre}</h3>
                        <p className="text-gray-600 mb-4">{system.descripcion}</p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Parameters List */}
          {selectedSystemData && parameters.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Parámetros del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parameters.map((parameter) => (
                    <div key={parameter.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Checkbox
                        checked={parameterValues[parameter.id]?.checked || false}
                        onCheckedChange={(checked) => handleParameterChange(parameter.id, "checked", checked as boolean)}
                      />

                      <div className="flex-1">
                        <div className="font-medium">{parameter.nombre}</div>
                        <div className="text-sm text-gray-500">
                          Unidad: {parameter.unidad}
                        </div>
                      </div>

                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder="0"
                          value={parameterValues[parameter.id]?.value || ""}
                          onChange={(e) =>
                            handleParameterChange(parameter.id, "value", Number.parseFloat(e.target.value) || 0)
                          }
                          disabled={!parameterValues[parameter.id]?.checked}
                        />
                      </div>

                      <div className="text-sm text-gray-500 w-16">{parameter.unidad}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {selectedSystemData && parameters.length > 0 && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex space-x-4">
                  <Button onClick={handleSaveData} variant="outline">
                    💾 Guardar Datos
                  </Button>
                  <Button onClick={handleGenerateReport}>📊 Generar Reporte</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráfico de series de tiempo de sensores */}
          <div className="mb-6">
            {selectedParameters.length > 0 && selectedParameters.map(param => (
              <div key={param.id} className="mb-8">
                <MesureTable
                  variable={param.nombre}
                  startDate={startDate}
                  endDate={endDate}
                  apiBase={apiBase}
                  unidades={param.unidad}
                />
                <SensorTimeSeriesChart
                  variable={param.nombre}
                  startDate={startDate}
                  endDate={endDate}
                  apiBase={apiBase}
                  unidades={param.unidad}
                />
              </div>
            ))}
          </div>

          {/* <DebugPanel
            debugInfo={debugInfo}
            currentState={{
              plantsCount: plants.length,
              reportsCount: 0,
              dataLoading: loading,
              userRole: selectedUser?.role || "guest",
            }}
          /> */}
        </div>
      </div>
    </ProtectedRoute>
  )
}
