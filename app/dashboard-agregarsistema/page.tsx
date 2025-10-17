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

  // Estado para variables globales
  const [allVariables, setAllVariables] = useState<Parameter[]>([]);
  const [selectedImportVariableId, setSelectedImportVariableId] = useState<string>("");

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
        console.log('🔍 Fetching all variables...');
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          console.log('❌ Error fetching variables:', res.status);
          return;
        }
        const data = await res.json();
        console.log('✅ Variables loaded:', data);
        setAllVariables(data.variables || data || []);
      } catch (error) {
        console.log('💥 Error fetching variables:', error);
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
                              <Button type="button" onClick={() => setShowCreatePlant(true)} variant="secondary">
                                <Plus className="mr-2 h-4 w-4" /> Crear Planta
                              </Button>
                              {selectedPlant && (
                                <Button 
                                  type="button" 
                                  onClick={() => handleOpenEditPlant(selectedPlant)} 
                                  variant="outline"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Editar Nombre
                                </Button>
                              )}
                            </div>
                          </div>
                          {showCreatePlant && (
                            <div className="grid w-full grid-cols-[1fr_auto] gap-2 rounded-lg border p-3">
                              <Input
                                placeholder="Nombre de la nueva planta"
                                value={newPlantName}
                                onChange={(e) => setNewPlantName(e.target.value)}
                              />
                              <Button type="button" onClick={handleCreatePlant} disabled={loading || !newPlantName.trim()}>
                                Guardar
                              </Button>
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
                            <Button type="button" onClick={() => setShowCreateSystem(true)} variant="secondary">
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
                                className={`flex flex-col h-full justify-between px-4 py-3 text-sm font-medium rounded border cursor-pointer ${
                                  selectedSystemId === system.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                              >
                                <div className="flex-grow flex items-center justify-center text-center">{system.nombre}</div>
                                <div className="flex justify-center mt-2 pt-2 border-t border-gray-300 border-opacity-30">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent triggering the parent div
                                      handleOpenEditSystem(system);
                                    }}
                                    className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
                                    aria-label={`Editar nombre de ${system.nombre}`}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                  </button>
                                  {/* space between buttons */}
                                  <div className="w-2"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent triggering the parent div
                                      handleDeleteSystem(system);
                                    }}
                                    className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
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
                      <div className="mt-4 grid w-full grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border p-3">
                        <Input
                          placeholder="Nombre del sistema"
                          value={newSystemName}
                          onChange={(e) => setNewSystemName(e.target.value)}
                        />
                        <Input
                          placeholder="Descripción"
                          value={newSystemDescription}
                          onChange={(e) => setNewSystemDescription(e.target.value)}
                        />
                        <Button type="button" onClick={handleCreateSystem} disabled={loading || !newSystemName.trim()}>
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
                      <DialogContent className="bg-[#f6f6f6] text-gray-900">
                        <DialogHeader>
                          <DialogTitle>Editar Nombre de la Planta</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-plant-name" className="text-right">
                              Nombre
                            </Label>
                            <Input
                              id="edit-plant-name"
                              value={editPlantName}
                              onChange={(e) => setEditPlantName(e.target.value)}
                              className="col-span-3"
                            />
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
                            disabled={loading || !editPlantName.trim()}
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
                    <p className="mt-1 text-sm text-gray-500">Añada un nuevo parámetro al sistema seleccionado.</p>
                    
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded">
                      Debug: selectedSystemId = {selectedSystemId}, allVariables.length = {allVariables.length}
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
                            {parameters.map((param) => (
                              <TableRow key={param.id}>
                                <TableCell className="font-medium">{param.nombre}</TableCell>
                                <TableCell>{param.unidad}</TableCell>
                                <TableCell className="text-right flex flex-wrap gap-2 justify-end">
                                  {/* Controles para límites y rango "bien" */}
                                  <div className="flex flex-row items-end gap-2">
                                    {/* Límite mínimo */}
                                    <div className="flex flex-col items-center">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMinLimit(param.id)}
                                          className={classNames(
                                            'rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150',
                                            param.limMinActive ? 'border-yellow-500 bg-yellow-100' : 'border-gray-300 bg-gray-100',
                                          )}
                                        >
                                          {param.limMinActive && <Check className="h-3 w-3 text-yellow-700" />}
                                        </button>
                                      </div>
                                      <input
                                        type="number"
                                        className={classNames(
                                          'flex h-8 rounded-md border w-14 text-xs py-1 px-1',
                                          param.limMinActive
                                            ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                                            : 'bg-gray-100 border-gray-300 text-gray-400'
                                        )}
                                        placeholder="min"
                                        disabled={!param.limMinActive}
                                        value={param.limMin ?? ''}
                                        onChange={(e) => handleChangeLimMin(param.id, e.target.value)}
                                      />
                                    </div>
                                    {/* Rango bien */}
                                    <div className="flex flex-col items-center" style={{ minWidth: '60px' }}>
                                      <span className="text-xs font-semibold text-green-700 text-center w-full mb-0.5">Bien</span>
                                      <div className="flex flex-row gap-1">
                                        <input
                                          type="number"
                                          className="flex h-8 rounded-md border w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                                          placeholder="min"
                                          value={param.goodMin ?? ''}
                                          onChange={(e) => handleChangeGoodMin(param.id, e.target.value)}
                                        />
                                        <input
                                          type="number"
                                          className="flex h-8 rounded-md border w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                                          placeholder="max"
                                          value={param.goodMax ?? ''}
                                          onChange={(e) => handleChangeGoodMax(param.id, e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    {/* Límite máximo */}
                                    <div className="flex flex-col items-center">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMaxLimit(param.id)}
                                          className={classNames(
                                            'rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150',
                                            param.limMaxActive ? 'border-yellow-500 bg-yellow-100' : 'border-gray-300 bg-gray-100'
                                          )}
                                        >
                                          {param.limMaxActive && <Check className="h-3 w-3 text-yellow-700" />}
                                        </button>
                                      </div>
                                      <input
                                        type="number"
                                        className={classNames(
                                          'flex h-8 rounded-md border w-14 text-xs py-1 px-1',
                                          param.limMaxActive
                                            ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                                            : 'bg-gray-100 border-gray-300 text-gray-400'
                                        )}
                                        placeholder="max"
                                        disabled={!param.limMaxActive}
                                        value={param.limMax ?? ''}
                                        onChange={(e) => handleChangeLimMax(param.id, e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  {/* Botones de acción */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveLimit(param.id)}
                                    className="h-7 w-7 text-green-600 hover:text-green-700"
                                    title="Guardar límites"
                                  >
                                    <Save className="h-4 w-4" />
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
                            ))}
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
