import { useState, useEffect, useCallback } from "react"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { getUserIdFromToken } from "@/lib/auth-token"
import { useAuthErrorHandler } from "./useAuthErrorHandler"

interface Empresa {
  id: string
  nombre: string
  descripcion?: string
}

function mapEmpresasFromAccessRows(rows: unknown[]): Empresa[] {
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const r = row as Record<string, unknown>
      const nested = r.empresas as Record<string, unknown> | null | undefined
      const id = String(r.empresa_id ?? nested?.id ?? r.id ?? "").trim()
      const nombre = String(
        r.empresa_nombre ?? nested?.nombre ?? r.nombre ?? ""
      ).trim()
      if (!id || !nombre) return null
      return {
        id,
        nombre,
        descripcion:
          typeof nested?.descripcion === "string" ? nested.descripcion : undefined,
      }
    })
    .filter((e): e is Empresa => e !== null)
}

function isAdminRole(puesto: string | undefined): boolean {
  return (puesto || "").toLowerCase() === "admin"
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
  mensaje_cliente?: string
  dirigido_a?: string
}

interface System {
  id: string
  nombre: string
  descripcion: string
  planta_id: string
  type?: string
  status?: string
  orden?: number
}

interface UseEmpresasAccessReturn {
  empresas: Empresa[]
  plants: Plant[]
  systems: System[]
  selectedEmpresa: Empresa | null
  selectedPlant: Plant | null
  selectedSystem: string
  userRole: "admin" | "user" | "client" | "guest"
  loading: boolean
  error: string | null
  setSelectedEmpresa: (empresa: Empresa | null) => void
  setSelectedPlant: (plant: Plant | null) => void
  setSelectedSystem: (systemId: string) => void
  handleSelectEmpresa: (empresaId: string) => Promise<void>
  handleSelectPlant: (plantId: string) => Promise<void>
  fetchParameters: () => Promise<any[]>
}

interface UseEmpresasAccessOptions {
  autoSelectFirstPlant?: boolean
  autoSelectFirstSystem?: boolean
}

