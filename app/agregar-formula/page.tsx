"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Navbar } from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { authService } from "@/services/authService"

interface Variable {
  nombre: string
  valor: number
}

interface Proceso {
  id: string
  nombre: string
}

export default function AgregarFormula() {
  const [cantidadVariables, setCantidadVariables] = useState(0)
  const [variables, setVariables] = useState<Variable[]>([])
  const [operacion, setOperacion] = useState("")
  const [vistaPrevia, setVistaPrevia] = useState("")
  const [resultado, setResultado] = useState<number | string | null>(null)
  const [nombreFormula, setNombreFormula] = useState("")
  const [procesoId, setProcesoId] = useState("")
  const [procesos, setProcesos] = useState<Proceso[]>([])

  // Additional state for the new UI
  const [expresion, setExpresion] = useState("")
  const [nombre, setNombre] = useState("")
  const [variablesOptions, setVariablesOptions] = useState<any[]>([])
  const [variableResultadoId, setVariableResultadoId] = useState("")

  const parametrosPredefinidos = ["pH", "Temperatura", "Presión", "Caudal", "Densidad"]

  // Helper function to get token
  const getToken = () => {
    return authService.getToken()
  }

  useEffect(() => {
    // Cargar procesos (mock data por ahora)
    setProcesos([
      { id: "1", nombre: "Proceso de Filtración" },
      { id: "2", nombre: "Proceso de Purificación" },
      { id: "3", nombre: "Proceso de Análisis" },
    ])
  }, [])

  const handleGenerateFields = () => {
    const generatedVariables: Variable[] = Array.from({ length: cantidadVariables }, (_, index) => ({
      nombre: parametrosPredefinidos[index] || `Var${index + 1}`,
      valor: 0,
    }))
    setVariables(generatedVariables)
    setOperacion("")
    setVistaPrevia("")
    setResultado(null)
  }

  const handleVariableChange = (index: number, key: keyof Variable, value: string | number) => {
    const updatedVariables = [...variables]
    updatedVariables[index][key] = value as never
    setVariables(updatedVariables)
  }

  const handleEvaluateFormula = () => {
    try {
      // Evaluación simple de fórmulas básicas
      let formula = operacion
      variables.forEach((variable) => {
        const regex = new RegExp(variable.nombre, "g")
        formula = formula.replace(regex, variable.valor.toString())
      })

      // Evaluación básica (solo operaciones simples por seguridad)
      const evalResult = Function(`"use strict"; return (${formula})`)()
      setResultado(evalResult)
      setVistaPrevia(operacion)
    } catch (error) {
      setResultado("Error: Verifica tu fórmula.")
    }
  }

  const handleGuardarFormula = async () => {
    const payload = {
      nombre: nombreFormula,
      expresion: operacion,
      proceso_id: procesoId,
      variables_usadas: variables.map((v) => v.nombre),
    }

    console.log("Fórmula a guardar:", payload)
    alert("Fórmula guardada correctamente (modo desarrollo)")
  }

  // ▼ NUEVO: Estado para gestión de fórmulas
  const [formulas, setFormulas] = useState<any[]>([])
  const [loadingFormulas, setLoadingFormulas] = useState(false)
  const [errorFormulas, setErrorFormulas] = useState<string | null>(null)
  const [editFormula, setEditFormula] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteFormula, setDeleteFormula] = useState<any | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editNombre, setEditNombre] = useState("")
  const [editExpresion, setEditExpresion] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Cargar fórmulas existentes
  useEffect(() => {
    async function fetchFormulas() {
      setLoadingFormulas(true)
      setErrorFormulas(null)
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE_URL}/api/formulas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        let arr: any[] = []
        if (Array.isArray(json?.formulas)) arr = json.formulas
        else if (Array.isArray(json?.data)) arr = json.data
        else if (Array.isArray(json)) arr = json
        setFormulas(arr)
      } catch (e: any) {
        setErrorFormulas("No se pudieron cargar las fórmulas")
      } finally {
        setLoadingFormulas(false)
      }
    }
    fetchFormulas()
  }, [])

  // Refrescar fórmulas tras editar/eliminar
  async function refreshFormulas() {
    setLoadingFormulas(true)
    setErrorFormulas(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      let arr: any[] = []
      if (Array.isArray(json?.formulas)) arr = json.formulas
      else if (Array.isArray(json?.data)) arr = json.data
      else if (Array.isArray(json)) arr = json
      setFormulas(arr)
    } catch (e: any) {
      setErrorFormulas("No se pudieron cargar las fórmulas")
    } finally {
      setLoadingFormulas(false)
    }
  }

  // --- Editar fórmula ---
  function handleOpenEdit(f: any) {
    setEditFormula(f)
    setEditNombre(f.nombre)
    setEditExpresion(f.expresion)
    setShowEditModal(true)
  }
  async function handleSaveEdit() {
    if (!editFormula) return
    setSavingEdit(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas/${editFormula.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: editNombre, expresion: editExpresion }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar la fórmula")
      setShowEditModal(false)
      setEditFormula(null)
      await refreshFormulas()
    } catch (e: any) {
      alert(e.message || "Error al actualizar la fórmula")
    } finally {
      setSavingEdit(false)
    }
  }

  // --- Eliminar fórmula ---
  function handleOpenDelete(f: any) {
    setDeleteFormula(f)
    setShowDeleteModal(true)
  }
  async function handleConfirmDelete() {
    if (!deleteFormula) return
    setDeleting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas/${deleteFormula.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("No se pudo eliminar la fórmula")
      setShowDeleteModal(false)
      setDeleteFormula(null)
      await refreshFormulas()
    } catch (e: any) {
      alert(e.message || "Error al eliminar la fórmula")
    } finally {
      setDeleting(false)
    }
  }

  // Elimina estados y lógica de autocomplete

  return (
    <ProtectedRoute>
      <div className="min-vh-100 bg-light">
        <Navbar role="admin" />
        {/* Main Content */}
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow">
                <div className="card-header bg-primary text-white">
                  <h1 className="h4 mb-0">
                    <i className="material-icons me-2">functions</i>
                    Crear Fórmula
                  </h1>
                </div>
                <div className="card-body">
                  {/* Paso 1: Número de variables */}
                  <div className="mb-4">
                    <h5 className="mb-3">Paso 1: Definir Variables</h5>
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <label htmlFor="cantidadVariables" className="form-label">
                          Número de Variables:
                        </label>
                        <input
                          type="number"
                          id="cantidadVariables"
                          className="form-control"
                          value={cantidadVariables}
                          onChange={(e) => setCantidadVariables(Number(e.target.value))}
                          placeholder="Ej. 3"
                          min="1"
                          max="10"
                        />
                      </div>
                      <div className="col-md-6">
                        <button className="btn btn-success" onClick={handleGenerateFields}>
                          <i className="material-icons me-2">add</i>
                          Generar Campos
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Paso 2: Campos de Variables */}
                  {variables.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">Paso 2: Configurar Variables</h5>
                      {variables.map((variable, index) => (
                        <div className="row align-items-center mb-3" key={index}>
                          <div className="col-md-2">
                            <label className="form-label">Variable {index + 1}:</label>
                          </div>
                          <div className="col-md-5">
                            <input
                              type="text"
                              className="form-control"
                              value={variable.nombre}
                              onChange={(e) => handleVariableChange(index, "nombre", e.target.value)}
                              placeholder={`Variable ${index + 1}`}
                            />
                          </div>
                          <div className="col-md-5">
                            <input
                              type="number"
                              className="form-control"
                              value={variable.valor}
                              onChange={(e) => handleVariableChange(index, "valor", Number(e.target.value))}
                              placeholder="Valor de prueba"
                              step="0.01"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paso 3: Definir Operación */}
                  {variables.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3">Paso 3: Definir Operación</h5>
                      <div className="mb-3">
                        <label htmlFor="operacion" className="form-label">
                          Fórmula:
                        </label>
                        <input
                          type="text"
                          id="operacion"
                          className="form-control"
                          value={operacion}
                          onChange={(e) => setOperacion(e.target.value)}
                          placeholder="Ej: (pH + Temperatura) / Presión"
                        />
                        <div className="form-text">
                          Usa los nombres de las variables definidas arriba. Operadores: +, -, *, /, (, )
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label htmlFor="nombreFormula" className="form-label">
                            Nombre de la fórmula:
                          </label>
                          <input
                            type="text"
                            id="nombreFormula"
                            className="form-control"
                            value={nombreFormula}
                            onChange={(e) => setNombreFormula(e.target.value)}
                            placeholder="Ej: Cálculo de Eficiencia"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label htmlFor="procesoId" className="form-label">
                            Proceso:
                          </label>
                          <select
                            id="procesoId"
                            className="form-select"
                            value={procesoId}
                            onChange={(e) => setProcesoId(e.target.value)}
                          >
                            <option value="">Selecciona un proceso</option>
                            {procesos.map((proceso) => (
                              <option key={proceso.id} value={proceso.id}>
                                {proceso.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-info" onClick={handleEvaluateFormula}>
                          <i className="material-icons me-2">calculate</i>
                          Evaluar Fórmula
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={handleGuardarFormula}
                          disabled={!nombreFormula || !operacion || !procesoId}
                        >
                          <i className="material-icons me-2">save</i>
                          Guardar Fórmula
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Vista previa y resultado */}
                  {(vistaPrevia || resultado !== null) && (
                    <div className="mt-4">
                      <div className="card bg-light">
                        <div className="card-body">
                          {vistaPrevia && (
                            <div className="mb-3">
                              <h6>Vista Previa de la Fórmula:</h6>
                              <code>{vistaPrevia}</code>
                            </div>
                          )}
                          {resultado !== null && (
                            <div>
                              <h6>Resultado con valores de prueba:</h6>
                              <div className="alert alert-success">
                                <strong>{resultado}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Gestor de fórmulas al final */}
            <section className="mt-12">
              <div className="bg-white border border-gray-200 rounded-2xl shadow p-6">
                <h2 className="text-xl font-bold mb-4">Gestión de fórmulas</h2>
                {loadingFormulas ? (
                  <div className="text-gray-500">Cargando fórmulas...</div>
                ) : errorFormulas ? (
                  <div className="text-red-500">{errorFormulas}</div>
                ) : formulas.length === 0 ? (
                  <div className="text-gray-400">No hay fórmulas registradas.</div>
                ) : (
                  <ul className="space-y-4">
                    {formulas.map((f) => (
                      <li key={f.id} className="border rounded-lg p-4 flex flex-col gap-2 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{f.nombre}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(f)} aria-label="Editar fórmula">
                              <span className="material-icons text-base">edit</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleOpenDelete(f)} aria-label="Eliminar fórmula">
                              <span className="material-icons text-base">delete</span>
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-blue-700 font-mono break-all">{f.expresion}</div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Modal editar fórmula */}
                {showEditModal && (
                  <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)} aria-label="Cerrar">
                          <X size={20} />
                        </button>
                        <h3 className="text-lg font-bold mb-4">Editar fórmula</h3>
                        <div className="mb-4">
                          <Label>Nombre</Label>
                          <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="mt-1" />
                        </div>
                        <div className="mb-4">
                          <Label>Operación</Label>
                          <Input value={editExpresion} onChange={e => setEditExpresion(e.target.value)} className="mt-1 font-mono" />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                          <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={savingEdit}>Cancelar</Button>
                          <Button onClick={handleSaveEdit} disabled={savingEdit} className="font-semibold">
                            {savingEdit ? "Guardando..." : "Guardar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Dialog>
                )}

                {/* Modal eliminar fórmula */}
                {showDeleteModal && (
                  <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteModal(false)} aria-label="Cerrar">
                          <X size={20} />
                        </button>
                        <h3 className="text-lg font-bold mb-4">Eliminar fórmula</h3>
                        <p className="mb-6">¿Seguro que deseas eliminar la fórmula <span className="font-semibold">{deleteFormula?.nombre}</span>? Esta acción no se puede deshacer.</p>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancelar</Button>
                          <Button onClick={handleConfirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                            {deleting ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Dialog>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
