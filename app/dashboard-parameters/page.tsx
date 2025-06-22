"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import CustomDropdown from "@/components/CustomDropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

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
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null

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

  // Fetch Users
  useEffect(() => {
    if (!token) {
      setError("Token de autenticación no encontrado. Por favor, inicie sesión.")
      return
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
          handleSelectUser(firstUser)
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
  const handleSelectUser = async (user: User) => {
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
        setSelectedPlant(firstPlant)
        handleSelectPlant(firstPlant)
      } else {
        setSelectedPlant(null)
      }
    } catch (e: any) {
      setError(`Error al cargar plantas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlant = async (plant: Plant) => {
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
      await handleSelectUser(selectedUser) // Refetch plants for the selected user
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
      await handleSelectPlant(selectedPlant) // Refetch systems for the selected plant
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestor de Parámetros</h1>
          <p className="text-gray-600">Gestione usuarios, plantas, sistemas y parámetros de forma jerárquica.</p>
        </div>

        <form onSubmit={handleSaveParameters}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selección Jerárquica</CardTitle>
                <CardDescription>Seleccione Usuario, Planta y Sistema para gestionar parámetros.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* --- User Row --- */}
                <div className="grid grid-cols-[120px_1fr] items-start gap-x-4">
                  <Label className="text-right pt-2">Usuario</Label>
                  <CustomDropdown
                    options={users}
                    value={selectedUser}
                    onChange={handleSelectUser}
                    placeholder="Seleccione un usuario"
                    displayKey="username"
                  />
                </div>

                {/* --- Plant Row & Form --- */}
                {selectedUser && (
                  <div className="grid grid-cols-[120px_1fr] items-start gap-x-4">
                    <Label className="text-right pt-2">Planta</Label>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CustomDropdown
                          options={plants}
                          value={selectedPlant}
                          onChange={handleSelectPlant}
                          placeholder="Seleccione una planta"
                          displayKey="nombre"
                          disabled={plants.length === 0}
                        />
                        <Button
                          type="button"
                          onClick={() => setShowCreatePlant(!showCreatePlant)}
                          variant="secondary"
                          aria-label="Crear nueva planta"
                          className="flex-shrink-0"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Crear Planta
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

                {/* --- System Row & Form --- */}
                {selectedPlant && (
                  <div className="grid grid-cols-[120px_1fr] items-start gap-x-4">
                    <Label className="text-right pt-2">Sistema (Proceso)</Label>
                    <div className="space-y-3">
                      <div className="flex min-h-[40px] flex-wrap items-center gap-2">
                        {systems.length > 0 ? (
                          systems.map((system) => (
                            <Button
                              type="button"
                              key={system.id}
                              variant={selectedSystemId === system.id ? "default" : "outline"}
                              className={selectedSystemId === system.id ? "" : "bg-black text-white"}
                              onClick={() => setSelectedSystemId(system.id)}
                            >
                              {system.nombre}
                            </Button>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay sistemas para esta planta.</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => setShowCreateSystem(!showCreateSystem)}
                        variant="secondary"
                        className="w-fit"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Crear Sistema
                      </Button>
                      {showCreateSystem && (
                        <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border p-3">
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
                          <Button
                            type="button"
                            onClick={handleCreateSystem}
                            disabled={loading || !newSystemName.trim()}
                          >
                            Guardar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* --- Parameters List --- */}
            {selectedSystemId && (
              <Card>
                <CardHeader>
                  <CardTitle>Parámetros del Sistema</CardTitle>
                  <CardDescription>
                    Parámetros para el sistema seleccionado:{" "}
                    <span className="font-semibold">
                      {systems.find((s) => s.id === selectedSystemId)?.nombre || "N/A"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                            <TableCell>{param.nombre}</TableCell>
                            <TableCell>{param.unidad}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteParameter(param.id)}
                                aria-label={`Eliminar ${param.nombre}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No hay parámetros para este sistema. ¡Agrega uno!</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* --- Add New Parameter Form --- */}
            {selectedSystemId && (
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Nuevo Parámetro</CardTitle>
                  <CardDescription>Añada un nuevo parámetro al sistema seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
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
                  <Button
                    type="button"
                    onClick={handleAddParameter}
                    className="mt-4"
                    disabled={!selectedSystemId || loading}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar Parámetro
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* --- Action Buttons --- */}
            {selectedSystemId && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || parameters.filter((p) => p.isNew).length === 0}>
                      {loading ? "Guardando..." : "Guardar Cambios en BD"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
