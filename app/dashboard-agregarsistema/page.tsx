"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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
import { useUserAccess } from "@/hooks/useUserAccess"

import SelectionSection from "./components/SelectionSection"
import ParametersSection from "./components/ParametersSection"
import AddParameterSection from "./components/AddParameterSection"



// Interfaces
interface User {
  id: string
  username: string
}

interface Plant {
  id: string
  nombre: string
}

interface System {
  id: string
  nombre: string
  descripcion: string
  planta_id: string
}

// Unified Parameter type for variables in a system
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
// Tolerance model aligned with backend fields
interface Tolerance {
  id?: string
  variable_id: string
  proceso_id: string
  planta_id?: string
  cliente_id?: string
  usar_limite_min?: boolean
  usar_limite_max?: boolean
  limite_min?: number | ''
  limite_max?: number | ''
  bien_min?: number | ''
  bien_max?: number | ''
}

type UserRole = "admin" | "user" | "client"

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function ParameterManager() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
  // Access hook centralizado (usuarios, plantas, sistemas, rol)
  // Si el hook no está disponible o retorna undefined en partes, la página usa la lógica local como respaldo.
  // @ts-ignore - la firma exacta del hook puede variar; usamos any para integrar sin romper
  const access: any = useUserAccess?.(token)

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
  const [showEditPlantDialog, setShowEditPlantDialog] = useState(false)
  const [editPlantName, setEditPlantName] = useState("")
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
  // Estado para variables globales / existentes
  const [allVariables, setAllVariables] = useState<Parameter[]>([])
  const [selectedImportVariableId, setSelectedImportVariableId] = useState<string>("")

  // Edit parameter modal state
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [editName, setEditName] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  // Sincroniza estado local desde el hook de acceso (si está disponible)
  useEffect(() => {
    if (!access) return
    if (Array.isArray(access.users)) setUsers(access.users)
    if (Array.isArray(access.plants)) setPlants(access.plants)
    if (Array.isArray(access.systems)) setSystems(access.systems)
    if (typeof access.userRole === 'string') setUserRole(access.userRole)
    if (access.selectedUser !== undefined) setSelectedUser(access.selectedUser || null)
    if (access.selectedPlant !== undefined) setSelectedPlant(access.selectedPlant || null)
    if (access.selectedSystemId !== undefined) setSelectedSystemId(access.selectedSystemId || null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    access?.users,
    access?.plants,
    access?.systems,
    access?.userRole,
    access?.selectedUser,
    access?.selectedPlant,
    access?.selectedSystemId
  ])
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


  // --- Tolerancias (como en dashboard-parameters) ---
  const [tolerancias, setTolerancias] = useState<Record<string, any>>({})
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({})
  const [tolError, setTolError] = useState<Record<string, string | null>>({})
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({})

  const handleTolChange = (variableId: string, field: string, value: string) => {
    setTolerancias((prev) => ({
      ...prev,
      [variableId]: {
        ...prev[variableId],
        [field]:
          field === 'usar_limite_min' || field === 'usar_limite_max'
            ? value === 'true'
            : value === ''
              ? ''
              : Number(value),
        variable_id: variableId,
        proceso_id: selectedSystemId,
        planta_id: selectedPlant?.id,
        cliente_id: selectedUser?.id,
      },
    }))
  }

  const handleTolSave = async (variableId: string) => {
    setTolLoading((p) => ({ ...p, [variableId]: true }))
    setTolError((p) => ({ ...p, [variableId]: null }))
    setTolSuccess((p) => ({ ...p, [variableId]: null }))

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
        setTolSuccess((p) => ({ ...p, [variableId]: "¡Guardado!" }))
      } else {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        if (!res.ok) throw new Error("Error al crear tolerancia")
        setTolSuccess((p) => ({ ...p, [variableId]: "¡Guardado!" }))
      }
    } catch (e: any) {
      setTolError((p) => ({ ...p, [variableId]: e.message }))
    } finally {
      setTolLoading((p) => ({ ...p, [variableId]: false }))
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
    // Si el hook ya gestiona usuarios/rol, no duplicar carga
    if (access && Array.isArray(access.users)) {
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
  }, [token, access])

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
    if (!newPlantName.trim() || !selectedUser) {
      alert("Por favor, ingrese un nombre para la planta y seleccione un usuario.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: newPlantName,
          usuario_id: selectedUser.id,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo crear la planta.")
      }
      setShowCreatePlant(false)
      setNewPlantName("")
      await handleSelectUser(selectedUser.id) // Refetch plants for the selected user
    } catch (e: any) {
      setError(`Error al crear planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlant = async (plant: Plant) => {
    if (!plant) return

    // Contar sistemas actuales ligados a la planta seleccionada
    const systemsForPlant = systems.filter((s) => s.planta_id === plant.id)
    const sysCount = systemsForPlant.length

    const ok = window.confirm(
      sysCount > 0
        ? `¿Seguro que deseas borrar la planta "${plant.nombre}"?\n\nEsto también eliminará ${sysCount} sistema(s) y sus parámetros/tolerancias asociados. Esta acción no se puede deshacer.`
        : `¿Seguro que deseas borrar la planta "${plant.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!ok) return

    setLoading(true)
    setError(null)
    try {
      // 1) Intento directo de borrar planta
      let res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_DELETE(plant.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      // 2) Si hay error de FK, borrar sistemas y reintentar
      if (!res.ok) {
        let shouldCascade = false
        try {
          const err = await res.json()
          if (err?.code === '23503' || /referenced|foreign key/i.test(err?.message || '')) {
            shouldCascade = true
          }
        } catch {
          // si no hay json, no hacemos nada
        }

        if (shouldCascade && systemsForPlant.length > 0) {
          for (const sys of systemsForPlant) {
            try {
              await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_DELETE_BY_PLANT(plant.id, sys.id)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              })
            } catch {
              // continuamos intentando con el resto
            }
          }
          // Reintentar borrar la planta
          res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_DELETE(plant.id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.message || "No se pudo eliminar la planta.")
        }
      }

      // 3) Éxito: refrescar estado
      if (selectedUser) {
        await handleSelectUser(selectedUser.id)
      } else {
        setPlants((prev) => prev.filter((p) => p.id !== plant.id))
        if (selectedPlant?.id === plant.id) {
          setSelectedPlant(null)
          setSelectedSystemId(null)
          setSystems([])
          setParameters([])
        }
      }
    } catch (e: any) {
      setError(`Error al eliminar planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }
  // Function to open edit plant dialog
  const handleOpenEditPlant = (plant: Plant) => {
    setEditingPlant(plant)
    setEditPlantName(plant.nombre)
    setShowEditPlantDialog(true)
  }

  // Function to update plant name
  const handleUpdatePlant = async () => {
    if (!editPlantName.trim() || !editingPlant) {
      alert("Por favor, ingrese un nombre para la planta.")
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_UPDATE(editingPlant.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: editPlantName,
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo actualizar la planta.")
      }
      
      setShowEditPlantDialog(false)
      setEditPlantName("")
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

  // Cargar tolerancias al cargar parámetros o al cambiar de sistema
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
        const arr = Array.isArray(data) ? data : Array.isArray(data.tolerancias) ? data.tolerancias : []
        const map: Record<string, any> = {}
        const visibleIds = new Set(parameters.map((p) => p.id))
        arr.forEach((tol: any) => {
          if (tol.proceso_id === selectedSystemId && visibleIds.has(tol.variable_id)) {
            map[tol.variable_id] = tol
          }
        })
        setTolerancias(map)
      } catch (e: any) {
        setTolError((p) => ({ ...p, global: e.message }))
      }
    }
    loadTolerances()
  }, [selectedSystemId, parameters, token])

  // Cargar todas las variables existentes (de todos los sistemas)
  useEffect(() => {
    const fetchAllVariables = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        setAllVariables(data.variables || data || [])
      } catch {}
    }
    fetchAllVariables()
  }, [token])

  // Variables disponibles para importar (no repetidas en el sistema actual)
  const getAvailableVariables = useCallback(() => {
    if (!selectedSystemId) return []
    const existingParameterNames = parameters.map(p => p.nombre.toLowerCase())
    return allVariables.filter(variable => {
      const isNotInCurrentSystem = !existingParameterNames.includes(variable.nombre.toLowerCase())
      const isGlobalOrFromOtherSystem = !variable.proceso_id || variable.proceso_id !== selectedSystemId
      return isNotInCurrentSystem && isGlobalOrFromOtherSystem
    })
  }, [allVariables, parameters, selectedSystemId])

  // Al seleccionar una variable existente, copiar nombre y unidad al formulario
  useEffect(() => {
    if (!selectedImportVariableId) return
    const variable = allVariables.find(v => v.id === selectedImportVariableId)
    if (variable) {
      setNewParameterName(variable.nombre)
      setNewParameterUnit(variable.unidad)
    }
  }, [selectedImportVariableId, allVariables])

  // Function to open edit dialog
  const handleOpenEditSystem = (system: System) => {
    setEditingSystem(system)
    setEditSystemName(system.nombre)
    setShowEditSystemDialog(true)
  }

  const handleDeleteSystem = async (system: System) => {
    const confirmDel = window.confirm("¿Está seguro que desea eliminar el sistema?")
    if (!confirmDel) return

    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_DELETE_BY_PLANT(system.planta_id, system.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo eliminar el sistema.")
      }
      // Actualiza lista local sin recargar ni re-fetch completo
      setSystems((prev) => prev.filter((s) => s.id !== system.id))
      // Si el sistema eliminado estaba seleccionado, limpia o selecciona otro
      setParameters([])
      setSelectedSystemId((curr) => (curr === system.id ? null : curr))
    } catch (e: any) {
      setError(`Error al eliminar sistema: ${e.message}`)
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
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEM_UPDATE(editingSystem.id)}`, {
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

  const handleDeleteParameter = (idToDelete: string) => {
    setParameters((prev) => prev.filter((p) => p.id !== idToDelete))
    // Nota: Para una eliminación persistente en la base de datos,
    // necesitarías un endpoint DELETE en tu API (ej. DELETE /api/variables/:id)
    // y llamar a ese endpoint aquí.
    alert(
      "Parámetro eliminado del lado del cliente. Para una eliminación persistente, se requiere un endpoint DELETE en el backend.",
    )
  }

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
      alert("Nuevos parámetros guardados exitosamente.")
      await fetchParameters() // Refetch all parameters to update their 'isNew' status and get server IDs
    } catch (e: any) {
      setError(`Error al guardar cambios: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />
        <div className="max-w-5xl mx-auto py-12 px-1 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Agregar sistema</h1>
              <p className="mt-2 text-sm text-gray-600">Usuarios, plantas, sistemas.</p>
            </div>

            <form onSubmit={handleSaveParameters}>
              <div className="space-y-8">
                {/* --- Selección Jerárquica --- */}
                <SelectionSection
                  users={users}
                  plants={plants}
                  systems={systems}
                  selectedUser={selectedUser}
                  selectedPlant={selectedPlant}
                  selectedSystemId={selectedSystemId}
                  showCreatePlant={showCreatePlant}
                  newPlantName={newPlantName}
                  loading={loading}
                  showEditPlantDialog={showEditPlantDialog}
                  editPlantName={editPlantName}
                  showCreateSystem={showCreateSystem}
                  newSystemName={newSystemName}
                  newSystemDescription={newSystemDescription}
                  showEditSystemDialog={showEditSystemDialog}
                  editSystemName={editSystemName}
                  actions={{
                    handleSelectUser,
                    handleSelectPlant,
                    setShowCreatePlant,
                    setNewPlantName,
                    handleCreatePlant,
                    handleOpenEditPlant,
                    setShowEditPlantDialog,
                    setEditPlantName,
                    handleUpdatePlant,
                    handleDeletePlant,
                    setShowCreateSystem,
                    setNewSystemName,
                    setNewSystemDescription,
                    handleCreateSystem,
                    handleOpenEditSystem,
                    handleDeleteSystem,
                    setShowEditSystemDialog,
                    setEditSystemName,
                    handleUpdateSystem,
                    setSelectedSystemId,
                  }}
                />

                {/* --- Parámetros del Sistema --- */}
                <ParametersSection
                  selectedSystemId={selectedSystemId}
                  systems={systems}
                  parameters={parameters}
                  tolerancias={tolerancias}
                  tolLoading={tolLoading}
                  tolError={tolError}
                  tolSuccess={tolSuccess}
                  handleTolChange={handleTolChange}
                  handleTolSave={handleTolSave}
                  handleOpenEditModal={handleOpenEditModal}
                  handleDeleteParameter={handleDeleteParameter}
                />

                {/* --- Add New Parameter Form --- */}
                <AddParameterSection
                  selectedSystemId={selectedSystemId}
                  loading={loading}
                  allVariables={allVariables}
                  selectedImportVariableId={selectedImportVariableId}
                  newParameterName={newParameterName}
                  newParameterUnit={newParameterUnit}
                  actions={{
                    setSelectedImportVariableId,
                    getAvailableVariables,
                    setNewParameterName,
                    setNewParameterUnit,
                    handleAddParameter,
                  }}
                />
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
              
              {/* --- Action Buttons --- */}
              {/*{selectedSystemId && (
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
              )}*/}
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
