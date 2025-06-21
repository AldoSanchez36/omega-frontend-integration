"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Plant {
  id: string
  name: string
  location: string
  description: string
  clientId: string
  clientName: string
  status: string
  systems: any[]
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface SystemType {
  id: string
  name: string
  description: string
}

interface AvailableParameter {
  id: string
  name: string
  unit: string
  defaultMin: number
  defaultMax: number
  category: string
}

export default function AgregarSistema() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const [plants, setPlants] = useState<Plant[]>([])
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([])
  const [availableParameters, setAvailableParameters] = useState<AvailableParameter[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>("")
  const [selectedSystemType, setSelectedSystemType] = useState<string>("")
  const [systemData, setSystemData] = useState({
    name: "",
    description: "",
    location: "",
    specifications: "",
  })
  const [selectedParameters, setSelectedParameters] = useState<
    Record<
      string,
      {
        selected: boolean
        minValue: number
        maxValue: number
        defaultValue: number
      }
    >
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const mockUser: User = {
    id: "1",
    name: "Admin User",
    email: "admin@omega.com",
    role: "admin",
  }

  // Función para agregar logs de debug
  const addDebugLog = (message: string) => {
    console.log(`🐛 AgregarSistema: ${message}`)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const loadData = async () => {
      addDebugLog("Cargando datos para crear sistema")

      try {
        // Mock plants data - replace with real fetch
        const mockPlants: Plant[] = [
          {
            id: "1",
            name: "Planta Norte",
            location: "Ciudad Norte",
            description: "Planta principal",
            clientId: "1",
            clientName: "Cliente A",
            status: "active",
            systems: [],
            createdAt: "2024-01-15",
          },
          {
            id: "2",
            name: "Planta Sur",
            location: "Ciudad Sur",
            description: "Planta de respaldo",
            clientId: "2",
            clientName: "Cliente B",
            status: "active",
            systems: [],
            createdAt: "2024-01-20",
          },
        ]

        setPlants(mockPlants)

        // Mock system types
        const mockSystemTypes: SystemType[] = [
          { id: "temperature", name: "Sistema de Temperatura", description: "Control y monitoreo de temperatura" },
          { id: "pressure", name: "Sistema de Presión", description: "Control y monitoreo de presión" },
          { id: "flow", name: "Sistema de Flujo", description: "Control y monitoreo de flujo" },
          { id: "level", name: "Sistema de Nivel", description: "Control y monitoreo de nivel" },
          { id: "ph", name: "Sistema de pH", description: "Control y monitoreo de pH" },
        ]

        setSystemTypes(mockSystemTypes)

        // Mock available parameters
        const mockParameters: AvailableParameter[] = [
          { id: "1", name: "Temperatura Ambiente", unit: "°C", defaultMin: 0, defaultMax: 50, category: "temperature" },
          { id: "2", name: "Humedad Relativa", unit: "%", defaultMin: 0, defaultMax: 100, category: "temperature" },
          { id: "3", name: "Punto de Rocío", unit: "°C", defaultMin: -10, defaultMax: 30, category: "temperature" },
          { id: "4", name: "Presión Principal", unit: "PSI", defaultMin: 0, defaultMax: 200, category: "pressure" },
          { id: "5", name: "Presión Diferencial", unit: "PSI", defaultMin: 0, defaultMax: 50, category: "pressure" },
          { id: "6", name: "Flujo Volumétrico", unit: "L/min", defaultMin: 0, defaultMax: 500, category: "flow" },
          { id: "7", name: "Velocidad de Flujo", unit: "m/s", defaultMin: 0, defaultMax: 10, category: "flow" },
          { id: "8", name: "Nivel de Tanque", unit: "m", defaultMin: 0, defaultMax: 10, category: "level" },
          { id: "9", name: "pH del Líquido", unit: "pH", defaultMin: 0, defaultMax: 14, category: "ph" },
        ]

        setAvailableParameters(mockParameters)

        addDebugLog("Datos cargados exitosamente")
      } catch (error) {
        addDebugLog(`Error cargando datos: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setSystemData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleParameterToggle = (parameterId: string, checked: boolean) => {
    const parameter = availableParameters.find((p) => p.id === parameterId)
    if (!parameter) return

    setSelectedParameters((prev) => ({
      ...prev,
      [parameterId]: {
        selected: checked,
        minValue: parameter.defaultMin,
        maxValue: parameter.defaultMax,
        defaultValue: (parameter.defaultMin + parameter.defaultMax) / 2,
      },
    }))
  }

  const handleParameterConfigChange = (parameterId: string, field: string, value: number) => {
    setSelectedParameters((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    addDebugLog("Iniciando creación de nuevo sistema")

    try {
      const selectedParams = Object.entries(selectedParameters)
        .filter(([_, config]) => config.selected)
        .map(([id, config]) => ({
          parameterId: id,
          minValue: config.minValue,
          maxValue: config.maxValue,
          defaultValue: config.defaultValue,
        }))

      const systemPayload = {
        ...systemData,
        plantId: selectedPlant,
        systemType: selectedSystemType,
        parameters: selectedParams,
        status: "offline",
        createdAt: new Date().toISOString(),
      }

      addDebugLog(`Sistema "${systemData.name}" creado exitosamente con ${selectedParams.length} parámetros`)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard")
    } catch (error) {
      addDebugLog(`Error creando sistema: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const filteredParameters = availableParameters.filter(
    (param) => !selectedSystemType || param.category === selectedSystemType,
  )

  const isFormValid = selectedPlant && selectedSystemType && systemData.name

  if (loading) {
    return (
      <div className="min-vh-100 bg-light">
        {/* Navigation */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <div className="container">
            <Link className="navbar-brand fw-bold" href="/">
              <span className="material-icons me-2">business</span>
              Omega Dashboard
            </Link>
          </div>
        </nav>
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            <span className="material-icons me-2">business</span>
            Omega Dashboard
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/dashboard">
              <span className="material-icons me-1">dashboard</span>
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <div className="mb-4">
          <h1 className="h3 mb-0">Agregar Nuevo Sistema</h1>
          <p className="text-muted">Crea un sistema y configura sus parámetros</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Plant and System Type Selection */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Selección de Planta y Tipo de Sistema</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Planta *</label>
                  <select 
                    className="form-select" 
                    value={selectedPlant} 
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar planta</option>
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name} - {plant.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Tipo de Sistema *</label>
                  <select 
                    className="form-select" 
                    value={selectedSystemType} 
                    onChange={(e) => setSelectedSystemType(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar tipo de sistema</option>
                    {systemTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSystemType && (
                <div className="alert alert-info">
                  <h6 className="alert-heading">Tipo de Sistema Seleccionado</h6>
                  {(() => {
                    const systemType = systemTypes.find((t) => t.id === selectedSystemType)
                    return systemType ? <p className="mb-0">{systemType.description}</p> : null
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Información del Sistema</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Nombre del Sistema *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={systemData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Sistema de Control Principal"
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Ubicación en Planta</label>
                  <input
                    type="text"
                    className="form-control"
                    value={systemData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Ej: Sector A, Nivel 2"
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control"
                    value={systemData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción detallada del sistema..."
                    rows={3}
                  />
                </div>

                <div className="col-12 mb-3">
                  <label className="form-label">Especificaciones Técnicas</label>
                  <textarea
                    className="form-control"
                    value={systemData.specifications}
                    onChange={(e) => handleInputChange("specifications", e.target.value)}
                    placeholder="Especificaciones técnicas, modelos, capacidades..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Parameters Configuration */}
          {selectedSystemType && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">Configuración de Parámetros</h5>
                <p className="text-muted mb-0">Selecciona los parámetros que monitoreará este sistema</p>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {filteredParameters.map((parameter) => (
                    <div key={parameter.id} className="border rounded p-3">
                      <div className="d-flex align-items-start">
                        <div className="form-check me-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedParameters[parameter.id]?.selected || false}
                            onChange={(e) => handleParameterToggle(parameter.id, e.target.checked)}
                            id={`param-${parameter.id}`}
                          />
                        </div>

                        <div className="flex-grow-1">
                          <label className="form-check-label fw-bold" htmlFor={`param-${parameter.id}`}>
                            {parameter.name}
                          </label>
                          <div className="text-muted small mb-2">
                            Unidad: {parameter.unit} | Categoría: {parameter.category}
                          </div>

                          {selectedParameters[parameter.id]?.selected && (
                            <div className="row">
                              <div className="col-md-4 mb-2">
                                <label className="form-label small">Valor Mínimo</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={selectedParameters[parameter.id]?.minValue || parameter.defaultMin}
                                  onChange={(e) =>
                                    handleParameterConfigChange(
                                      parameter.id,
                                      "minValue",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="col-md-4 mb-2">
                                <label className="form-label small">Valor Máximo</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={selectedParameters[parameter.id]?.maxValue || parameter.defaultMax}
                                  onChange={(e) =>
                                    handleParameterConfigChange(
                                      parameter.id,
                                      "maxValue",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="col-md-4 mb-2">
                                <label className="form-label small">Valor por Defecto</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={
                                    selectedParameters[parameter.id]?.defaultValue ||
                                    (parameter.defaultMin + parameter.defaultMax) / 2
                                  }
                                  onChange={(e) =>
                                    handleParameterConfigChange(
                                      parameter.id,
                                      "defaultValue",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => router.push("/dashboard")}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!isFormValid || saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="material-icons me-2">settings</i>
                      Crear Sistema
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Debug Info */}
        <div className="card mt-4">
          <div className="card-header">
            <h5 className="card-title mb-0">🐛 Debug Agregar Sistema</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>Estado Actual:</h6>
                <ul className="list-unstyled">
                  <li>✅ Formulario cargado correctamente</li>
                  <li>✅ Datos mock funcionando</li>
                  <li>✅ Planta seleccionada: {selectedPlant || "Ninguna"}</li>
                  <li>✅ Tipo de sistema: {selectedSystemType || "Ninguno"}</li>
                  <li>✅ Parámetros seleccionados: {Object.values(selectedParameters).filter((p) => p.selected).length}</li>
                  <li>✅ Formulario válido: {isFormValid ? "Sí" : "No"}</li>
                </ul>
              </div>
              <div className="col-md-6">
                <h6>Logs Recientes:</h6>
                <div
                  className="bg-dark text-light p-2 rounded"
                  style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
                >
                  {debugInfo.length > 0 ? (
                    debugInfo.map((log, index) => (
                      <div key={index} className="text-info">
                        <small>{log}</small>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">No hay logs aún...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
