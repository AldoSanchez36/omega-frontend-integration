"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit, Save, Check, ChevronUp, ChevronDown, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { v4 as uuidv4 } from "uuid"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
  /** Valor mínimo dentro del rango recomendado (limite inferior) */
  limMin?: string;
  /** Indicador de si el límite inferior está activo */
  limMinActive?: boolean;
  /** Valor máximo dentro del rango recomendado (límite superior) */
  limMax?: string;
  /** Indicador de si el límite superior está activo */
  limMaxActive?: boolean;
  /** Límite inferior del rango "bien" */
  goodMin?: string;
  /** Límite superior del rango "bien" */
  goodMax?: string;
}
// Interfaces
interface Empresa {
  id: string
  nombre: string
  descripcion?: string
  estatus?: string
}

interface Plant {
  id: string
  nombre: string
  dirigido_a?: string
  mensaje_cliente?: string
}

interface System {
  id: string
  nombre: string
  descripcion: string
  planta_id: string
  orden?: number
}

interface Parameter {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
  variable_proceso_id?: string // ID de la relación en variables_procesos
  orden?: number
  isNew?: boolean
  /** Valor mínimo dentro del rango recomendado (limite inferior) */
  limMin?: string
  /** Indicador de si el límite inferior está activo */
  limMinActive?: boolean
  /** Valor máximo dentro del rango recomendado (limite superior) */
  limMax?: string
  /** Indicador de si el límite superior está activo */
  limMaxActive?: boolean
  /** Límite inferior del rango "bien" */
  goodMin?: string
  /** Límite superior del rango "bien" */
  goodMax?: string
}