export function useEmpresasAccess(token: string | null, options: UseEmpresasAccessOptions = {}): UseEmpresasAccessReturn {
  const { autoSelectFirstPlant = true, autoSelectFirstSystem = true } = options
  const { handleAuthError } = useAuthErrorHandler()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize user role and fetch empresas
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
      }
    }

    const puesto = userData?.puesto || "user"

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (isAdminRole(puesto)) {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ALL}`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          const contentType = res.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            if (res.status === 404) {
              throw new Error(
                "El endpoint de empresas no está disponible. Verifica /api/empresas/all en el backend."
              )
            }
            throw new Error(
              `El servidor devolvió una respuesta no válida (${res.status}) al cargar empresas.`
            )
          }

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.message || `Error ${res.status}: Failed to fetch empresas`)
          }
          const data = await res.json()
          setEmpresas(data.empresas || data || [])
          return
        }

        const userId = getUserIdFromToken(token)
        if (!userId) {
          throw new Error("No se pudo identificar al usuario. Vuelve a iniciar sesión.")
        }

        const res = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ACCESS_BY_USER(userId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(
            errorData.msg || errorData.message || `Error ${res.status} al cargar empresas asignadas`
          )
        }

        const data = await res.json()
        const rows = Array.isArray(data.empresas) ? data.empresas : []
        setEmpresas(mapEmpresasFromAccessRows(rows))
      } catch (e: any) {
        setError(`Error al cargar empresas: ${e.message}`)
        setEmpresas([])
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  // Handlers for selection changes
  const handleSelectEmpresa = useCallback(async (empresaId: string) => {
    const empresa = empresas.find((e) => e.id === empresaId)
    if (!empresa) return

    setSelectedEmpresa(empresa)
    setSelectedPlant(null)
    setSelectedSystem("")
    setPlants([])
    setSystems([])

    setLoading(true)
    setError(null)
    try {
      // Fetch plants by empresa
      const url = `${API_BASE_URL}/api/plantas/empresa/${empresa.id}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        if (res.status === 404) {
          throw new Error("El endpoint de plantas por empresa no está disponible. Por favor, verifica que el backend tenga implementado el endpoint /api/plantas/empresa/:empresaId")
        }
        const text = await res.text()
        console.error('❌ Non-JSON response:', text.substring(0, 200))
        throw new Error(`El servidor devolvió una respuesta no válida (${res.status}). El endpoint /api/plantas/empresa/:empresaId puede no estar implementado.`)
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ Error response:', errorData)
        throw new Error(errorData.msg || errorData.message || `Error ${res.status}: No se pudieron cargar las plantas para la empresa.`)
      }
      const data = await res.json()
      const plantasArray = data.plantas || data || []
      setPlants(plantasArray)
      
      // Auto-select first plant if enabled and plants are available
      if (plantasArray.length > 0 && autoSelectFirstPlant) {
        const firstPlant = plantasArray[0]
        // Set the plant directly and load its systems
        setSelectedPlant(firstPlant)
        
        // Load systems for the first plant
        try {
          const plantRes = await fetch(`${API_BASE_URL}/api/procesos/planta/${firstPlant.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (plantRes.ok) {
            const plantData = await plantRes.json()
            const sistemas = plantData.procesos || []
            const sistemasOrdenados = sistemas.sort((a: System, b: System) => {
              const ordenA = a.orden ?? 999999
              const ordenB = b.orden ?? 999999
              return ordenA - ordenB
            })
            setSystems(sistemasOrdenados)
            if (sistemasOrdenados.length > 0 && autoSelectFirstSystem) {
              setSelectedSystem(sistemasOrdenados[0].id)
            }
          }
        } catch (sysError) {
          console.error('Error loading systems for first plant:', sysError)
        }
      } else {
        setSelectedPlant(null)
        if (plantasArray.length === 0) {
          console.warn('⚠️ No se encontraron plantas para la empresa:', empresa.nombre)
          console.warn('💡 Posible causa: Las plantas en la BD no tienen empresa_id asignado')
          console.warn('💡 Verifica en la BD que las plantas tengan empresa_id =', empresa.id)
          console.warn('💡 Ejecuta: SELECT * FROM plantas WHERE empresa_id IS NULL; para ver plantas sin empresa')
        }
      }
    } catch (e: any) {
      setError(`Error al cargar plantas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [empresas, token, autoSelectFirstPlant])

  const handleSelectPlant = useCallback(async (plantId: string) => {
    // Buscar la planta en el estado actual de plants
    const plant = plants.find((p) => p.id === plantId)
    if (!plant) {
      console.warn('⚠️ Planta no encontrada en el estado actual:', plantId)
      return
    }

    setSelectedPlant(plant)
    setSelectedSystem("")
    setSystems([])

    setLoading(true)
    setError(null)
    try {
      // Get complete plant data
      const plantRes = await fetch(`${API_BASE_URL}/api/plantas/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      let completePlant = plant
      if (plantRes.ok) {
        const plantData = await plantRes.json()
        const fullPlant = plantData.plantas?.find((p: any) => p.id === plantId)
        if (fullPlant) {
          completePlant = {
            ...plant,
            mensaje_cliente: fullPlant.mensaje_cliente,
            dirigido_a: fullPlant.dirigido_a
          }
          setSelectedPlant(completePlant)
        }
      }

      // Get systems for the plant
      const res = await fetch(`${API_BASE_URL}/api/procesos/planta/${plant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudieron cargar los sistemas para la planta.")
      }
      const data = await res.json()
      const sistemas = data.procesos || []
      // Sort systems by orden
      const sistemasOrdenados = sistemas.sort((a: System, b: System) => {
        const ordenA = a.orden ?? 999999
        const ordenB = b.orden ?? 999999
        return ordenA - ordenB
      })
      setSystems(sistemasOrdenados)
      if (sistemasOrdenados.length > 0 && autoSelectFirstSystem) {
        setSelectedSystem(sistemasOrdenados[0].id)
      }
    } catch (e: any) {
      setError(`Error al cargar sistemas: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [plants, token, autoSelectFirstSystem])

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
    empresas,
    plants,
    systems,
    selectedEmpresa,
    selectedPlant,
    selectedSystem,
    userRole,
    loading,
    error,
    setSelectedEmpresa,
    setSelectedPlant,
    setSelectedSystem,
    handleSelectEmpresa,
    handleSelectPlant,
    fetchParameters
  }
}
