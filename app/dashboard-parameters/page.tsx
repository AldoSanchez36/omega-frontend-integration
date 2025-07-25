"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { v4 as uuidv4 } from "uuid"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"
import { useUserAccess } from "@/hooks/useUserAccess"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
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
}

type UserRole = "admin" | "user" | "client" | "guest"

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function ParameterManager() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null

  // Use the reusable hook for user access
  const {
    users,
    plants,
    systems,
    selectedUser,
    selectedPlant,
    selectedSystem: selectedSystemId,
    userRole,
    loading,
    error,
    setSelectedUser,
    setSelectedPlant,
    setSelectedSystem: setSelectedSystemId,
    handleSelectUser,
    handleSelectPlant,
    fetchParameters: fetchParametersFromHook
  } = useUserAccess(token, { autoSelectFirstPlant: false, autoSelectFirstSystem: false })

  const [parameters, setParameters] = useState<Parameter[]>([])

  // Local loading and error states for this component
  const [localLoading, setLocalLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Form states
  const [showCreatePlant, setShowCreatePlant] = useState(false)
  const [newPlantName, setNewPlantName] = useState("")
  const [showCreateSystem, setShowCreateSystem] = useState(false)
  const [newSystemName, setNewSystemName] = useState("")
  const [newSystemDescription, setNewSystemDescription] = useState("")
  const [newParameterName, setNewParameterName] = useState("")
  const [newParameterUnit, setNewParameterUnit] = useState("")

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

  // Estado para el usuario (mantenido para compatibilidad)
  const [user, setUser] = useState<any>(null)

  // Estado para tolerancias por parámetro
  const [tolerancias, setTolerancias] = useState<Record<string, any>>({})
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({})
  const [tolError, setTolError] = useState<Record<string, string | null>>({})
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({})

  // Estado para importar variable
  const [selectedImportParamId, setSelectedImportParamId] = useState<string>("");

  // Estado para variables globales
  const [allVariables, setAllVariables] = useState<Parameter[]>([]);
  const [selectedImportVariableId, setSelectedImportVariableId] = useState<string>("");

  // Recolecta todas las variables de otros sistemas de la planta seleccionada (excepto el sistema actual)
  const existingParams: Parameter[] = [];
  if (selectedPlant && selectedSystemId) {
    systems.forEach((sys) => {
      if (sys.id !== selectedSystemId) {
        parameters.forEach((param) => {
          // Solo agrega si no existe ya en el sistema actual
          if (!parameters.some(p => p.nombre === param.nombre && p.proceso_id === selectedSystemId)) {
            existingParams.push(param);
          }
        });
      }
    });
  }

  const handleImportParameter = () => {
    const param = existingParams.find(p => p.id === selectedImportParamId);
    if (!param) return;
    setParameters((prev) => [
      ...prev,
      {
        id: uuidv4(),
        nombre: param.nombre,
        unidad: param.unidad,
        proceso_id: selectedSystemId,
        isNew: true,
      }
    ]);
    setSelectedImportParamId("");
  };

  // Cargar todas las variables existentes (de todos los sistemas)
  useEffect(() => {
    const fetchAllVariables = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setAllVariables(data.variables || data || []);
      } catch {}
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

  // Initialize user data for compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      }
    }
  }, [])

  const handleCreatePlant = async () => {
    if (!newPlantName.trim() || !selectedUser) {
      alert("Por favor, ingrese un nombre para la planta y seleccione un usuario.")
      return
    }
    setLocalLoading(true)
    setLocalError(null)
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
      setLocalError(`Error al crear planta: ${e.message}`)
    } finally {
      setLocalLoading(false)
    }
  }

  const fetchParameters = useCallback(async () => {
    if (!selectedSystemId) {
      setParameters([])
      return
    }
    setLocalLoading(true)
    setLocalError(null)
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedSystemId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      setParameters(data.variables || [])
    } catch (e: any) {
      setLocalError(`Error al cargar parámetros: ${e.message}`)
    } finally {
      setLocalLoading(false)
    }
  }, [selectedSystemId, token])

  useEffect(() => {
    fetchParameters()
  }, [fetchParameters])

  const handleCreateSystem = async () => {
    if (!newSystemName.trim() || !selectedPlant) {
      alert("Por favor, ingrese un nombre para el sistema y seleccione una planta.")
      return
    }
    setLocalLoading(true)
    setLocalError(null)
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
      setLocalError(`Error al crear sistema: ${e.message}`)
    } finally {
      setLocalLoading(false)
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
    setLocalLoading(true)
    setLocalError(null)
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
      setLocalError(`Error al guardar cambios: ${e.message}`)
    } finally {
      setLocalLoading(false)
    }
  }

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
        setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }))
      } else {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(tol),
        })
        if (!res.ok) throw new Error("Error al crear tolerancia")
        setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }))
      }
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message }))
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }))
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Gestor de Parámetros</h1>
              <p className="mt-2 text-sm text-gray-600">Gestione usuarios, plantas, sistemas y parámetros de forma jerárquica.</p>
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
                        <Select value={selectedUser?.id} onValueChange={handleSelectUser}>
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
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sistema */}
                    {selectedPlant && (
                      <div>
                        <div className="grid grid-cols-[150px_1fr] items-start gap-4">
                          <Label className="pt-2 text-sm font-medium text-gray-700">Sistema</Label>
                          <div className="flex items-center justify-between">
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPlant && systems.length > 0 && (
                      <div className="mt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {systems.map((system) => (
                            <button
                              key={system.id}
                              onClick={() => setSelectedSystemId(system.id)}
                              className={`px-4 py-2 text-sm font-medium rounded border ${
                                selectedSystemId === system.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {system.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Parámetros del Sistema --- */}
                {selectedSystemId && (
                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Parámetros del Sistema</h2>
                    <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1"><span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400"></span><span className="font-semibold text-yellow-700">Limite-(min,max)</span>: Cerca del límite recomendado</div>
                        <div className="flex items-center gap-1"><span className="w-4 h-4 inline-block rounded bg-green-100 border-green-400"></span><span className="font-semibold text-green-700">Bien</span>: Dentro de rango</div>
                      </div>
                      {/* {(userRole === "admin" || userRole === "user") && (
                        <Button 
                          onClick={() => router.push('/dashboard-parameters')} 
                          variant="secondary"
                          size="sm"
                          className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 text-xs"
                        >
                          ⚙️ Configurar Límites
                        </Button>
                      )} */}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Parámetros para el sistema seleccionado: {" "}
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
                                      {/* Lim-min */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                                          <button type="button" onClick={() => handleTolChange(param.id, 'usar_limite_min', String(!usarLimiteMin))} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMin ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                                        </div>
                                        <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="min" value={tolerancias[param.id]?.limite_min ?? ''} onChange={e => handleTolChange(param.id, 'limite_min', e.target.value)} disabled={!usarLimiteMin} />
                                      </div>
                                      {/* Bien (min/max) con letrero centrado */}
                                      <div className="flex flex-col items-center" style={{minWidth: '60px'}}>
                                        <span className="text-xs font-semibold text-green-700 text-center w-full mb-1">Bien</span>
                                        <div className="flex flex-row gap-1">
                                          <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[param.id]?.bien_min ?? ''} onChange={e => handleTolChange(param.id, 'bien_min', e.target.value)} />
                                          <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[param.id]?.bien_max ?? ''} onChange={e => handleTolChange(param.id, 'bien_max', e.target.value)} />
                                        </div>
                                      </div>
                                      {/* Lim-max */}
                                      <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-0.5">
                                          <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
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
                
                {/* --- Add New Parameter Form --- */}
                {selectedSystemId && (
                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Agregar Nuevo Parámetro</h2>
                    <p className="mt-1 text-sm text-gray-500">Añada un nuevo parámetro al sistema seleccionado.</p>
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
                            {allVariables
                              .filter(v => v.proceso_id !== selectedSystemId && !parameters.some(p => p.nombre === v.nombre && p.proceso_id === selectedSystemId))
                              .map((variable) => (
                                <SelectItem key={variable.id} value={variable.id}>
                                  {variable.nombre} ({variable.unidad})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
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
                    <Button type="button" onClick={handleAddParameter} className="mt-4" disabled={!selectedSystemId || localLoading}>
                      <Plus className="mr-2 h-4 w-4" /> Agregar Parámetro a la lista
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      ⚠️ Recuerde hacer clic en <strong>"Guardar Cambios"</strong> al final del formulario para guardar los parámetros en la base de datos.
                    </p>
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
                    <Button type="submit" disabled={localLoading || parameters.filter((p) => p.isNew).length === 0}>
                      {localLoading ? "Guardando..." : "Guardar Cambios"}
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
