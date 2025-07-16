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
    const res = await fetch(`http://localhost:4000/api/variables/${editingParam.id}`, {
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
        const res = await fetch("http://localhost:4000/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to fetch users")
        }
        const data = await res.json()
        setUsers(data.usuarios || [])
        if (data.usuarios.length > 0 && !selectedUser) {
          const firstUser = data.usuarios[0]
          setSelectedUser(firstUser)
          handleSelectUser(firstUser.id)
        }
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
      const res = await fetch(`http://localhost:4000/api/plantas/accesibles`, {
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
      const res = await fetch(`http://localhost:4000/api/procesos/planta/${plant.id}`, {
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
      const res = await fetch("http://localhost:4000/api/plantas/crear", {
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

  const fetchParameters = useCallback(async () => {
    if (!selectedSystemId) {
      setParameters([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:4000/api/variables/proceso/${selectedSystemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      setParameters(data.variables || [])
    } catch (e: any) {
      setError(`Error al cargar parámetros: ${e.message}`)
    } finally {
      setLoading(false)
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
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("http://localhost:4000/api/procesos/crear", {
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
    }
    setParameters((prev) => [...prev, newParam])
    setNewParameterName("")
    setNewParameterUnit("")
  }

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    const newParamsToSave = parameters.filter((p) => p.isNew)
    if (newParamsToSave.length === 0) {
      alert("No hay nuevos parámetros para guardar.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      for (const param of newParamsToSave) {
        const res = await fetch("http://localhost:4000/api/variables/crear", {
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
                            <Button type="button" onClick={() => setShowCreatePlant(true)} variant="secondary">
                              <Plus className="mr-2 h-4 w-4" /> Crear Planta
                            </Button>
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
                        <div className="flex border rounded overflow-hidden">
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
                  </div>
                </div>

                {/* --- Parámetros del Sistema --- */}
                {selectedSystemId && (
                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Parámetros del Sistema</h2>
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
                                <TableCell className="text-right flex gap-2 justify-end">
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
                
                {/* --- Add New Parameter Form --- */}
                {selectedSystemId && (
                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Agregar Nuevo Parámetro</h2>
                    <p className="mt-1 text-sm text-gray-500">Añada un nuevo parámetro al sistema seleccionado.</p>
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