type UserRole = "admin" | "user" | "client" | "guest"

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function ParameterManager() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null

  // State
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [parameters, setParameters] = useState<Parameter[]>([])

  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [showCreateEmpresa, setShowCreateEmpresa] = useState(false)
  const [newEmpresaName, setNewEmpresaName] = useState("")
  const [newEmpresaEstatus, setNewEmpresaEstatus] = useState("activa")
  const [showEditEmpresaDialog, setShowEditEmpresaDialog] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [editEmpresaName, setEditEmpresaName] = useState("")
  const [editEmpresaEstatus, setEditEmpresaEstatus] = useState("activa")
  const [showCreatePlant, setShowCreatePlant] = useState(false)
  const [newPlantName, setNewPlantName] = useState("")
  const [newPlantRecipient, setNewPlantRecipient] = useState("")
  const [newPlantMessage, setNewPlantMessage] = useState("")
  const [showEditPlantDialog, setShowEditPlantDialog] = useState(false)
  const [editPlantName, setEditPlantName] = useState("")
  const [editPlantRecipient, setEditPlantRecipient] = useState("")
  const [editPlantMessage, setEditPlantMessage] = useState("")
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [showCreateSystem, setShowCreateSystem] = useState(false)
  const [newSystemName, setNewSystemName] = useState("")
  const [newSystemDescription, setNewSystemDescription] = useState("")
  
  // States for system editing
  const [editingSystem, setEditingSystem] = useState<System | null>(null)
  const [editSystemName, setEditSystemName] = useState("")
  const [showEditSystemDialog, setShowEditSystemDialog] = useState(false)
  const [newParameterName, setNewParameterName] = useState("")
  const [newParameterUnit, setNewParameterUnit] = useState("")

  // Estado para variables globales
  const [allVariables, setAllVariables] = useState<Parameter[]>([]);
  const [selectedImportVariableId, setSelectedImportVariableId] = useState<string>("");
  
  // Estado para importar de otro sistema
  const [showImportFromSystem, setShowImportFromSystem] = useState(false);
  const [selectedSourceSystemId, setSelectedSourceSystemId] = useState<string>("");
  const [sourceSystemParameters, setSourceSystemParameters] = useState<Parameter[]>([]);

  // Orden de parámetros por planta (sección "Orden de parámetros de la planta")
  const [plantOrderVariables, setPlantOrderVariables] = useState<{ id: string; nombre: string; unidad: string; orden?: number }[]>([])
  const [loadingOrdenVariables, setLoadingOrdenVariables] = useState(false)
  const [savingOrdenVariables, setSavingOrdenVariables] = useState(false)
  const [errorOrdenVariables, setErrorOrdenVariables] = useState<string | null>(null)
  const [ordenParametrosOpen, setOrdenParametrosOpen] = useState(false)

  // Estado para tolerancias por parámetro
  const [tolerancias, setTolerancias] = useState<Record<string, any>>({})
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({})
  const [tolError, setTolError] = useState<Record<string, string | null>>({})
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({})
  
  // Ref para manejar timeouts de mensajes de éxito
  const successTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Función helper para mostrar mensaje de éxito con auto-limpieza
  const showSuccessMessage = useCallback((variableId: string, message: string = '¡Guardado!') => {
    // Limpiar timeout anterior si existe
    if (successTimeouts.current[variableId]) {
      clearTimeout(successTimeouts.current[variableId])
    }
    
    // Mostrar mensaje
    setTolSuccess((prev) => ({ ...prev, [variableId]: message }))
    
    // Programar limpieza después de 3 segundos
    successTimeouts.current[variableId] = setTimeout(() => {
      setTolSuccess((prev) => ({ ...prev, [variableId]: null }))
      delete successTimeouts.current[variableId]
    }, 3000)
  }, [])

  // Edit parameter modal state
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [editName, setEditName] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  // Edit parameter handlers
  const handleOpenEditModal = (param: Parameter) => {
    setEditingParam(param)
    setEditName(param.nombre)
    setEditUnit(param.unidad)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingParam) return
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLE_UPDATE(editingParam.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: editName,
        unidad: editUnit,
      }),
    })
    if (res.ok) {
      setParameters((prev) =>
        prev.map((p) =>
          p.id === editingParam.id ? { ...p, nombre: editName, unidad: editUnit } : p
        )
      )
      setShowEditModal(false)
    } else {
      alert("Error al actualizar parámetro")
    }
  }

  // --- Gestores para límites de parámetros ---
  /**
   * Alterna el estado de activación del límite inferior para un parámetro concreto.
   * Cuando se activa por primera vez no establece un valor predeterminado, solo habilita el campo.
   */
  const handleToggleMinLimit = (paramId: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, limMinActive: !p.limMinActive }
          : p,
      ),
    )
  }

  /**
   * Alterna el estado de activación del límite superior para un parámetro concreto.
   */
  const handleToggleMaxLimit = (paramId: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, limMaxActive: !p.limMaxActive }
          : p,
      ),
    )
  }

  /**
   * Maneja el cambio del valor de límite inferior (limMin).
   */
  const handleChangeLimMin = (paramId: string, value: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, limMin: value }
          : p,
      ),
    )
  }

  /**
   * Maneja el cambio del valor de límite superior (limMax).
   */
  const handleChangeLimMax = (paramId: string, value: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, limMax: value }
          : p,
      ),
    )
  }

  /**
   * Maneja el cambio del valor mínimo del rango "bien" (goodMin).
   */
  const handleChangeGoodMin = (paramId: string, value: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, goodMin: value }
          : p,
      ),
    )
  }

  /**
   * Maneja el cambio del valor máximo del rango "bien" (goodMax).
   */
  const handleChangeGoodMax = (paramId: string, value: string) => {
    setParameters((prev) =>
      prev.map((p) =>
        p.id === paramId
          ? { ...p, goodMax: value }
          : p,
      ),
    )
  }

  /**
   * Manejador para guardar los límites de un parámetro.
   * Por ahora muestra una alerta informativa, pero aquí se podría integrar
   * la llamada a la API para persistir los rangos.
   */
  const handleSaveLimit = (paramId: string) => {
    const param = parameters.find((p) => p.id === paramId)
    if (!param) return
    // Aquí se podría incluir la lógica para enviar la información al backend.
    alert(`Límites guardados para ${param.nombre}`)
  }

  // Funciones para manejo de tolerancias
  const handleTolChange = (variableId: string, field: string, value: string) => {
    setTolerancias((prev) => {
      let processedValue: any = value;
      
      // Manejar campos booleanos
      if (field === 'usar_limite_min' || field === 'usar_limite_max') {
        processedValue = value === 'true' || value === '1';
      } 
      // Manejar campos numéricos - convertir string vacío a null (todos los límites pueden ser null)
      else if (field === 'limite_min' || field === 'limite_max' || field === 'bien_min' || field === 'bien_max') {
        processedValue = value === '' || value === null || value === undefined ? null : Number(value);
      }
      // Otros campos numéricos
      else {
        processedValue = value === '' ? '' : Number(value);
      }
      
      // Obtener el variable_proceso_id del parámetro
      const param = parameters.find(p => p.id === variableId)
      const variableProcesoId = param?.variable_proceso_id
      
      return {
        ...prev,
        [variableId]: {
          ...prev[variableId],
          [field]: processedValue,
          variable_proceso_id: variableProcesoId || prev[variableId]?.variable_proceso_id, // Mantener el ID si ya existe
        },
      };
    });
  }

  // Función para resetear los límites de tolerancia a valores por defecto
  const handleResetTolerance = async (variableId: string) => {
    // Confirmar antes de resetear
    const confirmReset = window.confirm(
      "¿Estás seguro de que quieres resetear los límites de tolerancia? Esto eliminará todos los valores configurados."
    )
    
    if (!confirmReset) return
    
    setTolLoading((prev) => ({ ...prev, [variableId]: true }))
    setTolError((prev) => ({ ...prev, [variableId]: null }))
    setTolSuccess((prev) => ({ ...prev, [variableId]: null }))
    
    try {
      const tolData = tolerancias[variableId]
      
      // Si existe una tolerancia guardada en BD (tiene id), eliminarla
      if (tolData?.id) {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCE_DELETE(tolData.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.msg || errorData.message || "Error al eliminar tolerancia")
        }
      }
      
      // Obtener el ID de variables_procesos del parámetro
      const param = parameters.find(p => p.id === variableId)
      const variableProcesoId = param?.variable_proceso_id
      
      if (!variableProcesoId) {
        throw new Error("No se encontró la relación variable-proceso.")
      }
      
      // Resetear el estado local a valores por defecto
      setTolerancias((prev) => ({
        ...prev,
        [variableId]: {
          variable_proceso_id: variableProcesoId,
          bien_min: '',
          bien_max: '',
          limite_min: null,
          limite_max: null,
          usar_limite_min: false,
          usar_limite_max: false,
        },
      }))
      
      setTolSuccess((prev) => ({ ...prev, [variableId]: 'Límites reseteados' }))
      
      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setTolSuccess((prev) => ({ ...prev, [variableId]: null }))
      }, 3000)
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message || "Error al resetear límites" }))
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
    }
  }

  const handleTolSave = async (variableId: string) => {
    setTolLoading((prev) => ({ ...prev, [variableId]: true }))
    setTolError((prev) => ({ ...prev, [variableId]: null }))
    setTolSuccess((prev) => ({ ...prev, [variableId]: null }))
    
    const tolData = tolerancias[variableId]
    
    // Obtener el ID de variables_procesos del parámetro
    const param = parameters.find(p => p.id === variableId)
    
    if (!param) {
      setTolError((prev) => ({ ...prev, [variableId]: "No se encontró el parámetro seleccionado" }))
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
      return
    }
    
    let variableProcesoId = param.variable_proceso_id
    
    // Log para debugging
    console.log(`🔍 Guardando tolerancia para ${param.nombre}:`, {
      variableId,
      variable_proceso_id: variableProcesoId,
      selectedSystemId,
      param: {
        id: param.id,
        nombre: param.nombre,
        proceso_id: param.proceso_id,
        variable_proceso_id: param.variable_proceso_id
      }
    })
    
    // Si no está en el parámetro, intentar obtenerlo del backend
    if (!variableProcesoId && selectedSystemId) {
      try {
        console.log(`⚠️ variable_proceso_id no encontrado en parámetro ${param.nombre}, buscando en backend...`)
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystemId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          console.log(`📥 Respuesta del backend:`, data)
          const paramFromBackend = (data.variables || []).find((p: any) => p.id === variableId)
          if (paramFromBackend) {
            variableProcesoId = paramFromBackend.variable_proceso_id || paramFromBackend.variables_procesos_id || paramFromBackend.id_variables_procesos
            console.log(`✅ variable_proceso_id encontrado:`, variableProcesoId)
            // Actualizar el parámetro en el estado local
            if (variableProcesoId) {
              setParameters(prev => prev.map(p => 
                p.id === variableId ? { ...p, variable_proceso_id: variableProcesoId } : p
              ))
            }
          } else {
            console.error(`❌ Parámetro ${param.nombre} no encontrado en la respuesta del backend`)
          }
        } else {
          console.error(`❌ Error al obtener variables del backend:`, res.status, res.statusText)
        }
      } catch (error) {
        console.error("❌ Error al buscar variable_proceso_id:", error)
      }
    }
    
    // Si aún no tenemos el variable_proceso_id, intentar obtenerlo consultando directamente
    if (!variableProcesoId && selectedSystemId && variableId) {
      try {
        console.log(`🔄 Intentando obtener variable_proceso_id directamente para ${param.nombre}...`)
        
        // Método 1: Consultar el endpoint de filtros de tolerancias
        const filterRes = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.TOLERANCES_FILTERS}?variable_id=${variableId}&proceso_id=${selectedSystemId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (filterRes.ok) {
          const filterData = await filterRes.json()
          if (filterData.tolerancias && filterData.tolerancias.length > 0) {
            variableProcesoId = filterData.tolerancias[0].variable_proceso_id
            console.log(`✅ variable_proceso_id obtenido desde filtros:`, variableProcesoId)
          }
        }
        
        // Método 2: Si aún no lo tenemos, intentar obtenerlo desde el endpoint de actualización de orden
        // que devuelve la relación completa
        if (!variableProcesoId) {
          console.log(`🔄 Intentando obtener variable_proceso_id desde endpoint de orden...`)
          // Hacer una petición GET al endpoint de orden (aunque sea PATCH, podemos ver la respuesta de error)
          // O mejor, recargar todas las variables del proceso
          const reloadRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystemId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (reloadRes.ok) {
            const reloadData = await reloadRes.json()
            const reloadParam = (reloadData.variables || []).find((p: any) => p.id === variableId)
            if (reloadParam) {
              variableProcesoId = reloadParam.variable_proceso_id || 
                                 reloadParam.variables_procesos_id || 
                                 reloadParam.id_variables_procesos
              if (variableProcesoId) {
                console.log(`✅ variable_proceso_id obtenido desde recarga:`, variableProcesoId)
                // Actualizar el parámetro en el estado local
                setParameters(prev => prev.map(p => 
                  p.id === variableId ? { ...p, variable_proceso_id: variableProcesoId } : p
                ))
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error al obtener variable_proceso_id:", error)
      }
    }
    
    if (!variableProcesoId) {
      const errorMsg = `No se encontró la relación variable-proceso para "${param.nombre}". Por favor, recarga la página o contacta al administrador.`
      setTolError((prev) => ({ ...prev, [variableId]: errorMsg }))
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
      console.error("❌ Error crítico - variable_proceso_id no encontrado:", { 
        variableId, 
        paramNombre: param.nombre,
        paramId: param.id,
        paramProcesoId: param.proceso_id,
        selectedSystemId,
        allParams: parameters.map(p => ({ 
          id: p.id, 
          nombre: p.nombre, 
          variable_proceso_id: p.variable_proceso_id,
          proceso_id: p.proceso_id
        }))
      })
      return
    }
    
    // Validar que tenemos el variable_proceso_id antes de continuar
    if (!variableProcesoId) {
      const errorMsg = `No se pudo obtener la relación variable-proceso para "${param.nombre}". Por favor, recarga la página.`
      setTolError((prev) => ({ ...prev, [variableId]: errorMsg }))
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
      console.error("❌ Error: variable_proceso_id es null o undefined", {
        variableId,
        paramNombre: param.nombre,
        paramId: param.id,
        selectedSystemId,
        variableProcesoId
      })
      return
    }
    
    // Preparar datos para enviar - sin validaciones, cualquier límite puede ser null
    // IMPORTANTE: El backend espera variables_proceso_id (PLURAL), no variable_proceso_id (singular)
    const tol = {
      variables_proceso_id: variableProcesoId, // Backend espera PLURAL: variables_proceso_id
      // Convertir a número solo si hay valor, sino null - todos los límites pueden ser null
      bien_min: tolData?.bien_min !== null && tolData?.bien_min !== undefined && tolData?.bien_min !== '' 
        ? Number(tolData.bien_min) 
        : null,
      bien_max: tolData?.bien_max !== null && tolData?.bien_max !== undefined && tolData?.bien_max !== '' 
        ? Number(tolData.bien_max) 
        : null,
      limite_min: tolData?.limite_min !== null && tolData?.limite_min !== undefined && tolData?.limite_min !== '' 
        ? Number(tolData.limite_min) 
        : null,
      limite_max: tolData?.limite_max !== null && tolData?.limite_max !== undefined && tolData?.limite_max !== '' 
        ? Number(tolData.limite_max) 
        : null,
      usar_limite_min: tolData?.usar_limite_min || false,
      usar_limite_max: tolData?.usar_limite_max || false,
      usar_limite_bajo: tolData?.usar_limite_bajo || false, // Campo requerido por el backend
      usar_limite_alto: tolData?.usar_limite_alto || false, // Campo requerido por el backend
    }
    
    // Log final antes de enviar
    console.log(`📤 Enviando tolerancia para ${param.nombre}:`, {
      variables_proceso_id: tol.variables_proceso_id,
      bien_min: tol.bien_min,
      bien_max: tol.bien_max,
      limite_min: tol.limite_min,
      limite_max: tol.limite_max,
      tolData: tol
    })
    
    try {
      // Primero verificar si ya existe una tolerancia para este variable_proceso_id
      // Usar el formato correcto: { variables_proceso_id: variableProcesoId }
      let toleranciaExistente = null
      try {
        // Buscar usando el formato correcto con variables_proceso_id
        const checkRes = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.TOLERANCES_FILTERS}?variables_proceso_id=${variableProcesoId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        console.log(`🔍 Buscando tolerancia existente con:`, {
          variables_proceso_id: variableProcesoId,
          url: `${API_BASE_URL}${API_ENDPOINTS.TOLERANCES_FILTERS}?variables_proceso_id=${variableProcesoId}`
        })
        
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          if (checkData.tolerancias && checkData.tolerancias.length > 0) {
            toleranciaExistente = checkData.tolerancias[0]
            console.log(`ℹ️ Tolerancia existente encontrada:`, {
              id: toleranciaExistente.id,
              variables_proceso_id: toleranciaExistente.variables_proceso_id || toleranciaExistente.variable_proceso_id,
              tolerancia: toleranciaExistente
            })
          } else {
            console.log(`ℹ️ No se encontraron tolerancias para variables_proceso_id: ${variableProcesoId}`)
          }
        } else if (checkRes.status === 404) {
          // 404 significa que no existe, es normal
          console.log(`ℹ️ No existe tolerancia previa para variables_proceso_id: ${variableProcesoId}`)
        } else {
          const errorData = await checkRes.json().catch(() => ({}))
          console.warn(`⚠️ Error al verificar tolerancia existente:`, {
            status: checkRes.status,
            statusText: checkRes.statusText,
            error: errorData
          })
        }
      } catch (error) {
        console.warn("No se pudo verificar tolerancia existente, continuando...", error)
      }
      
      // Si existe una tolerancia, actualizarla; si no, crearla
      if (toleranciaExistente) {
        console.log(`🔄 Actualizando tolerancia existente para ${param.nombre}...`)
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCE_UPDATE(toleranciaExistente.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        
        const responseData = await res.json()
        
        // Log detallado de la respuesta del backend
        console.log(`📥 Respuesta del backend al actualizar tolerancia:`, {
          status: res.status,
          ok: res.ok,
          responseData,
          sentData: tol
        })
        
        if (!res.ok) {
          // Mostrar el mensaje exacto del backend
          const errorMsg = responseData.msg || responseData.message || `Error ${res.status}: ${res.statusText}`
          console.error(`❌ Error del backend al actualizar:`, {
            status: res.status,
            statusText: res.statusText,
            msg: errorMsg,
            responseData,
            sentData: tol
          })
          throw new Error(errorMsg)
        }
        // Actualizar el estado con la respuesta del servidor
        setTolerancias((prev) => ({ ...prev, [variableId]: responseData.tolerancia || tol }))
        showSuccessMessage(variableId)
      } else {
        console.log(`➕ Creando nueva tolerancia para ${param.nombre}...`)
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        
        const responseData = await res.json()
        
        // Log detallado de la respuesta del backend
        console.log(`📥 Respuesta del backend al crear tolerancia:`, {
          status: res.status,
          ok: res.ok,
          responseData,
          sentData: tol
        })
        
        if (!res.ok) {
          // Mostrar el mensaje exacto del backend
          const errorMsg = responseData.msg || responseData.message || `Error ${res.status}: ${res.statusText}`
          console.error(`❌ Error del backend al crear:`, {
            status: res.status,
            statusText: res.statusText,
            msg: errorMsg,
            responseData,
            sentData: tol
          })
          throw new Error(errorMsg)
        }
        // Actualizar el estado con la respuesta del servidor (incluye el ID generado)
        setTolerancias((prev) => ({ ...prev, [variableId]: responseData.tolerancia || tol }))
        showSuccessMessage(variableId)
      }
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message || "Error al guardar tolerancia" }))
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
    }
  }

  // Estado para el usuario y el rol
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")

  // Fetch Empresas
  useEffect(() => {
    if (!token) {
      setError("Token de autenticación no encontrado. Por favor, inicie sesión.")
      return
    }
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.puesto || "user")
      }
    }

    const fetchEmpresas = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ALL}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          if (res.status === 404) {
            throw new Error("El endpoint de empresas no está disponible. Por favor, verifica que el backend tenga implementado el endpoint /api/empresas/all")
          }
          const text = await res.text()
          throw new Error(`El servidor devolvió una respuesta no válida (${res.status}). El endpoint /api/empresas/all puede no estar implementado.`)
        }
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.message || `Error ${res.status}: Failed to fetch empresas`)
        }
        const data = await res.json()
        setEmpresas(data.empresas || data || [])
      } catch (e: any) {
        setError(`Error al cargar empresas: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchEmpresas()
  }, [token])

  // Handlers for selection changes
  const handleSelectEmpresa = async (empresaId: string) => {
    const empresa = empresas.find((e) => e.id === empresaId)
    if (!empresa) return

    setSelectedEmpresa(empresa)
    setSelectedPlant(null)
    setSelectedSystemId(null)
    setPlants([])
    setSystems([])
    setParameters([])
    if (!empresa) return

    setLoading(true)
    setError(null)
    try {
      const url = `${API_BASE_URL}${API_ENDPOINTS.PLANTS_BY_EMPRESA(empresa.id)}`
      console.log('🔍 [dashboard-agregarsistema] Fetching plants for empresa:', empresa.id, 'URL:', url)
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      console.log('📡 [dashboard-agregarsistema] Response status:', res.status, 'Content-Type:', res.headers.get("content-type"))
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        if (res.status === 404) {
          throw new Error("El endpoint de plantas por empresa no está disponible. Por favor, verifica que el backend tenga implementado el endpoint /api/plantas/empresa/:empresaId")
        }
        const text = await res.text()
        console.error('❌ [dashboard-agregarsistema] Non-JSON response:', text.substring(0, 200))
        throw new Error(`El servidor devolvió una respuesta no válida (${res.status}). El endpoint /api/plantas/empresa/:empresaId puede no estar implementado.`)
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ [dashboard-agregarsistema] Error response:', errorData)
        throw new Error(errorData.msg || errorData.message || `Error ${res.status}: No se pudieron cargar las plantas para la empresa.`)
      }
      const data = await res.json()
      console.log('✅ [dashboard-agregarsistema] Plants data received:', data)
      console.log('📊 [dashboard-agregarsistema] Plants array:', data.plantas)
      console.log('📊 [dashboard-agregarsistema] Plants count:', data.plantas?.length || 0)
      
      const plantasArray = data.plantas || data || []
      setPlants(plantasArray)
      
      if (plantasArray.length > 0) {
        const firstPlant = plantasArray[0]
        handleSelectPlant(firstPlant.id)
      } else {
        setSelectedPlant(null)
        if (plantasArray.length === 0) {
          console.warn('⚠️ [dashboard-agregarsistema] No se encontraron plantas para la empresa:', empresa.nombre)
        }
      }
    } catch (e: any) {
      setError(`Error al cargar plantas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlant = async (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId)
    if (!plant) return

    setSelectedPlant(plant)
    setSelectedSystemId(null)
    setSystems([])
    setParameters([])
    if (!plant) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(plant.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los sistemas para la planta.")
      }
      const data = await res.json()
      const sistemas = data.procesos || []
      // El backend ya devuelve los sistemas ordenados por 'orden', pero ordenamos por si acaso
      const sistemasOrdenados = sistemas.sort((a: System, b: System) => {
        const ordenA = a.orden ?? 999999
        const ordenB = b.orden ?? 999999
        return ordenA - ordenB
      })
      setSystems(sistemasOrdenados)
      if (sistemasOrdenados.length > 0 && !sistemasOrdenados.some((sys: System) => sys.id === selectedSystemId)) {
        setSelectedSystemId(sistemasOrdenados[0].id) // Select the first system by default if current is invalid
      } else if (sistemasOrdenados.length === 0) {
        setSelectedSystemId(null)
      }
    } catch (e: any) {
      setError(`Error al cargar sistemas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleMoveOrdenVariableUp = (index: number) => {
    if (index <= 0) return
    setPlantOrderVariables((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const handleMoveOrdenVariableDown = (index: number) => {
    if (index >= plantOrderVariables.length - 1) return
    setPlantOrderVariables((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const handleSaveOrdenVariables = async () => {
    if (!selectedPlant?.id || !token) return
    setSavingOrdenVariables(true)
    setErrorOrdenVariables(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(selectedPlant.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ variable_ids: plantOrderVariables.map((v) => v.id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || "Error al guardar orden")
      setErrorOrdenVariables(null)
    } catch (e: any) {
      setErrorOrdenVariables(e.message || "Error al guardar orden")
    } finally {
      setSavingOrdenVariables(false)
    }
  }

  const handleCreateEmpresa = async () => {
    if (!newEmpresaName.trim()) {
      alert("Por favor, ingrese el nombre de la empresa.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const empresaData = {
        nombre: newEmpresaName.trim(),
        estatus: newEmpresaEstatus || 'activa',
      }
      
      console.log("🏢 Datos de empresa a crear:", empresaData)
      
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESA_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(empresaData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error("❌ Error del servidor al crear empresa:", errorData)
        throw new Error(errorData.msg || errorData.message || "No se pudo crear la empresa.")
      }
      
      const responseData = await res.json()
      console.log("✅ Respuesta del servidor al crear empresa:", responseData)
      
      setShowCreateEmpresa(false)
      setNewEmpresaName("")
      setNewEmpresaEstatus("activa")
      
      // Refetch empresas to update the list
      const empresasRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ALL}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (empresasRes.ok) {
        const empresasData = await empresasRes.json()
        setEmpresas(empresasData.empresas || empresasData || [])
        
        // Auto-select the newly created empresa
        if (responseData.empresa && responseData.empresa.id) {
          await handleSelectEmpresa(responseData.empresa.id)
        }
      }
      
      alert(`✅ Empresa "${newEmpresaName}" creada exitosamente.`)
    } catch (e: any) {
      setError(`Error al crear empresa: ${e.message}`)
      alert(`Error al crear empresa: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Function to open edit empresa dialog
  const handleOpenEditEmpresa = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    setEditEmpresaName(empresa.nombre)
    setEditEmpresaEstatus(empresa.estatus || "activa")
    setShowEditEmpresaDialog(true)
  }

  // Function to update empresa information
  const handleUpdateEmpresa = async () => {
    if (!editEmpresaName.trim() || !editingEmpresa) {
      alert("Por favor, ingrese el nombre de la empresa.")
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const updateData = {
        nombre: editEmpresaName.trim(),
        estatus: editEmpresaEstatus || 'activa',
      }
      
      console.log("🏢 Datos de empresa a actualizar:", updateData)
      
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESA_UPDATE(editingEmpresa.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error("❌ Error del servidor al actualizar empresa:", errorData)
        throw new Error(errorData.msg || errorData.message || "No se pudo actualizar la empresa.")
      }
      
      const responseData = await res.json()
      console.log("✅ Respuesta del servidor al actualizar empresa:", responseData)
      
      setShowEditEmpresaDialog(false)
      setEditingEmpresa(null)
      setEditEmpresaName("")
      setEditEmpresaEstatus("activa")
      
      // Refetch empresas to update the list
      const empresasRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ALL}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (empresasRes.ok) {
        const empresasData = await empresasRes.json()
        setEmpresas(empresasData.empresas || empresasData || [])
        
        // Update selected empresa if it was the one being edited
        if (selectedEmpresa?.id === editingEmpresa.id && responseData.empresa) {
          setSelectedEmpresa(responseData.empresa)
        }
      }
      
      alert(`✅ Empresa "${editEmpresaName}" actualizada exitosamente.`)
    } catch (e: any) {
      setError(`Error al actualizar empresa: ${e.message}`)
      alert(`Error al actualizar empresa: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }


  const handleCreatePlant = async () => {
    if (!newPlantName.trim() || !newPlantRecipient.trim() || !selectedEmpresa) {
      alert("Por favor, complete todos los campos obligatorios: nombre de la planta, destinatario de reportes y seleccione una empresa.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const plantData = {
        nombre: newPlantName,
        dirigido_a: newPlantRecipient,
        mensaje_cliente: newPlantMessage.trim() || null, // Enviar null si está vacío
        empresa_id: selectedEmpresa.id,
      }
      
      console.log("🌱 Datos de planta a crear:", plantData)
      
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(plantData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        console.error("❌ Error del servidor al crear planta:", errorData)
        throw new Error(errorData.message || "No se pudo crear la planta.")
      }
      
      const responseData = await res.json()
      console.log("✅ Respuesta del servidor al crear planta:", responseData)
      
      setShowCreatePlant(false)
      setNewPlantName("")
      setNewPlantRecipient("")
      setNewPlantMessage("")
      await handleSelectEmpresa(selectedEmpresa.id) // Refetch plants for the selected empresa
    } catch (e: any) {
      setError(`Error al crear planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Function to open edit plant dialog
  const handleOpenEditPlant = (plant: Plant) => {
    setEditingPlant(plant)
    setEditPlantName(plant.nombre)
    setEditPlantRecipient(plant.dirigido_a || "")
    setEditPlantMessage(plant.mensaje_cliente || "")
    setShowEditPlantDialog(true)
  }

  // Function to update plant information
  const handleUpdatePlant = async () => {
    if (!editPlantName.trim() || !editPlantRecipient.trim() || !editingPlant) {
      alert("Por favor, complete todos los campos obligatorios: nombre de la planta y destinatario de reportes.")
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const updateData = {
        nombre: editPlantName,
        dirigido_a: editPlantRecipient,
        mensaje_cliente: editPlantMessage.trim() || null, // Enviar null si está vacío
      }
      
      console.log("🌱 Datos de planta a actualizar:", updateData)
      
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_UPDATE(editingPlant.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updateData),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error("❌ Error del servidor al actualizar planta:", errorData)
        throw new Error(errorData.message || "No se pudo actualizar la planta.")
      }
      
      const responseData = await res.json()
      console.log("✅ Respuesta del servidor al actualizar planta:", responseData)
      
      setShowEditPlantDialog(false)
      setEditPlantName("")
      setEditPlantRecipient("")
      setEditPlantMessage("")
      setEditingPlant(null)
      
      // Refetch plants to update the list
      if (selectedEmpresa) {
        await handleSelectEmpresa(selectedEmpresa.id)
      }
    } catch (e: any) {
      setError(`Error al actualizar planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Function to delete plant
  const handleDeletePlant = async (plant: Plant) => {
    // Mostrar confirmación de eliminación
    const confirmDelete = window.confirm(
      `¿Está seguro que desea eliminar la planta "${plant.nombre}"?\n\n` +
      `Esta acción eliminará:\n` +
      `• La planta y toda su información\n` +
      `• Todos los sistemas asociados\n` +
      `• Todos los parámetros y mediciones\n\n` +
      `⚠️ Esta acción NO se puede deshacer.`
    )
    
    if (!confirmDelete) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_DELETE(plant.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo eliminar la planta.")
      }
      
      // Limpiar selecciones si la planta eliminada era la seleccionada
      if (selectedPlant?.id === plant.id) {
        setSelectedPlant(null)
        setSelectedSystemId(null)
        setSystems([])
        setParameters([])
      }
      
      // Refetch plants to update the list
      if (selectedEmpresa) {
        await handleSelectEmpresa(selectedEmpresa.id)
      }
      
      alert(`✅ Planta "${plant.nombre}" eliminada exitosamente.`)
    } catch (e: any) {
      setError(`Error al eliminar planta: ${e.message}`)
      alert(`Error al eliminar planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchParameters = useCallback(async () => {
    if (!selectedSystemId) {
      setParameters([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystemId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      
      // Log completo de la respuesta del backend para debugging
      console.log(`📥 Respuesta completa del backend para proceso ${selectedSystemId}:`, {
        data,
        variables: data.variables,
        firstVariable: data.variables?.[0],
        firstVariableKeys: data.variables?.[0] ? Object.keys(data.variables[0]) : [],
        allVariablesWithIds: data.variables?.map((v: any) => ({
          nombre: v.nombre,
          id: v.id,
          variable_proceso_id: v.variable_proceso_id,
          variables_procesos_id: v.variables_procesos_id,
          id_variables_procesos: v.id_variables_procesos
        }))
      })
      
      // Mapea cada variable para añadir campos de límites con valores predeterminados.
      let mappedParams =
        (data.variables || []).map((p: any) => {
          // Intentar múltiples nombres posibles del campo
          const variableProcesoId = p.variable_proceso_id ?? 
                                    p.variables_procesos_id ?? 
                                    p.id_variables_procesos ??
                                    p.variable_proceso?.id ??
                                    p.variables_proceso_id ??
                                    null
          
          // Log para debugging si no se encuentra el variable_proceso_id
          if (!variableProcesoId) {
            console.error(`❌ variable_proceso_id NO encontrado para variable ${p.nombre} (id: ${p.id})`, {
              variable: p,
              availableFields: Object.keys(p),
              allFieldValues: {
                variable_proceso_id: p.variable_proceso_id,
                variables_procesos_id: p.variables_procesos_id,
                id_variables_procesos: p.id_variables_procesos,
                variable_proceso: p.variable_proceso
              }
            })
          } else {
            console.log(`✅ variable_proceso_id encontrado para ${p.nombre}:`, variableProcesoId)
          }
          
          return {
            ...p,
            // Si el backend ya devuelve estos campos, se conservarán; de lo contrario se inicializan.
            orden: p.orden ?? null,
            variable_proceso_id: variableProcesoId, // ID de variables_procesos
            limMin: p.limMin ?? "",
            limMinActive: p.limMinActive ?? false,
            limMax: p.limMax ?? "",
            limMaxActive: p.limMaxActive ?? false,
            goodMin: p.goodMin ?? "",
            goodMax: p.goodMax ?? "",
          }
        }) || []
      
      // Verificar y corregir órdenes duplicados
      const ordenCounts = new Map<number, number>()
      const paramsWithDuplicates: Parameter[] = []
      
      // Contar cuántos parámetros tienen cada orden
      mappedParams.forEach((param: Parameter) => {
        if (param.orden !== null && param.orden !== undefined) {
          const count = ordenCounts.get(param.orden) || 0
          ordenCounts.set(param.orden, count + 1)
          if (count > 0) {
            // Ya había otro parámetro con este orden, es un duplicado
            paramsWithDuplicates.push(param)
          }
        }
      })
      
      // Si hay duplicados, reasignar órdenes únicos
      if (paramsWithDuplicates.length > 0) {
        console.log(`⚠️ Detectados ${paramsWithDuplicates.length} parámetros con órdenes duplicados. Corrigiendo automáticamente...`)
        
        // Ordenar primero por orden actual (o por índice si no tiene orden)
        const sortedParams = mappedParams.sort((a: Parameter, b: Parameter) => {
          const ordenA = a.orden ?? 999999
          const ordenB = b.orden ?? 999999
          if (ordenA !== ordenB) return ordenA - ordenB
          // Si tienen el mismo orden, mantener el orden original
          return 0
        })
        
        // Reasignar órdenes únicos secuencialmente (1, 2, 3, ...)
        const updatedParams = sortedParams.map((param: Parameter, index: number) => {
          const newOrden = index + 1
          if (param.orden !== newOrden) {
            return { ...param, orden: newOrden }
          }
          return param
        })
        
        // Actualizar los parámetros en el backend
        const updatePromises = updatedParams
          .filter((param: Parameter, index: number) => {
            const originalParam = sortedParams[index]
            return param.orden !== originalParam.orden
          })
          .map(async (param: Parameter) => {
            try {
              const updateRes = await fetch(
                `${API_BASE_URL}${API_ENDPOINTS.VARIABLE_UPDATE_ORDER(param.id, selectedSystemId)}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ orden: param.orden }),
                }
              )
              
              if (!updateRes.ok) {
                console.error(`Error actualizando orden del parámetro ${param.id}:`, updateRes.status)
                return false
              }
              return true
            } catch (error) {
              console.error(`Error actualizando orden del parámetro ${param.id}:`, error)
              return false
            }
          })
        
        await Promise.all(updatePromises)
        console.log('✅ Órdenes duplicados corregidos automáticamente')
        
        // Usar los parámetros actualizados
        mappedParams = updatedParams
      }
      
        // Verificar si hay parámetros sin variable_proceso_id y recargar si es necesario
        const paramsSinId = mappedParams.filter(p => !p.variable_proceso_id)
        if (paramsSinId.length > 0) {
          console.warn(`⚠️ ${paramsSinId.length} parámetros sin variable_proceso_id. Intentando recargar...`)
          // Intentar recargar una vez más después de un breve delay
          setTimeout(async () => {
            try {
              const retryRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystemId)}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (retryRes.ok) {
                const retryData = await retryRes.json()
                const retryMapped = (retryData.variables || []).map((p: any) => ({
                  ...p,
                  orden: p.orden ?? null,
                  variable_proceso_id: p.variable_proceso_id ?? p.variables_procesos_id ?? p.id_variables_procesos ?? null,
                  limMin: p.limMin ?? "",
                  limMinActive: p.limMinActive ?? false,
                  limMax: p.limMax ?? "",
                  limMaxActive: p.limMaxActive ?? false,
                  goodMin: p.goodMin ?? "",
                  goodMax: p.goodMax ?? "",
                }))
                const retrySorted = retryMapped.sort((a: Parameter, b: Parameter) => {
                  const ordenA = a.orden ?? 999999
                  const ordenB = b.orden ?? 999999
                  return ordenA - ordenB
                })
                setParameters(retrySorted)
                console.log(`✅ Parámetros recargados con variable_proceso_id`)
              }
            } catch (error) {
              console.error("❌ Error al recargar parámetros:", error)
            }
          }, 500)
        }
        
        // Ordenar por orden final
        const sortedParams = mappedParams.sort((a: Parameter, b: Parameter) => {
          const ordenA = a.orden ?? 999999
          const ordenB = b.orden ?? 999999
          return ordenA - ordenB
        })
        
        setParameters(sortedParams)
    } catch (e: any) {
      setError(`Error al cargar parámetros: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedSystemId, token])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  // Cargar orden de variables de la planta al seleccionar planta
  useEffect(() => {
    if (!selectedPlant?.id || !token) {
      setPlantOrderVariables([])
      setErrorOrdenVariables(null)
      return
    }
    let cancelled = false
    setLoadingOrdenVariables(true)
    setErrorOrdenVariables(null)
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
          if (!data.ok) setErrorOrdenVariables(data.msg || "Error al cargar orden")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlantOrderVariables([])
          setErrorOrdenVariables("Error al cargar orden de parámetros")
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrdenVariables(false)
      })
    return () => { cancelled = true }
  }, [selectedPlant?.id, token])

  // Cleanup timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      // Limpiar todos los timeouts pendientes
      Object.values(successTimeouts.current).forEach(timeout => {
        clearTimeout(timeout)
      })
      successTimeouts.current = {}
    }
  }, [])

  // Cargar tolerancias al cargar parámetros o sistema
  useEffect(() => {
    if (!selectedSystemId || parameters.length === 0) return
    setTolLoading({})
    setTolError({})
    setTolSuccess({})
    const loadTolerances = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          throw new Error("No se pudieron cargar las tolerancias")
        }
        const data = await res.json()
        
        // Filtrar solo las tolerancias del sistema y parámetros actuales
        // Ahora las tolerancias se relacionan por variables_proceso_id
        // Usar el formato correcto: tolerancia = { variables_proceso_id: variable.variables_proceso_id }
        const map: Record<string, any> = {}
        const toleranceArray = Array.isArray(data) ? data : (Array.isArray(data.tolerancias) ? data.tolerancias : [])
        
        toleranceArray.forEach((tol: any) => {
          // Buscar el parámetro que tiene este variables_proceso_id
          // El formato correcto es: { variables_proceso_id: tol.variables_proceso_id }
          const tolVariablesProcesoId = tol.variables_proceso_id || tol.variable_proceso_id
          
          const param = parameters.find(p => {
            const paramVariablesProcesoId = p.variable_proceso_id || p.variables_proceso_id
            // Comparar usando el formato: { variables_proceso_id: variable.variables_proceso_id }
            return paramVariablesProcesoId === tolVariablesProcesoId && paramVariablesProcesoId !== null && paramVariablesProcesoId !== undefined
          })
          
          if (param && tolVariablesProcesoId) {
            console.log(`✅ Tolerancia encontrada para ${param.nombre}:`, {
              param_id: param.id,
              param_nombre: param.nombre,
              variables_proceso_id: tolVariablesProcesoId,
              tolerancia: tol
            })
            map[param.id] = tol
          }
        })
        
        setTolerancias(map)
      } catch (e: any) {
        setTolError((prev) => ({ ...prev, global: e.message }))
      }
    }
    
    loadTolerances()
  }, [selectedSystemId, parameters, token])

  // Function to open edit dialog
  const handleOpenEditSystem = (system: System) => {
    setEditingSystem(system)
    setEditSystemName(system.nombre)
    setShowEditSystemDialog(true)
  }

  const handleDeleteSystem = async (system: System) => {
    // mostar popup de seguro que desea eliminar el sistema
    const confirm = window.confirm("¿Está seguro que desea eliminar el sistema?")
    if (confirm) {
      // eliminar el sistema
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_DELETE_BY_PLANT(system.planta_id, system.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      //reload the page
      window.location.reload()
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo eliminar el sistema.")
      }
    }
  }
  
  // Function to update system name
  const handleUpdateSystem = async () => {
    if (!editSystemName.trim() || !editingSystem) {
      alert("Por favor, ingrese un nombre para el sistema.")
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      // Using the generic systems endpoint with PATCH method
      const res = await fetch(`${API_BASE_URL}/api/procesos/${editingSystem.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          nombre: editSystemName,
          descripcion: editingSystem.descripcion, // Keep the existing description
          planta_id: editingSystem.planta_id // Keep the existing plant association
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo actualizar el sistema.")
      }
      
      // Update the systems list with the new name
      setSystems(systems.map(sys => 
        sys.id === editingSystem.id 
          ? { ...sys, nombre: editSystemName } 
          : sys
      ))
      
      // If this is the selected system, update that too
      if (selectedSystemId === editingSystem.id) {
        // Just update the UI, no need to change selection
      }
      
      setShowEditSystemDialog(false)
      setEditingSystem(null)
      setEditSystemName("")
    } catch (e: any) {
      setError(`Error al actualizar sistema: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateSystem = async () => {
    if (!newSystemName.trim() || !selectedPlant) {
      alert("Por favor, ingrese un nombre para el sistema y seleccione una planta.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Calcular el siguiente orden (máximo orden + 1, o 0 si no hay sistemas)
      // Si no hay sistemas o todos tienen orden null/undefined, empezar en 0
      let nuevoOrden = 0
      if (systems.length > 0) {
        const ordenesExistentes = systems
          .map(s => s.orden)
          .filter(orden => orden !== null && orden !== undefined) as number[]
        
        if (ordenesExistentes.length > 0) {
          nuevoOrden = Math.max(...ordenesExistentes) + 1
        } else {
          nuevoOrden = systems.length // Si no hay órdenes, usar la cantidad de sistemas
        }
      }

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: newSystemName,
          descripcion: newSystemDescription,
          planta_id: selectedPlant.id,
          orden: nuevoOrden,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to create system")
      }
      setShowCreateSystem(false)
      setNewSystemName("")
      setNewSystemDescription("")
      await handleSelectPlant(selectedPlant.id) // Refetch systems for the selected plant
    } catch (e: any) {
      setError(`Error al crear sistema: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Función para mover un sistema hacia arriba
  const handleMoveSystemUp = async (system: System) => {
    const currentIndex = systems.findIndex(s => s.id === system.id)
    if (currentIndex <= 0) return // Ya está en la primera posición

    const prevSystem = systems[currentIndex - 1]
    
    // Usar los valores reales de orden, si no existen, usar el índice como fallback
    const currentOrden = system.orden ?? currentIndex
    const prevOrden = prevSystem.orden ?? currentIndex - 1

    setLoading(true)
    setError(null)
    try {
      // Intercambiar los órdenes
      const [res1, res2] = await Promise.all([
        fetch(`${API_BASE_URL}/api/procesos/${system.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ orden: prevOrden }),
        }),
        fetch(`${API_BASE_URL}/api/procesos/${prevSystem.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ orden: currentOrden }),
        }),
      ])

      if (!res1.ok || !res2.ok) {
        const errorData1 = await res1.json().catch(() => ({}))
        const errorData2 = await res2.json().catch(() => ({}))
        throw new Error(errorData1.msg || errorData2.msg || 'Error al actualizar el orden')
      }

      // Recargar los sistemas para reflejar el nuevo orden
      await handleSelectPlant(selectedPlant!.id)
    } catch (e: any) {
      setError(`Error al mover sistema: ${e.message}`)
      console.error('Error al mover sistema hacia arriba:', e)
    } finally {
      setLoading(false)
    }
  }

  // Función para mover un sistema hacia abajo
  const handleMoveSystemDown = async (system: System) => {
    const currentIndex = systems.findIndex(s => s.id === system.id)
    if (currentIndex >= systems.length - 1) return // Ya está en la última posición

    const nextSystem = systems[currentIndex + 1]
    
    // Usar los valores reales de orden, si no existen, usar el índice como fallback
    const currentOrden = system.orden ?? currentIndex
    const nextOrden = nextSystem.orden ?? currentIndex + 1

    setLoading(true)
    setError(null)
    try {
      // Intercambiar los órdenes
      const [res1, res2] = await Promise.all([
        fetch(`${API_BASE_URL}/api/procesos/${system.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ orden: nextOrden }),
        }),
        fetch(`${API_BASE_URL}/api/procesos/${nextSystem.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ orden: currentOrden }),
        }),
      ])

      if (!res1.ok || !res2.ok) {
        const errorData1 = await res1.json().catch(() => ({}))
        const errorData2 = await res2.json().catch(() => ({}))
        throw new Error(errorData1.msg || errorData2.msg || 'Error al actualizar el orden')
      }

      // Recargar los sistemas para reflejar el nuevo orden
      await handleSelectPlant(selectedPlant!.id)
    } catch (e: any) {
      setError(`Error al mover sistema: ${e.message}`)
      console.error('Error al mover sistema hacia abajo:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteParameter = async (idToDelete: string) => {
    if (!idToDelete) return;
    if (!token) return;
    if (!selectedSystemId) {
      alert("No hay sistema seleccionado");
      return;
    }

    // Confirmar antes de eliminar
    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres eliminar este parámetro del sistema? Esta acción solo eliminará la relación entre el parámetro y el sistema, no eliminará el parámetro completamente."
    );
    
    if (!confirmDelete) return;

    try {
      console.log("🗑️ Eliminando relación variable-proceso:", {
        variableId: idToDelete,
        processId: selectedSystemId
      });

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLE_DELETE_BY_PROCESS(idToDelete, selectedSystemId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log("🗑️ Eliminando relación variable-proceso:", {
        url: `${API_BASE_URL}${API_ENDPOINTS.VARIABLE_DELETE_BY_PROCESS(idToDelete, selectedSystemId)}`,
        variableId: idToDelete,
        processId: selectedSystemId
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Error al eliminar relación:", errorData);
        
        if (res.status === 400) {
          alert(errorData.msg || "No se puede eliminar la variable porque tiene mediciones asociadas");
        } else if (res.status === 404) {
          alert("La relación variable-proceso no fue encontrada");
        } else {
          alert(`Error al eliminar la relación: ${errorData.message || "Error desconocido"}`);
        }
        return;
      }

      console.log("✅ Relación variable-proceso eliminada exitosamente");

      // Actualizar el estado local - eliminar solo del sistema actual
      setParameters((prev) => prev.filter((p) => p.id !== idToDelete));
      
      // Mostrar mensaje de éxito
      alert("Parámetro eliminado del sistema exitosamente");
      
    } catch (error) {
      console.error("❌ Error en la solicitud:", error);
      alert("Error de conexión al eliminar el parámetro");
    }
  };

  const handleAddParameter = () => {
    if (!newParameterName.trim() || !selectedSystemId) {
      alert("Por favor, ingrese un nombre para el parámetro y seleccione un sistema.")
      return
    }
    // Calcular el siguiente orden (máximo orden + 1, o 0 si no hay parámetros)
    let nuevoOrden = 0
    if (parameters.length > 0) {
      const ordenesExistentes = parameters
        .map(p => p.orden)
        .filter(orden => orden !== null && orden !== undefined) as number[]
      
      if (ordenesExistentes.length > 0) {
        nuevoOrden = Math.max(...ordenesExistentes) + 1
      } else {
        nuevoOrden = parameters.length // Si no hay órdenes, usar la cantidad de parámetros
      }
    }
    const newParam: Parameter = {
      id: uuidv4(), // Generate a unique ID for client-side tracking
      nombre: newParameterName.trim(),
      unidad: newParameterUnit.trim(),
      proceso_id: selectedSystemId,
      orden: nuevoOrden,
      isNew: true, // Mark as new for saving later
      // Inicializa los campos de límites para nuevos parámetros
      limMin: "",
      limMinActive: false,
      limMax: "",
      limMaxActive: false,
      goodMin: "",
      goodMax: "",
    }
    setParameters((prev) => [...prev, newParam])
    setNewParameterName("")
    setNewParameterUnit("")
  }

  // Función para obtener variables disponibles (no asociadas al sistema actual)
  const getAvailableVariables = useCallback(() => {
    if (!selectedSystemId) return [];
    
    return allVariables.filter(variable => {
      // Obtener los nombres de parámetros ya existentes en el sistema actual
      const existingParameterNames = parameters.map(p => p.nombre.toLowerCase());
      
      // Una variable está disponible si:
      // 1. No está ya en el sistema actual (por nombre)
      // 2. No está asociada específicamente a otro sistema (o es global)
      const isNotInCurrentSystem = !existingParameterNames.includes(variable.nombre.toLowerCase());
      const isGlobalOrFromOtherSystem = !variable.proceso_id || variable.proceso_id !== selectedSystemId;
      
      return isNotInCurrentSystem && isGlobalOrFromOtherSystem;
    });
  }, [allVariables, parameters, selectedSystemId]);

  // Cargar todas las variables existentes (de todos los sistemas)
  useEffect(() => {
    const fetchAllVariables = async () => {
      try {
        //console.log('🔍 Fetching all variables...');
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          //console.log('❌ Error fetching variables:', res.status);
          return;
        }
        const data = await res.json();
        //console.log('✅ Variables loaded:', data);
        setAllVariables(data.variables || data || []);
      } catch (error) {
        //console.log('💥 Error fetching variables:', error);
      }
    };
    fetchAllVariables();
  }, [token]);

  // Al seleccionar una variable existente, copia nombre y unidad al formulario
  useEffect(() => {
    if (!selectedImportVariableId) return;
    const variable = allVariables.find(v => v.id === selectedImportVariableId);
    if (variable) {
      setNewParameterName(variable.nombre);
      setNewParameterUnit(variable.unidad);
    }
  }, [selectedImportVariableId, allVariables]);

  // Función para cargar parámetros y tolerancias de otro sistema
  const loadSourceSystemParameters = async (systemId: string) => {
    if (!systemId || !token) return;
    
    try {
      // Cargar parámetros del sistema fuente
      const paramsRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(systemId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!paramsRes.ok) {
        throw new Error("No se pudieron cargar los parámetros del sistema fuente");
      }
      
      const paramsData = await paramsRes.json();
      const parameters = paramsData.variables || [];
      setSourceSystemParameters(parameters);
      console.log(`📋 Parámetros cargados del sistema ${systemId}:`, parameters);
    } catch (error) {
      console.error("Error cargando datos del sistema fuente:", error);
      setSourceSystemParameters([]);
    }
  };

  // Cargar parámetros cuando se selecciona un sistema fuente
  useEffect(() => {
    if (selectedSourceSystemId) {
      loadSourceSystemParameters(selectedSourceSystemId);
    } else {
      setSourceSystemParameters([]);
    }
  }, [selectedSourceSystemId, token]);

  // Función para importar todos los parámetros y tolerancias de otro sistema
  const handleImportFromSystem = () => {
    if (!selectedSourceSystemId || sourceSystemParameters.length === 0) {
      alert("Por favor, selecciona un sistema fuente con parámetros.");
      return;
    }

    if (!selectedSystemId) {
      alert("No hay sistema destino seleccionado.");
      return;
    }

    // Filtrar parámetros que no estén ya en el sistema actual
    const existingParameterNames = parameters.map(p => p.nombre.toLowerCase());
    const parametersToImport = sourceSystemParameters.filter(param => 
      !existingParameterNames.includes(param.nombre.toLowerCase())
    );

    if (parametersToImport.length === 0) {
      alert("Todos los parámetros del sistema fuente ya están en el sistema actual.");
      return;
    }

    // Calcular el orden inicial para los parámetros importados
    let ordenInicial = 0
    if (parameters.length > 0) {
      const ordenesExistentes = parameters
        .map(p => p.orden)
        .filter(orden => orden !== null && orden !== undefined) as number[]
      
      if (ordenesExistentes.length > 0) {
        ordenInicial = Math.max(...ordenesExistentes) + 1
      } else {
        ordenInicial = parameters.length
      }
    }

    // Agregar los parámetros al sistema actual
    const newParameters: Parameter[] = parametersToImport.map((param, index) => ({
      ...param,
      id: uuidv4(), // Nuevo ID para evitar conflictos
      proceso_id: selectedSystemId, // Cambiar al sistema actual
      orden: ordenInicial + index, // Asignar orden secuencial
      isNew: true, // Marcar como nuevo para guardar
    }));

    setParameters(prev => [...prev, ...newParameters]);
    
    // Cerrar el modal y limpiar selección
    setShowImportFromSystem(false);
    setSelectedSourceSystemId("");
    setSourceSystemParameters([]);
    
    alert(`✅ Se importaron ${newParameters.length} parámetros del sistema fuente.`);
    console.log(`📥 Parámetros importados:`, newParameters);
  };

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    const newParamsToSave = parameters.filter((p) => p.isNew)
    if (newParamsToSave.length === 0) {
      // alert("No hay nuevos parámetros para guardar.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Guardar parámetros primero
      console.log("💾 Guardando parámetros...");
      for (const param of newParamsToSave) {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLE_CREATE}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombre: param.nombre,
            unidad: param.unidad,
            proceso_id: param.proceso_id,
            orden: param.orden,
          }),
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || `Error guardando el parámetro ${param.nombre}`)
        }
      }
      console.log("✅ Parámetros guardados exitosamente");

      // 2. Refetch parámetros para obtener los IDs del servidor (incluyendo variable_proceso_id)
      await fetchParameters();

      // 3. Guardar tolerancias automáticamente
      console.log("💾 Guardando tolerancias...");
      const tolerancePromises = Object.entries(tolerancias).map(async ([variableId, tolerance]) => {
        // Solo guardar tolerancias de parámetros nuevos
        // Buscar por nombre ya que el ID puede haber cambiado después del refetch
        const paramOriginal = newParamsToSave.find(p => p.id === variableId);
        if (!paramOriginal) return;

        // Buscar el parámetro actualizado por nombre para obtener su variable_proceso_id
        const param = parameters.find(p => p.nombre === paramOriginal.nombre && p.proceso_id === selectedSystemId);
        if (!param?.variable_proceso_id) {
          console.warn(`⚠️ No se encontró variable_proceso_id para el parámetro ${paramOriginal.nombre}`);
          return;
        }

        const toleranceData = {
          ...tolerance,
          variables_proceso_id: param.variable_proceso_id, // Backend espera PLURAL: variables_proceso_id
        };

        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(toleranceData),
          });
          
          if (!res.ok) {
            throw new Error(`Error guardando tolerancia para ${variableId}`);
          }
          
          console.log(`✅ Tolerancia guardada para ${variableId}`);
        } catch (error) {
          console.error(`❌ Error guardando tolerancia para ${variableId}:`, error);
          throw error;
        }
      });

      // Esperar a que todas las tolerancias se guarden
      await Promise.all(tolerancePromises);
      console.log("✅ Todas las tolerancias guardadas exitosamente");

      alert("✅ Parámetros y tolerancias guardados exitosamente.")
    } catch (e: any) {
      setError(`Error al guardar cambios: ${e.message}`)
      alert(`Error al guardar cambios: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Agregar sistema</h1>
              <p className="mt-2 text-sm text-gray-600">Usuarios, plantas, sistemas.</p>
            </div>

            <form onSubmit={handleSaveParameters}>
              <div className="space-y-8">
                {/* --- Selección Jerárquica --- */}
                <div>
                  <h2 className="text-lg font-medium leading-6 text-gray-900">Selección Jerárquica</h2>
                  <p className="mt-1 text-sm text-gray-500">Seleccione Cliente, Planta y Sistema para gestionar parámetros.</p>
                  <div className="mt-6 flex flex-col space-y-6">
                    {/* Empresa */}
                    <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                      <Label className="pt-2 text-sm font-medium text-gray-700">Empresa</Label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Select value={selectedEmpresa?.id ?? ""} onValueChange={handleSelectEmpresa}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccione una empresa" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#f6f6f6] text-gray-900">
                              {empresas.map((empresa) => (
                                <SelectItem key={empresa.id} value={empresa.id}>
                                  {empresa.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            onClick={() => setShowCreateEmpresa(true)} 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Agregar Empresa
                          </Button>
                          {selectedEmpresa && (
                            <Button 
                              type="button" 
                              onClick={() => handleOpenEditEmpresa(selectedEmpresa)} 
                              className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                              disabled={loading}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Seleccione la empresa para ver las plantas asociadas.</p>
                        
                        {/* Formulario para crear empresa */}
                        {showCreateEmpresa && (
                          <div className="space-y-3 rounded-xl border-2 border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                placeholder="Nombre de la empresa *"
                                value={newEmpresaName}
                                onChange={(e) => setNewEmpresaName(e.target.value)}
                                className="border-blue-200 focus:border-blue-400"
                              />
                              <Select value={newEmpresaEstatus} onValueChange={setNewEmpresaEstatus}>
                                <SelectTrigger className="border-blue-200 focus:border-blue-400">
                                  <SelectValue placeholder="Estatus" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#f6f6f6] text-gray-900">
                                  <SelectItem value="activa">Activa</SelectItem>
                                  <SelectItem value="inactiva">Inactiva</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                  setShowCreateEmpresa(false)
                                  setNewEmpresaName("")
                                  setNewEmpresaEstatus("activa")
                                }}
                                disabled={loading}
                                className="px-4 py-2"
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="button" 
                                onClick={handleCreateEmpresa} 
                                disabled={loading || !newEmpresaName.trim()} 
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                              >
                                {loading ? "Guardando..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Planta */}
                    {selectedEmpresa && (
                      <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                        <Label className="pt-2 text-sm font-medium text-gray-700">Planta</Label>
                        <div className="flex flex-col gap-3">
                          {plants.length === 0 && selectedEmpresa ? (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                ⚠️ No se encontraron plantas asociadas a la empresa seleccionada ({selectedEmpresa.nombre}).
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Verifica que las plantas tengan un <code>empresa_id</code> asignado en la base de datos, o crea una nueva planta.
                              </p>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Select value={selectedPlant?.id} onValueChange={handleSelectPlant} disabled={plants.length === 0}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={plants.length === 0 ? "No hay plantas disponibles" : "Seleccione una planta"} />
                              </SelectTrigger>
                              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                                {plants.map((plant) => (
                                  <SelectItem key={plant.id} value={plant.id}>
                                    {plant.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                              <div className="flex gap-2">
                                <Button type="button" onClick={() => setShowCreatePlant(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                                  <Plus className="mr-2 h-4 w-4" /> Crear Planta
                                </Button>
                                {selectedPlant && (
                                  <>
                                    <Button 
                                      type="button" 
                                      onClick={() => handleOpenEditPlant(selectedPlant)} 
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                                    >
                                      <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Button>
                                    <Button 
                                      type="button" 
                                      onClick={() => handleDeletePlant(selectedPlant)} 
                                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                                      disabled={loading}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Borrar Planta
                                    </Button>
                                  </>
                                )}
                              </div>
                          </div>
                           {showCreatePlant && (
                             <div className="space-y-3 rounded-xl border-2 border-green-200 p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <Input
                                   placeholder="Nombre de la nueva planta *"
                                   value={newPlantName}
                                   onChange={(e) => setNewPlantName(e.target.value)}
                                   className="border-green-200 focus:border-green-400"
                                 />
                                 <Input
                                   placeholder="Destinatario de reportes *"
                                   value={newPlantRecipient}
                                   onChange={(e) => setNewPlantRecipient(e.target.value)}
                                   className="border-green-200 focus:border-green-400"
                                 />
                               </div>
                               <div className="grid grid-cols-1 gap-3">
                                 <Input
                                   placeholder="Mensaje para el cliente (opcional)"
                                   value={newPlantMessage}
                                   onChange={(e) => setNewPlantMessage(e.target.value)}
                                   className="border-green-200 focus:border-green-400"
                                 />
                               </div>
                               <div className="flex justify-end">
                                 <Button 
                                   type="button" 
                                   onClick={handleCreatePlant} 
                                   disabled={loading || !newPlantName.trim() || !newPlantRecipient.trim()} 
                                   className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                                 >
                                   Guardar
                                 </Button>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {/* Orden de parámetros de la planta (pestaña expandible, antes del desglose de sistemas) */}
                    {selectedPlant && (
                      <Collapsible open={ordenParametrosOpen} onOpenChange={setOrdenParametrosOpen} className="mt-4">
                        <div className="rounded-xl border-2 border-slate-200 bg-slate-50/80 overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/80 transition-colors"
                              aria-expanded={ordenParametrosOpen}
                              aria-label={ordenParametrosOpen ? "Cerrar orden de parámetros" : "Abrir orden de parámetros"}
                            >
                              <span className="text-sm font-semibold text-slate-800">Orden de parámetros de la planta</span>
                              {ordenParametrosOpen ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t border-slate-200 p-4">
                              <p className="text-xs text-slate-600 mb-3">
                                Define el orden en que se mostrarán los parámetros en reportes y dashboards para esta planta. Usa las flechas para reordenar.
                              </p>
                              {errorOrdenVariables && (
                                <p className="text-sm text-red-600 mb-2" role="alert">{errorOrdenVariables}</p>
                              )}
                              {loadingOrdenVariables ? (
                                <p className="text-sm text-slate-500">Cargando orden...</p>
                              ) : plantOrderVariables.length === 0 ? (
                                <p className="text-sm text-slate-500">No hay parámetros en los sistemas de esta planta. Añade parámetros a algún sistema para configurar el orden.</p>
                              ) : (
                                <>
                                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-slate-100">
                                          <TableHead className="w-12">#</TableHead>
                                          <TableHead>Nombre</TableHead>
                                          <TableHead>Unidad</TableHead>
                                          <TableHead className="w-24 text-center">Orden</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {plantOrderVariables.map((v, index) => (
                                          <TableRow key={v.id}>
                                            <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                                            <TableCell>{v.nombre}</TableCell>
                                            <TableCell>{v.unidad || "—"}</TableCell>
                                            <TableCell>
                                              <div className="flex items-center justify-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleMoveOrdenVariableUp(index)}
                                                  disabled={index === 0}
                                                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                  aria-label={`Subir ${v.nombre}`}
                                                >
                                                  <ChevronUp className="h-4 w-4" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleMoveOrdenVariableDown(index)}
                                                  disabled={index === plantOrderVariables.length - 1}
                                                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                  aria-label={`Bajar ${v.nombre}`}
                                                >
                                                  <ChevronDown className="h-4 w-4" />
                                                </button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      type="button"
                                      onClick={handleSaveOrdenVariables}
                                      disabled={savingOrdenVariables}
                                      className="bg-slate-700 hover:bg-slate-800 text-white"
                                    >
                                      {savingOrdenVariables ? "Guardando…" : "Guardar orden"}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    {/* Sistema */}
                    {selectedPlant && (
                      <div>
                        <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                          <Label className="pt-2 text-sm font-medium text-gray-700">Sistema</Label>
                           <div className="flex items-center justify-between">
                             <Button type="button" onClick={() => setShowCreateSystem(true)} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                               <Plus className="mr-2 h-4 w-4" /> Crear Sistema
                             </Button>
                           </div>
                        </div>
                      </div>
                    )}

                    {selectedPlant && systems.length > 0 && (
                      <div className="mt-4">
                        {/*<div className="flex border rounded overflow-x-auto whitespace-nowrap no-scrollbar max-w-full">
                          {systems.map((system) => (
                            <button
                              key={system.id}
                              onClick={() => setSelectedSystemId(system.id)}
                              className={`px-4 py-2 text-sm font-medium ${
                                selectedSystemId === system.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {system.nombre}
                            </button>
                          ))}
                        </div>*/}
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {systems.map((system) => (
                             <div key={system.id} className="flex flex-col h-full">
                               <div
                                 onClick={() => setSelectedSystemId(system.id)}
                                 className={`flex flex-col h-full justify-between px-4 py-4 text-sm font-medium rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-lg ${
                                   selectedSystemId === system.id
                                     ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg transform scale-105'
                                     : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                 }`}
                               >
                                 <div className="flex-grow flex items-center justify-center text-center font-semibold">{system.nombre}</div>
                                 <div className="flex justify-center items-center gap-1 mt-3 pt-3 border-t border-gray-300 border-opacity-30">
                                   {/* Botones de orden */}
                                   <div className="flex flex-col gap-1">
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleMoveSystemUp(system);
                                       }}
                                       disabled={systems.findIndex(s => s.id === system.id) === 0 || loading}
                                       className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                       aria-label={`Mover ${system.nombre} hacia arriba`}
                                       title="Mover hacia arriba"
                                     >
                                       <ChevronUp className="h-3 w-3" />
                                     </button>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleMoveSystemDown(system);
                                       }}
                                       disabled={systems.findIndex(s => s.id === system.id) === systems.length - 1 || loading}
                                       className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                       aria-label={`Mover ${system.nombre} hacia abajo`}
                                       title="Mover hacia abajo"
                                     >
                                       <ChevronDown className="h-3 w-3" />
                                     </button>
                                   </div>
                                   <div className="w-2"></div>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleOpenEditSystem(system);
                                     }}
                                     className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center transition-colors"
                                     aria-label={`Editar nombre de ${system.nombre}`}
                                   >
                                     <Edit className="h-3 w-3 mr-1" />
                                   </button>
                                   <div className="w-2"></div>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleDeleteSystem(system);
                                     }}
                                     className="px-3 py-2 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 flex items-center transition-colors"
                                     aria-label={`Eliminar ${system.nombre}`}
                                   >
                                     <Trash2 className="h-3 w-3 mr-1" />
                                   </button>
                                 </div>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                     {showCreateSystem && (
                       <div className="mt-4 grid w-full grid-cols-[1fr_1fr_auto] gap-3 rounded-xl border-2 border-purple-200 p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                         <Input
                           placeholder="Nombre del sistema"
                           value={newSystemName}
                           onChange={(e) => setNewSystemName(e.target.value)}
                           className="border-purple-200 focus:border-purple-400"
                         />
                         <Input
                           placeholder="Descripción"
                           value={newSystemDescription}
                           onChange={(e) => setNewSystemDescription(e.target.value)}
                           className="border-purple-200 focus:border-purple-400"
                         />
                         <Button type="button" onClick={handleCreateSystem} disabled={loading || !newSystemName.trim()} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                           Guardar
                         </Button>
                       </div>
                     )}

                    {/* Edit System Dialog */}
                    <Dialog open={showEditSystemDialog} onOpenChange={setShowEditSystemDialog}>
                      <DialogContent className="bg-[#f6f6f6] text-gray-900">
                        <DialogHeader>
                          <DialogTitle>Editar Nombre del Sistema</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-system-name" className="text-right">
                              Nombre
                            </Label>
                            <Input
                              id="edit-system-name"
                              value={editSystemName}
                              onChange={(e) => setEditSystemName(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowEditSystemDialog(false)}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleUpdateSystem}
                            disabled={loading || !editSystemName.trim()}
                          >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Edit Plant Dialog */}
                    <Dialog open={showEditPlantDialog} onOpenChange={setShowEditPlantDialog}>
                      <DialogContent className="bg-[#f6f6f6] text-gray-900 max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Información de la Planta</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-plant-name" className="text-right">
                              Nombre *
                            </Label>
                            <Input
                              id="edit-plant-name"
                              value={editPlantName}
                              onChange={(e) => setEditPlantName(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-plant-recipient" className="text-right">
                              Destinatario de Reportes *
                            </Label>
                            <Input
                              id="edit-plant-recipient"
                              value={editPlantRecipient}
                              onChange={(e) => setEditPlantRecipient(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-plant-message" className="text-right pt-2">
                              Mensaje para el Cliente
                            </Label>
                            <div className="col-span-3">
                              <Input
                                id="edit-plant-message"
                                value={editPlantMessage}
                                onChange={(e) => setEditPlantMessage(e.target.value)}
                                placeholder="Mensaje opcional para el cliente"
                                className="w-full"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Este mensaje aparecerá en los reportes enviados al cliente
                              </p>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowEditPlantDialog(false)}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleUpdatePlant}
                            disabled={loading || !editPlantName.trim() || !editPlantRecipient.trim()}
                          >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Edit Empresa Dialog */}
                    <Dialog open={showEditEmpresaDialog} onOpenChange={setShowEditEmpresaDialog}>
                      <DialogContent className="bg-[#f6f6f6] text-gray-900 max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Información de la Empresa</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-empresa-name" className="text-right">
                              Nombre *
                            </Label>
                            <Input
                              id="edit-empresa-name"
                              value={editEmpresaName}
                              onChange={(e) => setEditEmpresaName(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-empresa-estatus" className="text-right">
                              Estatus *
                            </Label>
                            <Select value={editEmpresaEstatus} onValueChange={setEditEmpresaEstatus}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Estatus" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                                <SelectItem value="activa">Activa</SelectItem>
                                <SelectItem value="inactiva">Inactiva</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowEditEmpresaDialog(false)}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleUpdateEmpresa}
                            disabled={loading || !editEmpresaName.trim()}
                          >
                            {loading ? "Guardando..." : "Guardar Cambios"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* --- Add New Parameter Form --- */}
                {selectedSystemId && (
                  <div className="border-t border-gray-200 pt-6 bg-blue-50 p-6 rounded-lg">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Agregar Nuevo Parámetro</h2>
                    
                    {/* Opción para importar de otro sistema */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-md font-semibold text-purple-800">📋 Importar de Otro Sistema</h3>
                        <Button
                          type="button"
                          onClick={() => setShowImportFromSystem(!showImportFromSystem)}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                        >
                          {showImportFromSystem ? "Ocultar" : "Mostrar"}
                        </Button>
                      </div>
                      
                      {showImportFromSystem && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="source-system">Seleccionar Sistema Fuente</Label>
                            <Select
                              value={selectedSourceSystemId}
                              onValueChange={setSelectedSourceSystemId}
                            >
                              <SelectTrigger className="w-full bg-white text-gray-900 border border-gray-300 rounded-md">
                                <SelectValue placeholder="Selecciona un sistema para importar sus parámetros" />
                              </SelectTrigger>
                              <SelectContent className="bg-white text-gray-900">
                                {systems
                                  .filter(system => system.id !== selectedSystemId) // Excluir el sistema actual
                                  .map((system) => (
                                    <SelectItem key={system.id} value={system.id}>
                                      {system.nombre}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {selectedSourceSystemId && sourceSystemParameters.length > 0 && (
                            <div className="bg-white p-3 rounded border">
                              <h4 className="font-medium text-gray-700 mb-2">
                                Parámetros disponibles en {systems.find(s => s.id === selectedSourceSystemId)?.nombre}:
                              </h4>
                              <div className="space-y-2">
                                {sourceSystemParameters.map((param, index) => {
                                  return (
                                    <div key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                        {param.nombre} ({param.unidad})
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t">
                                <Button
                                  type="button"
                                  onClick={handleImportFromSystem}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                                >
                                  📥 Importar Parámetros
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {selectedSourceSystemId && sourceSystemParameters.length === 0 && (
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                              <p className="text-sm text-yellow-700">
                                El sistema seleccionado no tiene parámetros para importar.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Droplist de variables existentes */}
                    {allVariables.length > 0 && (
                      <div className="mb-4">
                        <Label htmlFor="import-variable">Importar variable existente</Label>
                        <Select
                          value={selectedImportVariableId}
                          onValueChange={setSelectedImportVariableId}
                        >
                          <SelectTrigger className="w-full bg-[#f6f6f6] text-gray-900 border border-gray-300 rounded-md">
                            <SelectValue placeholder="Selecciona una variable existente" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#f6f6f6] text-gray-900">
                            {getAvailableVariables().map((variable) => (
                              <SelectItem key={variable.id} value={variable.id}>
                                {variable.nombre} ({variable.unidad})
                                {!variable.proceso_id && " - Global"}
                                {variable.proceso_id && variable.proceso_id !== selectedSystemId && " - De otro sistema"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {getAvailableVariables().length === 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            No hay variables disponibles para importar. Todas las variables ya están en este sistema o no hay variables globales.
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="new-param-name">Nombre del Parámetro</Label>
                        <Input
                          id="new-param-name"
                          placeholder="Ej. Temperatura"
                          value={newParameterName}
                          onChange={(e) => setNewParameterName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-param-unit">Unidad de Medida</Label>
                        <Input
                          id="new-param-unit"
                          placeholder="Ej. °C"
                          value={newParameterUnit}
                          onChange={(e) => setNewParameterUnit(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="button" onClick={handleAddParameter} className="mt-4" disabled={!selectedSystemId || loading}>
                      <Plus className="mr-2 h-4 w-4" /> Agregar Parámetro a la lista
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      ⚠️ Recuerde hacer clic en <strong>"Guardar Cambios"</strong> al final del formulario para guardar los parámetros en la base de datos.
                    </p>
                  </div>
                )}

                {/* --- Parámetros del Sistema --- */}
                {selectedSystemId && (
                    <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Parámetros del Sistema</h2>
                    {/* Leyenda de estados para los parámetros */}
                    <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400"></span>
                          <span className="font-semibold text-yellow-700">Limite-(min,max)</span>: Cerca del límite recomendado
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-4 h-4 inline-block rounded bg-green-100 border-green-400"></span>
                          <span className="font-semibold text-green-700">Bien</span>: Dentro de rango
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Parámetros para el sistema seleccionado:{" "}
                      <span className="font-semibold">{systems.find((s) => s.id === selectedSystemId)?.nombre || "N/A"}</span>
                    </p>
                    <div className="mt-6">
                      {parameters.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Unidad</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              // Orden según planta: solo parámetros de este sistema, en el orden de plantOrderVariables (si no está en el orden, al final por nombre)
                              const orderMap = new Map(plantOrderVariables.map((v, i) => [v.id, i]));
                              const sorted = [...parameters].sort((a, b) => {
                                const ia = orderMap.get(a.id) ?? 99999;
                                const ib = orderMap.get(b.id) ?? 99999;
                                if (ia !== ib) return ia - ib;
                                return (a.nombre || "").localeCompare(b.nombre || "");
                              });
                              return sorted;
                            })().map((param) => {
                              const usarLimiteMin = !!tolerancias[param.id]?.usar_limite_min;
                              const usarLimiteMax = !!tolerancias[param.id]?.usar_limite_max;
                              return (
                                <TableRow key={param.id}>
                                  <TableCell className="font-medium">
                                    <span>{param.nombre}</span>
                                  </TableCell>
                                  <TableCell>{param.unidad}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end gap-2">
                                    {/* Inputs de tolerancia: Lim-min | Bien (min/max) | Lim-max */}
                                    <div className="flex flex-row items-end gap-2 flex-wrap">
                                      {/* Bajo bajo */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Bajo bajo</span>
                                          <button type="button" onClick={() => handleTolChange(param.id, 'usar_limite_min', String(!usarLimiteMin))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMin ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                        </div>
                                        <Input type="number" className={`w-20 min-w-[80px] text-xs py-1 px-1 ${usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="min" value={tolerancias[param.id]?.limite_min ?? ''} onChange={e => handleTolChange(param.id, 'limite_min', e.target.value)} disabled={!usarLimiteMin} />
                                      </div>
                                      {/* Bien (min/max) con letrero centrado */}
                                      <div className="flex flex-col items-center" style={{minWidth: '90px'}}>
                                        <span className="text-xs font-semibold text-green-700 text-center w-full mb-1">Bien</span>
                                        <div className="flex flex-row gap-1">
                                          <Input type="number" className="w-20 min-w-[80px] bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[param.id]?.bien_min ?? ''} onChange={e => handleTolChange(param.id, 'bien_min', e.target.value)} />
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-center" style={{minWidth: '90px'}}>
                                        <span className="text-xs font-semibold text-green-700 text-center w-full mb-1">Alto</span>
                                        <div className="flex flex-row gap-1">
                                          <Input type="number" className="w-20 min-w-[80px] bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[param.id]?.bien_max ?? ''} onChange={e => handleTolChange(param.id, 'bien_max', e.target.value)} />
                                        </div>
                                      </div>
                                      {/* Lim-max */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Alto alto</span>
                                          <button type="button" onClick={() => handleTolChange(param.id, 'usar_limite_max', String(!usarLimiteMax))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMax ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                        </div>
                                        <Input type="number" className={`w-20 min-w-[80px] text-xs py-1 px-1 ${usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="max" value={tolerancias[param.id]?.limite_max ?? ''} onChange={e => handleTolChange(param.id, 'limite_max', e.target.value)} disabled={!usarLimiteMax} />
                                      </div>
                                     
                                    </div>
                                    {/* Mensajes de error/éxito */}
                                    <div className="flex flex-col items-end">
                                      {tolError[param.id] && <div className="text-xs text-red-600">{tolError[param.id]}</div>}
                                      {tolSuccess[param.id] && <div className="text-xs text-green-600">{tolSuccess[param.id]}</div>}
                                    </div>
                                    {/* Botones de acciones */}
                                    <div className="flex flex-row items-center gap-1 flex-shrink-0">
                                     {/* Botón guardar límites */}
                                     <Button 
                                        size="icon" 
                                        variant="ghost"
                                        className="h-7 w-7 p-0 flex items-center justify-center" 
                                        onClick={() => handleTolSave(param.id)} 
                                        disabled={tolLoading[param.id]} 
                                        title="Guardar límites">
                                        <span className="material-icons text-base">save</span>
                                    </Button>
                                    {/* Botón resetear límites */}
                                    <Button 
                                        size="icon" 
                                        variant="ghost"
                                        className="h-7 w-7 p-0 flex items-center justify-center text-orange-500 hover:text-orange-700" 
                                        onClick={() => handleResetTolerance(param.id)} 
                                        disabled={tolLoading[param.id]} 
                                        title="Resetear límites">
                                        <span className="material-icons text-base">refresh</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenEditModal(param)}
                                      className="h-7 w-7 text-blue-500 hover:text-blue-700"
                                      aria-label={`Editar ${param.nombre}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteParameter(param.id)}
                                      className="h-7 w-7 text-red-500 hover:text-red-700"
                                      aria-label={`Eliminar ${param.nombre}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-sm text-gray-500">
                          <p>No hay parámetros para este sistema. ¡Agrega uno!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
              
              {/* --- Action Buttons --- */}
              {selectedSystemId && (
                <div className="mt-8 pt-5 border-t border-gray-200">
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || parameters.filter((p) => p.isNew).length === 0}>
                      {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
        {/* Edit Parameter Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg sm:w-full p-0 overflow-hidden rounded-lg shadow-xl bg-white">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Parámetro</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Nombre</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-unit">Unidad</Label>
                    <Input
                      id="edit-unit"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 flex justify-end gap-3 sm:px-6">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-500 text-white">
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
