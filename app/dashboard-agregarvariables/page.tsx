"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navbar from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

// Interfaces
interface Variable {
  id: string
  nombre: string
  unidad: string
  proceso_id: string
  created_at?: string
  updated_at?: string
}

interface Proceso {
  id: string
  nombre: string
  descripcion: string
}

// Dropdown de procesos estilo users-management
function DropdownProceso({ value, onChange, token }: { value: string, onChange: (v: string) => void, token: string | null }) {
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fetchProcesos = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_ALL}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!res.ok) throw new Error("No se pudieron cargar los procesos")
        const data = await res.json()
        setProcesos(data.procesos || data || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProcesos()
  }, [token])

  const selectedProceso = procesos.find(p => p.id === value)

  return (
    <div className="relative inline-block text-left w-48">
      <button
        type="button"
        className="inline-flex w-full justify-between gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {loading ? "Cargando..." : (selectedProceso ? selectedProceso.nombre : "Todas las variables")}
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
      {open && (
        <div
          className="absolute z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                setOpen(false)
                onChange("")
              }}
              className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${!value ? 'font-bold bg-gray-100' : ''}`}
              role="menuitem"
            >
              Todas las variables
            </button>
            {procesos.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false)
                  onChange(p.id)
                }}
                className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${value === p.id ? 'font-bold bg-gray-100' : ''}`}
                role="menuitem"
              >
                {p.nombre}
              </button>
            ))}
            {!loading && procesos.length === 0 && (
              <div className="px-4 py-2 text-gray-400">No hay procesos</div>
            )}
            {error && (
              <div className="px-4 py-2 text-red-500">{error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function VariablesPage() {
  const [selectedProceso, setSelectedProceso] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState({ nombre: '', unidad: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, variable: Variable | null }>({ open: false, variable: null })
  
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null

  // Cargar variables desde el backend
  useEffect(() => {
    const fetchVariables = async () => {
      if (!token) {
        setError("Token de autenticación no encontrado")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      
      try {
        const url = selectedProceso 
          ? `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedProceso)}`
          : `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setVariables(data.variables || data || [])
      } catch (err: any) {
        setError(`Error al cargar variables: ${err.message}`)
        console.error("Error fetching variables:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchVariables()
  }, [token, selectedProceso])

  // Manejar selección de checkboxes
  const handleSelectVariable = (variableId: string) => {
    setSelectedVariables(prev => 
      prev.includes(variableId) 
        ? prev.filter(id => id !== variableId)
        : [...prev, variableId]
    )
  }

  // Manejar selección de todos
  const handleSelectAll = () => {
    if (selectedVariables.length === variables.length) {
      setSelectedVariables([])
    } else {
      setSelectedVariables(variables.map(v => v.id))
    }
  }

  // Abrir modal para crear nueva variable
  const handleCreateVariable = () => {
    setModalMode('create')
    setEditingVariable(null)
    setFormData({ nombre: '', unidad: '' })
    setShowModal(true)
  }
  
  // Abrir modal para editar variable
  const handleEditVariable = (variable: Variable) => {
    setModalMode('edit')
    setEditingVariable(variable)
    setFormData({ nombre: variable.nombre, unidad: variable.unidad })
    setShowModal(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingVariable(null)
    setFormData({ nombre: '', unidad: '' })
    setError(null)
  }

  // Guardar variable (crear o editar)
  const handleSaveVariable = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = modalMode === 'create' 
        ? `${API_BASE_URL}${API_ENDPOINTS.VARIABLE_CREATE}`
        : `${API_BASE_URL}${API_ENDPOINTS.VARIABLE_UPDATE(editingVariable?.id ?? "")}`

      const method = modalMode === 'create' ? 'POST' : 'PATCH'
      
      // Solo incluir proceso_id si se selecciona específicamente un proceso
      const requestBody: any = {
        nombre: formData.nombre.trim(),
        unidad: formData.unidad.trim()
      }
      
      // Solo agregar proceso_id si se selecciona un proceso específico
      if (selectedProceso) {
        requestBody.proceso_id = selectedProceso
      }
      
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // Recargar variables después de guardar
      const fetchVariables = async () => {
        const url = selectedProceso 
          ? `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedProceso)}`
          : `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        if (response.ok) {
          const data = await response.json()
          setVariables(data.variables || data || [])
        }
      }

      await fetchVariables()
      handleCloseModal()
    } catch (err: any) {
      console.error('❌ Error al guardar variable:', err)
      setError(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} variable: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Eliminar variable (ahora solo abre el modal de confirmación)
  const handleDeleteVariable = (variable: Variable) => {
    setDeleteConfirm({ open: true, variable })
  }

  // Confirmar eliminación
  const confirmDeleteVariable = async () => {
    if (!deleteConfirm.variable) return
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLE_UPDATE(deleteConfirm.variable.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      // Recargar variables después de eliminar
      const url = selectedProceso 
        ? `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(selectedProceso)}`
        : `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_ALL}`
      const reloadResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (reloadResponse.ok) {
        const data = await reloadResponse.json()
        setVariables(data.variables || data || [])
      }
      setDeleteConfirm({ open: false, variable: null })
    } catch (err: any) {
      setError(`Error al eliminar variable: ${err.message}`)
      setDeleteConfirm({ open: false, variable: null })
    }
  }

  return (
    <ProtectedRoute>
      <Navbar role="admin" />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          {/* Encabezado */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Parámetros</h1>
            <div className="flex items-center gap-2">
              <DropdownProceso value={selectedProceso} onChange={setSelectedProceso} token={token} />
              <Button onClick={handleCreateVariable} className="ml-2">+ Agregar</Button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Tabla de variables */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Cargando variables...</span>
              </div>
            ) : (
              <table className="min-w-full text-sm border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                    <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                    <th className="px-3 py-2 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                        No hay variables disponibles
                      </td>
                    </tr>
                  ) : (
                    variables.map((variable) => (
                      <tr key={variable.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{variable.nombre}</td>
                        <td className="px-3 py-2">{variable.unidad}</td>
                        <td className="px-3 py-2 text-center">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="mr-1"
                            onClick={() => handleEditVariable(variable)}
                          >
                            <i className="material-icons text-sm">edit</i>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteVariable(variable)}
                          >
                            <i className="material-icons text-sm">delete</i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal para crear/editar variable */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
              <div className="relative z-10 w-full max-w-lg mx-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:size-10">
                          <span className="material-icons text-blue-600 text-3xl">{modalMode === 'create' ? 'add' : 'edit'}</span>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                          <h3 className="text-base font-semibold text-gray-900" id="dialog-title">
                            {modalMode === 'create' ? 'Agregar Variable' : 'Editar Variable'}
                          </h3>
                          <div className="mt-2 space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                              <Input
                                value={formData.nombre}
                                onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej: pH, Temperatura"
                                maxLength={25}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad <span className="text-gray-400">(opcional)</span></label>
                              <Input
                                value={formData.unidad}
                                onChange={e => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                                placeholder="Ej: °C, ppm o dejar vacío"
                                maxLength={10}
                                className="w-full"
                              />
                            </div>
                            {error && <div className="text-red-600 text-sm">{error}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-2">
                      <Button variant="outline" onClick={handleCloseModal} disabled={saving}>Cancelar</Button>
                      <Button onClick={handleSaveVariable} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Modal de confirmación de eliminación */}
          {deleteConfirm.open && deleteConfirm.variable && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setDeleteConfirm({ open: false, variable: null })}></div>
              <div className="relative z-10 w-full max-w-md mx-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                          <span className="material-icons text-red-600 text-3xl">delete</span>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                          <h3 className="text-base font-semibold text-gray-900" id="dialog-title">
                            Eliminar variable
                          </h3>
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">¿Estás seguro que quieres eliminar <span className="font-bold">{deleteConfirm.variable.nombre}</span>?</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 sm:px-2">
                      <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, variable: null })}>Cancelar</Button>
                      <Button onClick={confirmDeleteVariable} className="bg-red-600 hover:bg-red-700 text-white" type="button">
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
} 