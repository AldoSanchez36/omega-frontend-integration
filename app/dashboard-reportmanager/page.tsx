"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import ProtectedRoute from "@/components/ProtectedRoute"

import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { useUserAccess } from "@/hooks/useUserAccess"
import { useMeasurements } from "@/hooks/useMeasurements";
import { useTolerances } from "@/hooks/useTolerances"

import UserPlantSelector from "./components/UserPlantSelector"
import SystemSelector from "./components/SystemSelector"
import ParametersList from "./components/ParametersList"
import Charts from "./components/Charts"

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

import { useRef } from "react"




export default function ReportManager() {
  const router = useRouter()
  // Parámetros de fechas y URL para SensorTimeSeriesChart
  const startDate = "2025-04-04"
  const endDate   = "2025-06-04"
  const { addDebugLog } = useDebugLogger()
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
  const [globalFecha, setGlobalFecha] = useState<string>("");
  const [globalComentarios, setGlobalComentarios] = useState<string>("");

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

  // Load all plants if no user selected, else use hook plants
  useEffect(() => {
    async function loadPlants() {
      if (!selectedUser) {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ALL}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setDisplayedPlants(data.plantas || data);
          } else if (res.status === 401) {
            // Token inválido - redirigir al logout
            console.error('Token inválido detectado, redirigiendo al logout');
            localStorage.removeItem('Organomex_token');
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

  // Load users by selected plant, else use hook users
  useEffect(() => {
    async function loadUsers() {
      if (selectedPlant) {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER_BY_PLANT(selectedPlant.id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setDisplayedUsers(data.usuarios || data);
          } else if (res.status === 401) {
            // Token inválido - redirigir al logout
            console.error('Token inválido detectado, redirigiendo al logout');
            localStorage.removeItem('Organomex_token');
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

    const [parameters, setParameters] = useState<Parameter[]>([])

  // Local loading and error states for this component
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // 1. Define un tipo ParameterValue para el estado parameterValues
  type ParameterValue = {
    checked: boolean;
    value?: number;
    valores?: { [sistema: string]: string };
    fecha?: string;
    comentarios?: string;
  };

  // 2. Define el handler para el cambio de unidad
  const handleUnitChange = (parameterId: string, unidad: string) => {
    setParameterValues(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        unidadSeleccionada: unidad,
      },
    }));
  };

  // 3. Cambia la declaración de parameterValues para usar este tipo
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>({});
  // Determinar el parámetro seleccionado para el gráfico
  const selectedParameters = parameters.filter(param => parameterValues[param.id]?.checked);

  const { 
    tolerancias,
    tolLoading,
    tolError,
    tolSuccess,
    handleTolChange,
    handleTolSave 
  } = useTolerances(parameters, selectedSystem, selectedPlant?.id, selectedUser?.id);

    // Estado para sistemas por parámetro
  const [sistemasPorParametro, setSistemasPorParametro] = useState<Record<string, string[]>>({});

  // Estado para mediciones preview
  const { 
    medicionesPreview,
    isSaving,
    saveError,
    handleSaveData,
    setMedicionesPreview
  } = useMeasurements(token, parameters, selectedSystem, selectedPlant?.id, selectedUser?.id);

  // Custom handlers that extend the hook functionality
  const handleSelectUserWithReset = useCallback(async (userId: string) => {
    setParameters([])
    setParameterValues({})
    await handleSelectUser(userId)
  }, [handleSelectUser])

  const handleSelectPlantWithReset = useCallback(async (plantId: string) => {
    setParameters([])
    setParameterValues({})
    await handleSelectPlant(plantId)
  }, [handleSelectPlant])

  const fetchParameters = useCallback(async () => {
    if (!selectedSystem) {
      setParameters([])
      setParameterValues({})
      return
    }
    setLocalLoading(true)
    setLocalError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystem)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 401) {
          // Token inválido - redirigir al logout
          console.error('Token inválido detectado, redirigiendo al logout');
          localStorage.removeItem('Organomex_token');
          localStorage.removeItem('Organomex_user');
          router.push('/logout');
          return;
        }
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      setParameters(data.variables || [])
      addDebugLog("success", `Cargados ${data.variables?.length || 0} parámetros para sistema ${selectedSystem}`)
    } catch (e: any) {
      setLocalError(`Error al cargar parámetros: ${e.message}`)
      addDebugLog("error", `Error al cargar parámetros: ${e.message}`)
    } finally {
      setLocalLoading(false)
    }
  }, [selectedSystem, token, addDebugLog, router])

  const isGenerateDisabled =
    !globalFecha || 
    (!medicionesPreview || medicionesPreview.length === 0);

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  const selectedPlantData = plants.find((p) => p.id === selectedPlant?.id)
  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  // 2. Agrega la función para fetch dinámico:
  async function fetchSistemasForParametro(param: Parameter) {
    if (!selectedSystem) return;
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLEID(param.id)}`, {
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
    // setSistemasPorParametro(prev => ({ ...prev, [param.id]: sistemasSecuencia })) // This line is removed
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
    setParameterValues((prev: Record<string, ParameterValue>) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        valores: data.valores,
        fecha: data.fecha,
        comentarios: data.comentarios,
      }
    }));
    console.log("📥 Medición ingresada:", parameterId, data);
  }, []);

  

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    // Recoge la información seleccionada
    // Usar los datos guardados en medicionesPreview en lugar de los valores del formulario
    const mediciones = medicionesPreview.map(medicion => ({
      variable_id: medicion.variable_id,
      nombre: parameters.find(p => p.id === medicion.variable_id)?.nombre || '',
      unidad: parameters.find(p => p.id === medicion.variable_id)?.unidad || '',
      valores: { [medicion.sistema]: medicion.valor },
      fecha: medicion.fecha,
      comentarios: medicion.comentarios || '',
    }));

    const reportSelection = {
      user: selectedUser ? { id: selectedUser.id, username: selectedUser.username, email: selectedUser.email, puesto: selectedUser.puesto } : null,
      plant: selectedPlant ? { id: selectedPlant.id, nombre: selectedPlant.nombre } : null,
      systemName: selectedSystemData?.nombre,
      parameters: parameters.filter(param => 
        medicionesPreview.some(med => med.variable_id === param.id)
      ).map(param => ({
        id: param.id,
        nombre: param.nombre,
        unidad: param.unidad,
        limite_min: tolerancias[param.id]?.limite_min ?? null,
        limite_max: tolerancias[param.id]?.limite_max ?? null,
        bien_min: tolerancias[param.id]?.bien_min ?? null,
        bien_max: tolerancias[param.id]?.bien_max ?? null,
        usar_limite_min: !!tolerancias[param.id]?.usar_limite_min,
        usar_limite_max: !!tolerancias[param.id]?.usar_limite_max,
      })),
      mediciones,
      fecha: globalFecha,
      comentarios: globalComentarios,
      generatedDate: new Date().toISOString(),
    };
    localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
    router.push("/reports");
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

          <UserPlantSelector
            displayedUsers={displayedUsers}
            displayedPlants={displayedPlants}
            selectedUser={selectedUser}
            selectedPlant={selectedPlant}
            handleSelectUser={handleSelectUserWithReset}
            handleSelectPlant={handleSelectPlantWithReset}
            isPlantSelectorDisabled={!selectedUser}
          />

          {selectedPlantData && systems.length > 0 && (
            <SystemSelector
              systems={systems}
              selectedSystem={selectedSystem}
              selectedSystemData={selectedSystemData}
              setSelectedSystem={setSelectedSystem}
              plantName={selectedPlantData.nombre}
            />
          )}

          {/* Parámetros */}
          {selectedSystemData && parameters.length > 0 && (
            <ParametersList
              parameters={parameters}
              parameterValues={parameterValues}
              globalFecha={globalFecha}
              globalComentarios={globalComentarios}
              handleUnitChange={handleUnitChange}
              handleGlobalFechaChange={setGlobalFecha}
              handleGlobalComentariosChange={setGlobalComentarios}
              handleParameterChange={handleParameterChange}
              handleTolChange={handleTolChange}
              handleTolSave={handleTolSave}
              tolerancias={tolerancias}
              tolLoading={tolLoading}
              tolError={tolError}
              tolSuccess={tolSuccess}
              userRole={userRole}
              router={router}
              sistemasPorParametro={sistemasPorParametro}
              handleMeasurementDataChange={handleMeasurementDataChange}
              medicionesPreview={medicionesPreview}
            />
          )}

          {/* Action Buttons */}
          {selectedSystemData && parameters.length > 0 && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex space-x-4">
                  <Button onClick={() => handleSaveData(parameterValues)} variant="outline">
                    💾 Guardar Datos
                  </Button>
                  <Button onClick={handleGenerateReport} disabled={isGenerateDisabled} className={
                    `bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isGenerateDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                      📊 Generar Reporte</Button>
                </div>
              </CardContent>
            </Card>
          )}

                    {/* Gráficos de Series Temporales */}
          <Charts
            selectedParameters={selectedParameters}
            startDate={startDate}
            endDate={endDate}
            clientName={selectedPlantData?.clientName}
            processName={selectedSystemData?.nombre}
            userId={selectedUser?.id}
          />
          

        </div>
      </div>
    </ProtectedRoute>
  )
}

