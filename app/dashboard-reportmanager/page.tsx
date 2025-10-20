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

import { useRef } from "react"




export default function ReportManager() {
  const router = useRouter()
  // Parámetros de fechas y URL para SensorTimeSeriesChart
  const startDate = "2025-04-04"
  const endDate   = "2025-06-04"
  const { addDebugLog } = useDebugLogger()
  const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
  const [globalFecha, setGlobalFecha] = useState<string>("");
  const [globalComentarios, setGlobalComentarios] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  // Obtener usuario conectado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      //console.log('🔍 Buscando usuario en localStorage...');
      const userData = localStorage.getItem('Organomex_user');
      //console.log('📄 Datos del localStorage:', userData);
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setCurrentUser(user);
          //console.log('👤 Usuario conectado obtenido:', user);
        } catch (error) {
          console.error('❌ Error parsing user data:', error);
        }
      } else {
        console.warn('⚠️ No se encontró usuario en localStorage');
      }
    }
  }, []);

  // Load all plants if no user selected, else use hook plants
  useEffect(() => {
    async function loadPlants() {
      if (!selectedUser) {
        try {
          // Usar el endpoint que devuelve todos los campos
          const res = await fetch(`${API_BASE_URL}/api/plantas/all`, {
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

  // Load users - always show all available users, not filtered by plant
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

  // 1. Define tipos para estado por sistema
  type ParameterValue = {
    checked: boolean;
    value?: number;
    valores?: { [sistema: string]: string };
    fecha?: string;
    comentarios?: string;
    unidadSeleccionada?: string;
  };

  type SystemParameterValues = Record<string, Record<string, ParameterValue>>;
  type SystemLimitsState = Record<string, Record<string, { limite_min: boolean; limite_max: boolean }>>;

  // 2. Estados reestructurados por sistema
  const [parameterValuesBySystem, setParameterValuesBySystem] = useState<SystemParameterValues>({});
  const [limitsStateBySystem, setLimitsStateBySystem] = useState<SystemLimitsState>({});

  // 3. Helper functions para obtener datos del sistema actual
  const getCurrentSystemValues = (systemId: string) => parameterValuesBySystem[systemId] || {};
  const getCurrentSystemLimits = (systemId: string) => limitsStateBySystem[systemId] || {};

  // 4. Define el handler para el cambio de unidad
  const handleUnitChange = (parameterId: string, unidad: string) => {
    if (!selectedSystem) return;
    
    setParameterValuesBySystem(prev => ({
      ...prev,
      [selectedSystem]: {
        ...prev[selectedSystem],
        [parameterId]: {
          ...prev[selectedSystem]?.[parameterId],
          unidadSeleccionada: unidad,
        },
      },
    }));
  };

  // 5. Obtener valores del sistema actual para compatibilidad
  const parameterValues = getCurrentSystemValues(selectedSystem || '');
  
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

  // Estado para tolerancias por sistema
  const [tolerancesBySystem, setTolerancesBySystem] = useState<Record<string, Record<string, any>>>({});
  
  // Helper para obtener tolerancias del sistema actual
  const getCurrentSystemTolerances = (systemId: string) => tolerancesBySystem[systemId] || {};
  
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

  // Estado para el estado de los límites del sistema actual
  const limitsState = getCurrentSystemLimits(selectedSystem || '');
  
  // Debug: Log del estado por sistema
  useEffect(() => {
    if (selectedSystem) {
      //console.log(`🔍 Estado del sistema ${selectedSystem}:`, {
      //  parameterValues: parameterValues,
      //  limitsState: limitsState,
      //  tolerances: getCurrentSystemTolerances(selectedSystem)
      //});
      
      // Log de todos los sistemas para verificar independencia
      //console.log(`📊 Estado completo por sistemas:`, {
      //  parameterValuesBySystem,
      //  limitsStateBySystem,
      //  tolerancesBySystem
      //});
    }
  }, [selectedSystem, parameterValues, limitsState, parameterValuesBySystem, limitsStateBySystem, tolerancesBySystem]);

  // Custom handlers that extend the hook functionality
  const handleSelectUserWithReset = useCallback(async (userId: string) => {
    setParameters([])
    setParameterValuesBySystem({})
    setLimitsStateBySystem({})
    await handleSelectUser(userId)
  }, [handleSelectUser])

  const handleSelectPlantWithReset = useCallback(async (plantId: string) => {
    setParameters([])
    setParameterValuesBySystem({})
    setLimitsStateBySystem({})
    await handleSelectPlant(plantId)
  }, [handleSelectPlant])

  const fetchParameters = useCallback(async () => {
    if (!selectedSystem) {
      setParameters([])
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

  // Cargar tolerancias específicas del sistema actual
  useEffect(() => {
    async function loadSystemTolerances() {
      if (!selectedSystem || !selectedPlant || parameters.length === 0) return;
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/variables-tolerancia`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          const toleranceData = Array.isArray(data) ? data : data.tolerancias || [];
          
          const systemTolerancesMap: Record<string, any> = {};
          
          // Filtrar tolerancias solo para el sistema actual
          parameters.forEach(param => {
            const tolerance = toleranceData.find((tol: any) => 
              tol.variable_id === param.id && tol.proceso_id === selectedSystem
            );
            if (tolerance) {
              systemTolerancesMap[param.id] = tolerance;
            }
          });
          
          // Actualizar el estado por sistema
          setTolerancesBySystem(prev => ({
            ...prev,
            [selectedSystem]: systemTolerancesMap,
          }));
        }
      } catch (error) {
        console.error('Error loading system tolerances:', error);
      }
    }
    
    loadSystemTolerances();
  }, [selectedSystem, selectedPlant, parameters, token]);

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
    getCurrentSystemTolerances(selectedSystem || ''), // Usar tolerancias del sistema actual
    globalFecha,
    globalComentarios,
    parameterValues,
    systems, // allSystems
    allParameters, // allParameters - ahora con todos los sistemas
    limitsState, // Pasar el estado de límites actual
    parameterValuesBySystem, // Pasar todos los valores por sistema
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

  // 3. Handler actualizado para ser específico por sistema
  const handleParameterChange = (parameterId: string, field: "checked" | "value", value: boolean | number) => {
    if (!selectedSystem) return;
    
    setParameterValuesBySystem(prev => ({
      ...prev,
      [selectedSystem]: {
        ...prev[selectedSystem],
        [parameterId]: {
          ...prev[selectedSystem]?.[parameterId],
          [field]: value,
        },
      },
    }));
    
    if (field === "checked" && value === true) {
      const param = parameters.find(p => p.id === parameterId)
      if (param) fetchSistemasForParametro(param)
    }
  }

  const handleMeasurementDataChange = useCallback((parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => {
    if (!selectedSystem) return;
    
    setParameterValuesBySystem(prev => ({
      ...prev,
      [selectedSystem]: {
        ...prev[selectedSystem],
        [parameterId]: {
          ...prev[selectedSystem]?.[parameterId],
          valores: data.valores,
          fecha: data.fecha,
          comentarios: data.comentarios,
        },
      },
    }));
    //console.log("📥 Medición ingresada:", parameterId, data);
  }, [selectedSystem]);

  // Función para manejar cambios de estado de límites por sistema
  const handleLimitsStateChange = useCallback((newLimitsState: Record<string, { limite_min: boolean; limite_max: boolean }>) => {
    if (!selectedSystem) return;
    
    setLimitsStateBySystem(prev => ({
      ...prev,
      [selectedSystem]: newLimitsState,
    }));
    
    console.log("🔘 Estado de límites actualizado para sistema", selectedSystem, ":", newLimitsState);
    
    // Aquí puedes agregar lógica adicional basada en el estado de los límites
    const hasAnyActivatedLimits = Object.values(newLimitsState).some(limits => 
      limits.limite_min || limits.limite_max
    );
    
    console.log("📊 ¿Alguna variable tiene límites activados?", hasAnyActivatedLimits);
  }, [selectedSystem]);

  

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    // Verificar si hay datos guardados previamente
    const savedReportData = localStorage.getItem("reportSelection");
    
    if (savedReportData) {
      console.log("📊 Usando datos previamente guardados para generar reporte");
      console.log("💾 Datos guardados:", JSON.parse(savedReportData));
      
      // Solo actualizar la fecha de generación
      const reportData = JSON.parse(savedReportData);
      reportData.generatedDate = new Date().toISOString();
      
      localStorage.setItem("reportSelection", JSON.stringify(reportData));
      console.log("✅ reportSelection actualizado con nueva fecha de generación");
      router.push("/reports");
      return;
    }

    // Si no hay datos guardados, crear la estructura básica
    console.log("⚠️ No se encontraron datos guardados, creando estructura básica");
    
    const reportSelection = {
      user: currentUser ? { 
        id: currentUser.id,
        username: currentUser.username, 
        email: currentUser.email, 
        puesto: currentUser.puesto,
        cliente_id: selectedUser?.id || null
      } : null,
      plant: selectedPlant ? { 
        id: selectedPlant.id, 
        nombre: selectedPlant.nombre,
        mensaje_cliente: selectedPlant.mensaje_cliente,
        dirigido_a: selectedPlant.dirigido_a
      } : null,
      systemName: selectedSystemData?.nombre,
      parameters: [],
      mediciones: [],
      fecha: globalFecha,
      comentarios: globalComentarios,
      generatedDate: new Date().toISOString(),
      cliente_id: selectedUser?.id || null,
    };
    
    localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
    console.log("✅ reportSelection básico guardado en localStorage");
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
            displayedPlants={selectedUser ? plants : displayedPlants}
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
              onLimitsStateChange={handleLimitsStateChange}
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

