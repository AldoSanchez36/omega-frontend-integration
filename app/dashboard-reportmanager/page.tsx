"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import ProtectedRoute from "@/components/ProtectedRoute"

import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { authService } from "@/services/authService"
import { httpService } from "@/services/httpService"
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
  const token = authService.getToken()
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

  // Load users - filter by plant when plant is selected
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
            // Token inválido - redirigir al logout
            console.error('Token inválido detectado, redirigiendo al logout');
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

  // Estado para tolerancias globales de todos los sistemas
  const [allTolerances, setAllTolerances] = useState<Record<string, any>>({});
  
  // Estado para controlar la previsualización de datos guardados
  const [savedReportData, setSavedReportData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

    // Estado para sistemas por parámetro
  const [sistemasPorParametro, setSistemasPorParametro] = useState<Record<string, string[]>>({});

  // Estado para mediciones preview - se definirá después de selectedSystemData
  let medicionesPreview: any[] = [];
  let isSaving = false;
  let saveError: string | null = null;
  let handleSaveData: () => Promise<void> = async () => {};
  let setMedicionesPreview: (data: any[]) => void = () => {};

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

  const isGenerateDisabled = !showPreview || !savedReportData;

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  const selectedPlantData = plants.find((p) => p.id === selectedPlant?.id)
  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  // Función para obtener parámetros de todos los sistemas
  const [allParameters, setAllParameters] = useState<Record<string, Parameter[]>>({});
  
  // Cargar parámetros de todos los sistemas cuando se selecciona una planta
  useEffect(() => {
    async function loadAllParameters() {
      if (!selectedPlant || !systems.length) return;
      
      const parametersBySystem: Record<string, Parameter[]> = {};
      
      for (const system of systems) {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(system.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            parametersBySystem[system.id] = data.variables || [];
          }
        } catch (error) {
          console.error(`Error loading parameters for system ${system.id}:`, error);
        }
      }
      
      setAllParameters(parametersBySystem);
    }
    
    loadAllParameters();
  }, [selectedPlant, systems, token]);

  // Cargar tolerancias de todos los parámetros de todos los sistemas
  useEffect(() => {
    async function loadAllTolerances() {
      if (!selectedPlant || Object.keys(allParameters).length === 0) return;
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/variables-tolerancia`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          const toleranceData = Array.isArray(data) ? data : data.tolerancias || [];
          
          const allTolerancesMap: Record<string, any> = {};
          
          // Agregar tolerancias para todos los parámetros de todos los sistemas
          Object.values(allParameters).flat().forEach(param => {
            const tolerance = toleranceData.find((tol: any) => tol.variable_id === param.id);
            if (tolerance) {
              allTolerancesMap[param.id] = tolerance;
            }
          });
          
          setAllTolerances(allTolerancesMap);
        }
      } catch (error) {
        console.error('Error loading all tolerances:', error);
      }
    }
    
    loadAllTolerances();
  }, [selectedPlant, allParameters, token]);

  // Estado para mediciones preview - ahora que selectedSystemData está definido
  const { 
    medicionesPreview: medicionesPreviewFromHook,
    isSaving: isSavingFromHook,
    saveError: saveErrorFromHook,
    handleSaveData: handleSaveDataFromHook,
    setMedicionesPreview: setMedicionesPreviewFromHook
  } = useMeasurements(
    token, 
    parameters, 
    selectedSystem, 
    selectedPlant?.id, 
    selectedUser?.id,
    selectedUser,
    selectedPlant,
    selectedSystemData,
    allTolerances, // Usar allTolerances en lugar de tolerancias del sistema actual
    globalFecha,
    globalComentarios,
    parameterValues,
    systems, // allSystems
    allParameters, // allParameters - ahora con todos los sistemas
    (reportData) => {
      // Callback cuando se guardan exitosamente los datos
      setSavedReportData(reportData);
      setShowPreview(true);
    }
  );

  // Asignar los valores del hook a las variables locales
  medicionesPreview = medicionesPreviewFromHook;
  isSaving = isSavingFromHook;
  saveError = saveErrorFromHook;
  handleSaveData = handleSaveDataFromHook;
  setMedicionesPreview = setMedicionesPreviewFromHook;

  // 2. Agrega la función para fetch dinámico:
  async function fetchSistemasForParametro(param: Parameter) {
    if (!selectedSystem) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLEID(param.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!res.ok) {
        if (res.status === 404) {
          console.log(`No hay mediciones para variable ${param.nombre}, usando sistema por defecto`);
          // Si no hay mediciones, usar sistema por defecto
          return;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
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
    } catch (error) {
      console.error(`Error fetching sistemas for parameter ${param.nombre}:`, error);
      // En caso de error, continuar sin sistemas específicos
    }
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
    console.log("reportSelection", reportSelection);
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
              globalFecha={globalFecha}
              globalComentarios={globalComentarios}
              handleGlobalFechaChange={setGlobalFecha}
              handleGlobalComentariosChange={setGlobalComentarios}
              hasCheckedParameters={Object.values(parameterValues).some(value => value.checked)}
              ocultarFecha={globalFecha !== ""}
            />
          )}

          {/* Parámetros */}
          {selectedSystemData && parameters.length > 0 && (
            <ParametersList
              parameters={parameters}
              parameterValues={parameterValues}
              handleUnitChange={handleUnitChange}
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
              selectedUser={selectedUser}
              selectedPlant={selectedPlant}
              selectedSystem={selectedSystem}
            />
          )}

          {/* Action Buttons */}
          {selectedSystemData && parameters.length > 0 && (
            <Card className="mb-6">
              
              <CardContent className="pt-6">
                {globalFecha == "" && (
                  <label className="text-sm text-gray-500">Seleccione una fecha para guardar los datos</label>
                )}
                <hr className="my-2 invisible" ></hr>
                <div className="flex space-x-4">
                  <Button 
                    onClick={handleSaveData} 
                    variant="outline"
                    disabled={!globalFecha}
                    className={!globalFecha ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    💾 Guardar Datos
                  </Button>
                  <Button onClick={handleGenerateReport} disabled={isGenerateDisabled} className={
                    `bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isGenerateDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                      📊 Generar Reporte</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previsualización de datos guardados */}
          {showPreview && savedReportData && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-4">Previsualización de Datos Guardados</h3>
                
                {/* Fecha de medición */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-blue-800">
                    Fecha de medición: {new Date(savedReportData.fecha).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h4>
                </div>

                {/* Tabla de datos */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 bg-white">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-4 py-2 text-left font-semibold">Variable</th>
                        {Object.keys(savedReportData.parameters).map(systemName => (
                          <th key={systemName} className="border px-4 py-2 text-center font-semibold">
                            {systemName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Obtener todas las variables únicas
                        const allVariables = new Set<string>();
                        Object.values(savedReportData.parameters).forEach((systemData: any) => {
                          Object.keys(systemData).forEach(variable => allVariables.add(variable));
                        });
                        
                        return Array.from(allVariables).map(variable => (
                          <tr key={variable} className="hover:bg-gray-50">
                            <td className="border px-4 py-2 font-medium">{variable}</td>
                            {Object.keys(savedReportData.parameters).map(systemName => {
                              const systemData = savedReportData.parameters[systemName];
                              const paramData = systemData[variable];
                              return (
                                <td key={systemName} className="border px-4 py-2 text-center">
                                  {paramData ? `${paramData.valor} ${paramData.unidad}` : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Comentarios si existen */}
                {savedReportData.comentarios && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2">Comentarios:</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{savedReportData.comentarios}</p>
                  </div>
                )}
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

