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
import { getTolerancias, createTolerancia, updateTolerancia } from "@/services/httpService"

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

// Componente para ingreso de mediciones por parámetro seleccionado
import { useRef } from "react"

function MedicionInputBox({ parameter, userId, plantId, procesoId, sistemas, onDataChange }: {
  parameter: any,
  userId?: string,
  plantId?: string,
  procesoId?: string,
  sistemas: string[],
  onDataChange?: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void
}) {
  const [fecha, setFecha] = useState<string>("")
  const [comentarios, setComentarios] = useState<string>("")
  const [tab, setTab] = useState<string>(sistemas[0] || "S01")
  const [valores, setValores] = useState<{ [sistema: string]: string }>({})
  const [localSistemas, setLocalSistemas] = useState<string[]>(sistemas)
  const prevDataRef = useRef<{ fecha: string; comentarios: string; valores: { [sistema: string]: string } }>({ fecha: "", comentarios: "", valores: {} })
  // Removed unused state variables

  // Sincronizar localSistemas si cambia el prop sistemas
  useEffect(() => {
    setLocalSistemas(sistemas)
    if (!sistemas.includes(tab)) setTab(sistemas[0] || "S01")
  }, [sistemas])

  const handleValorChange = (s: string, v: string) => {
    setValores(prev => ({ ...prev, [s]: v }))
  }

  // Agregar nuevo sistema secuencial
  const handleAgregarSistema = () => {
    // Buscar el mayor SXX actual
    const maxNum = localSistemas.reduce((max, s) => {
      const match = s.match(/^S(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        return num > max ? num : max
      }
      return max
    }, 0)
    const nuevo = `S${String(maxNum + 1).padStart(2, "0")}`
    if (!localSistemas.includes(nuevo)) {
      setLocalSistemas([...localSistemas, nuevo])
      setTab(nuevo)
    }
  }

  // Notify parent component when data changes
  useEffect(() => {
    if (onDataChange && parameter?.id) {
      const currentData = { fecha, comentarios, valores }
      const prevData = prevDataRef.current
      
      // Only call onDataChange if data has actually changed
      const hasChanged = 
        prevData.fecha !== fecha ||
        prevData.comentarios !== comentarios ||
        JSON.stringify(prevData.valores) !== JSON.stringify(valores)
      
      if (hasChanged) {
        prevDataRef.current = currentData
        onDataChange(parameter.id, currentData)
      }
    }
  }, [fecha, comentarios, valores, parameter?.id]) // Removed onDataChange from dependencies

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center mb-2">
        <span className="text-gray-400 font-semibold text-base w-48">{parameter.nombre}</span>
        <input
          type="date"
          className="border rounded px-2 py-1 ml-2 text-sm"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
        />
        <input
          type="text"
          className="border rounded px-2 py-1 ml-2 text-sm flex-1"
          placeholder="Comentarios"
          value={comentarios}
          onChange={e => setComentarios(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <div className="flex flex-row gap-1 border-b mb-2 items-center">
          {localSistemas.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={
                (tab === s
                  ? "border-b-2 border-blue-600 bg-white text-blue-700 font-semibold "
                  : "bg-gray-100 text-gray-500 hover:text-blue-600 ") +
                " px-4 py-1 rounded-t transition-colors duration-150 focus:outline-none"
              }
              style={{ minWidth: 48 }}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAgregarSistema}
            className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 border border-blue-200"
            title="Agregar sistema"
          >
            +
          </button>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-20">Valor {tab}:</span>
            <Input
              type="number"
              className="w-32"
              placeholder="0"
              value={valores[tab] || ""}
              onChange={e => handleValorChange(tab, e.target.value)}
            />
            <span className="text-xs text-gray-400">{parameter.unidad}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-xs text-gray-500">Los datos se guardarán cuando uses "Guardar Datos"</span>
        {!fecha && (
          <span className="text-xs text-red-500">⚠️ Fecha requerida</span>
        )}
      </div>
    </div>
  )
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

  // Estado para el usuario y el rol
  const [userRole, setUserRole] = useState<"admin" | "user" | "client">("client")

  // Estado para tolerancias por parámetro
  const [tolerancias, setTolerancias] = useState<Record<string, any>>({})
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({})
  const [tolError, setTolError] = useState<Record<string, string | null>>({})
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({})

  // 1. Crear un estado global en ReportManager para almacenar las mediciones ingresadas manualmente en esta sesión:
  const [medicionesPreview, setMedicionesPreview] = useState<any[]>([])

  // 1. En ReportManager, crear un estado para los sistemas dinámicos por parámetro:
  const [sistemasPorParametro, setSistemasPorParametro] = useState<Record<string, string[]>>({})

  // Estado para almacenar todos los datos de mediciones ingresados
  const [allMeasurementData, setAllMeasurementData] = useState<Record<string, { fecha: string; comentarios: string; valores: { [sistema: string]: string } }>>({})

  // Fetch Users
  useEffect(() => {
    if (!token) {
      setError("Token de autenticación no encontrado. Por favor, inicie sesión.")
      return
    }

    let userData: any = null
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omega_user')
      if (storedUser) {
        userData = JSON.parse(storedUser)
        setUserRole(userData.puesto || "user")
      }
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
      } catch (e: any) {
        setError(`Error al cargar usuarios: ${e.message}`)
        addDebugLog("error", `Error al cargar usuarios: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (userRole === "admin") {
      fetchUsers()
    } else if (userRole === "user" && userData) {
      setUsers([userData])
      setSelectedUser(userData)
      handleSelectUser(userData.id)
      setLoading(false)
    }
  }, [token, userRole, addDebugLog])

  // Handlers for selection changes
  const handleSelectUser = useCallback(async (userId: string) => {
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
  }, [users, token, addDebugLog])

  const handleSelectPlant = useCallback(async (plantId: string) => {
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
  }, [plants, token, addDebugLog])

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

  // 2. Agrega la función para fetch dinámico:
  async function fetchSistemasForParametro(param: Parameter) {
    if (!selectedSystem) return;
    const res = await fetch(`http://localhost:4000/api/mediciones/variable/${encodeURIComponent(param.nombre)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const data = await res.json();
    const medicionesFiltradas = (data.mediciones || []).filter((m: any) => m.proceso_id === selectedSystem)
    const sistemasRaw = medicionesFiltradas.map((m: any) => String(m.sistema))
    let maxNum = 1
    sistemasRaw.forEach((s: string) => {
      const match = s.match(/^S(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    })
    let sistemasSecuencia = Array.from({length: maxNum}, (_, i) => `S${String(i+1).padStart(2, '0')}`)
    if (sistemasSecuencia.length === 0) sistemasSecuencia = ["S01"]
    setSistemasPorParametro(prev => ({ ...prev, [param.id]: sistemasSecuencia }))
  }

  // 3. En el handler del checkbox, si checked=true, llama a fetchSistemasForParametro(param)
  const handleParameterChange = (parameterId: string, field: "checked" | "value", value: boolean | number) => {
    setParameterValues((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        [field]: value,
      },
    }))
    if (field === "checked" && value === true) {
      const param = parameters.find(p => p.id === parameterId)
      if (param) fetchSistemasForParametro(param)
    }
  }

  const handleMeasurementDataChange = useCallback((parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => {
    setAllMeasurementData(prev => ({
      ...prev,
      [parameterId]: data
    }))
  }, [])

  const handleSaveData = async () => {
    addDebugLog("info", "Guardando datos de mediciones")

    try {
      // Collect all measurement data from all parameters
      const allMediciones: any[] = []
      
      Object.entries(allMeasurementData).forEach(([parameterId, data]) => {
        const parameter = parameters.find(p => p.id === parameterId)
        if (!parameter) return

        // Convert data to measurement format
        Object.entries(data.valores).forEach(([sistema, valor]) => {
          if (valor && valor !== "" && data.fecha) { // Validate required fields
            allMediciones.push({
              fecha: data.fecha,
              comentarios: data.comentarios || "",
              valor: parseFloat(valor),
              variable_id: parameterId,
              proceso_id: selectedSystem,
              sistema: sistema,
              usuario_id: selectedUser?.id,
              planta_id: selectedPlant?.id,
              nombreParametro: parameter.nombre,
              parametroNombre: parameter.nombre
            })
          }
        })
      })

      if (allMediciones.length === 0) {
        addDebugLog("warning", "No hay datos de mediciones para guardar")
        return
      }

      // Save all measurements to backend
      for (const medicion of allMediciones) {
        const response = await fetch("http://localhost:4000/api/mediciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(medicion),
        })
        
        if (!response.ok) {
          throw new Error(`Error saving measurement: ${response.status} ${response.statusText}`)
        }
      }

      // Update medicionesPreview for display
      setMedicionesPreview(prev => [...prev, ...allMediciones])

      addDebugLog("success", `Guardadas ${allMediciones.length} mediciones`)
      
      // Clear the form data after successful save
      setAllMeasurementData({})
      
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
      // Convert measurement data to the format expected by reports page
      const systemData: { [systemName: string]: Array<{ name: string; value: string; unit: string; checked: boolean }> } = {}
      
      // Group measurements by system
      const measurementsBySystem: { [system: string]: any[] } = {}
      
      // Add saved measurements
      medicionesPreview.forEach(medicion => {
        const sistema = medicion.sistema || 'S01'
        if (!measurementsBySystem[sistema]) {
          measurementsBySystem[sistema] = []
        }
        measurementsBySystem[sistema].push(medicion)
      })
      
      // Add current session measurements
      Object.entries(allMeasurementData).forEach(([parameterId, data]) => {
        const parameter = parameters.find(p => p.id === parameterId)
        if (!parameter) return
        
        Object.entries(data.valores).forEach(([sistema, valor]) => {
          if (valor && valor !== "") {
            const medicion = {
              fecha: data.fecha,
              comentarios: data.comentarios,
              valor: parseFloat(valor),
              sistema: sistema,
              nombreParametro: parameter.nombre,
              parametroNombre: parameter.nombre,
              variable_id: parameterId
            }
            if (!measurementsBySystem[sistema]) {
              measurementsBySystem[sistema] = []
            }
            measurementsBySystem[sistema].push(medicion)
          }
        })
      })

      // Convert to the format expected by reports page
      Object.entries(measurementsBySystem).forEach(([sistema, mediciones]) => {
        const systemName = selectedSystemData?.nombre || sistema
        systemData[systemName] = []
        
        // Group by parameter and get the latest measurement for each
        const paramMap: { [paramName: string]: any } = {}
        mediciones.forEach(medicion => {
          const paramName = medicion.nombreParametro || medicion.parametroNombre || 'Parámetro'
          const param = parameters.find(p => p.id === medicion.variable_id)
          
          if (!paramMap[paramName]) {
            paramMap[paramName] = {
              name: paramName,
              value: medicion.valor?.toString() || 'N/A',
              unit: param?.unidad || '',
              checked: true
            }
          } else {
            // Keep the latest measurement
            paramMap[paramName].value = medicion.valor?.toString() || 'N/A'
          }
        })
        
        systemData[systemName] = Object.values(paramMap)
      })

      // If no measurements, create empty data structure for selected parameters
      if (Object.keys(systemData).length === 0 && selectedSystemData) {
        systemData[selectedSystemData.nombre] = selectedParams.map(({ id }) => {
          const param = parameters.find(p => p.id === id)
          return {
            name: param?.nombre || 'Parámetro',
            value: 'N/A',
            unit: param?.unidad || '',
            checked: true
          }
        })
      }

      // Save to localStorage for the reports page
      localStorage.setItem('savedSystemData', JSON.stringify(systemData))
      
      // Save report metadata
      const reportMetadata = {
        plantName: selectedPlantData?.nombre || 'Planta',
        systemName: selectedSystemData?.nombre || 'Sistema',
        generatedDate: new Date().toISOString(),
        user: selectedUser?.username || 'Usuario'
      }
      localStorage.setItem('reportMetadata', JSON.stringify(reportMetadata))

      addDebugLog("success", `Reporte generado exitosamente con ${Object.keys(systemData).length} sistemas`)
      addDebugLog("info", `Datos guardados: ${JSON.stringify(systemData, null, 2)}`)
      router.push("/reports")
    } catch (error) {
      addDebugLog("error", `Error generando reporte: ${error}`)
    }
  }

  // Cargar tolerancias al cargar parámetros o sistema
  useEffect(() => {
    if (!selectedSystem || parameters.length === 0) return
    setTolLoading({})
    setTolError({})
    setTolSuccess({})
    getTolerancias()
      .then((data: any) => {
        // Filtrar solo las tolerancias del sistema y parámetros actuales
        const map: Record<string, any> = {}
        if (Array.isArray(data)) {
          data.forEach((tol) => {
            if (parameters.some(p => p.id === tol.variable_id) && tol.proceso_id === selectedSystem) {
              map[tol.variable_id] = tol
            }
          })
        } else if (Array.isArray(data.tolerancias)) {
          data.tolerancias.forEach((tol: any) => {
            if (parameters.some(p => p.id === tol.variable_id) && tol.proceso_id === selectedSystem) {
              map[tol.variable_id] = tol
            }
          })
        }
        setTolerancias(map)
      })
      .catch((e) => {
        setTolError((prev) => ({ ...prev, global: e.message }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSystem, parameters])

  const handleTolChange = (variableId: string, field: string, value: string) => {
    setTolerancias((prev) => ({
      ...prev,
      [variableId]: {
        ...prev[variableId],
        [field]: value === '' ? '' : Number(value),
        variable_id: variableId,
        proceso_id: selectedSystem,
        planta_id: selectedPlant?.id,
        cliente_id: selectedUser?.id,
      },
    }))
  }

  const handleTolSave = async (variableId: string) => {
    setTolLoading((prev) => ({ ...prev, [variableId]: true }))
    setTolError((prev) => ({ ...prev, [variableId]: null }))
    setTolSuccess((prev) => ({ ...prev, [variableId]: null }))
    const tol = {
      ...tolerancias[variableId],
      variable_id: variableId,
      proceso_id: selectedSystem,
      planta_id: selectedPlant?.id,
      cliente_id: selectedUser?.id,
      limite_min: tolerancias[variableId]?.usar_limite_min ? tolerancias[variableId]?.limite_min : null,
      limite_max: tolerancias[variableId]?.usar_limite_max ? tolerancias[variableId]?.limite_max : null,
    }
    try {
      if (tol && tol.id) {
        await updateTolerancia(tol.id, tol)
        setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }))
      } else {
        await createTolerancia(tol)
        setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }))
      }
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message }))
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
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
        <Navbar role={userRole} />
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
                <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
                  <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1"><span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400"></span><span className="font-semibold text-yellow-700">Lim-(min,max)</span>: Cerca del límite recomendado</div>
                    <div className="flex items-center gap-1"><span className="font-semibold text-green-700">Bien</span>: Dentro de rango</div>
                  </div>
                  <Button 
                    onClick={() => router.push('/dashboard-parameters')} 
                    variant="secondary"
                    size="sm"
                    className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 text-xs"
                  >
                    ⚙️ Configurar Límites
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Formulario de ingreso de mediciones por parámetro seleccionado */}
                <div className="space-y-6 mb-8">
                  {parameters.filter(p => parameterValues[p.id]?.checked).map((parameter) => (
                    <MedicionInputBox
                      key={parameter.id}
                      parameter={parameter}
                      userId={selectedUser?.id}
                      plantId={selectedPlant?.id}
                      procesoId={selectedSystem}
                      sistemas={sistemasPorParametro[parameter.id] || ["S01"]}
                      onDataChange={handleMeasurementDataChange}
                    />
                  ))}
                </div>
                {/* Fin formulario mediciones */}

                {/* Tabla de previsualización justo debajo del formulario de ingreso */}
                {(medicionesPreview.length > 0 || Object.keys(allMeasurementData).length > 0) && systems.length > 0 && (
                  <div className="mt-6">
                    {/* Agrupar por parámetro */}
                    {(() => {
                      // Agrupar por parámetro
                      const porParametro: Record<string, any[]> = {}
                      
                      // Add saved measurements
                      medicionesPreview.forEach(m => {
                        const nombre = m.nombreParametro || m.parametroNombre || ''
                        if (!porParametro[nombre]) porParametro[nombre] = []
                        porParametro[nombre].push(m)
                      })
                      
                      // Add current session measurements
                      Object.entries(allMeasurementData).forEach(([parameterId, data]) => {
                        const parameter = parameters.find(p => p.id === parameterId)
                        if (!parameter) return
                        
                        Object.entries(data.valores).forEach(([sistema, valor]) => {
                          if (valor && valor !== "") {
                            const medicion = {
                              fecha: data.fecha,
                              comentarios: data.comentarios,
                              valor: parseFloat(valor),
                              sistema: sistema,
                              nombreParametro: parameter.nombre,
                              parametroNombre: parameter.nombre
                            }
                            if (!porParametro[parameter.nombre]) porParametro[parameter.nombre] = []
                            porParametro[parameter.nombre].push(medicion)
                          }
                        })
                      })
                      
                      // Obtener sistemas dinámicos ordenados
                      const parametro = Object.keys(porParametro)[0]
                      const sistemasDyn = (parametro && sistemasPorParametro && sistemasPorParametro[parametro] && sistemasPorParametro[parametro].length > 0) ? sistemasPorParametro[parametro] : ["S01"]
                      return (
                        <>
                          {Object.entries(porParametro).map(([parametro, mediciones]) => {
                            // Agrupar por fecha
                            const fechasSet = new Set(mediciones.map(m => m.fecha))
                            const fechas = Array.from(fechasSet).sort()
                            // Mapa fecha -> sistema -> valor
                            const data: Record<string, Record<string, any>> = {}
                            mediciones.forEach(m => {
                              if (!data[m.fecha]) data[m.fecha] = {}
                              data[m.fecha][m.sistema] = m.valor
                            })
                            return (
                              <div key={parametro} className="mb-8">
                                <div className="font-bold text-lg text-center mb-1">{parametro}</div>
                                <table className="min-w-full border text-xs bg-white">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border px-2 py-1">Fecha</th>
                                      {sistemasDyn.map(s => (
                                        <th key={s} className="border px-2 py-1">{s}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fechas.map(fecha => (
                                      <tr key={fecha}>
                                        <td className="border px-2 py-1 font-semibold">{fecha}</td>
                                        {sistemasDyn.map(s => (
                                          <td key={s} className="border px-2 py-1 text-center">{data[fecha][s] !== undefined ? data[fecha][s] : ''}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                )}

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
                      <div className="text-sm text-gray-500 w-16">{parameter.unidad}</div>
                      {/* Inputs de tolerancia en una sola fila */}
                      <div className="flex flex-row items-end gap-2 ml-2">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                          <Input type="number" className="w-14 bg-yellow-100 border-yellow-400 text-yellow-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[parameter.id]?.limite_min ?? ''} onChange={e => handleTolChange(parameter.id, 'limite_min', e.target.value)} />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
                          <Input type="number" className="w-14 bg-yellow-100 border-yellow-400 text-yellow-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[parameter.id]?.limite_max ?? ''} onChange={e => handleTolChange(parameter.id, 'limite_max', e.target.value)} />
                        </div>
                        <div className="flex flex-col items-center col-span-2" style={{minWidth: '60px'}}>
                          <span className="text-xs font-semibold text-green-700 text-center w-full">Bien</span>
                          <div className="flex flex-row gap-1">
                            <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[parameter.id]?.bien_min ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_min', e.target.value)} />
                            <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[parameter.id]?.bien_max ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_max', e.target.value)} />
                          </div>
                        </div>
                        <Button size="icon" className="ml-2 h-7 w-7 p-0 flex items-center justify-center" onClick={() => handleTolSave(parameter.id)} disabled={tolLoading[parameter.id]} title="Guardar límites">
                          <span className="material-icons text-base">save</span>
                        </Button>
                        <div className="flex flex-col items-center justify-end">
                          {tolError[parameter.id] && <div className="text-xs text-red-600">{tolError[parameter.id]}</div>}
                          {tolSuccess[parameter.id] && <div className="text-xs text-green-600">{tolSuccess[parameter.id]}</div>}
                        </div>
                      </div>
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
