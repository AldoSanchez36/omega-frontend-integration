"use client"

import type React from "react"
import { useEffect, useState, Fragment, useCallback, useMemo } from "react"
import axios from "axios"
import { authService } from "@/services/authService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

interface User {
  id?: string
  _id?: string
  username: string
  email: string
  puesto?: string
  role?: string
  createdAt?: string
  updatedAt?: string
  empresa?: string
}

// Helper que devuelve un id robusto (_id o id)
const getUserId = (u: User | null | undefined) => u?._id ?? (u as any)?.id ?? ''

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [selectedUsuario, setSelectedUsuario] = useState<string>("")
  const [selectedPlanta, setSelectedPlanta] = useState<string>("")
  const [selectedSistema, setSelectedSistema] = useState<string>("")

  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null)

  // Modal edición usuario
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null)
  const [editUsername, setEditUsername] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPuesto, setEditPuesto] = useState("")
  const [editEmpresa, setEditEmpresa] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  // Modal crear usuario
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createUsername, setCreateUsername] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createPuesto, setCreatePuesto] = useState("analista")
  const [createEmpresa, setCreateEmpresa] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // Modal eliminar usuario
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("user")

  // --- MODAL DE GESTIONAR PERMISOS: LÓGICA DE CASCADA Y PERMISOS ---
  const [plantasModal, setPlantasModal] = useState<any[]>([]);
  const [plantaSeleccionadaModal, setPlantaSeleccionadaModal] = useState<string>("");
  const [sistemasModal, setSistemasModal] = useState<any[]>([]);
  const [sistemaSeleccionadoModal, setSistemaSeleccionadoModal] = useState<string>("");
  const [permisoVer, setPermisoVer] = useState(false);
  const [permisoEditar, setPermisoEditar] = useState(false);
  const [permisosLoading, setPermisosLoading] = useState(false);
  const [permisosError, setPermisosError] = useState<string | null>(null);
  const [permisosSuccess, setPermisosSuccess] = useState<string | null>(null);

  // Estados para filtros
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroEmail, setFiltroEmail] = useState("")
  const [filtroRol, setFiltroRol] = useState("")
  const [filtroEmpresa, setFiltroEmpresa] = useState("")
  
  // Estados para mostrar/ocultar inputs de filtro
  const [showFiltroUsuario, setShowFiltroUsuario] = useState(false)
  const [showFiltroEmail, setShowFiltroEmail] = useState(false)
  const [showFiltroRol, setShowFiltroRol] = useState(false)
  const [showFiltroEmpresa, setShowFiltroEmpresa] = useState(false)
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Determinar si el usuario actual es admin
  const isAdmin = currentUserRole === 'admin'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.puesto || "user")
      }
    }
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Obtener token
        const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
        if (!token) {
          setError("No hay token de autenticación")
          setLoading(false)
          return
        }
        
        // Hacer la petición con axios
        const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.USERS}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        
        // Procesar los datos recibidos
        const usersData = (Array.isArray(response.data) ? response.data : (response.data.users || response.data.usuarios || []))
          .map((u: any) => ({ ...u, id: u.id || u._id }))
        setUsers(usersData)
        
        // Obtener el rol del usuario actual desde el token
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]))
          setCurrentUserRole(tokenData.userType || tokenData.role || 'user')
        } catch (e) {
          setCurrentUserRole('user')
        }
        
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError("Sesión expirada. Por favor, inicia sesión nuevamente.")
          } else {
            setError(`Error del servidor: ${err.response?.status} - ${err.response?.statusText}`)
          }
        } else {
          setError("Error de conexión. Verifica que el backend esté corriendo.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Fetch plantas accesibles al abrir modal
  useEffect(() => {
    if (!showPermissionModal || !selectedUserForPermissions) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
    const usuarioId = getUserId(selectedUserForPermissions)
    if (!usuarioId) return; // No hacer fetch si no hay id
    
    // Si el usuario actual es admin, obtener todas las plantas del sistema
    // Si no es admin, obtener solo las plantas accesibles para el usuario seleccionado
    const endpoint = isAdmin 
      ? `${API_BASE_URL}${API_ENDPOINTS.PLANTS_ALL_ID}`
      : `${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`;
    
    const headers: any = { Authorization: `Bearer ${token}` };
    
    // Solo agregar x-usuario-id si no es admin (para el endpoint de accesibles)
    if (!isAdmin) {
      headers["x-usuario-id"] = usuarioId;
    }
    
    
    fetch(endpoint, { headers })
      .then(res => res.json())
      .then(data => {
        setPlantasModal(data.plantas || []);
        if (data.plantas && data.plantas.length > 0) {
          const primeraPlanta = data.plantas[0];
          const plantaId = primeraPlanta.id ?? primeraPlanta._id;
          setPlantaSeleccionadaModal(plantaId);
        }
      })
      .catch(error => {
        console.error("⚠️ Error fetching plantas:", error);
        // Si el endpoint de todas las plantas no existe, fallback al endpoint de accesibles
        if (isAdmin) {
          fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`, {
            headers: { Authorization: `Bearer ${token}`, "x-usuario-id": usuarioId }
          })
            .then(res => res.json())
            .then(data => {
              setPlantasModal(data.plantas || []);
              if (data.plantas && data.plantas.length > 0) {
                setPlantaSeleccionadaModal(data.plantas[0].id ?? data.plantas[0]._id);
              }
            })
            .catch(fallbackError => {
              console.error("⚠️ Error en fallback:", fallbackError);
            });
        }
      });
  }, [showPermissionModal, selectedUserForPermissions, isAdmin]);

  // Fetch sistemas al seleccionar planta
  useEffect(() => {
    if (!plantaSeleccionadaModal) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
    
    fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(String(plantaSeleccionadaModal ?? '') || '')}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSistemasModal(data.procesos || []);
        if (data.procesos && data.procesos.length > 0) {
          setSistemaSeleccionadoModal(data.procesos[0].id);
        }
      })
      .catch(error => {
        console.error("⚠️ Error fetching sistemas:", error);
      });
  }, [plantaSeleccionadaModal]);

  useEffect(() => {
    if (!selectedUserForPermissions || !plantaSeleccionadaModal) {
      setPermisoVer(false);
      setPermisoEditar(false);
      return;
    }
    const usuarioId = getUserId(selectedUserForPermissions);
    const plantaId = plantaSeleccionadaModal;
    const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;

    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESS_BY_USER(String(usuarioId ?? '') || '')}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const plantas = data.plantas || [];
        const found = plantas.find((p: { planta_id: string; puede_ver: boolean; puede_editar: boolean }) => String(p.planta_id) === String(plantaId));
        
        setPermisoVer(!!found?.puede_ver);
        setPermisoEditar(!!found?.puede_editar);
      })
      .catch((error) => {
        console.error("⚠️ Error fetching permisos de planta:", error);
        setPermisoVer(false);
        setPermisoEditar(false);
      });
  }, [selectedUserForPermissions, plantaSeleccionadaModal]);

  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { color: string; text: string } } = {
      admin: { color: "bg-red-600", text: "Administrador" },
      user: { color: "bg-blue-600", text: "Analista" },
      analista: { color: "bg-blue-600", text: "Analista" },
      client: { color: "bg-gray-600", text: "Cliente" }
    }
    
    const roleInfo = roleMap[role.toLowerCase()] || { color: "bg-teal-500", text: "Analista" }
    return (
      <span className={`text-white text-sm px-2 py-1 rounded-full ${roleInfo.color}`}>
        {roleInfo.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Función para filtrar y ordenar usuarios
  const usuariosFiltrados = useMemo(() => {
    let filtered = users.filter(user => {
      const matchUsuario = !filtroUsuario || user.username.toLowerCase().includes(filtroUsuario.toLowerCase())
      const matchEmail = !filtroEmail || user.email.toLowerCase().includes(filtroEmail.toLowerCase())
      const matchRol = !filtroRol || (user.puesto || user.role || 'analista').toLowerCase().includes(filtroRol.toLowerCase())
      const matchEmpresa = !filtroEmpresa || (user.empresa || "No asignado").toLowerCase().includes(filtroEmpresa.toLowerCase())
      
      return matchUsuario && matchEmail && matchRol && matchEmpresa
    })

    // Aplicar ordenamiento si hay un campo seleccionado
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = ""
        let bValue = ""
        
        switch (sortField) {
          case "username":
            aValue = a.username.toLowerCase()
            bValue = b.username.toLowerCase()
            break
          case "email":
            aValue = a.email.toLowerCase()
            bValue = b.email.toLowerCase()
            break
          case "role":
            // Ordenamiento personalizado para roles con jerarquía
            const roleOrder: { [key: string]: number } = { 'admin': 1, 'administrador': 1, 'analista': 2, 'user': 2, 'client': 3, 'cliente': 3 }
            const aRole = (a.puesto || a.role || 'analista').toLowerCase()
            const bRole = (b.puesto || b.role || 'analista').toLowerCase()
            const aOrder = roleOrder[aRole] || 4
            const bOrder = roleOrder[bRole] || 4
            
            if (aOrder !== bOrder) {
              return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder
            }
            // Si tienen el mismo orden, ordenar alfabéticamente
            aValue = aRole
            bValue = bRole
            break
          case "empresa":
            aValue = (a.empresa || "No asignado").toLowerCase()
            bValue = (b.empresa || "No asignado").toLowerCase()
            break
        }
        
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [users, filtroUsuario, filtroEmail, filtroRol, filtroEmpresa, sortField, sortDirection])

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroUsuario("")
    setFiltroEmail("")
    setFiltroRol("")
    setFiltroEmpresa("")
    setShowFiltroUsuario(false)
    setShowFiltroEmail(false)
    setShowFiltroRol(false)
    setShowFiltroEmpresa(false)
    setSortField("")
    setSortDirection("asc")
  }

  // Función para manejar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const Dropdown = ({ label = "Selecciona", options = [], onSelect }: {
    label?: string,
    options: string[],
    onSelect?: (value: string) => void
  }) => {
    const [open, setOpen] = useState(false)

    return (
      <div className="relative inline-block text-left w-full">
        <div>
          <button
            type="button"
            className="inline-flex w-full justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen(!open)}
          >
            {label}
            <svg
              className="-mr-1 size-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {open && (
          <div
            className="absolute z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="py-1">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setOpen(false)
                    onSelect?.(option)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Modal handler permisos
  const openPermissionModal = (user: User) => {
    setSelectedUserForPermissions(user)
    setShowPermissionModal(true)
  }
  const closePermissionModal = () => {
    setShowPermissionModal(false)
    setSelectedUserForPermissions(null)
    setPermisosError(null)
    setPermisosSuccess(null)
    setPermisosLoading(false)
  }

  // Modal handler edición
  const openEditModal = (user: User) => {
    setSelectedUserForEdit(user)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditPuesto(user.puesto || "analista")
    setEditEmpresa(user.empresa || "")
    setEditError(null)
    setEditSuccess(null)
    setShowEditModal(true)
  }
  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedUserForEdit(null)
    setEditError(null)
    setEditSuccess(null)
  }

  // Modal handlers crear usuario
  const openCreateModal = () => {
    setCreateUsername("")
    setCreateEmail("")
    setCreatePassword("")
    setCreatePuesto("analista")
    setCreateEmpresa("")
    setCreateError(null)
    setCreateSuccess(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateError(null)
    setCreateSuccess(null)
  }

  // Modal handlers eliminar usuario
  const openDeleteModal = (user: User) => {
    setSelectedUserForDelete(user)
    setDeleteError(null)
    setDeleteSuccess(null)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setSelectedUserForDelete(null)
    setDeleteError(null)
    setDeleteSuccess(null)
  }

  // Crear nuevo usuario
  const handleCreateUser = async () => {
    if (!createUsername.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Todos los campos son obligatorios")
      return
    }

    setCreateLoading(true)
    setCreateError(null)
    setCreateSuccess(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
      if (!token) {
        setCreateError("No hay token de autenticación")
        return
      }

      console.log("Creando usuario:", {
        username: createUsername,
        email: createEmail,
        password: createPassword,
        puesto: createPuesto,
        empresa: createEmpresa,
        endpoint: `${API_BASE_URL}${API_ENDPOINTS.REGISTER}`
      })

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REGISTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: createUsername,
          email: createEmail,
          password: createPassword,
          confirmPassword: createPassword,
          puesto: createPuesto,
          empresa: createEmpresa,
        }),
      })

      console.log("Respuesta del servidor:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      })

      if (!res.ok) {
        let errorMsg = "No se pudo crear el usuario."
        try {
          const errorData = await res.json()
          errorMsg = errorData.message || errorData.error || errorMsg
          console.error("Error del servidor:", errorData)
        } catch (e) {
          console.error("Error al parsear respuesta:", e)
        }
        setCreateError(errorMsg)
        return
      }

      const data = await res.json()
      console.log("Usuario creado exitosamente:", data)
      
      setCreateSuccess("Usuario creado exitosamente")
      
      // Recargar la lista de usuarios desde el servidor
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
        if (token) {
          const usersRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USERS}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          })
          
          if (usersRes.ok) {
            const usersData = await usersRes.json()
            setUsers(usersData.usuarios || [])
          }
        }
      } catch (error) {
        console.error("Error al recargar usuarios:", error)
        // Si falla la recarga, al menos cerramos el modal
      }
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        closeCreateModal()
      }, 1500)

    } catch (error) {
      console.error("Error al crear usuario:", error)
      setCreateError("Error de conexión al crear el usuario")
    } finally {
      setCreateLoading(false)
    }
  }

  // PATCH update user
  const handleEditSave = async () => {
    if (!selectedUserForEdit) return
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      const userId = selectedUserForEdit._id || selectedUserForEdit.id
      if (!userId) {
        throw new Error("ID de usuario no encontrado")
      }

      console.log("Actualizando usuario:", {
        userId,
        username: editUsername,
        email: editEmail,
        puesto: editPuesto,
        endpoint: `${API_BASE_URL}${API_ENDPOINTS.USER_UPDATE(userId)}`
      })

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER_UPDATE(userId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          puesto: editPuesto,
          empresa: editEmpresa,
        }),
      })

      console.log("Respuesta del servidor:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      })

      if (!res.ok) {
        let errorMsg = "No se pudo actualizar el usuario."
        try {
          const errorData = await res.json()
          errorMsg = errorData.message || errorData.error || errorMsg
          console.error("Error del servidor:", errorData)
        } catch (parseError) {
          console.error("Error al parsear respuesta:", parseError)
          errorMsg = `Error del servidor: ${res.status} - ${res.statusText}`
        }
        throw new Error(errorMsg)
      }

      const responseData = await res.json()
      console.log("Usuario actualizado exitosamente:", responseData)
      
      setEditSuccess("Usuario actualizado correctamente.")
      setTimeout(() => {
        closeEditModal()
        window.location.reload()
      }, 1000)
    } catch (e) {
      console.error("Error al actualizar usuario:", e)
      if (e instanceof Error) {
        setEditError(e.message)
      } else {
        setEditError("Error inesperado al actualizar el usuario.")
      }
    } finally {
      setEditLoading(false)
    }
  }

  // DELETE user - Nueva implementación
  const handleDeleteUser = async () => {
    if (!selectedUserForDelete) return

    setDeleteLoading(true)
    setDeleteError(null)
    setDeleteSuccess(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
      if (!token) {
        setDeleteError("No hay token de autenticación")
        return
      }

      const userId = getUserId(selectedUserForDelete)
      console.log("Eliminando usuario:", {
        userId,
        endpoint: `${API_BASE_URL}${API_ENDPOINTS.USER_DELETE(userId)}`
      })

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER_DELETE(userId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })

      console.log("Respuesta del servidor:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      })

      if (!res.ok) {
        let errorMsg = "No se pudo eliminar el usuario."
        try {
          const errorData = await res.json()
          errorMsg = errorData.message || errorData.msg || errorMsg
          console.error("Error del servidor:", errorData)
        } catch (e) {
          console.error("Error al parsear respuesta:", e)
        }
        setDeleteError(errorMsg)
        return
      }

      const data = await res.json()
      console.log("Usuario eliminado exitosamente:", data)
      
      setDeleteSuccess("Usuario eliminado exitosamente")
      
      // Actualizar la lista de usuarios
      const updatedUsers = users.filter(user => getUserId(user) !== userId)
      setUsers(updatedUsers)
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        closeDeleteModal()
      }, 1500)

    } catch (error) {
      console.error("Error al eliminar usuario:", error)
      setDeleteError("Error de conexión al eliminar el usuario")
    } finally {
      setDeleteLoading(false)
    }
  }

  // Handler para guardar permisos de planta (versión corregida según backend)
  const handleGuardarPermisos = async () => {
    if (!selectedUserForPermissions || !plantaSeleccionadaModal) {
      return;
    }
    
    setPermisosLoading(true);
    setPermisosError(null);
    setPermisosSuccess(null);
    
    const usuarioId = getUserId(selectedUserForPermissions);
    const plantaId = plantaSeleccionadaModal;
    const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
    
    try {
      // POST para asignar permisos de planta
      const payload = {
        usuario_id: usuarioId,
        planta_id: plantaId,
        puede_ver: permisoVer,
        puede_editar: permisoEditar
      };
      
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ASSIGN_ACCESS}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.msg || errorData.message || "Error al guardar permisos");
      }
      
      const data = await res.json();
      
      setPermisosSuccess("Permisos de planta asignados correctamente");
      
      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        closePermissionModal();
      }, 1500);
      
    } catch (err: any) {
      setPermisosError(err.message || "Error inesperado al guardar permisos");
    } finally {
      setPermisosLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto mb-3"></div>
          <h5 className="text-gray-700 text-lg">Cargando usuarios...</h5>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
       <Navbar role={userRole} />
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg shadow mb-4">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center mb-1">
                <span className="material-icons mr-2 text-2xl">people</span>
                Gestión de Usuarios
              </h1>
              <p className="opacity-90 text-sm">Administra los usuarios del sistema</p>
            </div>
            <div className="mt-2 md:mt-0">
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full border border-white/30">
                <span className="font-semibold text-sm">{users.length}</span> usuarios
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto">          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
              <span className="material-icons align-middle mr-2">warning</span>
              <strong className="font-semibold">Error:</strong> {error}
              <button 
                type="button" 
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setError(null)}
                aria-label="Close"
              >
                <span className="material-icons text-red-700">close</span>
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-gray-700 font-semibold mb-0">Lista de Usuarios</h5>
              </div>
              <div className="flex gap-2">
                <button 
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition flex items-center"
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className="material-icons align-middle mr-1">person_add</span>
                  Agregar Usuario
                </button>
                <button 
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition flex items-center"
                  onClick={limpiarFiltros}
                >
                  <span className="material-icons align-middle mr-1">clear</span>
                  Limpiar Filtros
                </button>
                <button 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition flex items-center"
                  onClick={() => window.location.reload()}
                >
                  <span className="material-icons align-middle mr-1">refresh</span>
                  Actualizar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-auto w-full border-collapse border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Usuario</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSort("username")}
                              className={`p-1 rounded hover:bg-gray-200 transition ${
                                sortField === "username" ? "bg-blue-100 text-blue-600" : "text-gray-500"
                              }`}
                              title="Ordenar por usuario"
                            >
                            <span className="material-icons text-sm">
                              filter_list
                            </span>
                          </button>
                          <button
                            onClick={() => setShowFiltroUsuario(!showFiltroUsuario)}
                            className={`p-1 rounded hover:bg-gray-200 transition ${
                              filtroUsuario ? "bg-orange-100 text-orange-600" : "text-gray-500"
                            }`}
                            title="Filtrar por usuario"
                          >
                            <span className="material-icons text-sm">filter_alt</span>
                            </button>
                          </div>
                        </div>
                        {showFiltroUsuario && (
                          <Input
                            placeholder="Filtrar por usuario..."
                            value={filtroUsuario}
                            onChange={(e) => setFiltroUsuario(e.target.value)}
                            className="w-full text-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Correo</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSort("email")}
                              className={`p-1 rounded hover:bg-gray-200 transition ${
                                sortField === "email" ? "bg-blue-100 text-blue-600" : "text-gray-500"
                              }`}
                              title="Ordenar por correo"
                            >
                            <span className="material-icons text-sm">
                              filter_list
                            </span>
                          </button>
                          <button
                            onClick={() => setShowFiltroEmail(!showFiltroEmail)}
                            className={`p-1 rounded hover:bg-gray-200 transition ${
                              filtroEmail ? "bg-orange-100 text-orange-600" : "text-gray-500"
                            }`}
                            title="Filtrar por correo"
                          >
                            <span className="material-icons text-sm">filter_alt</span>
                            </button>
                          </div>
                        </div>
                        {showFiltroEmail && (
                          <Input
                            placeholder="Filtrar por correo..."
                            value={filtroEmail}
                            onChange={(e) => setFiltroEmail(e.target.value)}
                            className="w-full text-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Rol</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSort("role")}
                              className={`p-1 rounded hover:bg-gray-200 transition ${
                                sortField === "role" ? "bg-blue-100 text-blue-600" : "text-gray-500"
                              }`}
                              title="Ordenar por rol"
                            >
                            <span className="material-icons text-sm">
                              filter_list
                            </span>
                          </button>
                          <button
                            onClick={() => setShowFiltroRol(!showFiltroRol)}
                            className={`p-1 rounded hover:bg-gray-200 transition ${
                              filtroRol ? "bg-orange-100 text-orange-600" : "text-gray-500"
                            }`}
                            title="Filtrar por rol"
                          >
                            <span className="material-icons text-sm">filter_alt</span>
                            </button>
                          </div>
                        </div>
                        {showFiltroRol && (
                          <Input
                            placeholder="Filtrar por rol..."
                            value={filtroRol}
                            onChange={(e) => setFiltroRol(e.target.value)}
                            className="w-full text-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Empresa</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSort("empresa")}
                              className={`p-1 rounded hover:bg-gray-200 transition ${
                                sortField === "empresa" ? "bg-blue-100 text-blue-600" : "text-gray-500"
                              }`}
                              title="Ordenar por empresa"
                            >
                            <span className="material-icons text-sm">
                              filter_list
                            </span>
                          </button>
                          <button
                            onClick={() => setShowFiltroEmpresa(!showFiltroEmpresa)}
                            className={`p-1 rounded hover:bg-gray-200 transition ${
                              filtroEmpresa ? "bg-orange-100 text-orange-600" : "text-gray-500"
                            }`}
                            title="Filtrar por empresa"
                          >
                            <span className="material-icons text-sm">filter_alt</span>
                            </button>
                          </div>
                        </div>
                        {showFiltroEmpresa && (
                          <Input
                            placeholder="Filtrar por empresa..."
                            value={filtroEmpresa}
                            onChange={(e) => setFiltroEmpresa(e.target.value)}
                            className="w-full text-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      <div className="flex items-center justify-between">
                        <span>Acciones</span>
                        <div className="text-xs text-gray-500">
                          {usuariosFiltrados.length} de {users.length}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length > 0 ? (
                    usuariosFiltrados.map((user) => {
                      // Validar que el usuario existe y tiene las propiedades necesarias
                      if (!user || !user.username) {
                        console.warn("Usuario inválido encontrado:", user)
                        return null
                      }
                      
                      return (
                        <tr key={getUserId(user)} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex items-center">
                              <div>
                                <div className="font-semibold text-gray-800">{user.username}</div>
                              </div>
                            </div>
                          </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                            {user.email}
                          </a>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {getRoleBadge(user.puesto || user.role || 'analista')}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center">
                            <div>
                              <div className="font-semibold text-gray-800">{user.empresa || "No asignado"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex space-x-2">
                            <button
                              className="flex items-center justify-center w-9 h-9 bg-transparent border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition"
                              title="Editar usuario"
                              onClick={() => openEditModal(user)}
                            >
                              <span className="material-icons text-base">edit</span>
                            </button>
                            <button
                              className="flex items-center justify-center w-9 h-9 bg-transparent border border-gray-500 text-gray-700 rounded hover:bg-gray-700 hover:text-white transition"
                              title="Gestionar permisos"
                              onClick={() => openPermissionModal(user)}
                            >
                              <span className="material-icons text-base">lock</span>
                            </button>
                            <button className="flex items-center justify-center w-9 h-9 bg-transparent border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition" title="Eliminar" onClick={() => openDeleteModal(user)}>
                              <span className="material-icons text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    }).filter(Boolean) // Filtrar elementos null
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-500">
                        <div>
                          <span className="material-icons text-6xl mb-3">search_off</span>
                          <h5 className="text-lg font-semibold">
                            {users.length === 0 ? "No se encontraron usuarios" : "No hay resultados para los filtros aplicados"}
                          </h5>
                          <p>
                            {users.length === 0 
                              ? "No hay usuarios registrados en el sistema." 
                              : "Intenta ajustar los filtros de búsqueda."
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="bg-blue-500 text-white rounded-t-lg px-4 py-3 flex items-center">
              <span className="material-icons mr-2">info</span>
              <h6 className="font-semibold mb-0">Información del Sistema</h6>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-700">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
              <div>
                      <small className="block text-gray-500 mb-1">Total de usuarios</small>
                      <div className="font-semibold text-lg">{users.length}</div>
              </div>
                    <span className="material-icons text-blue-600 text-2xl">people</span>
                </div>
              </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
              <div>
                      <small className="block text-gray-500 mb-1">Tu rol</small>
                      <div className="font-semibold text-lg text-blue-600 capitalize">{currentUserRole}</div>
              </div>
                    <span className="material-icons text-green-600 text-2xl">admin_panel_settings</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
              <div>
                      <small className="block text-gray-500 mb-1">Estado de conexión</small>
                      <div className="font-semibold text-lg text-green-600">✓ Conectado</div>
                    </div>
                    <span className="material-icons text-green-600 text-2xl">wifi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de edición de usuario */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={closeEditModal}></div>
            <div className="relative z-10 w-full max-w-lg mx-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                        <span className="material-icons text-blue-600 text-3xl">edit</span>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-base font-semibold text-gray-900" id="dialog-title">Editar usuario</h3>
                        <div className="mt-2 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <Input
                              value={editUsername}
                              onChange={e => setEditUsername(e.target.value)}
                              placeholder="Username"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <Input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              placeholder="Email"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
                            <Select value={editPuesto} onValueChange={setEditPuesto}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione un puesto" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="analista">Analista</SelectItem>
                                <SelectItem value="client">Cliente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                            <Input
                              value={editEmpresa}
                              onChange={e => setEditEmpresa(e.target.value)}
                              placeholder="Nombre de la empresa"
                              className="w-full"
                            />
                          </div>
                          {editError && <div className="text-red-600 text-sm">{editError}</div>}
                          {editSuccess && <div className="text-green-600 text-sm">{editSuccess}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-2">
                    <button type="button" className="inline-flex items-center justify-center w-45 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500" onClick={handleEditSave} disabled={editLoading}>{editLoading ? "Guardando..." : "Guardar cambios"}</button>
                    <button type="button" className="inline-flex items-center justify-center w-45 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50" onClick={closeEditModal} disabled={editLoading}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de creación de usuario */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={closeCreateModal}></div>
            <div className="relative z-10 w-full max-w-lg mx-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:size-10">
                        <span className="material-icons text-green-600 text-3xl">person_add</span>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-base font-semibold text-gray-900" id="dialog-title">Crear nuevo usuario</h3>
                        <div className="mt-2 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <Input
                              value={createUsername}
                              onChange={e => setCreateUsername(e.target.value)}
                              placeholder="Nombre de usuario"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <Input
                              type="email"
                              value={createEmail}
                              onChange={e => setCreateEmail(e.target.value)}
                              placeholder="Correo electrónico"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <Input
                              type="password"
                              value={createPassword}
                              onChange={e => setCreatePassword(e.target.value)}
                              placeholder="Contraseña"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
                            <Select value={createPuesto} onValueChange={setCreatePuesto}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione un puesto" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="analista">Analista</SelectItem>
                                <SelectItem value="client">Cliente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                            <Input
                              value={createEmpresa}
                              onChange={e => setCreateEmpresa(e.target.value)}
                              placeholder="Nombre de la empresa"
                              className="w-full"
                            />
                          </div>
                          {createError && <div className="text-red-600 text-sm">{createError}</div>}
                          {createSuccess && <div className="text-green-600 text-sm">{createSuccess}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-2">
                    <button type="button" className="inline-flex items-center justify-center w-45 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500" onClick={handleCreateUser} disabled={createLoading}>{createLoading ? "Creando..." : "Crear usuario"}</button>
                    <button type="button" className="inline-flex items-center justify-center w-45 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50" onClick={closeCreateModal} disabled={createLoading}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para eliminar usuario */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={closeDeleteModal}></div>
            <div className="relative z-10 w-full max-w-md mx-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                        <span className="material-icons text-red-600 text-3xl">warning</span>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-base font-semibold text-gray-900" id="dialog-title">Eliminar usuario</h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            ¿Estás seguro de que deseas eliminar al usuario <strong>{selectedUserForDelete?.username}</strong>? 
                            Esta acción no se puede deshacer.
                          </p>
                          {deleteError && <div className="text-red-600 text-sm mt-2">{deleteError}</div>}
                          {deleteSuccess && <div className="text-green-600 text-sm mt-2">{deleteSuccess}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-6">
                    <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" onClick={closeDeleteModal} disabled={deleteLoading}>Cancelar</button>
                    <button type="button" className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500" onClick={handleDeleteUser} disabled={deleteLoading}>{deleteLoading ? "Eliminando..." : "Eliminar"}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de permisos */}
        {showPermissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay de fondo */}
            <div 
              className="fixed inset-0 bg-gray-500/75 transition-opacity" 
              aria-hidden="true" 
              onClick={closePermissionModal}
            />
            
            {/* Contenedor del modal centrado con ancho máximo */}
            <div className="relative w-full max-w-[1000px] max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <span className="material-icons text-red-600 text-xl">lock</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Gestionar permisos - {selectedUserForPermissions?.username}
                    </h3>
                    <p className="text-sm text-gray-600">Configurar acceso a plantas y sistemas</p>
                  </div>
                </div>
                <button
                  onClick={closePermissionModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Cerrar modal"
                >
                  <span className="material-icons text-xl">close</span>
                </button>
              </div>

              {/* Contenido scrolleable del modal */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Información del usuario */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Usuario</span>
                      <div className="font-semibold text-gray-900 mt-1">{selectedUserForPermissions?.username}</div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</span>
                      <div className="mt-1">{getRoleBadge(selectedUserForPermissions?.puesto || 'analista')}</div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                      <div className="text-sm text-gray-700 mt-1 break-all">{selectedUserForPermissions?.email}</div>
                    </div>
                  </div>
                </div>

                {/* Mensaje informativo para admin */}
                {isAdmin && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="material-icons text-blue-600 text-lg mt-0.5">info</span>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Permisos de Administrador</h4>
                        <p className="text-sm text-blue-800">
                          Como administrador, puedes asignar permisos a cualquier planta del sistema para este usuario.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sección de configuración de permisos */}
                <div className="space-y-6">
                  {/* Dropdown de plantas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Planta
                    </label>
                    {plantasModal.length > 0 ? (
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={plantaSeleccionadaModal}
                        onChange={e => setPlantaSeleccionadaModal(e.target.value)}
                      >
                        {plantasModal.map((planta: any) => (
                          <option key={planta.id ?? planta._id} value={planta.id ?? planta._id}>
                            {planta.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                        {isAdmin ? "No hay plantas disponibles en el sistema" : "Este usuario no tiene acceso a ninguna planta"}
                      </div>
                    )}
                  </div>

                  {/* Dropdown de sistemas */}
                  {plantasModal.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sistema
                      </label>
                      {sistemasModal.length > 0 ? (
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          value={sistemaSeleccionadoModal}
                          onChange={e => setSistemaSeleccionadoModal(e.target.value)}
                        >
                          {sistemasModal.map((sistema: any) => (
                            <option key={sistema.id} value={sistema.id}>
                              {sistema.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                          No hay sistemas disponibles en esta planta
                        </div>
                      )}
                    </div>
                  )}

                  {/* Información del sistema seleccionado y permisos */}
                  {plantasModal.length > 0 && sistemasModal.length > 0 && (
                    sistemasModal.map((sistema: any) => (
                      sistema.id === sistemaSeleccionadoModal && (
                        <div key={sistema.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{sistema.nombre}</h4>
                            {sistema.descripcion && (
                              <p className="text-sm text-gray-600">{sistema.descripcion}</p>
                            )}
                          </div>
                          
                          {/* Permisos */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">
                              Permisos para esta planta
                            </h5>
                            
                            <div className="space-y-3">
                              <label className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={permisoVer} 
                                  onChange={e => setPermisoVer(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Permiso para Ver</span>
                                  <p className="text-xs text-gray-500 mt-1">Permite visualizar datos y reportes de esta planta</p>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={permisoEditar} 
                                  onChange={e => setPermisoEditar(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Permiso para Editar</span>
                                  <p className="text-xs text-gray-500 mt-1">Permite modificar configuraciones y datos de esta planta</p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )
                    ))
                  )}

                  {/* Mensajes de error y éxito */}
                  {permisosError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-red-600 text-lg">error</span>
                        <div>
                          <h4 className="font-medium text-red-900 mb-1">Error</h4>
                          <p className="text-sm text-red-800">{permisosError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {permisosSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-green-600 text-lg">check_circle</span>
                        <div>
                          <h4 className="font-medium text-green-900 mb-1">Éxito</h4>
                          <p className="text-sm text-green-800">{permisosSuccess}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer del modal con botones */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button 
                  type="button" 
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors" 
                  onClick={closePermissionModal}
                >
                  Cancelar
                </button>
                <button 
                  className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    plantasModal.length > 0 && !permisosLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`} 
                  onClick={handleGuardarPermisos}
                  disabled={plantasModal.length === 0 || permisosLoading}
                >
                  {permisosLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </div>
                  ) : (
                    "Guardar Permisos"
                  )}
                </button>
              </div>
            </div>
          </div>
        )} 
      </div>
    </ProtectedRoute>
  )
}