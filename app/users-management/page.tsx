"use client"

import type React from "react"
import { useEffect, useState, Fragment, useCallback, useMemo } from "react"
import axios from "axios"
import { authService } from "@/services/authService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface User {
  _id: string
  username: string
  email: string
  puesto?: string
  role?: string
  createdAt?: string
  updatedAt?: string
}

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
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log("🔍 Iniciando petición al backend con axios...")
        setLoading(true)
        setError(null)
        
        // Obtener token
        const token = authService.getToken()
        if (!token) {
          console.error("❌ No hay token de autenticación")
          setError("No hay token de autenticación")
          setLoading(false)
          return
        }
        
        console.log("🔑 Token encontrado:", token.substring(0, 20) + "...")
        
        // Hacer la petición con axios
        const response = await axios.get("http://localhost:4000/api/auth/users", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        
        console.log("📡 Respuesta del servidor:")
        console.log("Status:", response.status)
        console.log("Status Text:", response.statusText)
        console.log("Headers:", response.headers)
        
        console.log("📦 Datos recibidos:")
       /*  console.log(JSON.stringify(response.data, null, 2)) */
        
        // Procesar los datos recibidos
        const usersData = Array.isArray(response.data) ? response.data : (response.data.users || response.data.usuarios || [])
        setUsers(usersData)
        
        // Obtener el rol del usuario actual desde el token
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]))
          setCurrentUserRole(tokenData.userType || tokenData.role || 'user')
        } catch (e) {
          console.error("Error decodificando token:", e)
          setCurrentUserRole('user')
        }
        
      } catch (err) {
        console.error("❌ Error en la petición:")
        if (axios.isAxiosError(err)) {
          console.error("Status:", err.response?.status)
          console.error("Status Text:", err.response?.statusText)
          console.error("Data:", err.response?.data)
          console.error("Message:", err.message)
          
          if (err.response?.status === 401) {
            setError("Sesión expirada. Por favor, inicia sesión nuevamente.")
          } else {
            setError(`Error del servidor: ${err.response?.status} - ${err.response?.statusText}`)
          }
        } else {
          console.error("Error:", err)
          setError("Error de conexión. Verifica que el backend esté corriendo.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const getRoleBadge = (role: string) => {
    const roleMap: { [key: string]: { color: string; text: string } } = {
      admin: { color: "bg-red-600", text: "Administrador" },
      user: { color: "bg-blue-600", text: "Usuario" },
      client: { color: "bg-gray-600", text: "Cliente" }
    }
    
    const roleInfo = roleMap[role.toLowerCase()] || { color: "bg-teal-500", text: role }
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

  const isAdmin = currentUserRole === 'admin'

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
  }

  // Modal handler edición
  const openEditModal = (user: User) => {
    setSelectedUserForEdit(user)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditPuesto(user.puesto || "user")
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

  // PATCH update user
  const handleEditSave = async () => {
    if (!selectedUserForEdit) return
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      const token = authService.getToken()
      const res = await fetch(`http://localhost:4000/api/auth/update/${selectedUserForEdit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          puesto: editPuesto,
        }),
      })
      // Verifica si la respuesta es JSON
      const contentType = res.headers.get("content-type")
      if (!res.ok) {
        let errorMsg = "No se pudo actualizar el usuario."
        if (contentType && contentType.includes("application/json")) {
          const errJson = await res.json()
          errorMsg = errJson.message || errorMsg
        } else {
          errorMsg = "Error de conexión o endpoint no encontrado."
        }
        throw new Error(errorMsg)
      }
      setEditSuccess("Usuario actualizado correctamente.")
      setTimeout(() => {
        closeEditModal()
        window.location.reload()
      }, 1000)
    } catch (e) {
      if (e instanceof Error) {
        setEditError(e.message)
      } else {
        setEditError("Error inesperado al actualizar el usuario.")
      }
    } finally {
      setEditLoading(false)
    }
  }

  // DELETE user
  const handleDeleteUser = async () => {
    if (!selectedUserForEdit) return
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      const res = await fetch(`http://localhost:4000/api/auth/delete/${selectedUserForEdit.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "No se pudo eliminar el usuario.")
      }
      setEditSuccess("Usuario eliminado correctamente.")
      setTimeout(() => {
        closeEditModal()
        window.location.reload()
      }, 1000)
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setEditLoading(false)
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
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-blue-600 text-white py-6 rounded-lg shadow mb-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center mb-1">
              <span className="material-icons mr-2">people</span>
              Gestión de Usuarios
            </h1>
            <p className="opacity-75">Administra los usuarios del sistema</p>
          </div>
          <div>
            <span className="bg-gray-200 text-blue-700 text-sm px-3 py-1 rounded-full">
              {users.length} usuarios
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto">
        {/* Filtros jerárquicos (Cliente/Usuario, Planta, Sistema) - NUEVO DISEÑO */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Selección Jerárquica</h2>
          <p className="text-sm text-gray-500 mb-4">Seleccione Usuario, Planta y Sistema para gestionar parámetros.</p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="usuario" className="text-sm font-semibold text-gray-700 min-w-[70px]">Usuario</label>
              <div className="w-full max-w-sm">
                <Dropdown
                  label={selectedUsuario || "Seleccione un usuario"}
                  options={["Usuario A", "Usuario B"]}
                  onSelect={setSelectedUsuario}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label htmlFor="planta" className="text-sm font-semibold text-gray-700 min-w-[70px]">Planta</label>
              <div className="w-full max-w-sm">
                <Dropdown
                  label={selectedPlanta || "Seleccione una planta"}
                  options={["Planta A", "Planta B"]}
                  onSelect={setSelectedPlanta}
                />
              </div>
              <button className="ml-2 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition">
                Crear Planta
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label htmlFor="sistema" className="text-sm font-semibold text-gray-700 min-w-[70px]">Sistema</label>
              <div className="w-full max-w-sm">
                <Dropdown
                  label={selectedSistema || "Seleccione un sistema"}
                  options={["Sistema A", "Sistema B"]}
                  onSelect={setSelectedSistema}
                />
              </div>
              <button className="ml-2 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition">
                Cargar procesos
              </button>
            </div>
          </div>
        </div>
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
            <h5 className="text-gray-700 font-semibold mb-0">Lista de Usuarios</h5>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              onClick={() => window.location.reload()}
            >
              <span className="material-icons align-middle mr-1">refresh</span>
              Actualizar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Usuario</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Correo</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Rol</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
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
                        {getRoleBadge(user.puesto || user.role || 'user')}
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
                          <button className="flex items-center justify-center w-9 h-9 bg-transparent border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition" title="Eliminar" onClick={() => openEditModal(user)} disabled>
                            <span className="material-icons text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                      <div>
                        <span className="material-icons text-6xl mb-3">people_outline</span>
                        <h5 className="text-lg font-semibold">No se encontraron usuarios</h5>
                        <p>No hay usuarios registrados en el sistema.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-blue-500 text-white rounded-t-lg px-4 py-2 mb-4 flex items-center">
            <span className="material-icons mr-2">info</span>
            <h6 className="font-semibold mb-0">Información de Debug</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-gray-700">
            <div>
              <small className="block text-gray-500 mb-1">Total de usuarios:</small>
              <div className="font-semibold">{users.length}</div>
            </div>
            <div>
              <small className="block text-gray-500 mb-1">Token disponible:</small>
              <div className={`font-semibold ${authService.getToken() ? "text-green-600" : "text-red-600"}`}>
                {authService.getToken() ? "✅ Sí" : "❌ No"}
              </div>
            </div>
            <div>
              <small className="block text-gray-500 mb-1">Tu rol:</small>
              <div className="font-semibold text-blue-600">{currentUserRole}</div>
            </div>
            <div>
              <small className="block text-gray-500 mb-1">Estado:</small>
              <div className="font-semibold text-green-600">✅ Conectado</div>
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
                              <SelectItem value="user">Usuario</SelectItem>
                              <SelectItem value="client">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
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
      {/* Modal de permisos */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={closePermissionModal}></div>
          <div className="relative z-10 w-full max-w-lg mx-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                      <span className="material-icons text-red-600 text-3xl">lock</span>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-base font-semibold text-gray-900" id="dialog-title">Gestionar permisos</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Aquí puedes gestionar los permisos de planta y sistema para el usuario <span className="font-bold">{selectedUserForPermissions?.username}</span>.</p>
                        {/* Aquí puedes agregar los controles de permisos reales */}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button type="button" className="inline-flex w-32 items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:ml-3 sm:w-auto" onClick={closePermissionModal}>Guardar</button>
                  <button type="button" className="mt-3 inline-flex w-32 items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto" onClick={closePermissionModal}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}