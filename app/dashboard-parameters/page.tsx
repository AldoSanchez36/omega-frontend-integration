"use client"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus } from "lucide-react"
import { v4 as uuidv4 } from "uuid" // For generating unique IDs for new parameters
import { useUser } from "@/context/UserContext"

interface Plant {
  id: string
  nombre: string
}

interface System {
  id: string
  nombre: string
  planta_id: string
}

interface Parameter {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
  isNew?: boolean // To mark parameters added locally
}

interface User {
  id: string
  username: string
  email: string
}

export default function ParameterManager() {
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null;
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
  const [newParameterName, setNewParameterName] = useState("")
  const newParameterUnit = ""
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreatePlant, setShowCreatePlant] = useState(false)
  const [newPlantName, setNewPlantName] = useState("")

  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("http://localhost:4000/api/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: { ok: boolean, usuarios: User[] } = await response.json();
        setUsers(data.usuarios);
      } catch (e: any) {
        setError(`Error al cargar usuarios: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token])

  const handleSelectUsuario = async (userId: string) => {
    setSelectedUserId(userId);
    if (!token || !userId) {
      setPlants([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:4000/api/plantas/accesibles`, {
        headers: { Authorization: `Bearer ${token}`, "X-Usuario-Id": userId }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPlants(data.plantas);
      // Log de los nombres de las plantas
      if (Array.isArray(data.plantas)) {
        console.log('Plantas recibidas:', data.plantas.map((p: any) => p.nombre));
      }
    } catch (e: any) {
      setError(`Error al cargar plantas: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleCreatePlant = async () => {
    if (!newPlantName.trim() || !selectedUserId) return;
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("http://localhost:4000/api/plantas/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: newPlantName.trim(), usuario_id: selectedUserId }),
      })
      if (!response.ok) {
        throw new Error(`Error al crear planta: ${response.statusText}`)
      }
      setShowCreatePlant(false)
      setNewPlantName("")
      // Refetch plants
      const plantsRes = await fetch(`http://localhost:4000/api/plantas/accesibles`, {
        headers: { Authorization: `Bearer ${token}`}
      })
      if (plantsRes.ok) {
        const data = await plantsRes.json()
        setPlants(data.plantas)
      }
    } catch (e: any) {
      setError(`Error al crear planta: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Gestión de Plantas por Usuario</h1>
      {loading && <div className="text-center text-lg text-muted-foreground">Cargando...</div>}
      {error && <div className="text-center text-lg text-red-500">{error}</div>}
      <div className="mb-6">
        <Label htmlFor="user-select">Selecciona un usuario:</Label>
        <Select value={selectedUserId ?? undefined} onValueChange={handleSelectUsuario}>
          <SelectTrigger id="user-select" className="w-full max-w-md">
            <SelectValue placeholder="Selecciona un usuario" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>{user.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedUserId && (
        <div className="mb-6">
          <Label htmlFor="plant-select">Plantas del usuario:</Label>
          {plants.length > 0 ? (
            <>
              <Select>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecciona una planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4">
                <Button onClick={() => setShowCreatePlant(true)} className="w-fit">Crear planta</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <div className="h-10" />
              <Button onClick={() => setShowCreatePlant(true)} className="w-fit">Crear planta</Button>
            </div>
          )}
          {showCreatePlant && (
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Nombre de la planta"
                value={newPlantName}
                onChange={e => setNewPlantName(e.target.value)}
              />
              <Button onClick={handleCreatePlant} disabled={loading || !newPlantName.trim()}>
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePlant(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 