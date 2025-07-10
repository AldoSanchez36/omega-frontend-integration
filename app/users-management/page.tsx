"use client"

import type React from "react"
import { useEffect, useState, Fragment, useCallback, useMemo } from "react"
import axios from "axios"
import { authService } from "@/services/authService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"

interface User {
  id?: string
  _id?: string
  username: string
  email: string
  puesto?: string
  role?: string
  createdAt?: string
  updatedAt?: string
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
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("user")

  // --- MODAL DE GESTIONAR PERMISOS: LÓGICA DE CASCADA Y PERMISOS ---
  const [plantasModal, setPlantasModal] = useState<any[]>([]);
  const [plantaSeleccionadaModal, setPlantaSeleccionadaModal] = useState<string>("");
  const [sistemasModal, setSistemasModal] = useState<any[]>([]);
  const [sistemaSeleccionadoModal, setSistemaSeleccionadoModal] = useState<string>("");
  const [permisoVer, setPermisoVer] = useState(false);
  const [permisoEditar, setPermisoEditar] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omega_user')
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
        const token = authService.getToken()
        if (!token) {
          setError("No hay token de autenticación")
          setLoading(false)
          return
        }
        
        // Hacer la petición con axios
        const response = await axios.get("http://localhost:4000/api/auth/users", {
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
    const token = authService.getToken();
    const usuarioId = getUserId(selectedUserForPermissions)
    if (!usuarioId) return; // No hacer fetch si no hay id
    fetch("http://localhost:4000/api/plantas/accesibles", {
      headers: { Authorization: `Bearer ${token}`, "x-usuario-id": usuarioId }
    })
      .then(res => res.json())
      .then(data => {
        setPlantasModal(data.plantas || []);
        if (data.plantas && data.plantas.length > 0) {
          setPlantaSeleccionadaModal(data.plantas[0].id ?? data.plantas[0]._id);
        }
      });
  }, [showPermissionModal, selectedUserForPermissions]);

  // Fetch sistemas al seleccionar planta
  useEffect(() => {
    if (!plantaSeleccionadaModal) return;
    const token = authService.getToken();
    fetch(`http://localhost:4000/api/procesos/planta/${plantaSeleccionadaModal}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSistemasModal(data.procesos || []);
        if (data.procesos && data.procesos.length > 0) {
          setSistemaSeleccionadoModal(data.procesos[0].id);
        }
      });
  }, [plantaSeleccionadaModal]);

  useEffect(() => {
    if (!selectedUserForPermissions || !sistemaSeleccionadoModal) {
      setPermisoVer(false);
      setPermisoEditar(false);
      return;
    }
    const usuarioId = getUserId(selectedUserForPermissions);
    const procesoId = sistemaSeleccionadoModal;
    const token = authService.getToken();

    fetch(`http://localhost:4000/api/accesos/procesos/usuario/${usuarioId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const procesos = data.procesos || [];
        const found = procesos.find((p: { proceso_id: string; puede_ver: boolean; puede_editar: boolean }) => String(p.proceso_id) === String(procesoId));
        setPermisoVer(!!found?.puede_ver);
        setPermisoEditar(!!found?.puede_editar);
      })
      .catch(() => {
        setPermisoVer(false);
        setPermisoEditar(false);
      });
  }, [selectedUserForPermissions, sistemaSeleccionadoModal]);

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
      const res = await fetch(`http://localhost:4000/api/auth/update/${selectedUserForEdit._id}`, {
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
      const res = await fetch(`http://localhost:4000/api/auth/delete/${selectedUserForEdit._id}`, {
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

  // Handler para guardar permisos de sistema (versión corregida según backend)
  const handleGuardarPermisos = async () => {
    if (!selectedUserForPermissions || !plantaSeleccionadaModal || !sistemaSeleccionadoModal) {
      return;
    }
    const usuarioId = getUserId(selectedUserForPermissions);
    const procesoId = sistemaSeleccionadoModal;
    const token = authService.getToken();
    try {
      // 1. GET para saber si ya existen permisos para este proceso
      const getRes = await fetch(`http://localhost:4000/api/accesos/procesos/usuario/${usuarioId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const getData = await getRes.json();
      const procesos = getData.procesos || [];
      const yaExiste = procesos.some((p: any) => String(p.proceso_id) === String(procesoId));
      // 2. POST o PATCH según corresponda
      const payload = {
        usuario_id: usuarioId,
        proceso_id: procesoId,
        puede_ver: permisoVer,
        puede_editar: permisoEditar
      };
      const body = JSON.stringify(payload);
      let res, data;
      if (!yaExiste) {
        // POST asignar
        res = await fetch("http://localhost:4000/api/accesos/procesos/asignar", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body
        });
        data = await res.json();
        closePermissionModal();
      } else {
        // PATCH actualizar
        res = await fetch("http://localhost:4000/api/accesos/procesos/actualizar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body
        });
        data = await res.json();
      }
    } catch (err) {
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
            <div className="relative z-10 w-full max-w-4xl mx-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                        <span className="material-icons text-red-600 text-3xl">lock</span>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-base font-semibold text-gray-900" id="dialog-title">Gestionar permisos</h3>
                        <div className="mt-4">
                          {/* Dropdown de plantas */}
                          <label className="block text-sm font-medium mb-2">Planta</label>
                          <select
                            className="w-full border rounded px-3 py-2 mb-4"
                            value={plantaSeleccionadaModal}
                            onChange={e => setPlantaSeleccionadaModal(e.target.value)}
                          >
                            {plantasModal.map((planta: any) => (
                              <option key={planta.id ?? planta._id} value={planta.id ?? planta._id}>{planta.nombre}</option>
                            ))}
                          </select>
                          {/* Tabs de sistemas */}
                          {sistemasModal.length > 0 && (
                            <div className="mb-4">
                              <div className="flex gap-2 border-b mb-2">
                                {sistemasModal.map((sistema: any) => (
                                  <button
                                    key={sistema.id}
                                    className={`px-4 py-2 font-semibold ${sistemaSeleccionadoModal === sistema.id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
                                    onClick={() => setSistemaSeleccionadoModal(sistema.id)}
                                  >
                                    {sistema.nombre} 
                                  </button>
                                ))}
                              </div>
                              {/* Mostrar nombre y descripción del sistema seleccionado */}
                              {sistemasModal.map((sistema: any) => (
                                sistema.id === sistemaSeleccionadoModal && (
                                  <div key={sistema.id} className="mt-2">
                                    <h4 className="text-lg font-semibold mb-1">{sistema.nombre}</h4>
                                    <p className="text-gray-600 mb-2">{sistema.descripcion}</p>
                                    {/* Permisos: Ver, Editar, Guardar */}
                                    <div className="flex items-center gap-4 mt-4">
                                      <span className="font-semibold text-gray-700 mr-2">Permisos:</span>
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={permisoVer} onChange={e => setPermisoVer(e.target.checked)} />
                                        <span>Ver</span>
                                      </label>
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={permisoEditar} onChange={e => setPermisoEditar(e.target.checked)} />
                                        <span>Editar</span>
                                      </label>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-2">
                    <button type="button" className="inline-flex w-32 items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 sm:ml-3 sm:w-auto" onClick={closePermissionModal}>Cerrar</button>
                    <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" onClick={handleGuardarPermisos}>
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}