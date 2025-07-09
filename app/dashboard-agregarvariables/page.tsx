"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navbar from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"

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

// Placeholder para SelectProceso
function SelectProceso({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  // TODO: Implementar búsqueda asíncrona de procesos
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Seleccionar proceso" />
      </SelectTrigger>
      <SelectContent>
        {/* Opciones de ejemplo */}
        <SelectItem value="proceso1">Proceso 1</SelectItem>
        <SelectItem value="proceso2">Proceso 2</SelectItem>
      </SelectContent>
    </Select>
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
  
  const token = typeof window !== "undefined" ? localStorage.getItem("omega_token") : null

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
          ? `http://localhost:4000/api/variables/proceso/${selectedProceso}`
          : "http://localhost:4000/api/variables/"
        
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
    if (!formData.nombre.trim() || !formData.unidad.trim()) {
      setError('Nombre y unidad son obligatorios')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = modalMode === 'create' 
        ? 'http://localhost:4000/api/variables/crear'
        : `http://localhost:4000/api/variables/${editingVariable?.id}`

      const method = modalMode === 'create' ? 'POST' : 'PATCH'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          unidad: formData.unidad.trim(),
          proceso_id: selectedProceso || variables[0]?.proceso_id
        })
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      // Recargar variables después de guardar
      const fetchVariables = async () => {
        const url = selectedProceso 
          ? `http://localhost:4000/api/variables/proceso/${selectedProceso}`
          : "http://localhost:4000/api/variables/"
        
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
      setError(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} variable: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Eliminar variable
  const handleDeleteVariable = async (variableId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta variable?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:4000/api/variables/${variableId}`, {
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
        ? `http://localhost:4000/api/variables/proceso/${selectedProceso}`
        : "http://localhost:4000/api/variables/"
      
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
    } catch (err: any) {
      setError(`Error al eliminar variable: ${err.message}`)
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
              <SelectProceso value={selectedProceso} onChange={setSelectedProceso} />
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
                            onClick={() => handleDeleteVariable(variable.id)}
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
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-4">
                  {modalMode === 'create' ? 'Agregar Variable' : 'Editar Variable'}
                </h2>
                
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <Input 
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: pH, Temperatura"
                      maxLength={25}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Unidad *</label>
                    <Input 
                      value={formData.unidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, unidad: e.target.value }))}
                      placeholder="Ej: udless, °C, ppm"
                      maxLength={10}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveVariable} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
} 