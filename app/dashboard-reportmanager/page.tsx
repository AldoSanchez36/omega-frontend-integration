"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import ProtectedRoute from "@/components/ProtectedRoute"

import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { authService } from "@/services/authService"
import { httpService } from "@/services/httpService"
import { useEmpresasAccess } from "@/hooks/useEmpresasAccess"
import { useMeasurements } from "@/hooks/useMeasurements";
import { useTolerances } from "@/hooks/useTolerances"

import TabbedSelector from "./components/TabbedSelector"
import ParametersList from "./components/ParametersList"
import Charts from "./components/Charts"
import ScrollArrow from "./components/ScrollArrow"
import { parseComentariosForDisplay } from "./utils"

// Interfaces
interface User {
  id: string
  username: string
  email?: string
  puesto?: string
  role?: string
  verificado?: boolean
}

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
  orden?: number
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
  
  // Calcular fechas para los últimos 12 meses desde hoy
  const getLast12MonthsDates = () => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0] // Fecha de hoy en formato YYYY-MM-DD
    
    // Calcular fecha de hace 12 meses
    const startDateObj = new Date(today)
    startDateObj.setMonth(today.getMonth() - 12)
    const startDate = startDateObj.toISOString().split('T')[0] // Fecha de hace 12 meses en formato YYYY-MM-DD
    
    return { startDate, endDate }
  }
  
  const { startDate, endDate } = getLast12MonthsDates()
  
  const { addDebugLog } = useDebugLogger()
  const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
  const [globalFecha, setGlobalFecha] = useState<string>("");
  const [globalComentarios, setGlobalComentarios] = useState<string>("");
  const [activeTopTab, setActiveTopTab] = useState<string>("cliente");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Estados para fechas de filtro de gráficos (año en curso por defecto)
  const getCurrentYearDates = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 0, 1); // 1 de enero del año en curso
    const endDate = new Date(currentYear, 11, 31); // 31 de diciembre del año en curso
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  
  const { startDate: defaultChartStartDate, endDate: defaultChartEndDate } = getCurrentYearDates();
  const [chartStartDate, setChartStartDate] = useState<string>(defaultChartStartDate);
  const [chartEndDate, setChartEndDate] = useState<string>(defaultChartEndDate);

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

  // Obtener usuario conectado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('Organomex_user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setCurrentUser(user);
        } catch (error) {
          console.error('❌ Error parsing user data:', error);
        }
      } else {
        console.warn('⚠️ No se encontró usuario en localStorage');
      }
    }
  }, []);

  // Load all plants if no empresa selected, else use hook plants
  useEffect(() => {
    async function loadPlants() {
      if (!selectedEmpresa) {
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
  }, [selectedEmpresa, plants, token, router]);

  // Load empresas - siempre mostrar todas las empresas disponibles
  useEffect(() => {
    setDisplayedEmpresas(empresas);
  }, [empresas]);

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
  } = useTolerances(parameters, selectedSystem, selectedPlant?.id, selectedEmpresa?.id);

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
  const handleSelectEmpresaWithReset = useCallback(async (empresaId: string) => {
    setParameters([])
    setParameterValuesBySystem({})
    setLimitsStateBySystem({})
    await handleSelectEmpresa(empresaId)
  }, [handleSelectEmpresa])

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

  // Inicializar todos los parámetros como seleccionados por defecto cuando se cargan
  useEffect(() => {
    if (!selectedSystem || parameters.length === 0) return;
    
    // Obtener los valores actuales del sistema
    const currentValues = getCurrentSystemValues(selectedSystem);
    
    // Verificar si hay parámetros que no estén inicializados o no estén marcados
    const needsInitialization = parameters.some(param => 
      !currentValues[param.id] || currentValues[param.id].checked === undefined
    );
    
    // Solo inicializar si es necesario (primera vez que se cargan los parámetros para este sistema)
    if (needsInitialization) {
      setParameterValuesBySystem(prev => {
        const systemValues = prev[selectedSystem] || {};
        const updatedValues: Record<string, ParameterValue> = {};
        
        // Inicializar todos los parámetros como checked: true
        parameters.forEach(param => {
          if (systemValues[param.id]) {
            // Si ya existe, mantenerlo pero asegurar que esté checked si no estaba definido
            updatedValues[param.id] = {
              ...systemValues[param.id],
              checked: systemValues[param.id].checked !== undefined ? systemValues[param.id].checked : true,
            };
          } else {
            // Si no existe, crear nuevo con checked: true
            updatedValues[param.id] = {
              checked: true,
            };
          }
        });
        
        return {
          ...prev,
          [selectedSystem]: updatedValues,
        };
      });
    }
  }, [selectedSystem, parameters])

  const selectedPlantData = plants.find((p) => p.id === selectedPlant?.id)
  const selectedSystemData = systems.find((s) => s.id === selectedSystem)

  // Función para obtener parámetros de todos los sistemas
  const [allParameters, setAllParameters] = useState<Record<string, Parameter[]>>({});
  
  // Orden de parámetros por planta (para mostrar en orden configurado)
  const [plantOrderVariables, setPlantOrderVariables] = useState<{ id: string; nombre: string; unidad?: string; orden: number }[]>([]);
  
  // Cargar orden de variables de la planta al seleccionar planta
  useEffect(() => {
    if (!selectedPlant?.id || !token) {
      setPlantOrderVariables([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(selectedPlant.id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && Array.isArray(data.variables)) {
          setPlantOrderVariables(data.variables);
        } else {
          setPlantOrderVariables([]);
        }
      })
      .catch(() => { if (!cancelled) setPlantOrderVariables([]); });
    return () => { cancelled = true; };
  }, [selectedPlant?.id, token]);

  // Parámetros del sistema actual ordenados según la planta
  const sortedParameters = useMemo(() => {
    if (plantOrderVariables.length === 0) return parameters;
    const orderMap = new Map(plantOrderVariables.map((v, i) => [v.id, i]));
    return [...parameters].sort((a, b) => {
      const ia = orderMap.get(a.id) ?? 9999;
      const ib = orderMap.get(b.id) ?? 9999;
      if (ia !== ib) return ia - ib;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
  }, [parameters, plantOrderVariables]);

  // Datos para gráficos desde columna datos de reportes (no tabla mediciones)
  const [chartDataFromReportes, setChartDataFromReportes] = useState<Record<string, Array<{ fecha: string; sistema: string; valor: number }>>>({});

  useEffect(() => {
    if (!token || !selectedPlant?.id || !chartStartDate || !chartEndDate) {
      setChartDataFromReportes({});
      return;
    }
    let cancelled = false;
    const startNorm = chartStartDate.includes("T") ? chartStartDate.split("T")[0] : chartStartDate;
    const endNorm = chartEndDate.includes("T") ? chartEndDate.split("T")[0] : chartEndDate;

    fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const reportes: any[] = data.reportes || [];
        const byVariable: Record<string, Array<{ fecha: string; sistema: string; valor: number }>> = {};

        const toFechaYMD = (raw: string | number | Date): string => {
          if (!raw) return "";
          const s = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
          return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(raw).toISOString().split("T")[0];
        };
        reportes.forEach((report: any) => {
          const datos = report.datos || report.reportSelection || {};
          const fechaRaw = datos.fecha || report.fecha || report.created_at;
          if (!fechaRaw) return;
          const fecha = toFechaYMD(fechaRaw);
          if (!fecha || fecha < startNorm || fecha > endNorm) return;
          const plantaId = report.planta_id || datos.plant?.id;
          if (plantaId !== selectedPlant.id) return;

          const parametersData = datos.parameters || {};
          Object.entries(parametersData).forEach(([sistema, params]: [string, any]) => {
            if (!params || typeof params !== "object") return;
            const sistemaNorm = (sistema || "").trim();
            Object.entries(params).forEach(([variableName, paramData]: [string, any]) => {
              const valor = paramData?.valor ?? paramData?.value;
              if (valor == null || Number.isNaN(Number(valor))) return;
              if (!byVariable[variableName]) byVariable[variableName] = [];
              byVariable[variableName].push({ fecha, sistema: sistemaNorm, valor: Number(valor) });
            });
          });
        });

        setChartDataFromReportes(byVariable);
      })
      .catch(() => { if (!cancelled) setChartDataFromReportes({}); });
    return () => { cancelled = true; };
  }, [token, selectedPlant?.id, chartStartDate, chartEndDate]);

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
    selectedEmpresa?.id,
    selectedEmpresa,
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
    {}, // parameterComments - comentarios eliminados
    chartStartDate, // Pasar fecha inicio de gráficos
    chartEndDate, // Pasar fecha fin de gráficos
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

  // 2. Fetch "sistemas" por parámetro desde reportes.datos (en lugar de tabla mediciones)
  async function fetchSistemasForParametro(param: Parameter) {
    if (!selectedSystem || !selectedPlant || !selectedSystemData) return;

    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;

      const data = await res.json();
      const reportes: any[] = data.reportes || [];
      const systemName = selectedSystemData.nombre;

      const reportesConParam = reportes.filter((report: any) => {
        const plantaId = report.planta_id || report.datos?.plant?.id;
        if (plantaId !== selectedPlant.id) return false;
        const paramsForSystem = report.datos?.parameters?.[systemName] || report.reportSelection?.parameters?.[systemName] || {};
        return param.nombre in paramsForSystem && paramsForSystem[param.nombre]?.valor != null;
      });
      // Resultado no se asigna a estado (mismo comportamiento que antes); solo se evita llamar a mediciones
      if (reportesConParam.length > 0) {
        // Parámetro tiene datos en reportes para este sistema
      }
    } catch (error) {
      console.error(`Error fetching datos para parámetro ${param.nombre} desde reportes:`, error);
    }
  }

  // Poblar medicionesPreview desde reportes.datos (columna JSON) para que ParametersList muestre datos históricos
  useEffect(() => {
    if (!token || !selectedPlant || !selectedSystem || parameters.length === 0 || !selectedSystemData) {
      setMedicionesPreview([]);
      return;
    }

    const loadMedicionesPreviewFromReportes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const reportes: any[] = data.reportes || [];
        const systemName = selectedSystemData.nombre;
        const built: { variable_id: string; fecha: string; sistema: string; valor: number }[] = [];

        reportes.forEach((report: any) => {
          const datos = report.datos || report.reportSelection || {};
          const fecha = datos.fecha || report.fecha || report.created_at;
          if (!fecha) return;

          const fechaStr = typeof fecha === "string" ? fecha.split("T")[0] : new Date(fecha).toISOString().split("T")[0];
          const plantaId = report.planta_id || datos.plant?.id;
          if (plantaId !== selectedPlant.id) return;

          const paramsForSystem = datos.parameters?.[systemName] || {};
          parameters.forEach((param) => {
            const paramData = paramsForSystem[param.nombre];
            const valor = paramData?.valor ?? paramData?.value;
            if (valor == null || Number.isNaN(Number(valor))) return;

            built.push({
              variable_id: param.id,
              fecha: fechaStr,
              sistema: "S01",
              valor: Number(valor),
            });
          });
        });

        setMedicionesPreview(built);
      } catch (error) {
        console.error("Error cargando preview de mediciones desde reportes:", error);
        setMedicionesPreview([]);
      }
    };

    loadMedicionesPreviewFromReportes();
  }, [token, selectedPlant, selectedSystem, parameters, selectedSystemData, setMedicionesPreview]);

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
  }, [selectedSystem]);

  // Función para manejar cambios de estado de límites por sistema
  const handleLimitsStateChange = useCallback((newLimitsState: Record<string, { limite_min: boolean; limite_max: boolean }>) => {
    if (!selectedSystem) return;
    
    setLimitsStateBySystem(prev => ({
      ...prev,
      [selectedSystem]: newLimitsState,
    }));
  }, [selectedSystem]);

  

  // Función para manejar la vista del reporte desde reportes pendientes
  const handleViewReport = (report: any) => {
    try {
      // Obtener planta_id: del reporte primero, luego del contexto actual como fallback
      const plantaId = 
        report.datos?.plant?.id || 
        report.planta_id || 
        selectedPlant?.id || 
        null;
      
      if (!plantaId) {
        console.error("❌ Error: No se encontró planta_id en los datos del reporte ni en el contexto");
        alert("Error: No se pueden visualizar reportes sin datos de planta completos");
        return;
      }
      
      // Obtener empresa_id: del reporte primero, luego del contexto actual como fallback
      const empresaId =
        report?.empresa_id ??
        report?.datos?.empresa_id ??
        report?.datos?.user?.empresa_id ??
        selectedEmpresa?.id ??  // Usar empresa preseleccionada como fallback
        null;

      // Reconstruir reportSelection desde los datos JSONB completos
      const reportSelection = {
        user: {
          id: report.datos?.user?.id || report.usuario_id,
          username: report.datos?.user?.username || report.usuario,
          email: report.datos?.user?.email || "",
          puesto: report.datos?.user?.puesto || "client",
          cliente_id: report.datos?.user?.cliente_id || null,
          empresa_id: empresaId
        },
        plant: {
          id: plantaId,  // Asegurar que siempre tengamos el ID correcto
          nombre: report.datos?.plant?.nombre || report.plantName || selectedPlant?.nombre || "",
          dirigido_a: report.datos?.plant?.dirigido_a,
          mensaje_cliente: report.datos?.plant?.mensaje_cliente,
          systemName: report.datos?.plant?.systemName || report.datos?.systemName || report.systemName
        },
        systemName: report.datos?.systemName || report.systemName,
        parameters: report.datos?.parameters || {},
        variablesTolerancia: report.datos?.variablesTolerancia || {},
        mediciones: [],
        fecha: report.datos?.fecha || (report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        comentarios: report.datos?.comentarios || report.observaciones || "",
        generatedDate: report.datos?.generatedDate || report.created_at || new Date().toISOString(),
        cliente_id: report.datos?.user?.cliente_id || null,
        empresa_id: empresaId,  // Asegurar que siempre esté presente
        report_id: report.id || null,  // ID único del reporte para poder actualizarlo después
        // Asegurar que planta_id esté explícitamente en el objeto para compatibilidad
        planta_id: plantaId
      };

      // Guardar en localStorage
      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      
      // Redirigir a la página de reports
      router.push("/reports");
      
    } catch (error) {
      console.error("❌ Error al preparar vista del reporte:", error);
      alert("Error al preparar la vista del reporte");
    }
  };

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    // Verificar si hay datos guardados previamente
    const savedReportData = localStorage.getItem("reportSelection");
    
    if (savedReportData) {
      // Solo actualizar la fecha de generación y las fechas de gráficos
      const reportData = JSON.parse(savedReportData);
      reportData.generatedDate = new Date().toISOString();
      // Asegurar empresa_id (mismo origen que planta_id: selección actual)
      if (!reportData.empresa_id) {
        reportData.empresa_id = selectedEmpresa?.id || reportData.user?.empresa_id || null;
      }
      if (reportData.user && !reportData.user.empresa_id) {
        reportData.user.empresa_id = reportData.empresa_id || null;
      }
      // Asegurar que las fechas de gráficos estén incluidas
      if (!reportData.chartStartDate) {
        reportData.chartStartDate = chartStartDate;
      }
      if (!reportData.chartEndDate) {
        reportData.chartEndDate = chartEndDate;
      }
      
      localStorage.setItem("reportSelection", JSON.stringify(reportData));
      router.push("/reports");
      return;
    }

    // Si no hay datos guardados, crear la estructura básica
    const reportSelection = {
      user: currentUser ? { 
        id: currentUser.id,
        username: currentUser.username, 
        email: currentUser.email, 
        puesto: currentUser.puesto,
        empresa_id: selectedEmpresa?.id || null
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
      empresa_id: selectedEmpresa?.id || null,
      chartStartDate: chartStartDate, // Incluir fecha inicio de gráficos
      chartEndDate: chartEndDate, // Incluir fecha fin de gráficos
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

          <TabbedSelector
            displayedEmpresas={displayedEmpresas}
            displayedPlants={selectedEmpresa ? plants : displayedPlants}
            systems={systems}
            selectedEmpresa={selectedEmpresa}
            selectedPlant={selectedPlant}
            selectedSystem={selectedSystem}
            selectedSystemData={selectedSystemData}
            handleSelectEmpresa={handleSelectEmpresaWithReset}
            handleSelectPlant={handleSelectPlantWithReset}
            setSelectedSystem={setSelectedSystem}
            plantName={selectedPlantData?.nombre || ""}
            globalFecha={globalFecha}
            globalComentarios={globalComentarios}
            handleGlobalFechaChange={setGlobalFecha}
            handleGlobalComentariosChange={setGlobalComentarios}
            ocultarFecha={globalFecha !== ""}
            onSaveData={handleSaveData}
            onGenerateReport={handleGenerateReport}
            isGenerateDisabled={isGenerateDisabled}
            chartStartDate={chartStartDate}
            chartEndDate={chartEndDate}
            handleChartStartDateChange={setChartStartDate}
            handleChartEndDateChange={setChartEndDate}
            token={token}
            currentUser={currentUser}
            onViewReport={handleViewReport}
            activeTab={activeTopTab}
            onActiveTabChange={setActiveTopTab}
          />

          {/* Parámetros */}
          {activeTopTab !== "reportes-pendientes" && selectedSystemData && parameters.length > 0 && (
            <ParametersList
              parameters={sortedParameters}
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
              selectedEmpresa={selectedEmpresa}
              selectedPlant={selectedPlant}
              selectedSystem={selectedSystem}
              onLimitsStateChange={handleLimitsStateChange}
            />
          )}

          {/* Action Buttons */}
          {activeTopTab !== "reportes-pendientes" && selectedSystemData && parameters.length > 0 && (
            <Card className="mb-6">
              
              <CardContent className="pt-6">
                {globalFecha == "" && (
                  <label className="text-sm text-gray-500">Seleccione una fecha para guardar los datos</label>
                )}
                <hr className="my-2 invisible" ></hr>
                <div className="flex space-x-4">
                  {!globalFecha ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button 
                              onClick={handleSaveData} 
                              variant="outline"
                              disabled={!globalFecha}
                              className="opacity-50 cursor-not-allowed"
                            >
                              💾 Guardar Datos
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white border-gray-700">
                          <p>Selecciona una fecha para poder guardar los datos</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button 
                      onClick={handleSaveData} 
                      variant="outline"
                      disabled={!globalFecha}
                    >
                      💾 Guardar Datos
                    </Button>
                  )}
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
                        const allVariables = new Set<string>();
                        Object.values(savedReportData.parameters).forEach((systemData: any) => {
                          Object.keys(systemData).forEach(variable => allVariables.add(variable));
                        });
                        const orderedNames = plantOrderVariables.map((v) => v.nombre);
                        const orderedVariableList = orderedNames.length > 0
                          ? [
                              ...orderedNames.filter((n) => allVariables.has(n)),
                              ...Array.from(allVariables).filter((n) => !orderedNames.includes(n)),
                            ]
                          : Array.from(allVariables);
                        
                        return orderedVariableList.map(variable => {
                          // Obtener la unidad del primer sistema que tenga datos para esta variable
                          let unidad = '';
                          for (const systemName of Object.keys(savedReportData.parameters)) {
                            const systemData = savedReportData.parameters[systemName];
                            const paramData = systemData[variable];
                            if (paramData && paramData.unidad) {
                              unidad = paramData.unidad;
                              break;
                            }
                          }
                          
                          return (
                            <tr key={variable} className="hover:bg-gray-50">
                              <td className="border px-4 py-2 font-medium">
                                {variable}{unidad ? ` (${unidad})` : ''}
                              </td>
                              {Object.keys(savedReportData.parameters).map(systemName => {
                                const systemData = savedReportData.parameters[systemName];
                                const paramData = systemData[variable];
                                return (
                                  <td key={systemName} className="border px-4 py-2 text-center">
                                    {paramData ? paramData.valor : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Comentarios si existen */}
                {(() => {
                  const comentariosTexto = parseComentariosForDisplay(savedReportData.comentarios);
                  return comentariosTexto ? (
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold mb-2">Comentarios:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{comentariosTexto}</p>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Gráficos de Series Temporales - Oculto en "Reportes Pendientes" */}
          {activeTopTab !== "reportes-pendientes" && selectedSystem && (
            <Charts
              selectedParameters={selectedParameters}
              startDate={chartStartDate}
              endDate={chartEndDate}
              clientName={selectedPlantData?.clientName}
              processName={selectedSystemData?.nombre}
              userId={currentUser?.id}
              dataFromReportes={chartDataFromReportes}
            />
          )}

        </div>
        <ScrollArrow />
      </div>
    </ProtectedRoute>
  )
}

