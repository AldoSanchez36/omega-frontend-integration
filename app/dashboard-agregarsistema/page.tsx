"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit, Save, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
interface User {
  id: string
  username: string
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
}

interface Parameter {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
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
  const [users, setUsers] = useState<User[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [parameters, setParameters] = useState<Parameter[]>([])

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
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
  const [sourceSystemTolerances, setSourceSystemTolerances] = useState<Record<string, any>>({});

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
    setTolerancias((prev) => ({
      ...prev,
      [variableId]: {
        ...prev[variableId],
        [field]: (field === 'usar_limite_min' || field === 'usar_limite_max') ? value === 'true' : (value === '' ? '' : Number(value)),
        variable_id: variableId,
        proceso_id: selectedSystemId,
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
      proceso_id: selectedSystemId,
      planta_id: selectedPlant?.id,
      cliente_id: selectedUser?.id,
    }
    try {
      if (tol && tol.id) {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCE_UPDATE(tol.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        if (!res.ok) throw new Error("Error al actualizar tolerancia")
        showSuccessMessage(variableId)
      } else {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        if (!res.ok) throw new Error("Error al crear tolerancia")
        showSuccessMessage(variableId)
      }
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message }))
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
    }
  }

  // Estado para el usuario y el rol
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")

  // Fetch Users
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

    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USERS}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to fetch users")
        }
        const data = await res.json()
        setUsers(data.usuarios || [])
        // NO SE DEBE SELECCIONAR USUARIO AQUÍ
      } catch (e: any) {
        setError(`Error al cargar usuarios: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token])

  // Handlers for selection changes
  const handleSelectUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSelectedUser(user)
    setSelectedPlant(null)
    setSelectedSystemId(null)
    setPlants([])
    setSystems([])
    setParameters([])
    if (!user) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`, {
        headers: { Authorization: `Bearer ${token}`, "x-usuario-id": user.id },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar las plantas para el usuario.")
      }
      const data = await res.json()
      setPlants(data.plantas || [])
      if (data.plantas.length > 0) {
        const firstPlant = data.plantas[0]
        handleSelectPlant(firstPlant.id)
      } else {
        setSelectedPlant(null)
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
      setSystems(data.procesos || [])
      if (data.procesos.length > 0 && !data.procesos.some((sys: System) => sys.id === selectedSystemId)) {
        setSelectedSystemId(data.procesos[0].id) // Select the first system by default if current is invalid
      } else if (data.procesos.length === 0) {
        setSelectedSystemId(null)
      }
    } catch (e: any) {
      setError(`Error al cargar sistemas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlant = async () => {
    if (!newPlantName.trim() || !newPlantRecipient.trim() || !selectedUser) {
      alert("Por favor, complete todos los campos obligatorios: nombre de la planta, destinatario de reportes y seleccione un usuario.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const plantData = {
        nombre: newPlantName,
        dirigido_a: newPlantRecipient,
        mensaje_cliente: newPlantMessage.trim() || null, // Enviar null si está vacío
        usuario_id: selectedUser.id,
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
      await handleSelectUser(selectedUser.id) // Refetch plants for the selected user
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
      if (selectedUser) {
        await handleSelectUser(selectedUser.id)
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
      if (selectedUser) {
        await handleSelectUser(selectedUser.id)
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
      // Mapea cada variable para añadir campos de límites con valores predeterminados.
      const mappedParams =
        (data.variables || []).map((p: any) => ({
          ...p,
          // Si el backend ya devuelve estos campos, se conservarán; de lo contrario se inicializan.
          limMin: p.limMin ?? "",
          limMinActive: p.limMinActive ?? false,
          limMax: p.limMax ?? "",
          limMaxActive: p.limMaxActive ?? false,
          goodMin: p.goodMin ?? "",
          goodMax: p.goodMax ?? "",
        })) || []
      setParameters(mappedParams)
    } catch (e: any) {
      setError(`Error al cargar parámetros: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedSystemId, token])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

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
        const map: Record<string, any> = {}
        if (Array.isArray(data)) {
          data.forEach((tol) => {
            if (parameters.some(p => p.id === tol.variable_id) && tol.proceso_id === selectedSystemId) {
              map[tol.variable_id] = tol
            }
          })
        } else if (Array.isArray(data.tolerancias)) {
          data.tolerancias.forEach((tol: any) => {
            if (parameters.some(p => p.id === tol.variable_id) && tol.proceso_id === selectedSystemId) {
              map[tol.variable_id] = tol
            }
          })
        }
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
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: newSystemName,
          descripcion: newSystemDescription,
          planta_id: selectedPlant.id,
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
    const newParam: Parameter = {
      id: uuidv4(), // Generate a unique ID for client-side tracking
      nombre: newParameterName.trim(),
      unidad: newParameterUnit.trim(),
      proceso_id: selectedSystemId,
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

      // Cargar tolerancias del sistema fuente
      const tolerancesRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (tolerancesRes.ok) {
        const tolerancesData = await tolerancesRes.json();
        const tolerancesArray = Array.isArray(tolerancesData) ? tolerancesData : tolerancesData.tolerancias || [];
        
        // Filtrar solo las tolerancias del sistema fuente
        const systemTolerances: Record<string, any> = {};
        tolerancesArray.forEach((tol: any) => {
          if (tol.proceso_id === systemId && parameters.some((p: any) => p.id === tol.variable_id)) {
            systemTolerances[tol.variable_id] = tol;
          }
        });
        
        setSourceSystemTolerances(systemTolerances);
        console.log(`📊 Tolerancias cargadas del sistema ${systemId}:`, systemTolerances);
      }
    } catch (error) {
      console.error("Error cargando datos del sistema fuente:", error);
      setSourceSystemParameters([]);
      setSourceSystemTolerances({});
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

    // Agregar los parámetros al sistema actual
    const newParameters: Parameter[] = parametersToImport.map(param => ({
      ...param,
      id: uuidv4(), // Nuevo ID para evitar conflictos
      proceso_id: selectedSystemId, // Cambiar al sistema actual
      isNew: true, // Marcar como nuevo para guardar
    }));

    setParameters(prev => [...prev, ...newParameters]);

    // Importar las tolerancias correspondientes
    const newTolerances: Record<string, any> = {};
    parametersToImport.forEach(param => {
      const originalParam = sourceSystemParameters.find(p => p.nombre === param.nombre);
      if (originalParam && sourceSystemTolerances[originalParam.id]) {
        const originalTolerance = sourceSystemTolerances[originalParam.id];
        newTolerances[param.id] = {
          ...originalTolerance,
          id: undefined, // Remover ID para crear nueva tolerancia
          variable_id: param.id, // Usar el nuevo ID del parámetro
          proceso_id: selectedSystemId, // Cambiar al sistema actual
          planta_id: selectedPlant?.id,
          cliente_id: selectedUser?.id,
        };
      }
    });

    // Agregar las nuevas tolerancias al estado
    setTolerancias(prev => ({
      ...prev,
      ...newTolerances
    }));
    
    // Cerrar el modal y limpiar selección
    setShowImportFromSystem(false);
    setSelectedSourceSystemId("");
    setSourceSystemParameters([]);
    setSourceSystemTolerances({});
    
    const toleranceCount = Object.keys(newTolerances).length;
    alert(`✅ Se importaron ${newParameters.length} parámetros y ${toleranceCount} tolerancias del sistema fuente.`);
    console.log(`📥 Parámetros importados:`, newParameters);
    console.log(`📊 Tolerancias importadas:`, newTolerances);
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
          }),
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || `Error guardando el parámetro ${param.nombre}`)
        }
      }
      console.log("✅ Parámetros guardados exitosamente");

      // 2. Refetch parámetros para obtener los IDs del servidor
      await fetchParameters();

      // 3. Guardar tolerancias automáticamente
      console.log("💾 Guardando tolerancias...");
      const tolerancePromises = Object.entries(tolerancias).map(async ([variableId, tolerance]) => {
        // Solo guardar tolerancias de parámetros nuevos
        const isNewParameter = newParamsToSave.some(p => p.id === variableId);
        if (!isNewParameter) return;

        const toleranceData = {
          ...tolerance,
          variable_id: variableId,
          proceso_id: selectedSystemId,
          planta_id: selectedPlant?.id,
          cliente_id: selectedUser?.id,
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
                    {/* Cliente (Usuario) */}
                    <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                      <Label className="pt-2 text-sm font-medium text-gray-700">Cliente (Usuario)</Label>
                      <div className="flex flex-col">
                        <Select value={selectedUser?.id ?? ""} onValueChange={handleSelectUser}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione un usuario" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#f6f6f6] text-gray-900">
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-sm text-gray-500">Seleccione el usuario para ver las plantas asociadas.</p>
                      </div>
                    </div>

                    {/* Planta */}
                    {selectedUser && (
                      <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                        <Label className="pt-2 text-sm font-medium text-gray-700">Planta</Label>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <Select value={selectedPlant?.id} onValueChange={handleSelectPlant} disabled={plants.length === 0}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione una planta" />
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
                                 <div className="flex justify-center mt-3 pt-3 border-t border-gray-300 border-opacity-30">
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
                                  const hasTolerance = sourceSystemTolerances[param.id];
                                  return (
                                    <div key={index} className="text-sm text-gray-600 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                        {param.nombre} ({param.unidad})
                                      </div>
                                      {hasTolerance && (
                                        <div className="flex items-center gap-1 text-xs text-green-600">
                                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                          Con límites
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs text-gray-500 mb-2">
                                  {Object.keys(sourceSystemTolerances).length > 0 && (
                                    <span className="text-green-600">
                                      ✅ {Object.keys(sourceSystemTolerances).length} parámetros incluyen límites de tolerancia
                                    </span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  onClick={handleImportFromSystem}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                                >
                                  📥 Importar Parámetros y Límites
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
                            {parameters.map((param) => {
                              const usarLimiteMin = !!tolerancias[param.id]?.usar_limite_min;
                              const usarLimiteMax = !!tolerancias[param.id]?.usar_limite_max;
                              return (
                                <TableRow key={param.id}>
                                  <TableCell className="font-medium">{param.nombre}</TableCell>
                                  <TableCell>{param.unidad}</TableCell>
                                  <TableCell className="text-right flex gap-2 justify-end items-center">
                                    {/* Inputs de tolerancia: Lim-min | Bien (min/max) | Lim-max */}
                                    <div className="flex flex-row items-end gap-2">
                                      {/* Bajo bajo */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Bajo bajo</span>
                                          <button type="button" onClick={() => handleTolChange(param.id, 'usar_limite_min', String(!usarLimiteMin))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMin ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                        </div>
                                        <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="min" value={tolerancias[param.id]?.limite_min ?? ''} onChange={e => handleTolChange(param.id, 'limite_min', e.target.value)} disabled={!usarLimiteMin} />
                                      </div>
                                      {/* Bien (min/max) con letrero centrado */}
                                      <div className="flex flex-col items-center" style={{minWidth: '60px'}}>
                                        <span className="text-xs font-semibold text-green-700 text-center w-full mb-1">Bien</span>
                                        <div className="flex flex-row gap-1">
                                          <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[param.id]?.bien_min ?? ''} onChange={e => handleTolChange(param.id, 'bien_min', e.target.value)} />
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-center" style={{minWidth: '60px'}}>
                                        <span className="text-xs font-semibold text-green-700 text-center w-full mb-1">Alto</span>
                                        <div className="flex flex-row gap-1">
                                          <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[param.id]?.bien_max ?? ''} onChange={e => handleTolChange(param.id, 'bien_max', e.target.value)} />
                                        </div>
                                      </div>
                                      {/* Lim-max */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Alto alto</span>
                                          <button type="button" onClick={() => handleTolChange(param.id, 'usar_limite_max', String(!usarLimiteMax))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMax ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                        </div>
                                        <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="max" value={tolerancias[param.id]?.limite_max ?? ''} onChange={e => handleTolChange(param.id, 'limite_max', e.target.value)} disabled={!usarLimiteMax} />
                                      </div>
                                     
                                    </div>
                                    <div className="flex flex-col items-center justify-end">
                                      {tolError[param.id] && <div className="text-xs text-red-600">{tolError[param.id]}</div>}
                                      {tolSuccess[param.id] && <div className="text-xs text-green-600">{tolSuccess[param.id]}</div>}
                                    </div>
                                    {/* Acciones originales */}
                                     {/* Botón guardar límites */}
                                     <Button 
                                        size="icon" 
                                        variant="ghost"
                                        className="ml-2 h-7 w-7 p-0 flex items-center justify-center" 
                                        onClick={() => handleTolSave(param.id)} 
                                        disabled={tolLoading[param.id]} 
                                        title="Guardar límites">
                                        <span className="material-icons text-base">save</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenEditModal(param)}
                                      className="h-8 w-8 text-blue-500 hover:text-blue-700"
                                      aria-label={`Editar ${param.nombre}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteParameter(param.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                      aria-label={`Eliminar ${param.nombre}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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
