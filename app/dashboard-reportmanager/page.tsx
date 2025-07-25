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
import { useUserAccess } from "@/hooks/useUserAccess"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

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

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function MedicionInputBox({ parameter, userId, plantId, procesoId, sistemas, onDataChange, fecha, comentarios }: {
  parameter: any,
  userId?: string,
  plantId?: string,
  procesoId?: string,
  sistemas: string[],
  fecha: string,
  comentarios: string,
  onDataChange?: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void
}) {
  const [tab, setTab] = useState<string>(sistemas[0] || "S01")
  const [valores, setValores] = useState<{ [sistema: string]: string }>({})
  const [localSistemas, setLocalSistemas] = useState<string[]>(sistemas)
  const prevDataRef = useRef<{ fecha: string; comentarios: string; valores: { [sistema: string]: string } }>({ fecha: "", comentarios: "", valores: {} })
  // Removed unused state variables

  // Debounced valores
  const debouncedValores = useDebounce(valores, 500);

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

  // Remueve el sistema actual si hay más de uno
  const handleRemoveSistema = () => {
    const nuevos = localSistemas.filter(s => s !== tab);
    setLocalSistemas(nuevos);
    if (!nuevos.includes(tab)) {
      setTab(nuevos[0] || "S01");
    }
    // También limpia el valor asociado al sistema eliminado
    setValores(prev => {
      const copy = { ...prev };
      delete copy[tab];
      return copy;
    });
  };

  // Notify parent component when data changes
  useEffect(() => {
    if (onDataChange && parameter?.id) {
      const currentData = { fecha, comentarios, valores: debouncedValores }
      const prevData = prevDataRef.current
      
      // Only call onDataChange if data has actually changed
      const hasChanged = 
        prevData.fecha !== fecha ||
        prevData.comentarios !== comentarios ||
        JSON.stringify(prevData.valores) !== JSON.stringify(debouncedValores)
      
      if (hasChanged) {
        prevDataRef.current = currentData
        onDataChange(parameter.id, currentData)
      }
    }
  }, [debouncedValores, parameter?.id, fecha, comentarios])

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center mb-2">
        <span className="text-gray-400 font-semibold text-base w-48">{parameter.nombre}</span>
        <span className="ml-2 text-sm text-gray-600">Fecha: {fecha || "Sin fecha"}</span>
        <span className="ml-4 text-sm text-gray-600">Comentarios: {comentarios || "Sin comentarios"}</span>
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
          <button
            type="button"
            onClick={handleRemoveSistema}
            disabled={localSistemas.length <= 1}
            className="ml-1 px-2 py-1 rounded bg-red-100 text-red-700 font-bold hover:bg-red-200 border border-red-200 disabled:opacity-50"
            title="Eliminar sistema actual"
          >
            −
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

// Custom hook para obtener sistemas únicos de mediciones para una variable
function useSistemasDeMediciones(variable: string, apiBase: string, token: string | null) {
  const [sistemas, setSistemas] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSistemas() {
      const encodedVar = encodeURIComponent(variable);
      const res = await fetch(
        `${apiBase}/api/mediciones/${encodedVar}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      if (!res.ok) return setSistemas([]);
      const result = await res.json();
      const mediciones = result.mediciones || [];
      const sistemasUnicos = Array.from(new Set(mediciones.map((m: any) => m.sistema))).map(String).sort();
      setSistemas(sistemasUnicos.length > 0 ? sistemasUnicos : ["S01"]);
    }
    if (variable) fetchSistemas();
  }, [variable, apiBase, token]);

  return sistemas;
}

export default function ReportManager() {
  const router = useRouter()
  // Parámetros de fechas y URL para SensorTimeSeriesChart
  const startDate = "2025-04-04"
  const endDate   = "2025-06-04"
  const apiBase   = API_BASE_URL
  const { debugInfo, addDebugLog } = useDebugLogger()
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
    setSelectedUser,
    setSelectedPlant,
    setSelectedSystem,
    handleSelectUser,
    handleSelectPlant,
    fetchParameters: fetchParametersFromHook
  } = useUserAccess(token)

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

  // 2. Cambia la declaración de parameterValues para usar este tipo
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>({});
  // Determinar el parámetro seleccionado para el gráfico
  const selectedParameters = parameters.filter(param => parameterValues[param.id]?.checked);
  const variablefiltro = selectedParameters.length > 0 ? selectedParameters[0].nombre : "";
  const labelLeftText = selectedParameters.length > 0 ? `${selectedParameters[0].nombre} (${selectedParameters[0].unidad})` : "";

  // Estado para tolerancias por parámetro
  const [tolerancias, setTolerancias] = useState<Record<string, any>>({})
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({})
  const [tolError, setTolError] = useState<Record<string, string | null>>({})
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({})

  // 1. Crear un estado global en ReportManager para almacenar las mediciones ingresadas manualmente en esta sesión:
  const [medicionesPreview, setMedicionesPreview] = useState<any[]>([])

  // Centraliza la lista de sistemas para los tabs de medición usando la misma lógica que MesureTable
  const [sistemas, setSistemas] = useState<string[]>([]);

  useEffect(() => {
    // Extrae los sistemas únicos de medicionesPreview (como en MesureTable)
    const sistemasFromMediciones = Array.from(
      new Set(
        medicionesPreview.map((m) => m.sistema)
      )
    ).sort();
    if (sistemasFromMediciones.length > 0) {
      setSistemas(sistemasFromMediciones);
    } else if (sistemas.length === 0) {
      setSistemas(["S01"]);
    }
  }, [medicionesPreview]);

  // Handler para agregar un nuevo sistema (renombrado para evitar colisión)
  const handleAgregarSistemaGlobal = () => {
    // Si hay sistemas con nombre SXX, agrega el siguiente SXX
    const sNums = sistemas
      .map((s) => {
        const match = s.match(/^S(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null) as number[];
    let nuevo = "";
    if (sNums.length > 0) {
      const maxNum = Math.max(...sNums);
      nuevo = `S${String(maxNum + 1).padStart(2, "0")}`;
    } else {
      // Si hay nombres personalizados, agrega uno vacío para editar
      nuevo = "";
    }
    setSistemas((prev) => [...prev, nuevo]);
  };

  // Permite agregar sistemas persistentes por parámetro (para tabs)
  const handleAgregarSistemaPorParametro = (parameterId: string) => {
    setSistemasPorParametro(prev => {
      const actuales = prev[parameterId] || ["S01"];
      const max = actuales
        .map(s => parseInt(s.replace("S", ""), 10))
        .filter(n => !isNaN(n))
        .reduce((a, b) => Math.max(a, b), 0);
      const nuevo = `S${String(max + 1).padStart(2, "0")}`;

      const nuevos = [...actuales, nuevo];
      sistemasPorParametroRef.current[parameterId] = nuevos;
      return {
        ...prev,
        [parameterId]: nuevos,
      };
    });
  };

  // Handler para editar el nombre de un sistema
  const handleEditarSistema = (idx: number, nuevoNombre: string) => {
    setSistemas((prev) => prev.map((s, i) => (i === idx ? nuevoNombre : s)));
  };

  // Initialize user data for compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        
      }
    }
  }, [])

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
  }, [selectedSystem, token, addDebugLog])

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

  const handleSaveData = async () => {
    addDebugLog("info", "Guardando datos de mediciones")

    try {
      // Collect all measurement data from all parameters
      const allMediciones: any[] = []
      
      Object.entries(parameterValues).forEach(([parameterId, data]: [string, ParameterValue]) => {
        if (!data.checked) return;
        const parameter = parameters.find(p => p.id === parameterId)
        if (!parameter) return

        // Convert data to measurement format
        Object.entries(data.valores || {}).forEach(([sistema, valor]) => {
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
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS}`, {
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
      setParameterValues(prev => Object.fromEntries(Object.entries(prev).map(([id, val]) => [id, { ...val, valores: {} } ])));
      
    } catch (error) {
      addDebugLog("error", `Error guardando datos: ${error}`)
    }
  }

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    // Recoge la información seleccionada
    const mediciones = parameters
      .filter(param => parameterValues[param.id]?.checked)
      .map(param => ({
        variable_id: param.id,
        nombre: param.nombre,
        unidad: param.unidad,
        valores: parameterValues[param.id]?.valores || {},
        fecha: globalFecha,
        comentarios: globalComentarios,
      }));

    const reportSelection = {
      user: selectedUser ? { id: selectedUser.id, username: selectedUser.username, email: selectedUser.email, puesto: selectedUser.puesto } : null,
      plant: selectedPlant ? { id: selectedPlant.id, nombre: selectedPlant.nombre } : null,
      systemName: selectedSystemData?.nombre,
      parameters: parameters.filter(param => parameterValues[param.id]?.checked).map(param => ({
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

  // Estado para sistemas por parámetro
  const [sistemasPorParametro, setSistemasPorParametro] = useState<Record<string, string[]>>({});
  const sistemasPorParametroRef = useRef<Record<string, string[]>>({});
  // Efecto para cargar sistemas
  useEffect(() => {
    async function fetchAllSistemas() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
      const apiBase = API_BASE_URL;
      const nuevos: Record<string, string[]> = {};

      await Promise.all(
        parameters.filter(p => parameterValues[p.id]?.checked).map(async (parameter) => {
          // Evita refetch si ya fue cargado
          if (sistemasPorParametroRef.current[parameter.id]) return;

          const encodedVar = encodeURIComponent(parameter.nombre);
          const res = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLEID(parameter.id)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          if (!res.ok) {
            nuevos[parameter.id] = ["S01"];
            sistemasPorParametroRef.current[parameter.id] = ["S01"];
            return;
          }
          const result = await res.json();
          const mediciones = result.mediciones || [];
          const sistemasUnicos = Array.from(new Set(mediciones.map((m: any) => m.sistema))).map(String).sort();
          nuevos[parameter.id] = sistemasUnicos.length > 0 ? sistemasUnicos : ["S01"];
          sistemasPorParametroRef.current[parameter.id] = nuevos[parameter.id];
        })
      );
      setSistemasPorParametro(prev => ({ ...prev, ...nuevos }));
    }
    fetchAllSistemas();
  }, [parameters, parameterValues]);

  // Estado para tolerancias por variable_id
  const [toleranciasPorVariable, setToleranciasPorVariable] = useState<Record<string, any>>({})

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
                  <Select value={selectedUser?.id} onValueChange={handleSelectUserWithReset}>
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
                  <Select value={selectedPlant?.id} onValueChange={handleSelectPlantWithReset} disabled={!selectedUser}>
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
            <>
              
              {/* Parámetros del Sistema Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Parámetros del Sistema</CardTitle>
                  <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1"><span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400"></span><span className="font-semibold text-yellow-700">Lim-(min,max)</span>: Cerca del límite recomendado</div>
                      <div className="flex items-center gap-1"><span className="font-semibold text-green-700">Bien</span>: Dentro de rango</div>
                    </div>
                    {(userRole === "admin" || userRole === "user") && (
                      <Button 
                        onClick={() => router.push('/dashboard-parameters')} 
                        variant="secondary"
                        size="sm"
                        className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 text-xs"
                      >
                        ⚙️ Configurar Límites
                      </Button>
                    )}
                  </div>
                  {/* Información Global Card */}
                  {Object.values(parameterValues).some(p => p.checked) && (
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Información Global</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Fecha</label>
                            <Input
                              type="date"
                              className="w-full"
                              value={globalFecha}
                              onChange={(e) => setGlobalFecha(e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Comentarios</label>
                            <Input
                              type="text"
                              className="w-full"
                              placeholder="Comentarios generales"
                              value={globalComentarios}
                              onChange={(e) => setGlobalComentarios(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
                        fecha={globalFecha}
                        comentarios={globalComentarios}
                        onDataChange={handleMeasurementDataChange}
                      />
                    ))}
                  </div>
                  {/* Fin formulario mediciones */}

                  {/* Previsualización por parámetro */}
                  {parameters.filter(p => parameterValues[p.id]?.checked).map(parameter => {
                    // Obtener la última entrada para este parámetro
                    const entries = medicionesPreview.filter(m => m.variable_id === parameter.id);
                    if (entries.length === 0) return null;
                    const latest = entries[entries.length - 1];
                    const { fecha, valores } = latest;
                    // Cabeceras dinámicas según valores ingresados
                    const sistemasTabla = Object.keys(valores).length > 0
                      ? Object.keys(valores)
                      : sistemasPorParametro[parameter.id] || ["S01"];
                    return (
                      <div key={parameter.id} className="mt-6 overflow-x-auto">
                        <h3 className="text-lg font-semibold mb-2">{parameter.nombre}</h3>
                        <table className="min-w-full border text-xs bg-white">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border px-2 py-1">Fecha</th>
                              {sistemasTabla.map(s => (
                                <th key={s} className="border px-2 py-1 text-center">{s}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-2 py-1 font-semibold">{fecha}</td>
                              {sistemasTabla.map(s => (
                                <td key={s} className="border px-2 py-1 text-center">
                                  {valores[s] ?? ""}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}

                  <div className="space-y-4">
                    {parameters.map((parameter) => {
                      const usarLimiteMin = !!tolerancias[parameter.id]?.usar_limite_min;
                      const usarLimiteMax = !!tolerancias[parameter.id]?.usar_limite_max;
                      return (
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
                            {/* Lim-min - Solo mostrar si usar_limite_min es true */}
                            {usarLimiteMin && (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                                  <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_min', String(!usarLimiteMin))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMin ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                </div>
                                <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="min"
                                  value={
                                    tolerancias[parameter.id]?.limite_min === undefined ||
                                    tolerancias[parameter.id]?.limite_min === null ||
                                    tolerancias[parameter.id]?.limite_min === '' ||
                                    Number.isNaN(Number(tolerancias[parameter.id]?.limite_min))
                                      ? ''
                                      : tolerancias[parameter.id]?.limite_min
                                  }
                                  onChange={e => handleTolChange(parameter.id, 'limite_min', e.target.value)}
                                  disabled={!usarLimiteMin}
                                />
                              </div>
                            )}
                            {/* Lim-max - Solo mostrar si usar_limite_max es true */}
                            {usarLimiteMax && (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
                                  <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_max', String(!usarLimiteMax))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMax ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                </div>
                                <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="max"
                                  value={
                                    tolerancias[parameter.id]?.limite_max === undefined ||
                                    tolerancias[parameter.id]?.limite_max === null ||
                                    tolerancias[parameter.id]?.limite_max === '' ||
                                    Number.isNaN(Number(tolerancias[parameter.id]?.limite_max))
                                      ? ''
                                      : tolerancias[parameter.id]?.limite_max
                                  }
                                  onChange={e => handleTolChange(parameter.id, 'limite_max', e.target.value)}
                                  disabled={!usarLimiteMax}
                                />
                              </div>
                            )}
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
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
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
                  apiBase={API_BASE_URL}
                  unidades={param.unidad}
                />
                <SensorTimeSeriesChart
                  variable={param.nombre}
                  startDate={startDate}
                  endDate={endDate}
                  apiBase={API_BASE_URL}
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

