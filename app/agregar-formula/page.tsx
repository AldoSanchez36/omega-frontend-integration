"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"

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

  const parametrosPredefinidos = ["pH", "Temperatura", "Presión", "Caudal", "Densidad"]

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
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
