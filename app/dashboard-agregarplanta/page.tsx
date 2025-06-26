"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: string
  username: string
  email: string
  puesto?: string
}

export default function AgregarPlanta() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null

  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [plantName, setPlantName] = useState("")
  const [plantLocation, setPlantLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch users (clientes)
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
          throw new Error(errorData.message || "No se pudieron cargar los usuarios")
        }
        const data = await res.json()
        // Solo clientes
        setUsers((data.usuarios || []).filter((u: any) => u.puesto === "client"))
      } catch (e: any) {
        setError(`Error al cargar usuarios: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [token])

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !plantName.trim()) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("http://localhost:4000/api/plantas/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: plantName,
          ubicacion: plantLocation,
          usuario_id: selectedUserId,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo crear la planta.")
      }
      setSuccess("Planta creada exitosamente.")
      setPlantName("")
      setPlantLocation("")
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (e: any) {
      setError(`Error al crear planta: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Agregar Nueva Planta</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4 text-sm">{success}</div>
        )}
        <form onSubmit={handleCreatePlant}>
          <div className="mb-4">
            <Label className="mb-1 block">Cliente *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loading || users.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione un cliente" />
              </SelectTrigger>
              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label className="mb-1 block">Nombre de la Planta *</Label>
            <Input
              value={plantName}
              onChange={e => setPlantName(e.target.value)}
              placeholder="Ej: Planta Norte"
              required
            />
          </div>
          {/*<div className="mb-6">
            <Label className="mb-1 block">Ubicación</Label>
            <Input
              value={plantLocation}
              onChange={e => setPlantLocation(e.target.value)}
              placeholder="Ej: Ciudad, País"
            />
          </div>*/}
          <Button type="submit" className="w-full" disabled={!selectedUserId || !plantName.trim() || saving}>
            {saving ? "Guardando..." : "Crear Planta"}
          </Button>
        </form>
      </div>
    </div>
  )
}
