import { useState, useEffect, useCallback } from "react"
import { API_BASE_URL } from "@/config/constants"
import { useAuthErrorHandler } from "./useAuthErrorHandler"

interface User {
  id: string
  username: string
  role?: string
  puesto?: string
  email?: string
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

interface UseUserAccessReturn {
  users: User[]
  plants: Plant[]
  systems: System[]
  selectedUser: User | null
  selectedPlant: Plant | null
  selectedSystem: string
  userRole: "admin" | "user" | "client" | "guest"
  loading: boolean
  error: string | null
  setSelectedUser: (user: User | null) => void
  setSelectedPlant: (plant: Plant | null) => void
  setSelectedSystem: (systemId: string) => void
  handleSelectUser: (userId: string) => Promise<void>
  handleSelectPlant: (plantId: string) => Promise<void>
  fetchParameters: () => Promise<any[]>
}

interface UseUserAccessOptions {
  autoSelectFirstPlant?: boolean
  autoSelectFirstSystem?: boolean
}

export function useUserAccess(token: string | null, options: UseUserAccessOptions = {}): UseUserAccessReturn {
  const { autoSelectFirstPlant = true, autoSelectFirstSystem = true } = options
  const { handleAuthError } = useAuthErrorHandler()
  const [users, setUsers] = useState<User[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize user role and fetch users based on role
  useEffect(() => {
    if (!token) {
      setError("Token de autenticación no encontrado. Por favor, inicie sesión.")
      return
    }

    let userData: any = null
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        userData = JSON.parse(storedUser)
        setUserRole(userData.puesto || "user")
        console.log("Puesto:", userData.puesto)
      }
    }

    // Function to get real user ID by username
    const fetchUserIdByUsername = async (username: string) => {
      const res = await fetch(`${API_BASE_URL}/api/auth/user-by-name/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("No se pudo obtener el id del usuario")
      const data = await res.json()
      console.log("ID del usuario desde backend:", data.usuario?.id)
      return data.usuario?.id
    }

    // Function to get plant access by user ID
    const fetchUsuarioPlantas = async (userId: string) => {
      setLoading(true)
      setError(null)
      try {
        // 1. Get plant access
        const res = await fetch(`${API_BASE_URL}/api/accesos/plantas/usuario/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.message || "Failed to fetch user plant access")
        }
        const data = await res.json()
        
        // 2. Filter plants where puede_ver: true
        const plantasAccesibles = data.plantas?.filter((planta: any) => planta.puede_ver) || []
        
        if (plantasAccesibles.length > 0) {
          // 3. Call /api/plantas/accesibles with user id
          const plantasRes = await fetch(`${API_BASE_URL}/api/plantas/accesibles`, {
            headers: { 
              Authorization: `Bearer ${token}`, 
              "x-usuario-id": userId 
            },
          })
          if (!plantasRes.ok) {
            const errorData = await plantasRes.json()
            throw new Error(errorData.message || "No se pudieron cargar las plantas para el usuario.")
          }
          const plantasData = await plantasRes.json()
          setPlants(plantasData.plantas || [])
          
          // 4. Continue with normal flow
          if (plantasData.plantas && plantasData.plantas.length > 0 && autoSelectFirstPlant) {
            const firstPlant = plantasData.plantas[0]
            handleSelectPlant(firstPlant.id)
          }
        } else {
          setError("No tienes acceso a ninguna planta")
        }
      } catch (e: any) {
        setError(`Error al cargar accesos de plantas: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (userRole === "admin") {
      // Admin: normal flow
      (async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.message || "Failed to fetch users")
          }
          const data = await res.json()
          setUsers(data.usuarios || [])
        } catch (e: any) {
          setError(`Error al cargar usuarios: ${e.message}`)
        } finally {
          setLoading(false)
        }
      })()
    } else if (userRole === "user" && userData) {
      // User: get real ID and then access
      fetchUserIdByUsername(userData.username)
        .then((userId) => {
          if (userId) {
            fetchUsuarioPlantas(userId)
          } else {
            setError("No se pudo obtener el id del usuario")
          }
        })
        .catch((e) => setError(`Error al obtener id de usuario: ${e.message}`))
      setUsers([userData])
      setSelectedUser(userData)
      setLoading(false)
    }
  }, [token, userRole])

  // Handlers for selection changes
  const handleSelectUser = useCallback(async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSelectedUser(user)
    setSelectedPlant(null)
    setSelectedSystem("")
    setPlants([])
    setSystems([])

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/plantas/accesibles`, {
        headers: { Authorization: `Bearer ${token}`, "x-usuario-id": user.id },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar las plantas para el usuario.")
      }
      const data = await res.json()
      setPlants(data.plantas || [])
      if (data.plantas.length > 0 && autoSelectFirstPlant) {
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
  }, [users, token])

  const handleSelectPlant = useCallback(async (plantId: string) => {
    const plant = plants.find((p) => p.id === plantId)
    if (!plant) return

    setSelectedPlant(plant)
    setSelectedSystem("")
    setSystems([])

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/procesos/planta/${plant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los sistemas para la planta.")
      }
      const data = await res.json()
      setSystems(data.procesos || [])
      if (data.procesos.length > 0 && autoSelectFirstSystem) {
        setSelectedSystem(data.procesos[0].id)
      }
    } catch (e: any) {
      setError(`Error al cargar sistemas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [plants, token])

  const fetchParameters = useCallback(async () => {
    if (!selectedSystem) {
      return []
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/variables/proceso/${selectedSystem}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los parámetros para el sistema.")
      }
      const data = await res.json()
      return data.variables || []
    } catch (e: any) {
      setError(`Error al cargar parámetros: ${e.message}`)
      return []
    } finally {
      setLoading(false)
    }
  }, [selectedSystem, token])

  return {
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
    fetchParameters
  }
} 