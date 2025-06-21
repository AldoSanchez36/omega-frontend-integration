"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/navbar"
import { DebugPanel } from "@/components/debug_panel"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import type { Plant, User } from "@/types"

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
  const { debugInfo, addDebugLog } = useDebugLogger()

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

  useEffect(() => {
    const loadData = async () => {
      addDebugLog("info", "Cargando datos para crear sistema")

      try {
        // Mock plants data - replace with real fetch
        /*
        const plantsResponse = await fetch('/api/plants')
        const plantsData = await plantsResponse.json()
        setPlants(plantsData)
        */

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

        // Mock available parameters - replace with real fetch
        /*
        const parametersResponse = await fetch('/api/parameters/available')
        const parametersData = await parametersResponse.json()
        setAvailableParameters(parametersData)
        */

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

        addDebugLog("success", "Datos cargados exitosamente")
      } catch (error) {
        addDebugLog("error", `Error cargando datos: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [addDebugLog])

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
    addDebugLog("info", "Iniciando creación de nuevo sistema")

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

      // Mock save - replace with real API call
      /*
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemPayload)
      })
      
      if (!response.ok) {
        throw new Error('Error creating system')
      }
      
      const result = await response.json()
      */

      addDebugLog("success", `Sistema "${systemData.name}" creado exitosamente con ${selectedParams.length} parámetros`)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard")
    } catch (error) {
      addDebugLog("error", `Error creando sistema: ${error}`)
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
      <div className="min-h-screen bg-gray-50">
        <Navbar user={mockUser} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={mockUser} />

      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agregar Nuevo Sistema</h1>
          <p className="text-gray-600">Crea un sistema y configura sus parámetros</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Plant and System Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Selección de Planta y Tipo de Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Planta *</label>
                  <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar planta" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name} - {plant.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Sistema *</label>
                  <Select value={selectedSystemType} onValueChange={setSelectedSystemType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de sistema" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSystemType && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Tipo de Sistema Seleccionado</h4>
                  {(() => {
                    const systemType = systemTypes.find((t) => t.id === selectedSystemType)
                    return systemType ? <p className="text-sm text-blue-700 mt-1">{systemType.description}</p> : null
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Sistema *</label>
                  <Input
                    value={systemData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Sistema de Control Principal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ubicación en Planta</label>
                  <Input
                    value={systemData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Ej: Sector A, Nivel 2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <Textarea
                    value={systemData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción detallada del sistema..."
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Especificaciones Técnicas</label>
                  <Textarea
                    value={systemData.specifications}
                    onChange={(e) => handleInputChange("specifications", e.target.value)}
                    placeholder="Especificaciones técnicas, modelos, capacidades..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameters Configuration */}
          {selectedSystemType && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Configuración de Parámetros</CardTitle>
                <p className="text-sm text-gray-600">Selecciona los parámetros que monitoreará este sistema</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredParameters.map((parameter) => (
                    <div key={parameter.id} className="border rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={selectedParameters[parameter.id]?.selected || false}
                          onCheckedChange={(checked) => handleParameterToggle(parameter.id, checked as boolean)}
                        />

                        <div className="flex-1">
                          <div className="font-medium">{parameter.name}</div>
                          <div className="text-sm text-gray-500 mb-3">
                            Unidad: {parameter.unit} | Categoría: {parameter.category}
                          </div>

                          {selectedParameters[parameter.id]?.selected && (
                            <div className="grid grid-cols-3 gap-4 mt-3">
                              <div>
                                <label className="block text-xs font-medium mb-1">Valor Mínimo</label>
                                <Input
                                  type="number"
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
                              <div>
                                <label className="block text-xs font-medium mb-1">Valor Máximo</label>
                                <Input
                                  type="number"
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
                              <div>
                                <label className="block text-xs font-medium mb-1">Valor por Defecto</label>
                                <Input
                                  type="number"
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
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!isFormValid || saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    "⚙️ Crear Sistema"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <DebugPanel
          debugInfo={debugInfo}
          currentState={{
            selectedPlant,
            selectedSystemType,
            systemName: systemData.name,
            parametersSelected: Object.values(selectedParameters).filter((p) => p.selected).length,
            formValid: isFormValid,
            saving,
          }}
        />
      </div>
    </div>
  )
}
